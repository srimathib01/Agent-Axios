"""
Security-Focused Prompt Templates for AI Fix Generation

These templates are designed to generate secure, minimal, and context-aware
code fixes following OWASP best practices and CWE-specific guidance.
"""

from typing import Optional, Dict, List, Any


# ============================================================================
# SYSTEM PROMPTS
# ============================================================================

SYSTEM_PROMPT_FIX_GENERATION = """You are an expert security engineer. Generate ONLY the code fix.

RULES:
1. Output ONLY SEARCH/REPLACE blocks - no explanations, no comments, no prose
2. Make MINIMAL changes - fix only the vulnerability
3. Match existing code style exactly
4. If you need more context about imports, classes, or functions - request it

OUTPUT FORMAT (nothing else):
<<<SEARCH
exact vulnerable code
>>>
<<<REPLACE
fixed secure code
>>>

DO NOT include:
- Explanations
- Comments in code
- "Here's the fix" or similar text
- Anything other than SEARCH/REPLACE blocks"""


SYSTEM_PROMPT_CHAT = """You are a security assistant. Be BRIEF and CODE-FOCUSED.

RULES:
1. Give short, direct answers (2-3 sentences max for explanations)
2. Always include code examples when relevant
3. No filler phrases ("Certainly!", "I'd be happy to", "Of course")
4. If you need more code context to give a proper fix, say exactly what you need

BAD: "Certainly! I'd be happy to help you with that SQL injection vulnerability. Let me explain..."
GOOD: "Use parameterized queries:\n```python\ncursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))\n```" """


# ============================================================================
# CWE-SPECIFIC GUIDANCE
# ============================================================================

