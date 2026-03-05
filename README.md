# Agent-Axios — AI-Powered Security Analysis & Fix Platform

A multi-phase security analysis platform that combines autonomous AI agents with an interactive IDE for real-time vulnerability detection, code analysis, and automated fix generation.


## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Phase 1: Repository Analyzer](#phase-1-repository-analyzer)
- [Phase 2: SecureFix IDE](#phase-2-securefix-ide)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Supported Languages & Frameworks](#supported-languages--frameworks)
- [CWE & OWASP Coverage](#cwe--owasp-coverage)
- [API Reference](#api-reference)
- [Development](#development)
- [License](#license)


## Overview

**Agent-Axios** is a two-phase security platform:

1. **Phase 1 — Repository Analyzer**: Autonomous ReAct agent that scans repositories, detects vulnerabilities, extracts dependencies, and generates security reports using Azure OpenAI GPT-4.1.
2. **Phase 2 — SecureFix IDE**: A standalone IDE (desktop + web) with real-time vulnerability detection, AI-powered fix generation via streaming WebSocket, inline diff viewer, and interactive security chat.


## Architecture

```
Agent-Axios/
├── Agent-Axios/                          # Phase 1: Repository Analyzer
│   ├── agent-axios-backend/              #   Python Flask + LangGraph ReAct Agent
│   ├── agent-axios-frontend/             #   React + Vite SPA
│   └── agent-axios-node-backend/         #   Node.js backend (alternative)
│
├── AI-CodeEditor/                        # Phase 2: SecureFix IDE
│   └── securefix-ide/
│       ├── backend/                      #   Python FastAPI + async SQLAlchemy
│       ├── gui/                          #   React web interface
│       ├── desktop/                      #   Tauri (Rust + WebView) desktop app
│       ├── core/                         #   Shared TypeScript library
│       └── extensions/                   #   VS Code extension
```

### Component Interaction

```
┌──────────────────────────────────────────────────────┐
│              Phase 1: Repository Analyzer             │
│                                                       │
│  Frontend (React)  ──HTTP/WS──▶  Backend (Flask)     │
│                                   │                   │
│                         LangGraph ReAct Agent         │
│                         8 Autonomous Tools            │
│                         FAISS Vector Indexing          │
│                                   │                   │
│                          Azure OpenAI GPT-4.1         │
└──────────────────────────────────────────────────────┘
                        │
                        ▼ Vulnerability Data
┌──────────────────────────────────────────────────────┐
│               Phase 2: SecureFix IDE                  │
│                                                       │
│  Desktop (Tauri)                                      │
│       ▲                                               │
│       │ IPC                                           │
│       ▼                                               │
│  GUI (React) ──Message Passing──▶ Core (TypeScript)  │
│       │                              │                │
│       └──────── WebSocket ───────────┘                │
│                     │                                 │
│                     ▼                                 │
│            Backend (FastAPI)                          │
│            Streaming AI Fixes                         │
│            Interactive Chat                           │
│                     │                                 │
│            Azure OpenAI GPT-4.1                       │
└──────────────────────────────────────────────────────┘
```



## Phase 1: Repository Analyzer

An autonomous AI agent that analyzes codebases for security vulnerabilities using the ReAct (Reasoning + Acting) pattern.

### Features

- **Autonomous ReAct Agent** — LangGraph-based agent with 8 specialized analysis tools
- **Multi-Language Analysis** — Supports 13+ programming languages
- **Framework Detection** — Auto-detects Django, Flask, Express, Spring, and more
- **Dependency Extraction** — Parses package files and identifies vulnerable dependencies
- **CVE Matching** — Maps detected vulnerabilities to known CVE entries
- **Vector Indexing** — FAISS-based code similarity search with Cohere embeddings
- **Report Generation** — AI-generated PDF/Markdown security reports
- **3-Layer Caching** — Embeddings, FAISS indexes, and metadata caching for performance
- **Real-Time Streaming** — WebSocket-based progress updates during analysis
- **LangSmith Tracing** — Full agent execution tracing and debugging

### Backend Services

| Service | Purpose |
|---------|---------|
| `agentic_orchestrator.py` | ReAct agent orchestration loop |
| `agent_tools.py` | 8 autonomous analysis tools |
| `caching_service.py` | 3-layer caching (embeddings, FAISS, metadata) |
| `codebase_indexing_service.py` | FAISS vector indexing |
| `chat_service.py` | Interactive conversation handling |
| `auth_service.py` | JWT-based authentication |
| `validation_service.py` | Input/output security validation |

### API Routes

| Route | Description |
|-------|-------------|
| `/api/` | Repository analysis endpoints |
| `/auth/*` | Authentication (register, login, JWT refresh) |
| `/chat/*` | Chat interactions |
| `/dashboard/*` | Analytics & metrics |
| `/report/*` | Report generation (PDF/Markdown) |
| `/repository/*` | Repository CRUD operations |
| `/notifications/*` | Real-time notification system |



## Phase 2: SecureFix IDE

A standalone AI-powered IDE for real-time vulnerability detection and automated fix generation.

### Features

- **Streaming Fix Generation** — Token-by-token AI fixes via WebSocket
- **Search/Replace Blocks** — Precise code changes in structured format
- **Inline Diff Viewer** — Accept/reject workflow for generated fixes
- **Interactive AI Chat** — Ask questions about vulnerabilities and get explanations
- **Quick Actions** — One-click security analysis:
  - Explain vulnerability
  - OWASP guidance & cheat sheets
  - Alternative fix approaches
  - Security test case generation
  - Impact analysis
- **Monaco Editor** — Full-featured code editor (VS Code engine)
- **Desktop App** — Native desktop application via Tauri (Rust + WebView)
- **Web Interface** — Browser-based GUI with the same capabilities
- **VS Code Extension** — Use SecureFix directly within VS Code

### Search/Replace Block Format

Fixes are output in a structured format for precise code application:

```
<<<SEARCH
vulnerable_code_here
>>>
<<<REPLACE
secure_code_here
>>>
```

### WebSocket Protocol

**Fix Generation** — `ws://localhost:8000/api/fix/ws/fix`

```json
{
  "type": "fix_request",
  "vulnerability": { "id": "vuln-123", "cwe": "CWE-89", "severity": "high" },
  "codeContext": { "file_path": "app/views.py", "language": "python" }
}
```

**Chat** — `ws://localhost:8000/api/fix/ws/chat`

```json
{
  "type": "chat_message",
  "content": "Explain this SQL injection vulnerability",
  "context": { "vulnerability": { "cwe": "CWE-89" } }
}
```


## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Rust toolchain (for desktop app)
- Azure OpenAI API key or OpenAI API key

### Phase 1: Repository Analyzer

```bash
# Backend
cd Agent-Axios/agent-axios-backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows
pip install -r requirements.txt
cp .env.example .env            # Configure API keys
python main.py                  # Starts on http://localhost:5000

# Frontend
cd Agent-Axios/agent-axios-frontend
npm install
npm run dev                     # Starts on http://localhost:5173
```

### Phase 2: SecureFix IDE

#### Backend

```bash
cd AI-CodeEditor/securefix-ide/backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows
pip install -r requirements.txt
cp .env.example .env            # Configure API keys
python main.py                  # Starts on http://localhost:8000
```

#### Desktop App (Tauri)

```bash
cd AI-CodeEditor/securefix-ide/desktop
npm install

# Build Rust backend
cd src-tauri
set CARGO_BUILD_JOBS=2          # Limit parallel jobs if needed
cargo build --release
cd ..

# Run in development mode
npm run tauri dev
```

#### Web GUI

```bash
cd AI-CodeEditor/securefix-ide/gui
npm install
npm run dev                     # Starts on http://localhost:5173
```

### Environment Variables

```env
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

# Database
DATABASE_URL=sqlite+aiosqlite:///./securefix.db
```

> If both Azure OpenAI and standard OpenAI credentials are provided, Azure OpenAI takes priority.


## Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | Azure OpenAI GPT-4.1, OpenAI GPT-4 Turbo |
| **Agent Framework** | LangChain + LangGraph (ReAct pattern) |
| **Backend (Phase 1)** | Python, Flask, SQLAlchemy |
| **Backend (Phase 2)** | Python, FastAPI, async SQLAlchemy |
| **Frontend** | React 18, TypeScript, Redux Toolkit, Vite |
| **UI Components** | Shadcn/ui, Radix UI, Tailwind CSS |
| **Code Editor** | Monaco Editor |
| **Desktop** | Tauri v2 (Rust + WebView) |
| **Vector DB** | FAISS, Milvus |
| **Embeddings** | Cohere, OpenAI |
| **Database** | SQLite (async) |
| **Auth** | JWT |



## API Reference

### Phase 2 — SecureFix IDE Backend

#### REST Endpoints

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

#### WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `ws://localhost:8000/api/fix/ws/fix` | Streaming fix generation |
| `ws://localhost:8000/api/fix/ws/chat` | Interactive AI chat |

#### Health Check Response

```json
{
  "status": "healthy",
  "service": "SecureFix AI Fix Engine",
  "version": "2.3.0",
  "llm_configured": true
}
```



## Development

### Running Phase 2 (Two Terminals)

**Terminal 1 — Backend:**

```bash
cd AI-CodeEditor/securefix-ide/backend
python main.py
```

**Terminal 2 — Desktop App:**

```bash
cd AI-CodeEditor/securefix-ide/desktop
npm run tauri dev
```

### Testing

```bash
# Backend tests
cd AI-CodeEditor/securefix-ide/backend
pytest

# Frontend lint
cd AI-CodeEditor/securefix-ide/gui
npm run lint
```

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc







/home/developer/J2W/sem/Agent-Axios/reports/reports/analysis_5_report.txt
/home/developer/J2W/sem/Agent-Axios/reports/repositories/damn-vulnerable-MCP-server_1768676082504