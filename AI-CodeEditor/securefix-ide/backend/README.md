# SecureFix AI Fix Engine - Backend

 AI-powered security fix generation with real-time streaming support.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [Security Prompts](#security-prompts)
- [Supported Technologies](#supported-technologies)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Overview

The AI Fix Engine is the backend component responsible for generating secure code fixes for detected vulnerabilities. It uses Azure OpenAI (GPT-4.1) or standard OpenAI to analyze vulnerable code and produce minimal, security-focused fixes.

### Key Capabilities

- **Streaming Fix Generation**: Token-by-token streaming via WebSocket (Cursor-style UX)
- **Security-Aware Prompts**: CWE-specific guidance with OWASP best practices
- **Precise Code Changes**: Search/replace block output for DiffZone visualization
- **Multi-Language Support**: Python, JavaScript, TypeScript, Java, Go, and more
- **Framework Detection**: Auto-detects Django, Flask, Express, Spring, etc.

---

## Features

### 1. Streaming Fix Generation
Real-time, token-by-token AI fixes delivered via WebSocket for a responsive user experience.

### 2. Security-Focused Prompts
Each prompt includes:
- CWE-specific mitigation guidance
- OWASP category mapping
- Framework-specific security patterns
- Language-specific best practices

### 3. Search/Replace Blocks
Fixes are output in a structured format for precise code application:
```
<<<SEARCH
vulnerable_code_here
>>>
<<<REPLACE
secure_code_here
>>>
```

### 4. Interactive Chat
Ask questions about vulnerabilities, get explanations, and request alternative fixes.

### 5. Quick Actions
One-click security analysis:
- **Explain**: Detailed vulnerability explanation
- **OWASP**: OWASP guidance and cheat sheets
- **Alternative**: Alternative fix approaches
- **Test Cases**: Security test case generation
- **Impact**: Security impact analysis

---

## Architecture

```
backend/
├── app/
│   ├── __init__.py              # Package initialization
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py              # Async SQLAlchemy configuration
│   │   └── fix_suggestion.py    # FixSuggestion, ChatSession, ChatMessage models
│   ├── routes/
│   │   ├── __init__.py
│   │   └── fix_routes.py        # WebSocket & REST API endpoints
│   └── services/
│       ├── __init__.py
│       ├── context_extraction_service.py  # Code context extraction
│       ├── fix_generator_service.py       # Core AI fix generation
│       └── prompt_templates.py            # Security-focused prompts
├── config/
│   ├── __init__.py
│   └── settings.py              # Application configuration
├── main.py                      # FastAPI application entry point
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variable template
└── README.md                    # This file
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SecureFix IDE Frontend                    │
│         (core/src/services/FixGeneratorService.ts)          │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket / HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Application                        │
│                      (main.py)                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  fix_routes  │    │ fix_generator │    │   prompt     │  │
│  │   .py        │───▶│  _service.py  │───▶│ _templates   │  │
│  │              │    │               │    │   .py        │  │
│  │ • /ws/fix    │    │ • Streaming   │    │              │  │
│  │ • /ws/chat   │    │ • LangChain   │    │ • CWE Guide  │  │
│  │ • REST APIs  │    │ • Azure/OpenAI│    │ • OWASP      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────┐                         │
│                    │   context    │                         │
│                    │ _extraction  │                         │
│                    │  _service.py │                         │
│                    │              │                         │
│                    │ • Language   │                         │
│                    │ • Framework  │                         │
│                    │ • Imports    │                         │
│                    └──────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Azure OpenAI / OpenAI API                       │
│                    (GPT-4.1 / GPT-4-Turbo)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.10 or higher
- Azure OpenAI API access OR OpenAI API key

### Installation

1. **Navigate to backend directory**
   ```bash
   cd AI-CodeEditor/securefix-ide/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv

   # Activate on Windows
   venv\Scripts\activate

   # Activate on macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API credentials
   ```

5. **Run the server**
   ```bash
   python main.py
   ```

   Server starts at `http://localhost:8000`

6. **Verify installation**
   - Health check: `http://localhost:8000/health`
   - API docs: `http://localhost:8000/docs`

---

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application
DEBUG=true
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=sqlite+aiosqlite:///./securefix.db

# Azure OpenAI (Recommended)
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT=gpt-4.1

# Standard OpenAI (Alternative)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4-turbo-preview

# LLM Settings
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=2048
LLM_STREAMING=true

# Context Extraction
CONTEXT_LINES_BEFORE=15
CONTEXT_LINES_AFTER=15

# CORS
CORS_ORIGINS=*
```

### Priority

If both Azure OpenAI and standard OpenAI credentials are provided, Azure OpenAI takes priority.

---

## API Reference

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "SecureFix AI Fix Engine",
  "version": "2.3.0",
  "llm_configured": true
}
```

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI documentation |
| `POST` | `/api/fix/generate` | Generate fix (non-streaming) |
| `GET` | `/api/fix/history` | Get fix history |
| `GET` | `/api/fix/{id}` | Get specific fix by ID |
| `PATCH` | `/api/fix/{id}/status` | Update fix status (applied/rejected) |
| `POST` | `/api/fix/quick-action` | Execute quick action |

### Generate Fix (REST)

```
POST /api/fix/generate
Content-Type: application/json

{
  "vulnerability": {
    "id": "vuln-123",
    "cwe": "CWE-89",
    "severity": "high",
    "description": "SQL Injection vulnerability detected"
  },
  "code_context": {
    "file_path": "app/views.py",
    "start_line": 45,
    "end_line": 48,
    "vulnerable_code": "query = \"SELECT * FROM users WHERE id=\" + user_id",
    "surrounding_code": "...",
    "imports": ["from django.db import connection"],
    "language": "python",
    "framework": "django"
  }
}
```

**Response:**
```json
{
  "success": true,
  "fix": {
    "id": 1,
    "vulnerability_id": "vuln-123",
    "raw_content": "...",
    "search_blocks": ["query = \"SELECT * FROM users WHERE id=\" + user_id"],
    "replace_blocks": ["cursor.execute(\"SELECT * FROM users WHERE id = %s\", [user_id])"],
    "status": "completed",
    "generation_time_ms": 1234
  }
}
```

---

## WebSocket Protocol

### Fix Generation WebSocket

**Endpoint:** `ws://localhost:8000/api/fix/ws/fix`

#### Client → Server

```json
{
  "type": "fix_request",
  "vulnerability": {
    "id": "vuln-123",
    "cwe": "CWE-89",
    "severity": "high",
    "description": "SQL Injection vulnerability"
  },
  "codeContext": {
    "file_path": "app/views.py",
    "start_line": 45,
    "end_line": 48,
    "vulnerable_code": "...",
    "surrounding_code": "...",
    "imports": [],
    "language": "python",
    "framework": "django"
  }
}
```

#### Server → Client (Streaming)

**Chunk message:**
```json
{
  "type": "fix_chunk",
  "content": "cursor",
  "done": false,
  "vulnerability_id": "vuln-123"
}
```

**Completion message:**
```json
{
  "type": "fix_chunk",
  "content": "",
  "done": true,
  "vulnerability_id": "vuln-123",
  "full_content": "<<<SEARCH\n...\n>>>\n<<<REPLACE\n...\n>>>",
  "search_blocks": ["..."],
  "replace_blocks": ["..."],
  "generation_time_ms": 1234,
  "prompt_tokens": 500,
  "completion_tokens": 200
}
```

**Error message:**
```json
{
  "type": "fix_error",
  "message": "Error description",
  "vulnerability_id": "vuln-123"
}
```

### Chat WebSocket

**Endpoint:** `ws://localhost:8000/api/fix/ws/chat`

#### Chat Message

```json
{
  "type": "chat_message",
  "content": "Explain this SQL injection vulnerability",
  "context": {
    "vulnerability": {
      "cwe": "CWE-89",
      "severity": "high"
    },
    "current_file": "app/views.py",
    "recent_fix": "..."
  }
}
```

#### Quick Action

```json
{
  "type": "quick_action",
  "action": "explain",
  "vulnerability": {
    "cwe": "CWE-89",
    "severity": "high",
    "description": "SQL Injection"
  }
}
```

**Available actions:**
- `explain` - Detailed vulnerability explanation
- `owasp` - OWASP guidance and prevention methods
- `alternative` - Alternative fix approaches
- `test_cases` - Security test case generation
- `impact` - Security impact analysis

#### Clear History

```json
{
  "type": "clear_history"
}
```

---

## Security Prompts

### CWE Coverage

| CWE ID | Name | OWASP Category |
|--------|------|----------------|
| CWE-89 | SQL Injection | A03:2021 - Injection |
| CWE-79 | Cross-site Scripting (XSS) | A03:2021 - Injection |
| CWE-78 | OS Command Injection | A03:2021 - Injection |
| CWE-22 | Path Traversal | A01:2021 - Broken Access Control |
| CWE-918 | Server-Side Request Forgery | A10:2021 - SSRF |
| CWE-502 | Insecure Deserialization | A08:2021 - Software Integrity |
| CWE-798 | Hardcoded Credentials | A07:2021 - Auth Failures |
| CWE-327 | Weak Cryptography | A02:2021 - Crypto Failures |
| CWE-306 | Missing Authentication | A01:2021 - Broken Access Control |
| CWE-330 | Insecure Random | A02:2021 - Crypto Failures |

### Framework-Specific Patterns

The engine provides framework-specific security guidance for:

- **Python**: Django, Flask, FastAPI, SQLAlchemy
- **JavaScript/TypeScript**: Express, React, NestJS, Next.js
- **Java**: Spring, Jakarta EE
- **Go**: Gin, Echo, Fiber

---

## Supported Technologies

### Languages

| Language | Extensions | Framework Detection |
|----------|------------|---------------------|
| Python | `.py` | Django, Flask, FastAPI |
| JavaScript | `.js`, `.jsx` | Express, React, Next.js |
| TypeScript | `.ts`, `.tsx` | Express, NestJS, React |
| Java | `.java` | Spring, Jakarta |
| Go | `.go` | Gin, Echo, Fiber |
| Ruby | `.rb` | - |
| PHP | `.php` | - |
| C# | `.cs` | - |
| C/C++ | `.c`, `.cpp` | - |
| Rust | `.rs` | - |
| Swift | `.swift` | - |
| Kotlin | `.kt` | - |
| Scala | `.scala` | - |

### Context Extraction

The service automatically extracts:
- Import statements
- Surrounding code context (configurable lines)
- Function/class context
- Framework detection from imports and patterns

---

## Development

### Running in Development Mode

```bash
# With auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using the main.py script
python main.py
```

### Running Tests

```bash
pytest
```

### API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Code Structure

- `main.py` - FastAPI app initialization and lifespan management
- `config/settings.py` - Pydantic settings with environment variable loading
- `app/models/` - SQLAlchemy async models
- `app/services/` - Business logic and AI integration
- `app/routes/` - API endpoints and WebSocket handlers

---

## Troubleshooting

### Common Issues

#### "LLM not configured" Error

Ensure you have set either:
- `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT`, or
- `OPENAI_API_KEY`

#### WebSocket Connection Failed

1. Check CORS settings in `.env`
2. Ensure the server is running
3. Verify the WebSocket URL includes `/api/fix/ws/fix`

#### Database Errors

The database is created automatically on first run. To reset:
```bash
rm securefix.db
python main.py
```

#### Slow Response Times

- Increase `LLM_MAX_TOKENS` for longer fixes
- Consider using Azure OpenAI for better latency
- Check network connectivity to OpenAI API

### Logging

Set `DEBUG=true` in `.env` for verbose logging output.

---

## Integration

### Frontend Integration

The frontend `FixGeneratorService.ts` connects to this backend:

```typescript
import { FixGeneratorService } from './services/FixGeneratorService';

const fixService = new FixGeneratorService({
  backendUrl: 'http://localhost:8000'
});

// Generate a fix
await fixService.generateFix(vulnerability, codeContext, {
  onChunk: (content, done) => console.log(content),
  onComplete: (fullContent, blocks) => console.log('Fix:', blocks),
  onError: (error) => console.error(error)
});

// Chat about a vulnerability
await fixService.chat('Explain this vulnerability', { vulnerability }, {
  onChunk: (content, done) => console.log(content),
  onComplete: (fullContent) => console.log('Response:', fullContent),
  onError: (error) => console.error(error)
});
```

### Phase 1 Backend Integration

This service can optionally connect to the Phase 1 Repository Analyzer backend:

```env
PHASE1_BACKEND_URL=http://localhost:5000
```

---

## License

Part of the SecureFix IDE Project.

---

*Document Version: 2.3.0*
*Last Updated: January 2026*