CWE_GUIDANCE: Dict[str, Dict[str, Any]] = {
    # SQL Injection
    "CWE-89": {
        "name": "SQL Injection",
        "owasp": "A03:2021 - Injection",
        "mitigation": [
            "Use parameterized queries or prepared statements",
            "Use ORM methods instead of raw SQL when possible",
            "Validate and sanitize input before use in queries",
            "Apply least privilege database permissions"
        ],
        "patterns": {
            "python": "Use cursor.execute(query, params) or ORM's .filter()",
            "javascript": "Use parameterized queries or prepared statements",
            "java": "Use PreparedStatement with ? placeholders",
            "go": "Use db.Query/Exec with args instead of string formatting"
        }
    },
    # XSS
    "CWE-79": {
        "name": "Cross-site Scripting (XSS)",
        "owasp": "A03:2021 - Injection",
        "mitigation": [
            "Encode output based on context (HTML, JS, URL, CSS)",
            "Use Content-Security-Policy headers",
            "Use framework's built-in escaping mechanisms",
            "Validate and sanitize user input"
        ],
        "patterns": {
            "python": "Use Jinja2's {{ }} (auto-escaping) or markupsafe.escape()",
            "javascript": "Use textContent instead of innerHTML, or sanitize with DOMPurify",
            "java": "Use OWASP Java Encoder or framework escaping",
            "go": "Use html/template which auto-escapes by default"
        }
    },
    # Command Injection
    "CWE-78": {
        "name": "OS Command Injection",
        "owasp": "A03:2021 - Injection",
        "mitigation": [
            "Avoid shell=True in subprocess calls",
            "Use subprocess with list arguments instead of shell strings",
            "Validate and whitelist allowed commands/arguments",
            "Use built-in functions instead of shell commands when possible"
        ],
        "patterns": {
            "python": "Use subprocess.run(['cmd', 'arg'], shell=False)",
            "javascript": "Use child_process.spawn with array args, avoid shell: true",
            "java": "Use ProcessBuilder with list arguments",
            "go": "Use exec.Command with separate args, not concatenated strings"
        }
    },
    # Path Traversal
    "CWE-22": {
        "name": "Path Traversal",
        "owasp": "A01:2021 - Broken Access Control",
        "mitigation": [
            "Validate and sanitize file paths",
            "Use os.path.realpath() to resolve canonical paths",
            "Check that resolved path is within allowed directory",
            "Avoid using user input directly in file operations"
        ],
        "patterns": {
            "python": "Use os.path.realpath() and verify path.startswith(base_dir)",
            "javascript": "Use path.resolve() and validate against allowed root",
            "java": "Use File.getCanonicalPath() and validate prefix",
            "go": "Use filepath.Clean() and validate against base path"
        }
    },
    # SSRF
    "CWE-918": {
        "name": "Server-Side Request Forgery (SSRF)",
        "owasp": "A10:2021 - Server-Side Request Forgery",
        "mitigation": [
            "Validate and whitelist allowed URLs/domains",
            "Block requests to internal IPs (127.0.0.1, 10.x, 192.168.x, etc.)",
            "Use URL parser to validate scheme and host",
            "Disable redirects or validate redirect targets"
        ],
        "patterns": {
            "python": "Validate URL with urllib.parse, block private IPs with ipaddress module",
            "javascript": "Parse URL with URL class, validate against allowlist",
            "java": "Use java.net.URL parser, validate host against allowlist",
            "go": "Parse with url.Parse(), validate host and block private ranges"
        }
    },
    # Insecure Deserialization
    "CWE-502": {
        "name": "Insecure Deserialization",
        "owasp": "A08:2021 - Software and Data Integrity Failures",
        "mitigation": [
            "Avoid deserializing untrusted data",
            "Use safe serialization formats (JSON instead of pickle/YAML)",
            "Implement integrity checks (HMAC) on serialized data",
            "Use allowlists for deserialized types"
        ],
        "patterns": {
            "python": "Use json.loads() instead of pickle.loads() for untrusted data",
            "javascript": "Use JSON.parse() instead of eval() or unserialize",
            "java": "Use ObjectInputFilter to restrict deserialization",
            "go": "Use json.Unmarshal with explicit types instead of gob for untrusted data"
        }
    },
    # Hardcoded Credentials
    "CWE-798": {
        "name": "Hardcoded Credentials",
        "owasp": "A07:2021 - Identification and Authentication Failures",
        "mitigation": [
            "Store credentials in environment variables",
            "Use secrets management systems (HashiCorp Vault, AWS Secrets Manager)",
            "Use configuration files excluded from version control",
            "Implement proper key rotation mechanisms"
        ],
        "patterns": {
            "python": "Use os.environ.get('SECRET_KEY') or python-dotenv",
            "javascript": "Use process.env.SECRET_KEY or dotenv package",
            "java": "Use environment variables or external configuration",
            "go": "Use os.Getenv() or external configuration"
        }
    },
    # Weak Cryptography
    "CWE-327": {
        "name": "Use of Broken or Risky Cryptographic Algorithm",
        "owasp": "A02:2021 - Cryptographic Failures",
        "mitigation": [
            "Use modern algorithms: AES-256-GCM, ChaCha20-Poly1305",
            "Use PBKDF2, bcrypt, or Argon2 for password hashing",
            "Avoid MD5, SHA1 for security purposes",
            "Use cryptographically secure random number generators"
        ],
        "patterns": {
            "python": "Use cryptography library or hashlib with SHA-256+",
            "javascript": "Use crypto.subtle API or bcrypt for passwords",
            "java": "Use javax.crypto with AES/GCM/NoPadding",
            "go": "Use crypto/aes with GCM mode, crypto/rand for random"
        }
    },
    # Missing Authentication
    "CWE-306": {
        "name": "Missing Authentication for Critical Function",
        "owasp": "A01:2021 - Broken Access Control",
        "mitigation": [
            "Implement authentication checks on all sensitive endpoints",
            "Use middleware/decorators for consistent auth enforcement",
            "Verify user identity before processing requests",
            "Log authentication attempts"
        ],
        "patterns": {
            "python": "Use @login_required decorator or check request.user",
            "javascript": "Use authentication middleware (passport, jwt-auth)",
            "java": "Use Spring Security @PreAuthorize or @Secured",
            "go": "Implement auth middleware, check context for user"
        }
    },
    # Insecure Random
    "CWE-330": {
        "name": "Use of Insufficiently Random Values",
        "owasp": "A02:2021 - Cryptographic Failures",
        "mitigation": [
            "Use cryptographically secure random number generators",
            "Avoid Math.random() or random.random() for security purposes",
            "Use OS-provided entropy sources"
        ],
        "patterns": {
            "python": "Use secrets module: secrets.token_hex(), secrets.choice()",
            "javascript": "Use crypto.randomBytes() or crypto.getRandomValues()",
            "java": "Use java.security.SecureRandom",
            "go": "Use crypto/rand package instead of math/rand"
        }
    }
}


