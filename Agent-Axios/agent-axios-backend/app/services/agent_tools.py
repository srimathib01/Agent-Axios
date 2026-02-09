"""Agent tools for autonomous vulnerability detection using LangGraph."""
import os
import logging
import faiss
import numpy as np
from typing import Dict, Any, List, Optional
from langchain_core.tools import tool

# Import services FIRST before modifying sys.path to avoid conflicts
from app.services.codebase_indexing_service import CodebaseIndexingService
from app.services.validation_service import ValidationService
from app.services.retrieval_service import CVERetrievalService
from app.services.caching_service import IndexCache
from app.models import db, CVEFinding
from config.settings import Config

# structure_mapper is an OPTIONAL external utility, not a PyPI package
# It's used for advanced repo analysis but has a fallback implementation
STRUCTURE_MAPPER_AVAILABLE = False

logger = logging.getLogger(__name__)

# Global context for current analysis
_current_analysis_id = None
_current_repo_path = None
_current_repo_url = None

def set_analysis_context(analysis_id: int):
    """Set the current analysis ID for tool context"""
    global _current_analysis_id
    _current_analysis_id = analysis_id
    logger.info(f"Set analysis context to ID: {analysis_id}")

def get_analysis_context() -> Optional[int]:
    """Get the current analysis ID"""
    return _current_analysis_id

def set_repo_path(repo_path: str):
    """Set the current repository path for tool context"""
    global _current_repo_path
    _current_repo_path = repo_path
    logger.info(f"Set repository path context to: {repo_path}")

def get_repo_path() -> Optional[str]:
    """Get the current repository path"""
    return _current_repo_path

def set_repo_url(repo_url: str):
    """Set the current repository URL for cache lookups"""
    global _current_repo_url
    _current_repo_url = repo_url
    logger.info(f"Set repository URL context to: {repo_url}")

def get_repo_url() -> Optional[str]:
    """Get the current repository URL"""
    return _current_repo_url

def _resolve_path(file_path: str) -> str:
    """Resolve file path relative to the current repository path if set"""
    repo_path = get_repo_path()
    if repo_path and not os.path.isabs(file_path):
        return os.path.join(repo_path, file_path)
    return file_path

# CVE retrieval is now always available since it's in app.services
CVE_RETRIEVAL_AVAILABLE = True
CVE_IMPORT_ERROR: Optional[str] = None

# Global CVE retrieval service instance (initialized lazily)
_cve_retrieval_service = None

def get_cve_retrieval_service():
    """Get or initialize the CVE retrieval service."""
    global _cve_retrieval_service, CVE_IMPORT_ERROR
    
    if _cve_retrieval_service is None:
        try:
            logger.info("Initializing CVE Retrieval Service...")
            _cve_retrieval_service = CVERetrievalService()
            
            success = _cve_retrieval_service.initialize()
            
            if success:
                logger.info("CVE Retrieval Service initialized successfully")
                CVE_IMPORT_ERROR = None
            else:
                logger.error("CVE Retrieval Service initialization failed")
                CVE_IMPORT_ERROR = "Initialization failed"
                return None
        except Exception as e:
            logger.error(f"Error initializing CVE Retrieval Service: {e}")
            CVE_IMPORT_ERROR = str(e)
            return None
    
    return _cve_retrieval_service


def check_cve_service_health() -> Dict[str, Any]:
    """
    Check if CVE retrieval service is available and healthy.
    
    Returns:
        Dictionary with health status, error details, and recommendations
    """
    service = get_cve_retrieval_service()
    
    if service is None:
        return {
            "available": False,
            "error": "CVE retrieval service failed to initialize",
            "details": {
                "service_url": Config.CVE_SERVICE_BASE_URL,
                "network": "unreachable, verify VPN/Firewall"
            },
            "recommendations": [
                "Ensure the FAISS CVE Storage API is running and reachable",
                "Update CVE_SERVICE_BASE_URL if the endpoint has changed",
                "Check backend logs for detailed error messages"
            ]
        }
    
    # Service initialized, check if it's functional
    try:
        # Try a simple test search
        test_results = service.search_by_text("test", limit=1)
        return {
            "available": True,
            "functional": True,
            "message": "CVE retrieval service is healthy"
        }
    except Exception as e:
        return {
            "available": True,
            "functional": False,
            "error": f"Service initialized but not functional: {str(e)}",
            "recommendations": [
                "Check FAISS service status",
                "Verify API quotas and rate limits"
            ]
        }


