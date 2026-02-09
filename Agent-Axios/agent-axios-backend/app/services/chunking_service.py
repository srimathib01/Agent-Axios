"""Code chunking service - parses files and creates analyzable chunks."""
import os
import ast
import re
from typing import List, Callable, Optional
from langsmith import traceable
from app.models import CodeChunk, db
import logging

logger = logging.getLogger(__name__)

class ChunkingService:
    """Handles parsing and chunking of code files."""
    
    # Supported file extensions
    PYTHON_EXTENSIONS = {'.py'}
    JAVASCRIPT_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx'}
    GENERIC_EXTENSIONS = {'.java', '.cpp', '.c', '.go', '.rb', '.php', '.cs', '.swift', '.rs'}
    
    # Ignored directories
    IGNORED_DIRS = {
        'node_modules', '.git', '__pycache__', '.venv', 'venv', 
        'env', 'dist', 'build', '.next', '.cache', 'coverage',
        '.pytest_cache', '.mypy_cache', 'target'
    }
    
    # Generic chunk settings
    CHUNK_SIZE = 100  # lines per chunk
    CHUNK_OVERLAP = 20  # overlap between chunks
    
    def __init__(self):
        self.files_processed = 0
        self.chunks_created = 0
    
    @traceable(name="process_directory", run_type="tool")
    def process_directory(
        self,
        repo_path: str,
        analysis_id: int,
        max_files: Optional[int] = None,
        max_chunks_per_file: int = 50,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> List[CodeChunk]:
        """
        Process all code files in a directory.
        
        Args:
            repo_path: Path to repository directory
            analysis_id: Analysis ID to associate chunks with
            max_files: Maximum number of files to process (None = unlimited)
            max_chunks_per_file: Maximum chunks per file
            progress_callback: Optional progress callback (current, total)
        
        Returns:
            List[CodeChunk]: Created chunks
        """
        self.files_processed = 0
        self.chunks_created = 0
        
        # Find all code files
        files = self._find_code_files(repo_path)
        
        if max_files:
            files = files[:max_files]
        
        total_files = len(files)
        logger.info(f"Processing {total_files} files for analysis {analysis_id}")
        
        chunks: List[CodeChunk] = []
        
        for i, file_path in enumerate(files):
            try:
                relative_path = os.path.relpath(file_path, repo_path)
                file_chunks = self._process_file(
                    file_path,
                    relative_path,
                    analysis_id,
                    max_chunks_per_file
                )
                
                chunks.extend(file_chunks)
                self.files_processed += 1
                
                if progress_callback:
                    progress_callback(i + 1, total_files)
                    
            except Exception as e:
                logger.warning(f"Failed to process {file_path}: {str(e)}")
                continue
        
        self.chunks_created = len(chunks)
        logger.info(f"Created {self.chunks_created} chunks from {self.files_processed} files")
        
        return chunks
    
    def _find_code_files(self, repo_path: str) -> List[str]:
        """Find all code files in repository."""
        files = []
        
        for root, dirs, filenames in os.walk(repo_path):
            # Remove ignored directories
            dirs[:] = [d for d in dirs if d not in self.IGNORED_DIRS]
            
            for filename in filenames:
                ext = os.path.splitext(filename)[1].lower()
                if ext in (self.PYTHON_EXTENSIONS | self.JAVASCRIPT_EXTENSIONS | self.GENERIC_EXTENSIONS):
                    files.append(os.path.join(root, filename))
        
        return files
    
    def _process_file(
        self,
        file_path: str,
        relative_path: str,
        analysis_id: int,
        max_chunks: int
    ) -> List[CodeChunk]:
        """Process a single file and create chunks."""
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            logger.warning(f"Failed to read {file_path}: {str(e)}")
            return []
        
        # Choose chunking strategy based on file type
        if ext in self.PYTHON_EXTENSIONS:
            chunks = self._chunk_python(content, relative_path, analysis_id)
        elif ext in self.JAVASCRIPT_EXTENSIONS:
            chunks = self._chunk_javascript(content, relative_path, analysis_id)
        else:
            chunks = self._chunk_generic(content, relative_path, analysis_id)
        
        # Limit chunks per file
        if max_chunks is not None and len(chunks) > max_chunks:
            chunks = chunks[:max_chunks]
        
        # Save to database and flush to populate IDs
        for chunk in chunks:
            db.session.add(chunk)

        if chunks:
            db.session.flush()
        
        return chunks
    
    @traceable(name="chunk_python", run_type="tool")
    def _chunk_python(self, content: str, file_path: str, analysis_id: int) -> List[CodeChunk]:
        """Chunk Python files by function/class."""
        chunks = []
        
        try:
            tree = ast.parse(content)
            lines = content.split('\n')
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    start_line = node.lineno
                    end_line = node.end_lineno or start_line
                    
                    # Extract code
                    code = '\n'.join(lines[start_line - 1:end_line])
                    
                    # Create chunk
                    chunk = CodeChunk(
                        analysis_id=analysis_id,
                        file_path=file_path,
                        line_start=start_line,
                        line_end=end_line,
                        chunk_text=code,
                        language='python'
                    )
                    chunks.append(chunk)
                    
        except SyntaxError as e:
            logger.warning(f"Python syntax error in {file_path}: {str(e)}, falling back to generic chunking")
            return self._chunk_generic(content, file_path, analysis_id)
        
        # If no functions/classes found, use generic chunking
        if not chunks:
            return self._chunk_generic(content, file_path, analysis_id)
        
        return chunks
    
    @traceable(name="chunk_javascript", run_type="tool")
    def _chunk_javascript(self, content: str, file_path: str, analysis_id: int) -> List[CodeChunk]:
        """Chunk JavaScript/TypeScript files by function."""
        chunks = []
        lines = content.split('\n')
        
        # Regex patterns for function definitions
        patterns = [
            r'function\s+\w+\s*\(',  # function name()
            r'const\s+\w+\s*=\s*\(',  # const name = ()
            r'let\s+\w+\s*=\s*\(',  # let name = ()
            r'var\s+\w+\s*=\s*\(',  # var name = ()
            r'\w+\s*:\s*function\s*\(',  # name: function()
            r'async\s+function\s+\w+',  # async function
        ]
        
        combined_pattern = '|'.join(patterns)
        
        # Find function start lines
        function_starts = []
        for i, line in enumerate(lines):
            if re.search(combined_pattern, line):
                function_starts.append(i)
        
        # Create chunks between function starts
        for i, start in enumerate(function_starts):
            end = function_starts[i + 1] if i + 1 < len(function_starts) else len(lines)
            
            # Find closing brace
            brace_count = 0
            actual_end = start
            for j in range(start, min(end, len(lines))):
                brace_count += lines[j].count('{') - lines[j].count('}')
                if brace_count == 0 and '{' in lines[j]:
                    actual_end = j + 1
                    break
                if j > start and brace_count == 0:
                    actual_end = j
                    break
            
            code = '\n'.join(lines[start:actual_end])
            
            chunk = CodeChunk(
                analysis_id=analysis_id,
                file_path=file_path,
                line_start=start + 1,
                line_end=actual_end,
                chunk_text=code,
                language='javascript'
            )
            chunks.append(chunk)
        
        # Fallback to generic if no functions found
        if not chunks:
            return self._chunk_generic(content, file_path, analysis_id)
        
        return chunks
    
    @traceable(name="chunk_generic", run_type="tool")
    def _chunk_generic(self, content: str, file_path: str, analysis_id: int) -> List[CodeChunk]:
        """Chunk files by fixed-size windows with overlap."""
        chunks = []
        lines = content.split('\n')
        
        start = 0
        chunk_index = 0
        
        while start < len(lines):
            end = min(start + self.CHUNK_SIZE, len(lines))
            
            code = '\n'.join(lines[start:end])
            
            chunk = CodeChunk(
                analysis_id=analysis_id,
                file_path=file_path,
                line_start=start + 1,
                line_end=end,
                chunk_text=code,
                language='generic'
            )
            chunks.append(chunk)
            
            start += self.CHUNK_SIZE - self.CHUNK_OVERLAP
        
        return chunks
