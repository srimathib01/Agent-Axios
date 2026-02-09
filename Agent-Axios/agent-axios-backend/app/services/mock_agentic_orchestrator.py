"""
Agentic Vulnerability Analysis Orchestrator
Executes the complete vulnerability analysis process with real-time progress updates.
"""
import os
import time
from datetime import datetime
from typing import List, Dict, Any
from app.models import Analysis, CVEFinding, CodeChunk, db
from app.services.mock_data_generator import VulnerabilityDataGenerator
from app.services.enhanced_pdf_generator import EnhancedPDFReportGenerator
import logging

logger = logging.getLogger(__name__)


class AgenticVulnerabilityOrchestrator:
    """
    Autonomous agent-based vulnerability analysis orchestrator.
    Provides real-time progress updates and generates comprehensive reports.
    """
    
    def __init__(self, analysis_id: int, socketio_instance):
        self.analysis_id = analysis_id
        self.socketio = socketio_instance
        self.analysis = db.session.query(Analysis).filter_by(analysis_id=analysis_id).first()
        
        if not self.analysis:
            raise ValueError(f"Analysis {analysis_id} not found")
        
        self.room = f"analysis_{analysis_id}"
        self.pdf_generator = EnhancedPDFReportGenerator()
        self.data_generator = VulnerabilityDataGenerator()
        
        logger.info(f"Initialized orchestrator for analysis {analysis_id}")
    
    def run(self):
        """Execute the mock vulnerability analysis with realistic simulation."""
        try:
            # Refresh session
            db.session.expire_all()
            self.analysis = db.session.query(Analysis).filter_by(analysis_id=self.analysis_id).first()
            
            if not self.analysis:
                raise ValueError(f"Analysis {self.analysis_id} not found")
            
            self.analysis.status = 'running'
            self.analysis.start_time = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"🚀 Starting analysis {self.analysis_id}: {self.analysis.repo_url}")
            
            # ========== PHASE 1: Initialization ==========
            self.emit_progress(0, 'initializing', 'Initializing autonomous agent...')
            time.sleep(1)
            
            # ========== PHASE 2: Repository Cloning ==========
            self.emit_progress(5, 'cloning', 'Cloning repository...')
            time.sleep(2)
            self.emit_progress(10, 'cloning', 'Repository cloned successfully')
            
            # ========== PHASE 3: Code Analysis ==========
            self.emit_progress(15, 'indexing', 'Chunking and indexing codebase...')
            time.sleep(2)
            
            # Generate repository stats
            stats = self.data_generator.generate_mock_repository_stats(self.analysis.repo_url)
            self.analysis.total_files = stats['total_files']
            self.analysis.total_chunks = stats['total_chunks']
            db.session.commit()
            
            self.emit_progress(30, 'indexing', f"Indexed {stats['total_chunks']} code chunks from {stats['total_files']} files")
            time.sleep(1)
            
            # ========== PHASE 4: Agent Analysis Simulation ==========
            self.emit_progress(30, 'agent_starting', 'Starting autonomous agent analysis...')
            time.sleep(1)
            
            # Simulate agent steps and generate vulnerabilities inline
            vulnerabilities = self.data_generator.generate_mock_vulnerabilities(
                self.analysis.repo_url, 
                count=3
            )
            
            agent_steps = self.data_generator.generate_mock_agent_steps(self.analysis.repo_url)
            self._simulate_agent_analysis(agent_steps, vulnerabilities)
            
            # ========== PHASE 5: Generate Report ==========
            self.emit_progress(90, 'generating_report', 'Generating comprehensive vulnerability report...')
            time.sleep(2)
            
            # Get the count of created findings
            findings_count = db.session.query(CVEFinding).filter_by(analysis_id=self.analysis_id).count()
            
            if findings_count > 0:
                report_path = self._generate_report()
                self.emit_progress(95, 'report_generated', 'Report generated successfully')
            else:
                self.emit_progress(95, 'report_generated', 'No vulnerabilities found')
            
            time.sleep(1)
            
            # ========== PHASE 6: Complete ==========
            self._complete_analysis(findings_count, 'Analysis completed successfully')
            
        except Exception as e:
            logger.error(f"Analysis {self.analysis_id} failed: {str(e)}", exc_info=True)
            self._handle_error(str(e))
    
    def _simulate_agent_analysis(self, steps: List[Dict[str, Any]], vulnerabilities: List[Dict[str, Any]]):
        """Simulate agent analysis steps with realistic timing and updates."""
        base_progress = 30
        progress_increment = 60 / len(steps)  # 30% to 90%
        vuln_index = 0
        
        for i, step in enumerate(steps):
            current_progress = int(base_progress + (i * progress_increment))
            
            # Emit tool call
            tool_call_data = {
                'analysis_id': self.analysis_id,
                'action': 'tool_call',
                'tool': step['action'],
                'args': {'query': step['message']},
                'timestamp': datetime.utcnow().isoformat()
            }
            logger.info(f"🔧 Emitting agent_action to room '{self.room}': {step['action']}")
            self.socketio.emit('agent_action', tool_call_data, room=self.room, namespace='/analysis')
            
            logger.info(f"🔧 Agent Step {step['step']}: {step['action']}")
            
            # Update progress
            self.emit_progress(
                current_progress, 
                'agent_analyzing', 
                f"Agent step {step['step']}: {step['message']}"
            )
            
            # Simulate processing time
            time.sleep(step['duration'])
            
            # Emit tool result
            tool_result_data = {
                'analysis_id': self.analysis_id,
                'tool': step['action'],
                'result_preview': step['result'],
                'timestamp': datetime.utcnow().isoformat()
            }
            logger.info(f"✅ Emitting tool_result to room '{self.room}': {step['action']}")
            self.socketio.emit('tool_result', tool_result_data, room=self.room, namespace='/analysis')
            
            logger.info(f"✅ Tool Result: {step['result']}")
            
            # Emit intermediate result when recording a finding
            if step['action'] == 'record_finding' and vuln_index < len(vulnerabilities):
                vuln = vulnerabilities[vuln_index]
                self._create_finding(vuln)
                
                # Emit intermediate result event
                self.socketio.emit('intermediate_result', {
                    'analysis_id': self.analysis_id,
                    'cve_id': vuln['cve_id'],
                    'file_path': vuln['file_path'],
                    'severity': vuln['severity'],
                    'confidence_score': 0.85 + (0.1 * (hash(vuln['cve_id']) % 10) / 10),
                    'timestamp': datetime.utcnow().isoformat()
                }, room=self.room, namespace='/analysis')
                
                logger.info(f"🔍 Vulnerability found: {vuln['cve_id']} - {vuln['severity']}")
                vuln_index += 1
            
            # Small delay between steps
            time.sleep(0.5)
        
        # Emit report generation event
        self.socketio.emit('report_generated', {
            'analysis_id': self.analysis_id,
            'report_type': 'final',
            'timestamp': datetime.utcnow().isoformat()
        }, room=self.room, namespace='/analysis')
    
    def _create_finding(self, vuln: Dict[str, Any]):
        """Create a CVE finding in the database."""
        try:
            # Create code chunk
            code_chunk = CodeChunk(
                analysis_id=self.analysis_id,
                file_path=vuln['file_path'],
                chunk_text=vuln['code_snippet'],
                start_line=vuln['line_number'],
                end_line=vuln['line_number'] + vuln['code_snippet'].count('\n'),
                language='python'
            )
            db.session.add(code_chunk)
            db.session.flush()
            
            # Create CVE finding
            finding = CVEFinding(
                analysis_id=self.analysis_id,
                cve_id=vuln['cve_id'],
                description=vuln['description'],
                severity=vuln['severity'],
                cvss_score=vuln['cvss_score'],
                affected_component=vuln.get('affected_versions', 'Unknown'),
                file_path=vuln['file_path'],
                line_number=vuln['line_number'],
                code_snippet=vuln['code_snippet'],
                mitigation=vuln['mitigation'],
                confidence_score=0.85 + (0.1 * (hash(vuln['cve_id']) % 10) / 10),  # 0.85-0.95
                validation_status='confirmed',
                chunk_id=code_chunk.chunk_id
            )
            db.session.add(finding)
            db.session.commit()
            
            logger.info(f"✅ Created finding: {vuln['cve_id']} - {vuln['severity']}")
            
        except Exception as e:
            logger.error(f"Error creating finding: {str(e)}")
            db.session.rollback()
    
    def _generate_report(self) -> str:
        """Generate PDF report for the analysis."""
        try:
            # Get findings from database
            findings = db.session.query(CVEFinding).filter_by(
                analysis_id=self.analysis_id
            ).all()
            
            if not findings:
                logger.warning("No findings to generate report")
                return None
            
            # Generate PDF
            report_path = self.pdf_generator.generate_report(
                self.analysis_id,
                findings,
                self.analysis.repo_url
            )
            
            # Update analysis with report path
            self.analysis.report_path = report_path
            db.session.commit()
            
            logger.info(f"📄 Generated report: {report_path}")
            return report_path
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            return None
    
    def emit_progress(self, percentage: int, stage: str, message: str):
        """Emit progress update via SocketIO."""
        event_data = {
            'analysis_id': self.analysis_id,
            'progress': percentage,
            'stage': stage,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"📊 Emitting progress_update to room '{self.room}': {percentage}% - {stage}")
        self.socketio.emit('progress_update', event_data, room=self.room, namespace='/analysis')
        logger.info(f"✅ Progress event emitted successfully")
        
        logger.info(f"Analysis {self.analysis_id}: {percentage}% - {stage} - {message}")
    
    def _complete_analysis(self, total_findings: int, message: str):
        """Complete the analysis successfully."""
        db.session.expire_all()
        self.analysis = db.session.query(Analysis).filter_by(analysis_id=self.analysis_id).first()
        
        self.analysis.status = 'completed'
        self.analysis.end_time = datetime.utcnow()
        self.analysis.total_findings = total_findings
        db.session.commit()
        
        duration = (self.analysis.end_time - self.analysis.start_time).total_seconds()
        logger.info(f"✅ Analysis {self.analysis_id} completed in {duration:.1f}s with {total_findings} findings")
        
        self.emit_progress(100, 'completed', message)
        self.socketio.emit('analysis_complete', {
            'analysis_id': self.analysis_id,
            'duration_seconds': int(duration),
            'total_findings': total_findings,
            'message': message
        }, room=self.room, namespace='/analysis')
    
    def _handle_error(self, error_message: str):
        """Handle analysis error."""
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
            'stage': 'analysis'
        }, room=self.room, namespace='/analysis')