@tool
def analyze_repository_structure(repo_path: str) -> Dict[str, Any]:
    """
    Analyze the structure of a repository to identify key components, technologies, and entry points.
    
    Args:
        repo_path: Path to the cloned repository
        
    Returns:
        Dictionary containing repository structure analysis with technologies, file types, and key files
    """
    try:
        # Resolve path relative to repo_path if set
        original_path = repo_path
        repo_path = _resolve_path(repo_path)
        
        logger.info(f"Analyzing repository structure at: {repo_path} (original: {original_path})")
        
        if not os.path.exists(repo_path):
            return {"error": f"Repository path does not exist: {original_path}", "success": False}
        
        # Check cache first for faster repeated analysis
        from app.services.caching_service import get_cache_manager
        cache_manager = get_cache_manager()
        
        # Try to get commit hash for caching
        commit_hash = None
        try:
            import git
            git_repo = git.Repo(repo_path)
            commit_hash = git_repo.head.commit.hexsha
        except:
            pass
        
        # Check if we have cached analysis
        cached_analysis = cache_manager.repo_cache.get(original_path, commit_hash, max_age_hours=24)
        if cached_analysis:
            logger.info(f"✓ Using cached repository analysis")
            return {"success": True, "analysis": cached_analysis.get('analysis', cached_analysis)}
        
        # Perform fresh analysis - use basic directory scan (structure_mapper is optional external tool)
        logger.info("Performing fresh repository analysis...")
        files = []
        languages = {}
        frameworks = []
        important_dirs = {}
        
        for root, dirs, filenames in os.walk(repo_path):
            # Skip hidden and common ignore directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__', 'dist', 'build']]
            
            for filename in filenames:
                if not filename.startswith('.'):
                    ext = os.path.splitext(filename)[1]
                    if ext:
                        languages[ext] = languages.get(ext, 0) + 1
                    files.append(os.path.join(root, filename))
                    
                    # Detect frameworks by config files
                    if filename in ['package.json', 'requirements.txt', 'Gemfile', 'pom.xml', 'build.gradle', 'Cargo.toml']:
                        framework_type = {
                            'package.json': 'Node.js/JavaScript',
                            'requirements.txt': 'Python',
                            'Gemfile': 'Ruby',
                            'pom.xml': 'Java/Maven',
                            'build.gradle': 'Java/Gradle',
                            'Cargo.toml': 'Rust'
                        }.get(filename, 'Unknown')
                        if framework_type not in frameworks:
                            frameworks.append(framework_type)
        
        result = {
            'total_files': len(files),
            'languages': languages,
            'important_directories': important_dirs,
            'frameworks_detected': frameworks
        }
        
        # Cache the result
        cache_manager.repo_cache.set(original_path, result, commit_hash)
        
        logger.info(f"✓ Repository analysis complete: {len(files)} files analyzed, cached for future use")
        return {"success": True, "analysis": result}
        
    except Exception as e:
        logger.error(f"✗ Error analyzing repository: {e}")
        return {"error": str(e), "success": False}


@tool
def read_file_content(file_path: str, max_lines: int = 500) -> Dict[str, Any]:
    """
    Read the content of a specific file in the repository.
    
    Args:
        file_path: Path to the file to read
        max_lines: Maximum number of lines to read (default: 500)
        
    Returns:
        Dictionary containing file content and metadata
    """
    try:
        # Resolve path relative to repo_path if set
        original_path = file_path
        file_path = _resolve_path(file_path)
        
        logger.info(f"Reading file: {file_path} (original: {original_path})")
        
        if not os.path.exists(file_path):
            return {"error": f"File does not exist: {original_path}", "success": False}
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()[:max_lines]
            content = ''.join(lines)
        
        logger.info(f"✓ Read {len(lines)} lines from {os.path.basename(file_path)}")
        return {
            "success": True,
            "file_path": original_path,  # Return original path to keep context clear for agent
            "content": content,
            "lines_read": len(lines),
            "truncated": len(lines) == max_lines
        }
        
    except Exception as e:
        logger.error(f"✗ Error reading file {file_path}: {e}")
        return {"error": str(e), "success": False}


