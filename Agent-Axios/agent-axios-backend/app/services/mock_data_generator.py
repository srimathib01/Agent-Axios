"""Vulnerability data generator for analysis demonstrations."""
import random
import time
from typing import List, Dict, Any
from datetime import datetime

class VulnerabilityDataGenerator:
    """Generate realistic vulnerability data for analysis demonstrations."""
    
    # Mock vulnerabilities for different frameworks
    MOCK_VULNERABILITIES = {
        'flask': [
            {
                'cve_id': 'CVE-2023-30861',
                'description': 'Flask before 2.3.2 has a potential security issue with cookie parsing that could lead to session fixation attacks.',
                'severity': 'HIGH',
                'cvss_score': 7.5,
                'affected_versions': '< 2.3.2',
                'file_patterns': ['app.py', '__init__.py', 'routes'],
                'code_patterns': ['session', 'cookie', 'set_cookie'],
                'mitigation': 'Upgrade Flask to version 2.3.2 or later. Ensure proper session configuration with secure flags.'
            },
            {
                'cve_id': 'CVE-2023-25577',
                'description': 'Werkzeug (Flask dependency) has a high resource consumption vulnerability that could lead to denial of service.',
                'severity': 'MEDIUM',
                'cvss_score': 5.9,
                'affected_versions': '< 2.2.3',
                'file_patterns': ['wsgi', 'app.py'],
                'code_patterns': ['werkzeug', 'run', 'debug'],
                'mitigation': 'Update Werkzeug to version 2.2.3 or later. Disable debug mode in production.'
            },
            {
                'cve_id': 'CVE-2024-1234',
                'description': 'SQL Injection vulnerability in Flask-SQLAlchemy when using raw SQL queries without proper parameterization.',
                'severity': 'CRITICAL',
                'cvss_score': 9.8,
                'affected_versions': 'All versions',
                'file_patterns': ['models', 'database', 'db'],
                'code_patterns': ['execute', 'raw_sql', 'text('],
                'mitigation': 'Use parameterized queries and ORM methods. Never concatenate user input into SQL queries.'
            },
            {
                'cve_id': 'CVE-2023-46136',
                'description': 'Werkzeug debugger PIN authentication bypass vulnerability allowing remote code execution.',
                'severity': 'CRITICAL',
                'cvss_score': 9.1,
                'affected_versions': '< 3.0.1',
                'file_patterns': ['app.py', 'wsgi.py', '__init__.py'],
                'code_patterns': ['debug=True', 'DEBUG', 'use_debugger'],
                'mitigation': 'Disable debug mode in production environments. Update Werkzeug to 3.0.1 or later.'
            },
            {
                'cve_id': 'CVE-2023-5678',
                'description': 'Cross-Site Scripting (XSS) vulnerability in Flask applications not using auto-escaping in templates.',
                'severity': 'HIGH',
                'cvss_score': 7.2,
                'affected_versions': 'All versions',
                'file_patterns': ['templates', 'views', 'routes'],
                'code_patterns': ['render_template', 'Markup', '|safe'],
                'mitigation': 'Enable auto-escaping in Jinja2 templates. Validate and sanitize user input before rendering.'
            }
        ],
        'express': [
            {
                'cve_id': 'CVE-2022-24999',
                'description': 'Express.js has a path traversal vulnerability in the static file serving middleware.',
                'severity': 'HIGH',
                'cvss_score': 7.5,
                'affected_versions': '< 4.17.3',
                'file_patterns': ['app.js', 'server.js', 'index.js'],
                'code_patterns': ['express.static', 'sendFile'],
                'mitigation': 'Update Express.js to version 4.17.3 or later. Validate file paths before serving.'
            },
            {
                'cve_id': 'CVE-2023-1111',
                'description': 'NoSQL Injection vulnerability in Express applications using MongoDB without input validation.',
                'severity': 'CRITICAL',
                'cvss_score': 9.1,
                'affected_versions': 'All versions',
                'file_patterns': ['models', 'controllers', 'routes'],
                'code_patterns': ['$where', 'find(', 'findOne('],
                'mitigation': 'Sanitize user input before MongoDB queries. Use parameterized queries and avoid $where operator.'
            }
        ],
        'django': [
            {
                'cve_id': 'CVE-2023-41164',
                'description': 'Django has a potential denial-of-service vulnerability in file uploads.',
                'severity': 'HIGH',
                'cvss_score': 7.5,
                'affected_versions': '< 4.2.5',
                'file_patterns': ['views.py', 'forms.py'],
                'code_patterns': ['FileField', 'ImageField', 'upload'],
                'mitigation': 'Update Django to 4.2.5 or later. Implement file size limits and validation.'
            }
        ],
        'react': [
            {
                'cve_id': 'CVE-2023-9999',
                'description': 'React DOM XSS vulnerability when using dangerouslySetInnerHTML without sanitization.',
                'severity': 'HIGH',
                'cvss_score': 7.8,
                'affected_versions': 'All versions',
                'file_patterns': ['components', 'pages'],
                'code_patterns': ['dangerouslySetInnerHTML', '__html'],
                'mitigation': 'Sanitize HTML content before using dangerouslySetInnerHTML. Use DOMPurify or similar library.'
            }
        ],
        'default': [
            {
                'cve_id': 'CVE-2023-0001',
                'description': 'Generic dependency vulnerability - outdated packages with known security issues.',
                'severity': 'MEDIUM',
                'cvss_score': 6.5,
                'affected_versions': 'Various',
                'file_patterns': ['requirements.txt', 'package.json', 'pom.xml'],
                'code_patterns': ['dependencies', 'imports'],
                'mitigation': 'Update all dependencies to latest secure versions. Run security audits regularly.'
            }
        ]
    }
    
    MOCK_CODE_SNIPPETS = {
        'session_vulnerability': """
# Vulnerable code: Insecure session configuration
app = Flask(__name__)
app.config['SESSION_COOKIE_SECURE'] = False  # Vulnerable: cookies sent over HTTP
app.config['SESSION_COOKIE_HTTPONLY'] = False  # Vulnerable: accessible via JavaScript

@app.route('/login', methods=['POST'])
def login():
    session['user_id'] = request.form['user_id']  # Potential session fixation
    return redirect('/dashboard')
""",
        'sql_injection': """
# Vulnerable code: SQL injection risk
@app.route('/user/<username>')
def get_user(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"  # Vulnerable!
    result = db.session.execute(text(query))
    return jsonify(result.fetchone())
""",
        'debug_mode': """
# Vulnerable code: Debug mode enabled in production
app = Flask(__name__)
app.config['DEBUG'] = True  # CRITICAL: Debug mode in production!
app.config['ENV'] = 'development'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')  # Exposed debugger
""",
        'xss_vulnerability': """
# Vulnerable code: XSS through unsafe template rendering
@app.route('/search')
def search():
    query = request.args.get('q', '')
    # Dangerous: User input rendered without escaping
    return render_template_string(f"<h1>Results for: {query}</h1>")
""",
        'path_traversal': """
# Vulnerable code: Path traversal vulnerability
@app.route('/download/<path:filename>')
def download_file(filename):
    # Vulnerable: No path validation
    return send_file(os.path.join('/uploads', filename))
"""
    }
    
    @staticmethod
    def detect_framework(repo_url: str) -> str:
        """Detect framework from repository URL or name."""
        url_lower = repo_url.lower()
        
        if 'flask' in url_lower or 'python' in url_lower:
            return 'flask'
        elif 'express' in url_lower or 'node' in url_lower:
            return 'express'
        elif 'django' in url_lower:
            return 'django'
        elif 'react' in url_lower or 'next' in url_lower:
            return 'react'
        else:
            return 'flask'  # Default to Flask for demo
    
    @staticmethod
    def generate_mock_vulnerabilities(repo_url: str, count: int = 3) -> List[Dict[str, Any]]:
        """Generate realistic mock vulnerabilities for a repository."""
        framework = VulnerabilityDataGenerator.detect_framework(repo_url)
        
        available_vulns = VulnerabilityDataGenerator.MOCK_VULNERABILITIES.get(
            framework, 
            VulnerabilityDataGenerator.MOCK_VULNERABILITIES['default']
        )
        
        # Select vulnerabilities (up to count)
        selected_count = min(count, len(available_vulns))
        selected_vulns = random.sample(available_vulns, selected_count)
        
        # Add code snippets
        code_snippet_keys = list(VulnerabilityDataGenerator.MOCK_CODE_SNIPPETS.keys())
        for i, vuln in enumerate(selected_vulns):
            snippet_key = code_snippet_keys[i % len(code_snippet_keys)]
            vuln['code_snippet'] = VulnerabilityDataGenerator.MOCK_CODE_SNIPPETS[snippet_key]
            vuln['file_path'] = VulnerabilityDataGenerator._generate_file_path(framework, vuln)
            vuln['line_number'] = random.randint(10, 200)
        
        return selected_vulns
    
    @staticmethod
    def _generate_file_path(framework: str, vuln: Dict[str, Any]) -> str:
        """Generate a realistic file path for the vulnerability."""
        patterns = vuln.get('file_patterns', ['app.py'])
        base_pattern = random.choice(patterns)
        
        if framework == 'flask':
            paths = [
                f'app/{base_pattern}.py',
                f'app/routes/{base_pattern}.py',
                f'app/models/{base_pattern}.py',
                f'{base_pattern}.py'
            ]
        elif framework == 'express':
            paths = [
                f'src/{base_pattern}.js',
                f'routes/{base_pattern}.js',
                f'controllers/{base_pattern}.js'
            ]
        else:
            paths = [f'src/{base_pattern}']
        
        return random.choice(paths)
    
    @staticmethod
    def generate_mock_agent_steps(repo_url: str) -> List[Dict[str, Any]]:
        """Generate mock agent analysis steps for realistic progress updates."""
        framework = VulnerabilityDataGenerator.detect_framework(repo_url)
        
        steps = [
            {
                'step': 1,
                'action': 'analyze_repository_structure',
                'message': f'Analyzing repository structure...',
                'result': f'Detected {framework.upper()} application with Python backend',
                'duration': 2
            },
            {
                'step': 2,
                'action': 'search_cve_database',
                'message': f'Searching CVE database for {framework} vulnerabilities...',
                'result': f'Found 5 relevant CVEs for {framework}',
                'duration': 3
            },
            {
                'step': 3,
                'action': 'search_codebase_semantically',
                'message': 'Searching codebase for session management code...',
                'result': 'Found 3 files with session handling',
                'duration': 2
            },
            {
                'step': 4,
                'action': 'read_file_content',
                'message': 'Reading app/__init__.py for analysis...',
                'result': 'File contains session configuration code',
                'duration': 1
            },
            {
                'step': 5,
                'action': 'validate_vulnerability_match',
                'message': 'Validating potential CVE-2023-30861 match...',
                'result': 'CONFIRMED: Insecure session configuration detected',
                'duration': 2
            },
            {
                'step': 6,
                'action': 'record_finding',
                'message': 'Recording vulnerability finding...',
                'result': 'Finding recorded: CVE-2023-30861',
                'duration': 1
            },
            {
                'step': 7,
                'action': 'search_codebase_semantically',
                'message': 'Searching for SQL query patterns...',
                'result': 'Found 2 files with database queries',
                'duration': 2
            },
            {
                'step': 8,
                'action': 'validate_vulnerability_match',
                'message': 'Checking for SQL injection vulnerabilities...',
                'result': 'CONFIRMED: SQL injection risk in user queries',
                'duration': 2
            },
            {
                'step': 9,
                'action': 'record_finding',
                'message': 'Recording SQL injection finding...',
                'result': 'Finding recorded: CVE-2024-1234',
                'duration': 1
            },
            {
                'step': 10,
                'action': 'search_codebase_semantically',
                'message': 'Checking debug mode configuration...',
                'result': 'Found debug configuration in app.py',
                'duration': 2
            },
            {
                'step': 11,
                'action': 'validate_vulnerability_match',
                'message': 'Validating debug mode vulnerability...',
                'result': 'CONFIRMED: Debug mode enabled in production code',
                'duration': 1
            },
            {
                'step': 12,
                'action': 'record_finding',
                'message': 'Recording debug mode vulnerability...',
                'result': 'Finding recorded: CVE-2023-46136',
                'duration': 1
            },
            {
                'step': 13,
                'action': 'generate_vulnerability_report',
                'message': 'Generating comprehensive vulnerability report...',
                'result': 'Report generated successfully with 3 findings',
                'duration': 3
            }
        ]
        
        return steps
    
    @staticmethod
    def generate_mock_repository_stats(repo_url: str) -> Dict[str, Any]:
        """Generate mock repository statistics."""
        return {
            'total_files': random.randint(50, 200),
            'total_chunks': random.randint(500, 2000),
            'languages': {
                'Python': random.randint(60, 90),
                'JavaScript': random.randint(5, 20),
                'HTML': random.randint(3, 10),
                'CSS': random.randint(2, 8)
            },
            'lines_of_code': random.randint(5000, 20000)
        }
