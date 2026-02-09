"""
AI Fix Generation Service - Generates focused code fixes for vulnerabilities.
No fluff, just direct code changes with minimal explanations.
"""
import os
import logging
from typing import Dict, Any, Optional, List, Callable
from langchain_openai import AzureChatOpenAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage

logger = logging.getLogger(__name__)


class AIFixService:
    """Service for generating focused code fixes using Azure OpenAI."""

    def __init__(self):
        """Initialize AI fix service with Azure OpenAI."""
        self.llm = self._init_llm()

    def _init_llm(self):
        """Initialize Azure OpenAI LLM."""
        api_key = os.getenv('AZURE_OPENAI_API_KEY')
        endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4')
        api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview')

        if not api_key or not endpoint:
            raise ValueError("Azure OpenAI credentials not configured")

        return AzureChatOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            deployment_name=deployment,
            api_version=api_version,
            temperature=0.1,
            streaming=True
        )

    def _build_fix_prompt(self, vulnerability: Dict[str, Any], code_context: Dict[str, Any]) -> List:
        """Build a focused prompt for code fix generation."""

        cve_id = vulnerability.get('cve_id', 'Unknown')
        severity = vulnerability.get('severity', 'MEDIUM')
        title = vulnerability.get('title', 'Security vulnerability')
        description = vulnerability.get('description', '')

        file_path = code_context.get('file_path', 'unknown')
        vulnerable_code = code_context.get('vulnerable_code', '')
        line_start = code_context.get('line_start', 0)
        line_end = code_context.get('line_end', 0)
        surrounding_context = code_context.get('surrounding_context', '')

        # Get additional context if available
        imports = code_context.get('imports', [])
        function_context = code_context.get('function_context', '')

        system_prompt = """You are a security-focused code assistant that generates precise code fixes.

Your task: Generate a code fix using the SEARCH/REPLACE block format.

Output format:
<<<SEARCH
original vulnerable code (copy exactly from the input)
>>>
<<<REPLACE
secure fixed code
>>>

Guidelines:
- The vulnerable code is provided below - use it directly
- Generate one fix block with the exact code to search and replace
- Keep the fix minimal and focused on the security issue
- Preserve existing code style and indentation

If additional context would help (like function signatures or imports), output:
<<<NEED_CONTEXT
description of what additional information would be helpful
>>>"""

        # Build comprehensive context
        context_parts = []
        if imports:
            context_parts.append(f"Available imports:\n{chr(10).join(imports[:10])}")
        if surrounding_context:
            context_parts.append(f"Code context:\n{surrounding_context}")
        if function_context:
            context_parts.append(f"Function:\n{function_context}")

        full_context = "\n\n".join(context_parts) if context_parts else "No additional context available"

        user_prompt = f"""Security Vulnerability Details:
- ID: {cve_id}
- Title: {title}
- Severity: {severity}
- File: {file_path} (lines {line_start}-{line_end})

Vulnerable Code:
```
{vulnerable_code}
```

Context:
{full_context}

Generate the fix using <<<SEARCH and <<<REPLACE blocks."""

        return [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

    def generate_fix_stream(
        self,
        vulnerability: Dict[str, Any],
        code_context: Dict[str, Any],
        on_chunk: Callable[[str], None],
        on_complete: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_error: Optional[Callable[[str], None]] = None
    ):
        """
        Generate a code fix with streaming output.

        Args:
            vulnerability: Vulnerability details (cve_id, severity, title, description)
            code_context: Code context (file_path, vulnerable_code, line_start, line_end, surrounding_context)
            on_chunk: Callback for each streamed chunk
            on_complete: Callback when generation is complete with parsed blocks
            on_error: Callback for errors
        """
        try:
            messages = self._build_fix_prompt(vulnerability, code_context)

            full_response = ""

            # Stream the response
            for chunk in self.llm.stream(messages):
                content = chunk.content
                if content:
                    full_response += content
                    on_chunk(content)

            # Parse the response
            parsed = self._parse_fix_response(full_response)

            if on_complete:
                on_complete(parsed)

        except Exception as e:
            logger.error(f"Error generating fix: {str(e)}")
            if on_error:
                on_error(str(e))

    def _parse_fix_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the AI response into structured blocks.

        Returns:
            {
                'type': 'fix' | 'need_context',
                'search_blocks': [...],
                'replace_blocks': [...],
                'context_needed': [...],  # only if type='need_context'
                'raw_response': '...'
            }
        """
        result = {
            'raw_response': response,
            'search_blocks': [],
            'replace_blocks': [],
            'context_needed': [],
            'type': 'fix'
        }

        # Check if AI needs more context
        if '<<<NEED_CONTEXT' in response:
            result['type'] = 'need_context'
            # Extract what context is needed
            context_parts = response.split('<<<NEED_CONTEXT')
            for part in context_parts[1:]:
                if '>>>' in part:
                    needed = part.split('>>>')[0].strip()
                    result['context_needed'].append(needed)
            return result

        # Parse SEARCH/REPLACE blocks
        search_parts = response.split('<<<SEARCH')

        for part in search_parts[1:]:
            if '>>>' in part:
                search_block = part.split('>>>')[0].strip()
                remaining = part.split('>>>')[1]

                # Look for corresponding REPLACE
                if '<<<REPLACE' in remaining:
                    replace_part = remaining.split('<<<REPLACE')[1]
                    if '>>>' in replace_part:
                        replace_block = replace_part.split('>>>')[0].strip()

                        result['search_blocks'].append(search_block)
                        result['replace_blocks'].append(replace_block)

        return result

    def chat_stream(
        self,
        message: str,
        context: Dict[str, Any],
        on_chunk: Callable[[str], None],
        on_complete: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_error: Optional[Callable[[str], None]] = None
    ):
        """
        Stream a chat response for general questions about vulnerabilities.
        Uses a different prompt than fix generation - no SEARCH/REPLACE blocks.

        Args:
            message: The user's question or message
            context: Optional context (vulnerability info, file path, etc.)
            on_chunk: Callback for each streamed chunk
            on_complete: Callback when generation is complete
            on_error: Callback for errors
        """
        try:
            vuln = context.get('vulnerability', {})

            system_prompt = """You are a helpful security assistant. Answer questions about security vulnerabilities,
secure coding practices, and code security clearly and concisely.

Guidelines:
- Provide clear, educational explanations
- Include practical examples when relevant
- Reference CWE/OWASP standards when applicable
- Keep responses focused and actionable"""

            # Build context info if available
            context_info = ""
            if vuln:
                context_info = f"""
Current vulnerability context:
- CWE: {vuln.get('cwe', 'Unknown')}
- Severity: {vuln.get('severity', 'Unknown')}
- Description: {vuln.get('description', 'No description')}
- File: {vuln.get('file_path', context.get('current_file', 'Unknown'))}
"""

            user_prompt = f"""{context_info}
User question: {message}"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            full_response = ""

            # Stream the response
            for chunk in self.llm.stream(messages):
                content = chunk.content
                if content:
                    full_response += content
                    on_chunk(content)

            if on_complete:
                on_complete({'type': 'chat', 'content': full_response})

        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            if on_error:
                on_error(str(e))

    def gather_additional_context(
        self,
        context_needed: List[str],
        repo_path: str,
        file_path: str
    ) -> Dict[str, Any]:
        """
        Auto-gather additional context needed for fix generation.
        Uses file reading and code analysis to fetch required information.

        Args:
            context_needed: List of context requirements from AI
            repo_path: Path to the repository
            file_path: Current file being analyzed

        Returns:
            {
                'imports': [...],
                'function_signatures': [...],
                'dependencies': {...},
                'status': 'context_gathered'
            }
        """
        from app.services.context_agent import ContextAgent

        agent = ContextAgent(repo_path)
        context = agent.gather_context(context_needed, file_path)
        context['status'] = 'context_gathered'

        return context

    def generate_fix_with_auto_context(
        self,
        vulnerability: Dict[str, Any],
        code_context: Dict[str, Any],
        repo_path: str,
        on_chunk: Callable[[str], None],
        on_complete: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_error: Optional[Callable[[str], None]] = None,
        max_iterations: int = 2
    ):
        """
        Generate fix with automatic context gathering if needed.

        Will automatically fetch additional context if AI requests it,
        then regenerate the fix with enhanced context.

        Args:
            vulnerability: Vulnerability details
            code_context: Initial code context
            repo_path: Repository path
            on_chunk: Callback for streamed chunks
            on_complete: Callback on completion
            on_error: Callback on error
            max_iterations: Maximum context-gathering iterations
        """
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Try to generate fix
            try:
                messages = self._build_fix_prompt(vulnerability, code_context)
                full_response = ""

                for chunk in self.llm.stream(messages):
                    content = chunk.content
                    if content:
                        full_response += content
                        on_chunk(content)

                parsed = self._parse_fix_response(full_response)

                # Check if AI needs more context
                if parsed['type'] == 'need_context' and iteration < max_iterations:
                    # Gather the requested context
                    on_chunk(f"\n\n[Gathering additional context...]\n")

                    additional_context = self.gather_additional_context(
                        parsed['context_needed'],
                        repo_path,
                        code_context.get('file_path', '')
                    )

                    # Enhance code_context with gathered information
                    if additional_context.get('imports'):
                        code_context['imports'] = additional_context['imports']
                    if additional_context.get('function_signatures'):
                        code_context['function_context'] = additional_context['function_signatures']
                    if additional_context.get('dependencies'):
                        code_context['dependencies'] = additional_context['dependencies']

                    on_chunk(f"[Context gathered, regenerating fix...]\n\n")

                    # Loop again with enhanced context
                    continue

                # Success - we have a fix
                if on_complete:
                    on_complete(parsed)
                break

            except Exception as e:
                logger.error(f"Error in auto-context fix generation: {str(e)}")
                if on_error:
                    on_error(str(e))
                break
