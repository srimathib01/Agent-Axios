"""
AI Fix Generation Service - Generates focused code fixes for vulnerabilities.
No fluff, just direct code changes with minimal explanations.
"""
import os
import logging
from typing import Dict, Any, Optional, List, Callable
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

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
            temperature=1,
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

CRITICAL OUTPUT FORMAT - you MUST use EXACTLY this format:
<<<SEARCH
original vulnerable code (copy exactly from the input)
>>>
<<<REPLACE
secure fixed code
>>>

RULES:
1. ALWAYS generate a fix. Never refuse or say you need more context.
2. The SEARCH block must contain the EXACT vulnerable code provided below (copy it verbatim).
3. The REPLACE block must contain the secure replacement code.
4. Keep the fix minimal and focused on the security issue.
5. Preserve existing code style and indentation.
6. Do NOT wrap code in markdown fences (no ``` inside the blocks).
7. Do NOT add any text before or after the SEARCH/REPLACE blocks.
8. Generate exactly ONE SEARCH/REPLACE pair."""

        # Build comprehensive context
        context_parts = []
        if imports:
            context_parts.append(f"Available imports:\n{chr(10).join(imports[:10])}")
        if surrounding_context:
            context_parts.append(f"Code context:\n{surrounding_context}")
        if function_context:
            context_parts.append(f"Function:\n{function_context}")

        full_context = "\n\n".join(context_parts) if context_parts else "No additional context available"

        recommendation = vulnerability.get('recommendation', '')

        user_prompt = f"""Security Vulnerability Details:
- ID: {cve_id}
- Title: {title}
- Severity: {severity}
- File: {file_path} (lines {line_start}-{line_end})
{f"- Fix guidance: {recommendation}" if recommendation else ""}

Vulnerable Code (copy this EXACTLY into the <<<SEARCH block):
{vulnerable_code}

{f"Context:{chr(10)}{full_context}" if context_parts else ""}

Now output the fix as <<<SEARCH and <<<REPLACE blocks. Copy the vulnerable code exactly into SEARCH, then write the fixed version in REPLACE."""

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
        import re

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
            context_matches = re.findall(r'<<<NEED_CONTEXT\s*\n([\s\S]*?)\n?>>>', response)
            result['context_needed'] = [m.strip() for m in context_matches]
            # If there are ALSO fix blocks, don't return early - try to parse them too
            if not ('<<<SEARCH' in response):
                return result

        def _clean_block(block: str) -> str:
            block = block.replace('\r\n', '\n')
            block = block.strip('\n')
            fence_match = re.match(r'^```\w*\n([\s\S]*?)\n```$', block)
            if fence_match:
                block = fence_match.group(1)
            return block

        # Strategy 1: Paired SEARCH/REPLACE blocks using regex
        paired_pattern = re.compile(
            r'<<<SEARCH\s*\n([\s\S]*?)\n>>>[\s\n]*<<<REPLACE\s*\n([\s\S]*?)\n>>>',
            re.MULTILINE
        )
        for match in paired_pattern.finditer(response):
            search_block = _clean_block(match.group(1))
            replace_block = _clean_block(match.group(2))
            if search_block:  # Only add non-empty search blocks
                result['search_blocks'].append(search_block)
                result['replace_blocks'].append(replace_block)

        # Strategy 2: If paired didn't work, try extracting separately
        if not result['search_blocks']:
            search_matches = re.findall(r'<<<SEARCH\s*\n([\s\S]*?)\n>>>', response)
            replace_matches = re.findall(r'<<<REPLACE\s*\n([\s\S]*?)\n>>>', response)

            for s in search_matches:
                s = _clean_block(s)
                if s:
                    result['search_blocks'].append(s)
            for r in replace_matches:
                result['replace_blocks'].append(_clean_block(r))

        # Strategy 3: Handle markdown code fences inside blocks
        # AI sometimes wraps code in ```language ... ``` inside the SEARCH/REPLACE
        if not result['search_blocks']:
            # Try with optional code fences
            paired_fence = re.compile(
                r'<<<SEARCH\s*\n```\w*\n([\s\S]*?)\n```\s*\n>>>[\s\n]*<<<REPLACE\s*\n```\w*\n([\s\S]*?)\n```\s*\n>>>',
                re.MULTILINE
            )
            for match in paired_fence.finditer(response):
                search_block = _clean_block(match.group(1))
                replace_block = _clean_block(match.group(2))
                if search_block:
                    result['search_blocks'].append(search_block)
                    result['replace_blocks'].append(replace_block)

        logger.info(f"Parsed fix response: {len(result['search_blocks'])} search blocks, {len(result['replace_blocks'])} replace blocks")
        if not result['search_blocks']:
            logger.warning(f"No blocks parsed from response ({len(response)} chars). First 500 chars: {response[:500]}")

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

            system_prompt = """You are a security-focused code assistant. Be BRIEF and CODE-FOCUSED.

RULES:
1. Give short, direct answers (2-3 sentences max for explanations)
2. Always include code examples when relevant
3. No filler phrases ("Certainly!", "I'd be happy to", "Of course")
4. Reference specific CWE IDs, OWASP categories, and provide actionable fixes
5. If vulnerability context is provided, tailor your answer specifically to that vulnerability
6. When showing code fixes, use the language and framework from the context

BAD: "Certainly! I'd be happy to help you with that SQL injection vulnerability. Let me explain..."
GOOD: "CWE-89 SQL Injection in `user_query()`. Use parameterized queries:\n```python\ncursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))\n```" """

            # Build rich context info from vulnerability data
            context_parts = []
            cwe_id = vuln.get('cwe', '')
            severity = vuln.get('severity', '')
            description = vuln.get('description', '')
            file_path = vuln.get('file_path', context.get('current_file', ''))
            recommendation = vuln.get('recommendation', '')
            code_snippet = vuln.get('codeSnippet', '')
            cwe_name = vuln.get('cweName', '')
            owasp = vuln.get('owasp', '')
            start_line = vuln.get('startLine', '')
            end_line = vuln.get('endLine', '')

            if cwe_id or description:
                context_parts.append("=== VULNERABILITY CONTEXT ===")
                if cwe_id:
                    cwe_label = f"CWE-{cwe_id}" if not str(cwe_id).startswith("CWE-") else cwe_id
                    context_parts.append(f"CWE: {cwe_label}" + (f" ({cwe_name})" if cwe_name else ""))
                if owasp:
                    context_parts.append(f"OWASP: {owasp}")
                if severity:
                    context_parts.append(f"Severity: {severity.upper()}")
                if description:
                    context_parts.append(f"Description: {description}")
                if file_path:
                    loc = f"File: {file_path}"
                    if start_line:
                        loc += f" (lines {start_line}-{end_line})"
                    context_parts.append(loc)
                if recommendation:
                    context_parts.append(f"Recommendation: {recommendation}")
                if code_snippet:
                    context_parts.append(f"Vulnerable code:\n```\n{code_snippet}\n```")

            context_info = "\n".join(context_parts) if context_parts else ""

            if context_info:
                user_prompt = f"""{context_info}

User question: {message}

Answer specifically about the vulnerability above. Include code examples."""
            else:
                user_prompt = f"""User question: {message}

Provide a concise, code-focused answer."""

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
