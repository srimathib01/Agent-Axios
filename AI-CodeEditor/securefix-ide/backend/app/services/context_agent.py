"""
Context Gathering Agent - Automatically fetches code context when AI needs more information.
Navigates through files to find imports, function signatures, dependencies, etc.
"""
import os
import re
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class ContextAgent:
    """Agent that gathers code context automatically."""

    def __init__(self, repo_path: str):
        """
        Initialize context agent.

        Args:
            repo_path: Path to the repository
        """
        self.repo_path = Path(repo_path)

    def gather_context(self, context_requests: List[str], file_path: str) -> Dict[str, Any]:
        """
        Gather requested context from the codebase.

        Args:
            context_requests: List of context needs (e.g., "import statements", "function signature")
            file_path: The file where the vulnerability is

        Returns:
            Dictionary with gathered context
        """
        context = {
            'imports': [],
            'function_signatures': [],
            'class_definitions': [],
            'dependencies': {},
            'related_code': []
        }

        try:
            # Extract file to analyze
            target_file = self.repo_path / file_path

            if not target_file.exists():
                logger.warning(f"File not found: {target_file}")
                return context

            # Read the file
            with open(target_file, 'r', encoding='utf-8', errors='ignore') as f:
                file_content = f.read()

            # Process each context request
            for request in context_requests:
                request_lower = request.lower()

                if 'import' in request_lower:
                    context['imports'] = self._extract_imports(file_content, file_path)

                if 'function' in request_lower or 'signature' in request_lower:
                    context['function_signatures'] = self._extract_functions(file_content)

                if 'class' in request_lower:
                    context['class_definitions'] = self._extract_classes(file_content)

                if 'dependency' in request_lower or 'dependencies' in request_lower:
                    context['dependencies'] = self._find_dependencies(file_path)

                if 'related' in request_lower or 'usage' in request_lower:
                    # Find related code that uses similar patterns
                    context['related_code'] = self._find_related_code(file_path)

        except Exception as e:
            logger.error(f"Error gathering context: {str(e)}")

        return context

    def _extract_imports(self, content: str, file_path: str) -> List[str]:
        """Extract import statements from code."""
        imports = []

        # Detect language
        ext = Path(file_path).suffix

        if ext in ['.py']:
            # Python imports
            import_pattern = r'^(?:from\s+[\w.]+\s+)?import\s+.+$'
            imports = re.findall(import_pattern, content, re.MULTILINE)

        elif ext in ['.js', '.jsx', '.ts', '.tsx']:
            # JavaScript/TypeScript imports
            import_pattern = r'^import\s+.+\s+from\s+[\'"].+[\'"];?$'
            imports = re.findall(import_pattern, content, re.MULTILINE)
            # Also check for require()
            require_pattern = r'(?:const|let|var)\s+\w+\s*=\s*require\([\'"].+[\'"]\)'
            imports.extend(re.findall(require_pattern, content, re.MULTILINE))

        elif ext in ['.java']:
            # Java imports
            import_pattern = r'^import\s+[\w.]+;$'
            imports = re.findall(import_pattern, content, re.MULTILINE)

        elif ext in ['.go']:
            # Go imports
            import_pattern = r'^import\s+(?:\([\s\S]+?\)|".+")'
            imports = re.findall(import_pattern, content, re.MULTILINE)

        return [imp.strip() for imp in imports if imp.strip()]

    def _extract_functions(self, content: str) -> List[Dict[str, str]]:
        """Extract function signatures from code."""
        functions = []

        # Python function pattern
        py_pattern = r'def\s+(\w+)\s*\((.*?)\)\s*(?:->\s*[\w\[\], ]+)?:'
        for match in re.finditer(py_pattern, content):
            functions.append({
                'name': match.group(1),
                'signature': f"def {match.group(1)}({match.group(2)})",
                'line': content[:match.start()].count('\n') + 1
            })

        # JavaScript/TypeScript function pattern
        js_pattern = r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\(.*?\)\s*=>))\s*\((.*?)\)'
        for match in re.finditer(js_pattern, content):
            name = match.group(1) or match.group(2)
            params = match.group(3)
            functions.append({
                'name': name,
                'signature': f"function {name}({params})",
                'line': content[:match.start()].count('\n') + 1
            })

        # Java method pattern
        java_pattern = r'(?:public|private|protected)\s+(?:static\s+)?(?:[\w<>]+)\s+(\w+)\s*\((.*?)\)'
        for match in re.finditer(java_pattern, content):
            functions.append({
                'name': match.group(1),
                'signature': f"{match.group(1)}({match.group(2)})",
                'line': content[:match.start()].count('\n') + 1
            })

        return functions

    def _extract_classes(self, content: str) -> List[Dict[str, str]]:
        """Extract class definitions from code."""
        classes = []

        # Python class pattern
        py_pattern = r'class\s+(\w+)(?:\(.*?\))?:'
        for match in re.finditer(py_pattern, content):
            classes.append({
                'name': match.group(1),
                'line': content[:match.start()].count('\n') + 1
            })

        # JavaScript/TypeScript class pattern
        js_pattern = r'class\s+(\w+)(?:\s+extends\s+\w+)?'
        for match in re.finditer(js_pattern, content):
            classes.append({
                'name': match.group(1),
                'line': content[:match.start()].count('\n') + 1
            })

        # Java class pattern
        java_pattern = r'(?:public|private|protected)?\s+class\s+(\w+)'
        for match in re.finditer(java_pattern, content):
            classes.append({
                'name': match.group(1),
                'line': content[:match.start()].count('\n') + 1
            })

        return classes

    def _find_dependencies(self, file_path: str) -> Dict[str, Any]:
        """Find project dependencies from package files."""
        dependencies = {}

        # Check for common dependency files in repo root
        dep_files = {
            'requirements.txt': 'python',
            'package.json': 'javascript',
            'pom.xml': 'java',
            'go.mod': 'go',
            'Gemfile': 'ruby'
        }

        for dep_file, lang in dep_files.items():
            dep_path = self.repo_path / dep_file
            if dep_path.exists():
                try:
                    with open(dep_path, 'r', encoding='utf-8', errors='ignore') as f:
                        dependencies[lang] = f.read()
                except Exception as e:
                    logger.error(f"Error reading {dep_file}: {str(e)}")

        return dependencies

    def _find_related_code(self, file_path: str) -> List[Dict[str, str]]:
        """Find related code files in the same directory or module."""
        related = []

        try:
            target_file = self.repo_path / file_path
            parent_dir = target_file.parent

            # Find similar files in the same directory
            if parent_dir.exists():
                for sibling_file in parent_dir.glob(f"*{target_file.suffix}"):
                    if sibling_file != target_file:
                        try:
                            # Read first 50 lines for context
                            with open(sibling_file, 'r', encoding='utf-8', errors='ignore') as f:
                                lines = [f.readline() for _ in range(50)]
                                related.append({
                                    'file': str(sibling_file.relative_to(self.repo_path)),
                                    'preview': ''.join(lines)
                                })
                        except Exception as e:
                            logger.error(f"Error reading related file {sibling_file}: {str(e)}")

        except Exception as e:
            logger.error(f"Error finding related code: {str(e)}")

        return related[:5]  # Limit to 5 related files

    def extract_code_block(self, file_path: str, line_start: int, line_end: int, context_lines: int = 10) -> Dict[str, Any]:
        """
        Extract a specific code block with surrounding context.

        Args:
            file_path: File to read
            line_start: Starting line number (1-indexed)
            line_end: Ending line number (1-indexed)
            context_lines: Number of context lines to include before/after

        Returns:
            {
                'vulnerable_code': 'code at specified lines',
                'surrounding_context': 'code with context',
                'full_function': 'entire function if block is inside one',
                'line_start_with_context': int,
                'line_end_with_context': int
            }
        """
        try:
            target_file = self.repo_path / file_path

            if not target_file.exists():
                return {'error': f'File not found: {file_path}'}

            with open(target_file, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()

            # Adjust for 0-indexing
            start_idx = max(0, line_start - 1)
            end_idx = min(len(lines), line_end)

            # Get vulnerable code
            vulnerable_code = ''.join(lines[start_idx:end_idx])

            # Get surrounding context
            context_start = max(0, start_idx - context_lines)
            context_end = min(len(lines), end_idx + context_lines)
            surrounding_context = ''.join(lines[context_start:context_end])

            # Try to extract the full function
            full_function = self._extract_enclosing_function(lines, start_idx)

            return {
                'vulnerable_code': vulnerable_code,
                'surrounding_context': surrounding_context,
                'full_function': full_function,
                'line_start_with_context': context_start + 1,
                'line_end_with_context': context_end,
                'total_lines': len(lines)
            }

        except Exception as e:
            logger.error(f"Error extracting code block: {str(e)}")
            return {'error': str(e)}

    def _extract_enclosing_function(self, lines: List[str], target_line: int) -> Optional[str]:
        """Extract the full function that contains the target line."""
        # Work backwards to find function definition
        func_start = None

        for i in range(target_line, -1, -1):
            line = lines[i].strip()

            # Check for function definition patterns
            if re.match(r'(def|function|public|private|protected)\s+', line):
                func_start = i
                break

        if func_start is None:
            return None

        # Work forwards to find function end (simple heuristic: same or less indentation)
        if func_start < len(lines):
            start_indent = len(lines[func_start]) - len(lines[func_start].lstrip())
            func_end = len(lines)

            for i in range(func_start + 1, len(lines)):
                line = lines[i]
                if line.strip() and not line.startswith(' ' * (start_indent + 1)):
                    # Found a line with same or less indentation (and not empty)
                    if not line.strip().startswith(('#', '//')):  # Ignore comments
                        func_end = i
                        break

            return ''.join(lines[func_start:func_end])

        return None