@tool
def list_directory_contents(directory_path: str, recursive: bool = False, max_depth: int = 2) -> Dict[str, Any]:
    """
    List files and directories in a given path.
    
    Args:
        directory_path: Path to the directory
        recursive: Whether to list recursively (default: False)
        max_depth: Maximum recursion depth if recursive=True (default: 2)
        
    Returns:
        Dictionary containing list of files and directories
    """
    try:
        # Resolve path relative to repo_path if set
        original_path = directory_path
        directory_path = _resolve_path(directory_path)
        
        logger.info(f"Listing directory: {directory_path} (original: {original_path}, recursive={recursive})")
        
        if not os.path.exists(directory_path):
            return {"error": f"Directory does not exist: {original_path}", "success": False}
        
        if not os.path.isdir(directory_path):
            return {"error": f"Path is not a directory: {original_path}", "success": False}
        
        items = {"files": [], "directories": []}
        
        if recursive:
            for root, dirs, files in os.walk(directory_path):
                # Calculate depth relative to the resolved directory_path
                rel_root = os.path.relpath(root, directory_path)
                if rel_root == '.':
                    depth = 0
                else:
                    depth = rel_root.count(os.sep) + 1
                
                if depth >= max_depth:
                    dirs[:] = []  # Don't recurse deeper
                    continue
                
                for file in files:
                    # Return paths relative to the original request if possible, or just relative to repo root
                    # But to be safe and consistent with how agent sees it, let's return relative paths from the listed dir
                    # actually, let's return paths relative to the repo root if we can
                    
                    abs_path = os.path.join(root, file)
                    # If we have a repo path, try to make it relative to that
                    repo_path = get_repo_path()
                    if repo_path and abs_path.startswith(repo_path):
                        display_path = os.path.relpath(abs_path, repo_path)
                    else:
                        display_path = abs_path
                        
                    items["files"].append(display_path)
                    
                for dir in dirs:
                    abs_path = os.path.join(root, dir)
                    repo_path = get_repo_path()
                    if repo_path and abs_path.startswith(repo_path):
                        display_path = os.path.relpath(abs_path, repo_path)
                    else:
                        display_path = abs_path
                        
                    items["directories"].append(display_path)
        else:
            for item in os.listdir(directory_path):
                full_path = os.path.join(directory_path, item)
                
                # Format for display
                repo_path = get_repo_path()
                if repo_path and full_path.startswith(repo_path):
                    display_path = os.path.relpath(full_path, repo_path)
                else:
                    display_path = full_path
                
                if os.path.isfile(full_path):
                    items["files"].append(display_path)
                else:
                    items["directories"].append(display_path)
        
        logger.info(f"✓ Found {len(items['files'])} files and {len(items['directories'])} directories")
        return {"success": True, **items, "total_files": len(items['files']), "total_dirs": len(items['directories'])}
        
    except Exception as e:
        logger.error(f"✗ Error listing directory {directory_path}: {e}")
        return {"error": str(e), "success": False}


@tool
def search_codebase_semantically(query: str, top_k: int = 10) -> Dict[str, Any]:
    """
    Perform semantic search across the codebase using FAISS with Cohere embeddings.
    
    Args:
        query: Natural language query describing what code to find
        top_k: Number of top results to return (default: 10)
        
    Returns:
        Dictionary containing search results with file paths and similarity scores
    """
    try:
        # Get analysis_id and repo_url from context
        analysis_id = get_analysis_context()
        repo_url = get_repo_url()
        
        if analysis_id is None:
            logger.error("✗ No analysis context set - cannot determine FAISS index path")
            return {"error": "Analysis context not set", "success": False, "results": []}
        
        logger.info(f"=" * 80)
        logger.info(f"🔍 SEMANTIC SEARCH REQUEST")
        logger.info(f"   Query: '{query[:100]}...'")
        logger.info(f"   Analysis ID: {analysis_id}")
        logger.info(f"   Top K: {top_k}")
        
        # Use IndexCache to get the actual index path (may be cached)
        index_cache = IndexCache()
        cached_info = index_cache.get_cached_index(repo_url) if repo_url else None
        
        if cached_info:
            index_file = cached_info['index_path']
            logger.info(f"   Using cached index: {index_file}")
        else:
            # Fallback to old path pattern if no cache info
            index_dir = os.path.join(Config.FAISS_INDEX_DIR, f"analysis_{analysis_id}")
            index_file = os.path.join(index_dir, "codebase_index.faiss")
            logger.info(f"   Using analysis-specific index: {index_file}")
        
        logger.info(f"=" * 80)
        
        if not os.path.exists(index_file):
            logger.error(f"✗ FAISS index file not found: {index_file}")
            return {"error": f"Index file not found: {index_file}", "success": False, "results": []}
        
        # Use CodebaseIndexingService with Cohere embeddings (1024-dim)
        indexing_service = CodebaseIndexingService(index_path=index_file)
        
        # Load the index first
        if not indexing_service.load_index():
            logger.error(f"✗ Failed to load FAISS index from: {index_file}")
            return {"error": f"Could not load index from {index_file}", "success": False, "results": []}
        
        logger.info(f"✓ FAISS index loaded: {indexing_service.index.ntotal} vectors")
        
        # Search WITHOUT index_path parameter (already loaded)
        results = indexing_service.search(
            query=query,
            top_k=top_k,
            similarity_threshold=0.3  # Lower threshold to get more results
        )
        
        # Handle both field names (chunk_text and chunk_snippet)
        for result in results:
            if 'chunk_snippet' in result and 'chunk_text' not in result:
                result['chunk_text'] = result['chunk_snippet']
            elif 'chunk_text' in result and 'chunk_snippet' not in result:
                result['chunk_snippet'] = result['chunk_text']
        
        logger.info(f"✓ Found {len(results)} semantic matches (threshold: 0.3)")
        if results:
            logger.info(f"   Top match: {results[0].get('file_path', 'N/A')} (score: {results[0].get('similarity_score', 0):.3f})")
        logger.info(f"=" * 80)
        
        return {"success": True, "results": results, "total_found": len(results)}
        
    except Exception as e:
        logger.error(f"✗ ERROR in semantic search: {e}", exc_info=True)
        logger.info(f"=" * 80)
        return {"error": str(e), "success": False, "results": []}