# ============================================================================
# FRAMEWORK-SPECIFIC PATTERNS
# ============================================================================

FRAMEWORK_PATTERNS: Dict[str, Dict[str, List[str]]] = {
    "django": {
        "sql_injection": [
            "Use Model.objects.filter() instead of raw SQL",
            "If raw SQL needed, use cursor.execute(query, [params])",
            "Use F() and Q() objects for complex queries"
        ],
        "xss": [
            "Templates auto-escape by default",
            "Use {{ value }} not {{ value|safe }} for untrusted data",
            "Use django.utils.html.escape() for manual escaping"
        ],
        "csrf": [
            "Ensure {% csrf_token %} in forms",
            "Use @csrf_protect decorator on views"
        ],
        "auth": [
            "Use @login_required decorator",
            "Use permission_required for fine-grained access"
        ]
    },
    "flask": {
        "sql_injection": [
            "Use SQLAlchemy ORM queries",
            "If raw SQL, use db.engine.execute(text(query), params)",
            "Use parameterized queries with ?/%s placeholders"
        ],
        "xss": [
            "Jinja2 auto-escapes by default",
            "Use {{ value }} not {{ value|safe }} for user input",
            "Use markupsafe.escape() for manual cases"
        ],
        "auth": [
            "Use Flask-Login @login_required",
            "Check current_user.is_authenticated"
        ]
    },
    "fastapi": {
        "sql_injection": [
            "Use SQLAlchemy ORM with session.query()",
            "For raw SQL use text() with bindparams",
            "Prefer ORM operations over raw queries"
        ],
        "validation": [
            "Use Pydantic models for request validation",
            "Define strict types for path/query parameters"
        ],
        "auth": [
            "Use OAuth2PasswordBearer dependency",
            "Implement Depends() for authentication checks"
        ]
    },
    "express": {
        "sql_injection": [
            "Use parameterized queries: db.query(sql, [params])",
            "With Sequelize: Model.findAll({ where: { field: value } })",
            "Never concatenate user input into SQL strings"
        ],
        "xss": [
            "Use res.render() which escapes by default (EJS/Pug)",
            "Sanitize with DOMPurify for rich text",
            "Set Content-Security-Policy headers"
        ],
        "auth": [
            "Use passport.js middleware",
            "Implement JWT validation middleware"
        ]
    },
    "spring": {
        "sql_injection": [
            "Use JPA/Hibernate with named parameters",
            "Use @Query with :param placeholders",
            "Use JpaRepository methods instead of native queries"
        ],
        "xss": [
            "Thymeleaf escapes by default with th:text",
            "Use th:utext only for trusted content",
            "Configure HtmlUtils.htmlEscape() for manual cases"
        ],
        "auth": [
            "Use @PreAuthorize annotations",
            "Configure Spring Security filter chain",
            "Use @Secured for role-based access"
        ]
    }
}


# ============================================================================
# PROMPT BUILDERS
# ============================================================================

