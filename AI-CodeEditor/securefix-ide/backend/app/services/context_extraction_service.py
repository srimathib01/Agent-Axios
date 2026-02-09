"""
Context Extraction Service for AI Fix Generation

Extracts relevant code context including vulnerable code, surrounding context,
imports, and framework detection to provide comprehensive information for
AI-powered security fix generation.
"""

import os
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class FunctionContext:
    """Context about the function containing vulnerable code."""
    name: str
    start_line: int
    end_line: int
    signature: str
    docstring: Optional[str] = None


@dataclass
class ClassContext:
    """Context about the class containing vulnerable code."""
    name: str
    start_line: int
    end_line: int
    bases: List[str] = field(default_factory=list)


@dataclass
class CodeContext:
    """Complete extracted code context for fix generation."""
    file_path: str
    language: str
    start_line: int
    end_line: int
    vulnerable_code: str
    surrounding_code: str
    imports: List[str]
    framework: Optional[str] = None
    function_context: Optional[FunctionContext] = None
    class_context: Optional[ClassContext] = None
    full_file_content: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API/prompt usage."""
        return {
            "file_path": self.file_path,
            "language": self.language,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "vulnerable_code": self.vulnerable_code,
            "surrounding_code": self.surrounding_code,
            "imports": self.imports,
            "framework": self.framework,
            "function_context": {
                "name": self.function_context.name,
                "signature": self.function_context.signature
            } if self.function_context else None,
            "class_context": {
                "name": self.class_context.name,
                "bases": self.class_context.bases
            } if self.class_context else None
        }


class ContextExtractionService:
    """
    Service for extracting comprehensive code context for AI fix generation.

    Handles:
    - Language detection from file extension
    - Framework detection from imports and patterns
    - Import statement extraction
    - Surrounding code context extraction
    - Function/class context identification
    """

    # File extension to language mapping
    LANGUAGE_MAP = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".jsx": "javascript",
        ".tsx": "typescript",
        ".java": "java",
        ".go": "go",
        ".rb": "ruby",
        ".php": "php",
        ".cs": "csharp",
        ".cpp": "cpp",
        ".c": "c",
        ".rs": "rust",
        ".swift": "swift",
        ".kt": "kotlin",
        ".scala": "scala"
    }

    # Framework detection patterns
    FRAMEWORK_PATTERNS = {
        "python": {
            "django": [
                r"from django",
                r"import django",
                r"from rest_framework",
                r"\.objects\.",
                r"@login_required",
                r"HttpResponse"
            ],
            "flask": [
                r"from flask",
                r"import flask",
                r"Flask\(",
                r"@app\.route",
                r"Blueprint\("
            ],
            "fastapi": [
                r"from fastapi",
                r"import fastapi",
                r"FastAPI\(",
                r"@app\.(get|post|put|delete)",
                r"Depends\("
            ],
            "sqlalchemy": [
                r"from sqlalchemy",
                r"import sqlalchemy",
                r"Column\(",
                r"relationship\(",
                r"Base\.metadata"
            ]
        },
        "javascript": {
            "express": [
                r"require\(['\"]express['\"]\)",
                r"from ['\"]express['\"]",
                r"express\(\)",
                r"app\.(get|post|put|delete|use)\("
            ],
            "react": [
                r"from ['\"]react['\"]",
                r"require\(['\"]react['\"]\)",
                r"useState",
                r"useEffect",
                r"React\.Component"
            ],
            "nextjs": [
                r"from ['\"]next",
                r"getServerSideProps",
                r"getStaticProps",
                r"import.*from ['\"]next/"
            ]
        },
        "typescript": {
            "express": [
                r"from ['\"]express['\"]",
                r"express\(\)",
                r": Request",
                r": Response"
            ],
            "nestjs": [
                r"from ['\"]@nestjs",
                r"@Controller",
                r"@Injectable",
                r"@Module"
            ]
        },
        "java": {
            "spring": [
                r"import org\.springframework",
                r"@Controller",
                r"@RestController",
                r"@Service",
                r"@Autowired",
                r"@RequestMapping"
            ],
            "jakarta": [
                r"import jakarta\.",
                r"import javax\.servlet",
                r"@WebServlet"
            ]
        },
        "go": {
            "gin": [
                r'"github\.com/gin-gonic/gin"',
                r"gin\.Context",
                r"gin\.Engine"
            ],
            "echo": [
                r'"github\.com/labstack/echo"',
                r"echo\.Context"
            ],
            "fiber": [
                r'"github\.com/gofiber/fiber"',
                r"fiber\.Ctx"
            ]
        }
    }

    def __init__(self, context_lines_before: int = 15, context_lines_after: int = 15):
        """
        Initialize the context extraction service.

        Args:
            context_lines_before: Number of lines to include before vulnerable code
            context_lines_after: Number of lines to include after vulnerable code
        """
        self.context_lines_before = context_lines_before
        self.context_lines_after = context_lines_after

    def extract_context(
        self,
        file_path: str,
        start_line: int,
        end_line: int,
        repo_path: Optional[str] = None
    ) -> CodeContext:
        """
        Extract comprehensive code context for fix generation.

        Args:
            file_path: Path to the file containing vulnerable code
            start_line: Starting line number (1-indexed)
            end_line: Ending line number (1-indexed)
            repo_path: Optional repository root path for relative paths

        Returns:
            CodeContext with all extracted information
        """
        # Resolve full path
        if repo_path and not os.path.isabs(file_path):
            full_path = os.path.join(repo_path, file_path)
        else:
            full_path = file_path

        # Read file content
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                lines = content.splitlines()
        except FileNotFoundError:
            logger.error(f"File not found: {full_path}")
            raise ValueError(f"File not found: {file_path}")
        except Exception as e:
            logger.error(f"Error reading file {full_path}: {e}")
            raise

        # Detect language
        language = self._detect_language(file_path)

        # Extract vulnerable code (convert to 0-indexed)
        start_idx = max(0, start_line - 1)
        end_idx = min(len(lines), end_line)
        vulnerable_code = "\n".join(lines[start_idx:end_idx])

        # Extract surrounding context
        context_start = max(0, start_idx - self.context_lines_before)
        context_end = min(len(lines), end_idx + self.context_lines_after)
        surrounding_code = "\n".join(lines[context_start:context_end])

        # Extract imports
        imports = self._extract_imports(content, language)

        # Detect framework
        framework = self._detect_framework(content, language)

        # Extract function/class context
        function_context = self._extract_function_context(lines, start_idx, end_idx, language)
        class_context = self._extract_class_context(lines, start_idx, language)

        return CodeContext(
            file_path=file_path,
            language=language,
            start_line=start_line,
            end_line=end_line,
            vulnerable_code=vulnerable_code,
            surrounding_code=surrounding_code,
            imports=imports,
            framework=framework,
            function_context=function_context,
            class_context=class_context,
            full_file_content=content
        )

    def extract_context_from_content(
        self,
        content: str,
        file_path: str,
        start_line: int,
        end_line: int
    ) -> CodeContext:
        """
        Extract context from provided content (for API use without file access).

        Args:
            content: Full file content
            file_path: File path for language detection
            start_line: Starting line number (1-indexed)
            end_line: Ending line number (1-indexed)

        Returns:
            CodeContext with extracted information
        """
        lines = content.splitlines()
        language = self._detect_language(file_path)

        start_idx = max(0, start_line - 1)
        end_idx = min(len(lines), end_line)
        vulnerable_code = "\n".join(lines[start_idx:end_idx])

        context_start = max(0, start_idx - self.context_lines_before)
        context_end = min(len(lines), end_idx + self.context_lines_after)
        surrounding_code = "\n".join(lines[context_start:context_end])

        imports = self._extract_imports(content, language)
        framework = self._detect_framework(content, language)
        function_context = self._extract_function_context(lines, start_idx, end_idx, language)
        class_context = self._extract_class_context(lines, start_idx, language)

        return CodeContext(
            file_path=file_path,
            language=language,
            start_line=start_line,
            end_line=end_line,
            vulnerable_code=vulnerable_code,
            surrounding_code=surrounding_code,
            imports=imports,
            framework=framework,
            function_context=function_context,
            class_context=class_context,
            full_file_content=content
        )

    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension."""
        ext = os.path.splitext(file_path)[1].lower()
        return self.LANGUAGE_MAP.get(ext, "unknown")

    def _detect_framework(self, content: str, language: str) -> Optional[str]:
        """Detect framework from code patterns."""
        if language not in self.FRAMEWORK_PATTERNS:
            return None

        framework_patterns = self.FRAMEWORK_PATTERNS[language]

        for framework, patterns in framework_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content):
                    return framework

        return None

    def _extract_imports(self, content: str, language: str) -> List[str]:
        """Extract import statements based on language."""
        imports = []

        if language == "python":
            # Match 'import x' and 'from x import y'
            import_pattern = r"^(?:from\s+[\w.]+\s+)?import\s+.+$"
            imports = re.findall(import_pattern, content, re.MULTILINE)

        elif language in ("javascript", "typescript"):
            # Match 'import ... from ...' and 'require(...)'
            es6_pattern = r"^import\s+.+\s+from\s+['\"].+['\"];?$"
            require_pattern = r"(?:const|let|var)\s+\w+\s*=\s*require\(['\"].+['\"]\);?"
            imports = re.findall(es6_pattern, content, re.MULTILINE)
            imports += re.findall(require_pattern, content)

        elif language == "java":
            import_pattern = r"^import\s+[\w.]+;$"
            imports = re.findall(import_pattern, content, re.MULTILINE)

        elif language == "go":
            # Match single imports and import blocks
            single_pattern = r'^import\s+"[^"]+"$'
            imports = re.findall(single_pattern, content, re.MULTILINE)
            # Also match import block
            block_match = re.search(r'import\s*\(\s*((?:"[^"]+"\s*)+)\)', content)
            if block_match:
                imports += re.findall(r'"[^"]+"', block_match.group(1))

        elif language == "csharp":
            import_pattern = r"^using\s+[\w.]+;$"
            imports = re.findall(import_pattern, content, re.MULTILINE)

        return imports[:50]  # Limit to 50 imports

    def _extract_function_context(
        self,
        lines: List[str],
        start_idx: int,
        end_idx: int,
        language: str
    ) -> Optional[FunctionContext]:
        """Extract the function containing the vulnerable code."""
        # Look backwards for function definition
        function_patterns = {
            "python": r"^\s*(?:async\s+)?def\s+(\w+)\s*\([^)]*\)\s*(?:->.*)?:",
            "javascript": r"(?:async\s+)?function\s+(\w+)\s*\([^)]*\)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)",
            "typescript": r"(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)",
            "java": r"(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+)?\s*\{",
            "go": r"^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\([^)]*\)",
            "csharp": r"(?:public|private|protected|internal)?\s*(?:static)?\s*(?:async)?\s*\w+\s+(\w+)\s*\([^)]*\)"
        }

        pattern = function_patterns.get(language)
        if not pattern:
            return None

        for i in range(start_idx, -1, -1):
            line = lines[i]
            match = re.search(pattern, line)
            if match:
                func_name = next((g for g in match.groups() if g), "unknown")
                # Find function end (simplified - looks for same or lower indentation)
                func_end = self._find_block_end(lines, i, language)
                return FunctionContext(
                    name=func_name,
                    start_line=i + 1,
                    end_line=func_end + 1,
                    signature=line.strip()
                )

        return None

    def _extract_class_context(
        self,
        lines: List[str],
        start_idx: int,
        language: str
    ) -> Optional[ClassContext]:
        """Extract the class containing the vulnerable code."""
        class_patterns = {
            "python": r"^\s*class\s+(\w+)\s*(?:\(([^)]*)\))?:",
            "javascript": r"class\s+(\w+)(?:\s+extends\s+(\w+))?",
            "typescript": r"class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+[\w,\s]+)?",
            "java": r"(?:public|private)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+[\w,\s]+)?",
            "csharp": r"(?:public|private|internal)?\s*(?:partial)?\s*class\s+(\w+)(?:\s*:\s*([\w,\s]+))?"
        }

        pattern = class_patterns.get(language)
        if not pattern:
            return None

        for i in range(start_idx, -1, -1):
            line = lines[i]
            match = re.search(pattern, line)
            if match:
                class_name = match.group(1)
                bases = []
                if match.lastindex >= 2 and match.group(2):
                    bases = [b.strip() for b in match.group(2).split(",")]
                class_end = self._find_block_end(lines, i, language)
                return ClassContext(
                    name=class_name,
                    start_line=i + 1,
                    end_line=class_end + 1,
                    bases=bases
                )

        return None

    def _find_block_end(self, lines: List[str], start_idx: int, language: str) -> int:
        """Find the end of a code block (function/class)."""
        if language == "python":
            # Python uses indentation
            start_indent = len(lines[start_idx]) - len(lines[start_idx].lstrip())
            for i in range(start_idx + 1, len(lines)):
                line = lines[i]
                if line.strip():  # Non-empty line
                    current_indent = len(line) - len(line.lstrip())
                    if current_indent <= start_indent:
                        return i - 1
            return len(lines) - 1
        else:
            # Brace-based languages - count braces
            brace_count = 0
            started = False
            for i in range(start_idx, len(lines)):
                line = lines[i]
                brace_count += line.count("{") - line.count("}")
                if "{" in line:
                    started = True
                if started and brace_count <= 0:
                    return i
            return len(lines) - 1


    def fetch_additional_context(
        self,
        file_path: str,
        requests: List[Dict[str, Any]],
        repo_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch additional context based on AI requests.

        This is called when the AI needs more information to generate a fix.

        Args:
            file_path: Path to the file
            requests: List of context requests, each with 'type' and params
                      Types: 'function', 'class', 'imports', 'file', 'lines'
            repo_path: Optional repository root path

        Returns:
            Dictionary with requested context
        """
        result = {}

        # Resolve path
        if repo_path and not os.path.isabs(file_path):
            full_path = os.path.join(repo_path, file_path)
        else:
            full_path = file_path

        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                lines = content.splitlines()
        except Exception as e:
            logger.error(f"Cannot read file for additional context: {e}")
            return {"error": str(e)}

        language = self._detect_language(file_path)

        for req in requests:
            req_type = req.get("type", "")

            if req_type == "function":
                # Fetch a specific function by name
                func_name = req.get("name", "")
                func_code = self._extract_function_by_name(lines, func_name, language)
                if func_code:
                    result[f"function_{func_name}"] = func_code

            elif req_type == "class":
                # Fetch a specific class by name
                class_name = req.get("name", "")
                class_code = self._extract_class_by_name(lines, class_name, language)
                if class_code:
                    result[f"class_{class_name}"] = class_code

            elif req_type == "imports":
                # Fetch all imports
                result["imports"] = self._extract_imports(content, language)

            elif req_type == "file":
                # Fetch entire file (limited)
                result["full_file"] = content[:10000]  # Limit to 10k chars

            elif req_type == "lines":
                # Fetch specific line range
                start = req.get("start", 1) - 1
                end = req.get("end", start + 20)
                result[f"lines_{start+1}_{end}"] = "\n".join(lines[start:end])

            elif req_type == "related_functions":
                # Find functions that call or are called by the vulnerable code
                vuln_code = req.get("code", "")
                related = self._find_related_functions(lines, vuln_code, language)
                result["related_functions"] = related

        return result

    def _extract_function_by_name(
        self,
        lines: List[str],
        func_name: str,
        language: str
    ) -> Optional[str]:
        """Extract a function's complete code by its name."""
        patterns = {
            "python": rf"^\s*(?:async\s+)?def\s+{func_name}\s*\(",
            "javascript": rf"(?:async\s+)?function\s+{func_name}\s*\(|(?:const|let|var)\s+{func_name}\s*=",
            "typescript": rf"(?:async\s+)?function\s+{func_name}|(?:const|let)\s+{func_name}\s*(?::\s*\w+)?\s*=",
            "java": rf"(?:public|private|protected)?\s*(?:static)?\s*\w+\s+{func_name}\s*\(",
            "go": rf"^func\s+(?:\([^)]+\)\s+)?{func_name}\s*\(",
        }

        pattern = patterns.get(language)
        if not pattern:
            return None

        for i, line in enumerate(lines):
            if re.search(pattern, line):
                end_idx = self._find_block_end(lines, i, language)
                return "\n".join(lines[i:end_idx+1])

        return None

    def _extract_class_by_name(
        self,
        lines: List[str],
        class_name: str,
        language: str
    ) -> Optional[str]:
        """Extract a class's complete code by its name."""
        patterns = {
            "python": rf"^\s*class\s+{class_name}\s*[:\(]",
            "javascript": rf"class\s+{class_name}\s",
            "typescript": rf"class\s+{class_name}\s",
            "java": rf"class\s+{class_name}\s",
        }

        pattern = patterns.get(language)
        if not pattern:
            return None

        for i, line in enumerate(lines):
            if re.search(pattern, line):
                end_idx = self._find_block_end(lines, i, language)
                return "\n".join(lines[i:end_idx+1])

        return None

    def _find_related_functions(
        self,
        lines: List[str],
        vuln_code: str,
        language: str
    ) -> List[str]:
        """Find functions that might be related to the vulnerable code."""
        related = []

        # Extract function calls from vulnerable code
        if language == "python":
            calls = re.findall(r'(\w+)\s*\(', vuln_code)
        else:
            calls = re.findall(r'(\w+)\s*\(', vuln_code)

        # Look for those function definitions
        for func_name in calls:
            if func_name in ('print', 'str', 'int', 'len', 'range', 'if', 'for', 'while'):
                continue
            func_code = self._extract_function_by_name(lines, func_name, language)
            if func_code and len(func_code) < 2000:
                related.append(func_code)

        return related[:5]  # Limit to 5 related functions


# Singleton instance for convenience
context_extractor = ContextExtractionService()