@tool
def search_cve_database(query: str, limit: int = 10, min_cvss: float = 0.0, expand_query: bool = False) -> Dict[str, Any]:
    """
    Search the CVE vulnerability database using the external FAISS CVE Storage API.
    Queries are answered by Cohere embeddings served from http://140.238.227.29:5000.
    
    Args:
        query: Text description of vulnerability to search for
        limit: Maximum number of CVEs to return (default: 10)
        min_cvss: Minimum CVSS score to filter by (default: 0.0)
        expand_query: Whether to expand query with related terms (default: False)
        
    Returns:
        Dictionary containing matching CVEs with details and similarity scores
    """
    try:
        logger.info(f"=" * 80)
        logger.warning(f"🔍 CVE DATABASE SEARCH REQUEST")
        logger.warning(f"   Query: '{query[:100]}...'")
        logger.warning(f"   Limit: {limit}, Min CVSS: {min_cvss}, Expand: {expand_query}")
        logger.info(f"   Using external FAISS CVE service at {Config.CVE_SERVICE_BASE_URL}")
        logger.info(f"=" * 80)
        
        # Get the CVE retrieval service
        service = get_cve_retrieval_service()
        
        if service is None:
            logger.error("✗ CVE Retrieval Service not available!")
            logger.error("   Check: service URL, network connectivity, remote API status")
            logger.info(f"=" * 80)
            return {
                "error": "CVE Retrieval Service not initialized. Check CVE service configuration.",
                "success": False,
                "results": [],
                "cves": []
            }
        
        logger.info(f"✓ CVE Retrieval Service initialized")
        logger.info("   Calling search_by_text via FAISS CVE Storage API...")
        
        # Use the working retrieval service backed by FAISS + Cohere embeddings
        result = service.search_by_text(
            query=query,
            limit=limit,
            similarity_threshold=-10.0,  # Disabled threshold to accept all results (even with negative scores from L2 distance)
            include_scores=True,
            expand_query=expand_query
        )
        
        logger.info(f"   Search completed. Checking results...")
        
        if "error" in result:
            logger.error(f"✗ CVE search returned error: {result['error']}")
            logger.info(f"=" * 80)
            return {"error": result["error"], "success": False, "results": [], "cves": []}
        
        # Extract CVEs from result
        cves = result.get("results") or result.get("data") or []
        logger.info(f"✓ Retrieved {len(cves)} CVEs from FAISS DB")
        
        # Filter by CVSS score if specified
        if min_cvss > 0.0:
            original_count = len(cves)
            cves = [cve for cve in cves if cve.get("cvss_score", 0.0) >= min_cvss]
            logger.info(f"   Filtered by CVSS >= {min_cvss}: {original_count} → {len(cves)} CVEs")
        
        logger.info(f"✓ FINAL RESULT: {len(cves)} CVEs matching all criteria")
        
        # Log sample results for debugging
        if cves:
            sample = cves[0]
            logger.info(f"   Sample CVE: {sample.get('cve_id', 'N/A')}")
            logger.info(f"   CVSS: {sample.get('cvss_score', 'N/A')}")
            logger.info(f"   Score: {sample.get('score', 'N/A')}")
            logger.info(f"   Summary: {sample.get('summary', 'N/A')[:100]}...")
        else:
            logger.warning(f"⚠️  NO CVEs FOUND for query: '{query}'")
            logger.warning(f"   This might indicate:")
            logger.warning(f"   1. Query too specific")
            logger.warning(f"   2. FAISS index empty or service returned no matches")
            logger.warning(f"   3. Embedding generation issue")
        
        logger.info(f"=" * 80)
        
        return {
            "success": True,
            "results": cves,
            "cves": cves,  # Include both for compatibility
            "total_found": len(cves),
            "query": query
        }
        
    except Exception as e:
        logger.error(f"✗ CRITICAL ERROR in CVE search: {e}", exc_info=True)
        logger.info(f"=" * 80)
        return {"error": str(e), "success": False, "results": [], "cves": []}