def build_fix_prompt(
    vulnerability: Dict[str, Any],
    code_context: Dict[str, Any],
    framework: Optional[str] = None,
    language: str = "python"
) -> str:
    """
    Build a concise prompt for fix generation - code only, no explanations.
    """
    cwe_id = vulnerability.get("cwe", "CWE-Unknown")
    if isinstance(cwe_id, dict):
        cwe_id = cwe_id.get("id", "CWE-Unknown")

    if not cwe_id.startswith("CWE-"):
        cwe_id = f"CWE-{cwe_id}"

    # Get the secure pattern for this language/CWE
    cwe_guidance = CWE_GUIDANCE.get(cwe_id, {})
    secure_pattern = cwe_guidance.get("patterns", {}).get(language, "")

    # Get framework hint
    framework_hint = ""
    if framework and framework.lower() in FRAMEWORK_PATTERNS:
        fw_patterns = FRAMEWORK_PATTERNS[framework.lower()]
        if cwe_id == "CWE-89":
            hints = fw_patterns.get("sql_injection", [])
            framework_hint = hints[0] if hints else ""
        elif cwe_id == "CWE-79":
            hints = fw_patterns.get("xss", [])
            framework_hint = hints[0] if hints else ""

    # Build minimal imports context
    imports = code_context.get("imports", [])
    imports_str = "\n".join(imports[:15]) if imports else ""

    prompt = f"""FIX THIS {cwe_id} ({cwe_guidance.get('name', 'vulnerability')})

File: {code_context.get('file_path', 'unknown')} (lines {code_context.get('start_line', '?')}-{code_context.get('end_line', '?')})
{f"Framework: {framework}" if framework else ""}
{f"Secure pattern: {secure_pattern}" if secure_pattern else ""}
{f"Hint: {framework_hint}" if framework_hint else ""}

IMPORTS:
```{language}
{imports_str if imports_str else "# none provided"}
```

CONTEXT:
```{language}
{code_context.get('surrounding_code', '')}
```

VULNERABLE CODE TO FIX:
```{language}
{code_context.get('vulnerable_code', '')}
```

OUTPUT ONLY SEARCH/REPLACE BLOCKS. NO TEXT."""

    return prompt


def build_chat_context_prompt(
    vulnerability: Optional[Dict[str, Any]] = None,
    current_file: Optional[str] = None,
    recent_fix: Optional[str] = None,
    user_message: str = ""
) -> str:
    """Build a minimal context prompt for chat - code focused, no fluff."""
    context_parts = []

    if vulnerability:
        cwe_id = vulnerability.get("cwe", "Unknown")
        if isinstance(cwe_id, dict):
            cwe_id = cwe_id.get("id", "Unknown")
        context_parts.append(f"[{cwe_id}] {vulnerability.get('severity', '').upper()} in {vulnerability.get('file_path', 'unknown')}")

    if current_file:
        context_parts.append(f"File: {current_file}")

    if recent_fix:
        context_parts.append(f"Recent fix:\n```\n{recent_fix[:300]}\n```")

    context = " | ".join(context_parts) if context_parts else ""

    return f"""{f"Context: {context}" if context else ""}

{user_message}

Be brief. Show code. No filler phrases."""


# ============================================================================
# QUICK ACTION PROMPTS
# ============================================================================

QUICK_ACTION_PROMPTS = {
    "explain": """In 3 sentences max: What is this vulnerability? How can it be exploited? Show a simple attack example.""",

    "owasp": """OWASP category and top 3 prevention methods. Be brief, use bullet points.""",

    "alternative": """Show ONE alternative fix approach with code. State the main trade-off in one sentence.""",

    "test_cases": """Generate 2-3 test cases as code. Include one that tests the exploit is blocked.""",

    "impact": """Risk level (Critical/High/Medium/Low), what data is at risk, one sentence on compliance impact."""
}


def get_quick_action_prompt(action: str, vulnerability: Dict[str, Any]) -> str:
    """Get a minimal quick action prompt."""
    base_prompt = QUICK_ACTION_PROMPTS.get(action, QUICK_ACTION_PROMPTS["explain"])

    cwe_id = vulnerability.get("cwe", "Unknown")
    if isinstance(cwe_id, dict):
        cwe_id = cwe_id.get("id", "Unknown")

    return f"""[{cwe_id}] {vulnerability.get('severity', '').upper()} - {vulnerability.get('description', 'N/A')[:100]}

{base_prompt}"""
