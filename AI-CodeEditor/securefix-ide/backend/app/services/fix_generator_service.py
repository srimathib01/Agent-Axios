"""
Fix Generator Service - Core AI Fix Engine

Handles streaming AI fix generation using Azure OpenAI or standard OpenAI.
Integrates with LangChain for structured prompting and token streaming.
"""

import re
import time
import logging
from typing import Dict, Any, Optional, List, AsyncGenerator, Tuple
from datetime import datetime

from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

from config.settings import settings
from .prompt_templates import (
    SYSTEM_PROMPT_FIX_GENERATION,
    SYSTEM_PROMPT_CHAT,
    build_fix_prompt,
    build_chat_context_prompt,
    get_quick_action_prompt
)
from .context_extraction_service import ContextExtractionService, CodeContext

logger = logging.getLogger(__name__)


class FixGeneratorService:
    """
    AI-powered security fix generator with streaming support.

    Features:
    - Streaming token-by-token generation (Cursor-style)
    - Security-focused prompts with CWE/OWASP context
    - Search/replace block parsing for precise code application
    - Support for both Azure OpenAI and standard OpenAI
    """

    def __init__(self):
        """Initialize the fix generator with configured LLM."""
        self.context_extractor = ContextExtractionService(
            context_lines_before=settings.CONTEXT_LINES_BEFORE,
            context_lines_after=settings.CONTEXT_LINES_AFTER
        )
        self.llm = self._create_llm()

    def _create_llm(self):
        """Create the appropriate LLM client based on configuration."""
        if settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT:
            logger.info("Using Azure OpenAI for fix generation")
            return AzureChatOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                deployment_name=settings.AZURE_OPENAI_DEPLOYMENT,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
                streaming=settings.LLM_STREAMING
            )
        elif settings.OPENAI_API_KEY:
            logger.info("Using OpenAI for fix generation")
            return ChatOpenAI(
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
                streaming=settings.LLM_STREAMING
            )
        else:
            logger.warning("No LLM API key configured - fix generation will fail")
            return None

    async def generate_fix_streaming(
        self,
        vulnerability: Dict[str, Any],
        code_context: Dict[str, Any],
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a security fix with streaming response.

        Args:
            vulnerability: Vulnerability information dict with cwe, severity, description
            code_context: Code context dict with file_path, start_line, end_line,
                         vulnerable_code, surrounding_code, imports, framework

        Yields:
            Dict with type='fix_chunk', content=str, done=bool
            On completion: includes search_blocks and replace_blocks
        """
        if not self.llm:
            yield {
                "type": "fix_error",
                "message": "LLM not configured. Please set AZURE_OPENAI_API_KEY or OPENAI_API_KEY.",
                "vulnerability_id": vulnerability.get("id", "unknown")
            }
            return

        start_time = time.time()
        full_content = ""
        prompt_tokens = 0
        completion_tokens = 0

        try:
            # Build the fix generation prompt
            language = code_context.get("language", "python")
            framework = code_context.get("framework")

            user_prompt = build_fix_prompt(
                vulnerability=vulnerability,
                code_context=code_context,
                framework=framework,
                language=language
            )

            messages = [
                SystemMessage(content=SYSTEM_PROMPT_FIX_GENERATION),
                HumanMessage(content=user_prompt)
            ]

            logger.info(f"Starting fix generation for vulnerability: {vulnerability.get('cwe', 'unknown')}")

            # Stream the response
            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, "content") and chunk.content:
                    full_content += chunk.content
                    yield {
                        "type": "fix_chunk",
                        "content": chunk.content,
                        "done": False,
                        "vulnerability_id": vulnerability.get("id", "unknown")
                    }

                # Track token usage if available
                if hasattr(chunk, "usage_metadata") and chunk.usage_metadata:
                    prompt_tokens = chunk.usage_metadata.get("input_tokens", 0)
                    completion_tokens = chunk.usage_metadata.get("output_tokens", 0)

            # Parse search/replace blocks from the complete response
            search_blocks, replace_blocks = self._parse_search_replace_blocks(full_content)

            generation_time_ms = int((time.time() - start_time) * 1000)

            logger.info(
                f"Fix generation completed: {len(search_blocks)} blocks, "
                f"{generation_time_ms}ms, {prompt_tokens}+{completion_tokens} tokens"
            )

            # Send completion message
            yield {
                "type": "fix_chunk",
                "content": "",
                "done": True,
                "vulnerability_id": vulnerability.get("id", "unknown"),
                "full_content": full_content,
                "search_blocks": search_blocks,
                "replace_blocks": replace_blocks,
                "generation_time_ms": generation_time_ms,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens
            }

        except Exception as e:
            logger.error(f"Error during fix generation: {e}", exc_info=True)
            yield {
                "type": "fix_error",
                "message": str(e),
                "vulnerability_id": vulnerability.get("id", "unknown")
            }

    async def generate_fix(
        self,
        vulnerability: Dict[str, Any],
        code_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate a security fix (non-streaming, returns complete result).

        Args:
            vulnerability: Vulnerability information dict
            code_context: Code context dict

        Returns:
            Dict with raw_content, search_blocks, replace_blocks, metadata
        """
        full_content = ""
        result = {}

        async for chunk in self.generate_fix_streaming(vulnerability, code_context):
            if chunk["type"] == "fix_chunk":
                if chunk.get("done"):
                    result = chunk
                else:
                    full_content += chunk.get("content", "")
            elif chunk["type"] == "fix_error":
                raise Exception(chunk["message"])

        return result

    def _parse_search_replace_blocks(self, content: str) -> Tuple[List[str], List[str]]:
        """
        Parse search/replace blocks from LLM output.

        Expected format:
        <<<SEARCH
        original code here
        >>>
        <<<REPLACE
        fixed code here
        >>>

        Returns:
            Tuple of (search_blocks, replace_blocks)
        """
        search_blocks = []
        replace_blocks = []

        # Pattern to match SEARCH/REPLACE blocks
        pattern = r"<<<SEARCH\n([\s\S]*?)\n>>>\n<<<REPLACE\n([\s\S]*?)\n>>>"

        matches = re.findall(pattern, content)
        for search, replace in matches:
            search_blocks.append(search.strip())
            replace_blocks.append(replace.strip())

        # Also try alternative formats
        if not search_blocks:
            # Try ```search and ```replace format
            alt_pattern = r"```search\n([\s\S]*?)\n```\n```replace\n([\s\S]*?)\n```"
            matches = re.findall(alt_pattern, content, re.IGNORECASE)
            for search, replace in matches:
                search_blocks.append(search.strip())
                replace_blocks.append(replace.strip())

        return search_blocks, replace_blocks

    def _check_for_context_request(self, content: str) -> Optional[List[Dict[str, Any]]]:
        """
        Check if the AI is requesting more context.

        The AI may respond with:
        NEED_CONTEXT: function:validate_user, class:UserService, imports, lines:50-70

        Returns:
            List of context requests or None if no request
        """
        # Check for context request pattern
        pattern = r"NEED_CONTEXT:\s*(.+)"
        match = re.search(pattern, content, re.IGNORECASE)

        if not match:
            return None

        requests = []
        request_str = match.group(1).strip()

        for item in request_str.split(","):
            item = item.strip()
            if item.startswith("function:"):
                requests.append({"type": "function", "name": item[9:].strip()})
            elif item.startswith("class:"):
                requests.append({"type": "class", "name": item[6:].strip()})
            elif item == "imports":
                requests.append({"type": "imports"})
            elif item.startswith("lines:"):
                range_str = item[6:].strip()
                if "-" in range_str:
                    start, end = range_str.split("-")
                    requests.append({"type": "lines", "start": int(start), "end": int(end)})
            elif item == "related":
                requests.append({"type": "related_functions"})

        return requests if requests else None

    async def chat_streaming(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a chat response with streaming.

        Args:
            message: User's message
            context: Optional context (vulnerability, current_file, recent_fix)
            history: Optional conversation history

        Yields:
            Dict with type='chat_chunk', content=str, done=bool
        """
        if not self.llm:
            yield {
                "type": "chat_error",
                "message": "LLM not configured."
            }
            return

        try:
            # Build context-aware prompt
            context = context or {}
            user_prompt = build_chat_context_prompt(
                vulnerability=context.get("vulnerability"),
                current_file=context.get("current_file"),
                recent_fix=context.get("recent_fix"),
                user_message=message
            )

            messages = [SystemMessage(content=SYSTEM_PROMPT_CHAT)]

            # Add conversation history
            if history:
                for msg in history[-10:]:  # Keep last 10 messages
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(SystemMessage(content=msg["content"]))

            messages.append(HumanMessage(content=user_prompt))

            full_content = ""
            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, "content") and chunk.content:
                    full_content += chunk.content
                    yield {
                        "type": "chat_chunk",
                        "content": chunk.content,
                        "done": False
                    }

            yield {
                "type": "chat_chunk",
                "content": "",
                "done": True,
                "full_content": full_content
            }

        except Exception as e:
            logger.error(f"Error during chat: {e}", exc_info=True)
            yield {
                "type": "chat_error",
                "message": str(e)
            }

    async def quick_action(
        self,
        action: str,
        vulnerability: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute a quick action (explain, owasp, alternative, test_cases, impact).

        Args:
            action: Action type
            vulnerability: Vulnerability information

        Yields:
            Dict with type='chat_chunk', content=str, done=bool
        """
        if not self.llm:
            yield {
                "type": "chat_error",
                "message": "LLM not configured."
            }
            return

        try:
            prompt = get_quick_action_prompt(action, vulnerability)
            messages = [
                SystemMessage(content=SYSTEM_PROMPT_CHAT),
                HumanMessage(content=prompt)
            ]

            full_content = ""
            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, "content") and chunk.content:
                    full_content += chunk.content
                    yield {
                        "type": "chat_chunk",
                        "content": chunk.content,
                        "done": False
                    }

            yield {
                "type": "chat_chunk",
                "content": "",
                "done": True,
                "full_content": full_content,
                "action": action
            }

        except Exception as e:
            logger.error(f"Error during quick action '{action}': {e}", exc_info=True)
            yield {
                "type": "chat_error",
                "message": str(e)
            }

    def extract_code_context(
        self,
        file_path: str,
        start_line: int,
        end_line: int,
        repo_path: Optional[str] = None
    ) -> CodeContext:
        """
        Extract code context for fix generation.

        Args:
            file_path: Path to the file
            start_line: Starting line number
            end_line: Ending line number
            repo_path: Optional repository root path

        Returns:
            CodeContext object
        """
        return self.context_extractor.extract_context(
            file_path=file_path,
            start_line=start_line,
            end_line=end_line,
            repo_path=repo_path
        )

    def extract_code_context_from_content(
        self,
        content: str,
        file_path: str,
        start_line: int,
        end_line: int
    ) -> CodeContext:
        """
        Extract code context from provided content.

        Args:
            content: Full file content
            file_path: File path for language detection
            start_line: Starting line number
            end_line: Ending line number

        Returns:
            CodeContext object
        """
        return self.context_extractor.extract_context_from_content(
            content=content,
            file_path=file_path,
            start_line=start_line,
            end_line=end_line
        )


# Singleton instance
fix_generator = FixGeneratorService()