@tool
def validate_vulnerability_match(
    cve_id: str, 
    cve_description: str, 
    code_snippet: str,
    file_path: str
) -> Dict[str, Any]:
    """
    Use GPT-4.1 to validate whether a code snippet is actually vulnerable to a specific CVE.
    
    Args:
        cve_id: CVE identifier
        cve_description: Description of the vulnerability
        code_snippet: Code to analyze for vulnerability
        file_path: Path to the file containing the code
        
    Returns:
        Dictionary with validation result (is_vulnerable, confidence, reasoning)
    """
    try:
        logger.info(f"Validating {cve_id} against {file_path}")
        
        # Use ValidationService which has GPT-4.1 integration
        validation_service = ValidationService()
        result = validation_service.validate_cve_match(
            cve_id=cve_id,
            cve_description=cve_description,
            code_snippet=code_snippet,
            file_path=file_path
        )
        
        logger.info(f"✓ Validation complete: {result.get('is_vulnerable', False)} (confidence: {result.get('confidence', 0.0):.2f})")
        return {"success": True, **result}
        
    except Exception as e:
        logger.error(f"✗ Error validating vulnerability: {e}")
        return {"error": str(e), "success": False, "is_vulnerable": False, "confidence": 0.0}


@tool
def record_finding(
    cve_id: str,
    file_path: str,
    severity: str,
    confidence_score: float,
    description: str,
    validation_explanation: str = ""
) -> str:
    """
    Record a confirmed vulnerability finding in the database.
    Call this tool when you have validated a vulnerability.
    """
    try:
        analysis_id = get_analysis_context()
        if not analysis_id:
            return "Error: No analysis context active"
            
        finding = CVEFinding(
            analysis_id=analysis_id,
            cve_id=cve_id,
            file_path=file_path,
            severity=severity,
            confidence_score=confidence_score,
            cve_description=description,
            validation_explanation=validation_explanation,
            validation_status='confirmed'
        )
        db.session.add(finding)
        db.session.commit()
        return f"Successfully recorded finding {cve_id} in {file_path}"
    except Exception as e:
        return f"Error recording finding: {str(e)}"


@tool
def generate_vulnerability_report() -> str:
    """
    Generate a PDF report listing all the vulnerabilities recorded for this analysis.
    Call this tool at the very end of your analysis.
    """
    try:
        from app.services.enhanced_pdf_generator import EnhancedPDFReportGenerator
        
        analysis_id = get_analysis_context()
        if not analysis_id:
            return "Error: No analysis context active"
            
        # Fetch findings from DB
        findings = db.session.query(CVEFinding).filter_by(analysis_id=analysis_id).all()
        
        if not findings:
            return "No findings recorded. Cannot generate report."
            
        generator = EnhancedPDFReportGenerator()
        path = generator.generate_final_vulnerability_report(analysis_id, findings, {})
        return f"Report generated successfully at: {path}"
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        return f"Error generating report: {str(e)}"


# Export all tools as a list
ALL_TOOLS = [
    analyze_repository_structure,
    read_file_content,
    list_directory_contents,
    search_codebase_semantically,
    search_cve_database,
    validate_vulnerability_match,
    record_finding,
    generate_vulnerability_report
]

logger.info(f"Agent tools loaded: {len(ALL_TOOLS)} tools available")
