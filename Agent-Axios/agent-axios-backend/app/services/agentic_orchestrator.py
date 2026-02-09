"""
Agentic Vulnerability Analysis Orchestrator
Uses LangGraph ReAct agent with Azure GPT-4 to autonomously analyze repositories for vulnerabilities.
"""
import os
import shutil
import time
from datetime import datetime
from typing import List, Dict, Any, Iterator
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langsmith import traceable
from app.models import Analysis, CVEFinding, CodeChunk, db
from app.services.repo_service import RepoService
from app.services.chunking_service import ChunkingService
from app.services.codebase_indexing_service import CodebaseIndexingService
from app.services.enhanced_pdf_generator import EnhancedPDFReportGenerator
from app.services.agent_tools import ALL_TOOLS, set_analysis_context, set_repo_path, set_repo_url
from config.settings import Config
import logging
import json

logger = logging.getLogger(__name__)


class AgenticVulnerabilityOrchestrator:
    """
    Autonomous agent-based vulnerability analysis orchestrator.
    """
    
    def __init__(self, analysis_id: int, socketio_instance):
        self.analysis_id = analysis_id
        self.socketio = socketio_instance
        self.analysis = db.session.query(Analysis).filter_by(analysis_id=analysis_id).first()
        
        if not self.analysis:
            raise ValueError(f"Analysis {analysis_id} not found")
        
        self.room = f"analysis_{analysis_id}"
        
        # Initialize services
        self.repo_service = RepoService()
        self.chunking_service = ChunkingService()
        
        # Initialize indexing service with analysis-specific path and repo info for caching
        # We'll set repo_url after cloning when we have the actual path
        self.indexing_service = None  # Initialize later with repo info
        
        self.pdf_generator = EnhancedPDFReportGenerator()
        
        # Initialize Azure GPT-4 for the agent
        self.llm = AzureChatOpenAI(
            azure_endpoint=Config.AZURE_OPENAI_ENDPOINT,
            api_key=Config.AZURE_OPENAI_API_KEY,
            api_version=Config.AZURE_OPENAI_API_VERSION,
            deployment_name=Config.AZURE_OPENAI_MODEL,
            temperature=0.1,
            streaming=True
        )
        
        self.memory = MemorySaver()
        self.agent = None
        
        logger.info(f"Initialized agentic orchestrator for analysis {analysis_id}")
    
    @traceable(name="agentic_vulnerability_analysis", run_type="chain")
    def run(self):
        """Execute the autonomous agent-based vulnerability analysis"""
        repo_path = None
        
        try:
            # Refresh session
            db.session.expire_all()
            self.analysis = db.session.query(Analysis).filter_by(analysis_id=self.analysis_id).first()
            
            if not self.analysis:
                raise ValueError(f"Analysis {self.analysis_id} not found in background task")
            
            self.analysis.status = 'running'
            self.analysis.start_time = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Starting agentic analysis {self.analysis_id}: {self.analysis.repo_url}")
            
            # ========== SETUP: Repository Setup and Indexing ==========
            self.emit_progress(0, 'initializing', 'Initializing autonomous agent...')
            
            # Clone repository
            self.emit_progress(5, 'cloning', 'Cloning repository...')
            repo_path = self.repo_service.clone(self.analysis.repo_url)
            self.emit_progress(15, 'cloning', 'Repository cloned successfully')
            
            # Initialize indexing service NOW with repo info for intelligent caching
            self.indexing_service = CodebaseIndexingService(
                repo_url=self.analysis.repo_url,
                repo_path=repo_path
            )
            
            # Chunk and index codebase
            self.emit_progress(15, 'indexing', 'Chunking and indexing codebase (with intelligent caching)...')
            chunks = self.chunking_service.process_directory(
                repo_path,
                self.analysis_id,
                max_files=5000,
                max_chunks_per_file=100
            )
            
            if not chunks:
                self._complete_analysis(0, 'No supported code files found')
                return
            
            self.indexing_service.index_chunks(chunks)
            self.analysis.total_files = self.chunking_service.files_processed
            self.analysis.total_chunks = len(chunks)
            db.session.commit()
            
            self.emit_progress(30, 'indexing', f'Indexed {len(chunks)} code chunks')
            
            # ========== AGENT EXECUTION ==========
            self.emit_progress(30, 'agent_starting', 'Starting autonomous agent analysis...')
            
            # Set analysis context for tools
            set_analysis_context(self.analysis_id)
            set_repo_path(repo_path)
            set_repo_url(self.analysis.repo_url)  # Set repo URL for cache lookups
            
            # Create agent configuration with higher recursion limit
            config = {
                "configurable": {
                    "thread_id": f"analysis_{self.analysis_id}",
                    "repo_path": repo_path,
                    "analysis_id": self.analysis_id
                },
                "recursion_limit": 50  # Allow up to 50 reasoning steps
            }
            
            # Create initial prompt for the agent
            system_prompt = self._create_agent_prompt(repo_path)
            
            # Create the agent with the system prompt
            self.agent = create_react_agent(
                self.llm,
                tools=ALL_TOOLS,
                checkpointer=self.memory,
                messages_modifier=system_prompt
            )
            
            # Stream agent execution
            self._run_agent_with_streaming("Start the vulnerability analysis.", config)
            
            # Analysis completion is handled by the agent calling generate_vulnerability_report
            # But we need to mark the analysis as completed in DB
            
            # Check if report was generated (maybe check DB for findings)
            findings_count = db.session.query(CVEFinding).filter_by(analysis_id=self.analysis_id).count()
            self._complete_analysis(findings_count, 'Agent analysis completed')
            
        except Exception as e:
            logger.error(f"Agentic analysis {self.analysis_id} failed: {str(e)}", exc_info=True)
            self._handle_error(str(e))
            
        finally:
            # Cleanup - but DON'T delete cached repos (they're in data/cache/repositories/)
            if repo_path and os.path.exists(repo_path):
                # Only delete if it's a temp directory (not in cache)
                if "data/cache/repositories" not in repo_path:
                    try:
                        shutil.rmtree(repo_path)
                        logger.info(f"Cleaned up temporary repository at {repo_path}")
                    except Exception as cleanup_error:
                        logger.warning(f"Failed to cleanup temp repo: {str(cleanup_error)}")
                else:
                    logger.info(f"Keeping cached repository at {repo_path}")
    
    def _create_agent_prompt(self, repo_path: str) -> str:
        """Create the initial prompt for the autonomous agent"""
        prompt = f"""You are an expert security analysis agent. Your mission is to analyze this repository for security vulnerabilities.

Repository: {self.analysis.repo_url}
Local Path: {repo_path}

**Your Analysis Process:**
1. First, use `analyze_repository_structure` to understand the codebase technologies
2. Then, use `search_cve_database` to find 5-10 relevant CVEs for those technologies
3. For the TOP 3 most critical CVEs found:
   - Use `search_codebase_semantically` to find potentially vulnerable code
   - Use `read_file_content` to examine the code
   - Use `validate_vulnerability_match` to confirm if it's actually vulnerable
   - If vulnerable, use `record_finding` to save it
4. When you've analyzed 3 CVEs OR found 3+ vulnerabilities, STOP and call `generate_vulnerability_report`

**CRITICAL RULES:**
- Do NOT search for more than 10 CVEs total
- Do NOT analyze more than 3 CVEs in detail
- When you have findings, call `generate_vulnerability_report` and STOP
- If no vulnerabilities found after checking 3 CVEs, call `generate_vulnerability_report` anyway

Start your analysis now."""
        return prompt
    
    def _run_agent_with_streaming(self, initial_prompt: str, config: Dict):
        """Run the agent and stream all intermediate results using values mode"""
        messages = [{"role": "user", "content": initial_prompt}]
        
        step_count = 0
        max_steps = 45  # Match recursion_limit - 5 for safety
        
        try:
            # Stream the agent execution using 'values' mode to get complete state
            for state in self.agent.stream({"messages": messages}, config, stream_mode="values"):
                step_count += 1
                
                if step_count > max_steps:
                    logger.warning(f"Agent reached max steps ({max_steps})")
                    self.emit_progress(85, 'agent_max_steps', f'Agent completed {max_steps} analysis steps')
                    break
                
                # Process the current state
                self._process_agent_state(state)
                
                # Update progress based on steps
                progress = min(30 + (step_count * 1), 95)
                self.emit_progress(progress, 'agent_analyzing', f'Agent step {step_count}...')
            
            logger.info(f"Agent completed analysis in {step_count} steps")
            
        except Exception as e:
            logger.error(f"Error during agent execution: {str(e)}", exc_info=True)
            raise
    
    def _process_agent_state(self, state: Dict):
        """Process the agent state and stream relevant information to the UI."""
        try:
            messages = state.get('messages', [])
            if not messages:
                return
            
            # Get the last message to determine what just happened
            last_message = messages[-1]
            
            # Check message type and handle accordingly
            if isinstance(last_message, AIMessage):
                # Agent is either thinking or calling tools
                if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                    # Agent decided to use tools
                    for tool_call in last_message.tool_calls:
                        tool_name = tool_call.get('name', 'unknown')
                        logger.info(f"🔧 Agent calling tool: {tool_name}")
                        
                        self.socketio.emit('agent_action', {
                            'analysis_id': self.analysis_id,
                            'action': 'tool_call',
                            'tool': tool_name,
                            'args': tool_call.get('args', {}),
                            'timestamp': datetime.utcnow().isoformat()
                        }, room=self.room, namespace='/analysis')
                else:
                    # Agent is sending a response (no tool calls)
                    content = last_message.content if hasattr(last_message, 'content') else str(last_message)
                    if content:
                        logger.info(f"💬 Agent response: {content[:100]}...")
                        
                        self.socketio.emit('agent_response', {
                            'analysis_id': self.analysis_id,
                            'response': content[:500],
                            'full_response': content,
                            'timestamp': datetime.utcnow().isoformat()
                        }, room=self.room, namespace='/analysis')
            
            elif isinstance(last_message, ToolMessage):
                # Tool execution completed
                tool_name = last_message.name if hasattr(last_message, 'name') else 'unknown'
                tool_result = last_message.content if hasattr(last_message, 'content') else str(last_message)
                
                logger.info(f"✅ Tool result from {tool_name}: {str(tool_result)[:100]}...")
                
                self.socketio.emit('tool_result', {
                    'analysis_id': self.analysis_id,
                    'tool': tool_name,
                    'result_preview': str(tool_result)[:200],
                    'timestamp': datetime.utcnow().isoformat()
                }, room=self.room, namespace='/analysis')
                
                # Check if this is the report generation tool
                if tool_name == 'generate_vulnerability_report' and 'successfully' in str(tool_result).lower():
                    self.socketio.emit('report_generated', {
                        'analysis_id': self.analysis_id,
                        'report_type': 'final',
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=self.room, namespace='/analysis')

        except Exception as e:
            logger.error(f"Error processing agent state: {str(e)}", exc_info=True)
    
    def emit_progress(self, percentage: int, stage: str, message: str):
        """Emit progress update via SocketIO"""
        self.socketio.emit('progress_update', {
            'analysis_id': self.analysis_id,
            'progress': percentage,
            'stage': stage,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }, room=self.room, namespace='/analysis')
        
        logger.info(f"Analysis {self.analysis_id}: {percentage}% - {stage} - {message}")
    
    def _complete_analysis(self, total_findings: int, message: str):
        """Complete the analysis successfully"""
        db.session.expire_all()
        self.analysis = db.session.query(Analysis).filter_by(analysis_id=self.analysis_id).first()
        
        self.analysis.status = 'completed'
        self.analysis.end_time = datetime.utcnow()
        self.analysis.total_findings = total_findings
        db.session.commit()
        
        duration = (self.analysis.end_time - self.analysis.start_time).total_seconds()
        logger.info(f"✅ Agentic analysis {self.analysis_id} completed in {duration:.1f}s with {total_findings} findings")
        
        self.emit_progress(100, 'completed', message)
        self.socketio.emit('analysis_complete', {
            'analysis_id': self.analysis_id,
            'duration_seconds': int(duration),
            'total_findings': total_findings,
            'message': message
        }, room=self.room, namespace='/analysis')
    
    def _handle_error(self, error_message: str):
        """Handle analysis error"""
        db.session.rollback()
        db.session.expire_all()
        self.analysis = db.session.query(Analysis).filter_by(analysis_id=self.analysis_id).first()
        
        if self.analysis:
            self.analysis.status = 'failed'
            self.analysis.error_message = error_message
            self.analysis.end_time = datetime.utcnow()
            db.session.commit()
        
        self.socketio.emit('error', {
            'analysis_id': self.analysis_id,
            'error': error_message,
            'stage': 'agentic_analysis'
        }, room=self.room, namespace='/analysis')
