# SecureFix AI IDE - Phase 2 Implementation Plan

> **A Standalone Security-Focused IDE Built with Tauri, React, and FastAPI**

---

## Architectural Overview

SecureFix IDE is a security-focused, AI-powered Integrated Development Environment with a modern three-layer architecture:

- **Full control** over the user experience and branding
- **Direct distribution** without marketplace dependencies
- **Native capabilities** via Tauri (Rust backend)
- **Professional product identity** like Cursor, Void, or WindSurf

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Repository Structure](#repository-structure)
4. [Technology Stack](#technology-stack)
5. [Data Flow & Messaging Protocol](#data-flow--messaging-protocol)
6. [API Specifications](#api-specifications)
7. [Implementation Phases](#implementation-phases)
8. [User Experience Design](#user-experience-design)
9. [Risk Mitigation](#risk-mitigation)
10. [Future Considerations](#future-considerations)

---

## Executive Summary

### Strategic Vision

Build an IDE that provides:
- Real-time vulnerability detection integrated with Phase 1 Repository Analyzer
- AI-powered fix suggestions with streaming responses (Cursor-style)
- Seamless code review workflow with inline diff visualization
- Interactive AI chat for vulnerability explanations

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Tauri Desktop App** | Native performance, small bundle size (~10MB vs Electron's ~150MB), secure by default |
| **Three-Layer Architecture** | Core (business logic) + Desktop (Tauri bridge) + GUI (React) - proven pattern |
| **Monaco Editor** | Same editor as VS Code, full-featured code editing with syntax highlighting |
| **Message-Passing Protocol** | Decoupled components, easier testing, reusable Core across platforms |
| **WebSocket Streaming** | Real-time AI responses, Cursor-style token-by-token display, responsive UX |
| **FastAPI Backend** | High-performance Python async server, native WebSocket support, LangChain integration |

### Phase 1 Integration

The standalone IDE connects to your **existing Repository Analyzer backend**:
- Vulnerability detection with CWE mapping
- Multi-language support (Python, Node.js, Java, Go, etc.)
- Detailed technical reports
- Phase 2 adds: Interactive fix generation and application layer

---

## Architecture Deep Dive

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SECUREFIX IDE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      GUI LAYER (React)                          │    │
│  │                                                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │    │
│  │  │ Vulnerability │  │    Chat      │  │    Diff Viewer       │ │    │
│  │  │    Panel     │  │   Panel      │  │  (Accept/Reject)     │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │    │
│  │  │    Monaco    │  │    File      │  │    Workspace         │ │    │
│  │  │    Editor    │  │  Explorer    │  │     Loader           │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │    │
│  │                                                                 │    │
│  │  State: Redux Toolkit | Styling: Tailwind CSS | Build: Vite   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                           Message Passing                                │
│                                    │                                     │
│  ┌─────────────────────────────────┴───────────────────────────────┐    │
│  │                      CORE LAYER (TypeScript)                     │    │
│  │                                                                  │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │    │
│  │  │ FixGenerator   │  │    Diff        │  │  Vulnerability  │   │    │
│  │  │   Service      │  │   Service      │  │    Service      │   │    │
│  │  └────────────────┘  └────────────────┘  └─────────────────┘   │    │
│  │                                                                  │    │
│  │  Protocol Types: gui-to-core.ts | core-to-gui.ts                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                           Tauri IPC Bridge                               │
│                                    │                                     │
│  ┌─────────────────────────────────┴───────────────────────────────┐    │
│  │                    DESKTOP LAYER (Tauri/Rust)                    │    │
│  │                                                                  │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │    │
│  │  │  File System   │  │    Shell       │  │    Window       │   │    │
│  │  │   Commands     │  │   Commands     │  │   Management    │   │    │
│  │  └────────────────┘  └────────────────┘  └─────────────────┘   │    │
│  │                                                                  │    │
│  │  Plugins: fs, shell, dialog, window-state                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                          HTTP / WebSocket
                                   │
┌──────────────────────────────────┴──────────────────────────────────────┐
│                        BACKEND LAYER (FastAPI)                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      FastAPI Server                              │    │
│  │  /api/fix/ws/fix  /api/fix/ws/chat  /api/fix/generate  /health  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────┴───────────────────────────────┐    │
│  │                         Services                                 │    │
│  │                                                                  │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │    │
│  │  │ FixGenerator   │  │   Context      │  │    Prompt       │   │    │
│  │  │   Service      │  │  Extraction    │  │   Templates     │   │    │
│  │  └────────────────┘  └────────────────┘  └─────────────────┘   │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                          Azure OpenAI / OpenAI                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Tauri Over Electron

| Aspect | Tauri | Electron |
|--------|-------|----------|
| **Bundle Size** | ~10MB | ~150MB+ |
| **Memory Usage** | ~50MB | ~200MB+ |
| **Security** | Rust backend, secure by default | Node.js, larger attack surface |
| **Performance** | Native Rust, minimal overhead | Chromium overhead |
| **Backend** | Rust (type-safe, fast) | Node.js |
| **IPC** | Command-based, strongly typed | Loose IPC |

---

## Repository Structure

```
securefix-ide/
├── core/                           # Business Logic (TypeScript)
│   ├── src/
│   │   ├── index.ts               # Main exports
│   │   ├── protocol/
│   │   │   ├── index.ts           # All message type definitions
│   │   │   ├── gui-to-core.ts     # GUI → Core messages
│   │   │   └── core-to-gui.ts     # Core → GUI messages
│   │   ├── services/
│   │   │   ├── FixGeneratorService.ts    # WebSocket streaming to backend
│   │   │   ├── DiffService.ts            # Diff computation & parsing
│   │   │   └── VulnerabilityService.ts   # Vulnerability data management
│   │   └── types/
│   │       ├── vulnerability.ts   # Vulnerability, CWE, OWASP types
│   │       ├── code-context.ts    # CodeContext, FrameworkInfo
│   │       └── diff-zone.ts       # DiffZone, SearchReplaceBlock
│   ├── package.json
│   └── tsconfig.json
│
├── gui/                            # React Webview
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # Root component
│   │   ├── pages/
│   │   │   └── MainView.tsx       # Main application view
│   │   ├── components/
│   │   │   ├── VulnerabilityPanel/
│   │   │   │   ├── VulnerabilityPanel.tsx
│   │   │   │   ├── VulnerabilityList.tsx
│   │   │   │   ├── VulnerabilityCard.tsx
│   │   │   │   └── VulnerabilityDetails.tsx
│   │   │   ├── Chat/
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── MessageList.tsx
│   │   │   └── DiffViewer/
│   │   │       ├── DiffViewer.tsx
│   │   │       ├── DiffControls.tsx
│   │   │       └── InlineDiff.tsx
│   │   ├── hooks/
│   │   │   ├── useMessaging.ts    # Message passing hook
│   │   │   └── useVulnerabilities.ts
│   │   ├── store/
│   │   │   ├── index.ts           # Redux store setup
│   │   │   ├── chatSlice.ts
│   │   │   ├── diffSlice.ts
│   │   │   └── vulnerabilitySlice.ts
│   │   └── styles/
│   │       └── index.css          # Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── desktop/                        # Tauri Desktop Application
│   ├── src/
│   │   └── renderer/
│   │       ├── index.tsx          # Entry point
│   │       ├── App.tsx            # Desktop app wrapper
│   │       ├── tauri-api.ts       # Tauri API wrapper
│   │       ├── bridge/
│   │       │   └── TauriMessenger.ts    # Tauri IPC bridge
│   │       ├── components/
│   │       │   ├── FileExplorer.tsx     # File tree navigation
│   │       │   └── WorkspaceLoader.tsx  # Project loader
│   │       ├── context/
│   │       │   └── WorkspaceContext.tsx
│   │       ├── hooks/
│   │       │   ├── useAIFixEngine.ts    # AI Fix Engine integration
│   │       │   └── useWorkspace.ts
│   │       └── services/
│   │           ├── AIFixEngineService.ts
│   │           ├── repositoryService.ts
│   │           └── vulnerabilityLoader.ts
│   ├── editor/
│   │   ├── MonacoEditor.tsx       # Monaco integration
│   │   └── decorations.ts         # Inline decorations
│   ├── src-tauri/                  # Rust Backend
│   │   ├── src/
│   │   │   ├── main.rs            # Tauri app entry
│   │   │   └── commands.rs        # IPC command handlers
│   │   ├── Cargo.toml             # Rust dependencies
│   │   └── tauri.conf.json        # Tauri configuration
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                        # FastAPI Server
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt           # Python dependencies
│   ├── config/
│   │   └── settings.py            # Pydantic settings
│   └── app/
│       ├── models/
│       │   ├── base.py            # SQLAlchemy base
│       │   └── fix_suggestion.py  # Database models
│       ├── routes/
│       │   └── fix_routes.py      # WebSocket & REST endpoints
│       └── services/
│           ├── fix_generator_service.py
│           ├── context_extraction_service.py
│           └── prompt_templates.py
│
├── extensions/
│   └── vscode/                     # VS Code Extension (Optional)
│       ├── src/
│       │   ├── extension.ts
│       │   ├── VsCodeExtension.ts
│       │   └── VsCodeMessenger.ts
│       └── package.json
│
├── packages/                       # Shared NPM Packages
│   ├── protocol-types/
│   └── config-schema/
│
├── package.json                    # Root workspace config
├── tsconfig.base.json
└── README.md
```

---

## Technology Stack

### Frontend (GUI Layer)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **Redux Toolkit** | 2.x | State management |
| **Vite** | 5.x | Fast builds, HMR |

### Desktop Layer (Tauri)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tauri** | 2.0 | Desktop framework |
| **Rust** | Latest | Native backend |
| **Monaco Editor** | Latest | Code editing |
| **tauri-plugin-fs** | 2.x | File system access |
| **tauri-plugin-shell** | 2.x | Command execution |
| **tauri-plugin-dialog** | 2.x | Native dialogs |

### Core Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **TypeScript** | 5.x | Core logic |
| **diff-match-patch** | 1.x | Diff computation |
| **zod** | 3.x | Runtime validation |

### Backend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.100+ | API server |
| **Python** | 3.10+ | Runtime |
| **SQLAlchemy** | 2.0+ | ORM (async) |
| **LangChain** | Latest | LLM integration |
| **OpenAI/Azure OpenAI** | Latest | AI backbone |
| **WebSockets** | Native | Streaming |
| **SQLite** | 3.x | Database |

---

## Data Flow & Messaging Protocol

### Message Categories

| Message Type | Direction | Examples |
|--------------|-----------|----------|
| **GUI → Core** | Request | `request_fix`, `apply_fix`, `reject_fix`, `chat_message`, `quick_action` |
| **Core → GUI** | Response | `fix_stream_chunk`, `fix_complete`, `vulnerability_list`, `chat_chunk` |
| **Tauri IPC** | Bidirectional | File operations, shell commands, dialog requests |

### Fix Generation Data Flow

```
1. User clicks "Fix Vulnerability" in GUI
   ↓
2. GUI sends: {type: "request_fix", vulnerabilityId, codeContext}
   ↓
3. Core FixGeneratorService connects to Backend WebSocket
   ↓
4. Backend receives fix request with:
   - Vulnerability info (CWE, severity, OWASP)
   - Code context (file, lines, imports, framework)
   ↓
5. Backend generates security-aware prompt with CWE guidance
   ↓
6. Backend streams from Azure OpenAI/OpenAI
   ↓
7. Backend sends chunks: {type: "fix_chunk", content: "...", done: false}
   ↓
8. Core parses search/replace blocks, computes diffs
   ↓
9. GUI displays streaming fix + inline diff visualization
   ↓
10. User accepts/rejects the fix
   ↓
11. If accepted: Tauri writes changes to file system
```

### Search/Replace Block Format

```
<<<SEARCH
vulnerable_code_here
>>>
<<<REPLACE
secure_code_here
>>>
```

---

## API Specifications

### Backend Endpoints

#### WebSocket Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/fix/ws/fix` | Streaming fix generation |
| `POST /api/fix/ws/chat` | Streaming chat conversation |

**Fix Request:**
```typescript
{
  type: "fix_request",
  vulnerability: {
    id: string,
    cwe_id: string,
    severity: "critical" | "high" | "medium" | "low",
    description: string,
    owasp_category?: string
  },
  codeContext: {
    fileUri: string,
    startLine: number,
    endLine: number,
    code: string,
    surroundingCode: string,
    imports: string[],
    framework?: string
  }
}
```

**Fix Chunk Response:**
```typescript
{
  type: "fix_chunk",
  content: string,
  done: boolean,
  search_blocks?: SearchReplaceBlock[]  // Only when done=true
}
```

#### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fix/generate` | POST | Non-streaming fix generation |
| `/api/fix/history` | GET | Get fix history |
| `/api/fix/{id}` | GET | Get specific fix |
| `/api/fix/{id}/status` | PATCH | Update fix status |
| `/api/fix/quick-action` | POST | Non-streaming quick action |
| `/health` | GET | Health check |

### Tauri Commands

| Command | Description |
|---------|-------------|
| `read_file` | Read file contents |
| `write_file` | Write file contents |
| `read_directory` | List directory contents |
| `create_directory` | Create new directory |
| `delete_file` | Delete file |
| `run_command` | Execute shell command |
| `open_file_dialog` | Show file picker |
| `open_folder_dialog` | Show folder picker |

---

## Implementation Phases

### Phase 2.1: Foundation

**Goal:** Establish the desktop application skeleton with three-layer architecture.

| Task | Details |
|------|---------|
| **Tauri Setup** | Initialize Tauri project, configure plugins (fs, shell, dialog) |
| **Core Initialization** | Create Core module with service stubs, define protocol types |
| **GUI Scaffolding** | Set up React with Vite, establish Tauri IPC bridge |
| **Monaco Integration** | Integrate Monaco editor with syntax highlighting |

### Phase 2.2: Vulnerability Integration

**Goal:** Connect to Phase 1 backend and display vulnerabilities.

| Task | Details |
|------|---------|
| **Backend Communication** | HTTP client for Phase 1 API, WebSocket connection |
| **Vulnerability Display** | VulnerabilityPanel component, severity color coding |
| **Editor Decorations** | Monaco decorations for vulnerable lines, gutter icons |
| **Navigation** | Click-to-navigate from panel to code |

**Severity Color Mapping:**
| Severity | Color | Icon |
|----------|-------|------|
| Critical | Red | Error |
| High | Orange | Warning |
| Medium | Yellow | Info |
| Low | Blue | Hint |

### Phase 2.3: AI Fix Engine (Core Feature)

**Goal:** Implement streaming AI fix generation with security-focused prompts.

| Task | Details |
|------|---------|
| **WebSocket Streaming** | Real-time token-by-token display |
| **Context Extraction** | Extract code context, imports, framework patterns |
| **Prompt Engineering** | Security-focused templates with CWE/OWASP context |
| **Search/Replace Parsing** | Parse fix output into structured blocks |

### Phase 2.4: DiffZone & Apply/Reject

**Goal:** Implement inline diff visualization with accept/reject workflow.

| Task | Details |
|------|---------|
| **DiffZone Implementation** | Monaco decorations for added/removed lines |
| **Apply Logic** | Parse search/replace blocks, apply edits via Tauri |
| **Reject Logic** | Remove DiffZone, restore original state |
| **Keyboard Navigation** | Shortcuts for accept/reject |

### Phase 2.5: Chat & Explanation

**Goal:** Interactive AI assistant for vulnerability explanations.

| Task | Details |
|------|---------|
| **Chat Panel UI** | Message list, input box, code blocks |
| **Context Injection** | Include current file, vulnerability in prompts |
| **Quick Actions** | Explain, OWASP guidance, alternative fix, test cases |

### Phase 2.6: Polish & Production

**Goal:** Production-ready polish and performance optimization.

| Task | Details |
|------|---------|
| **Fix History** | Track applied fixes, undo/redo support |
| **Settings Panel** | Backend URL, theme preferences |
| **Performance** | Lazy loading, efficient updates |
| **Build & Distribution** | Tauri bundling for Windows/Mac/Linux |

---

## User Experience Design

### Primary Workflow

```
1. OPEN WORKSPACE
   File → Open Folder or drag-drop project
   ↓
2. TRIGGER SCAN
   Click "Scan for Vulnerabilities" or auto-scan on open
   ↓
3. VIEW VULNERABILITIES
   Sidebar shows list grouped by severity
   Editor shows inline markers (decorations, gutter icons)
   ↓
4. SELECT VULNERABILITY
   Click in panel → Navigates to affected code
   Shows details: CWE, severity, description
   ↓
5. REQUEST FIX
   Click "Fix with AI" → Fix streams in real-time
   Token-by-token display (Cursor-style)
   ↓
6. REVIEW DIFF
   DiffZone highlights proposed changes inline
   Red = removed, Green = added
   ↓
7. APPLY OR REJECT
   Accept (applies to file) or Reject (discards)
   ↓
8. OPTIONAL: CHAT
   Ask follow-up questions
   Request alternative approaches
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Trigger vulnerability scan |
| `Ctrl+Shift+F` | Fix selected vulnerability |
| `Ctrl+Shift+Y` | Navigate to next DiffZone |
| `Ctrl+Shift+U` | Navigate to previous DiffZone |
| `Enter` (in DiffZone) | Accept current fix |
| `Escape` (in DiffZone) | Reject current fix |
| `Ctrl+Shift+L` | Open chat panel |
| `Ctrl+Z` | Undo last applied fix |

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| **AI generates incorrect fix** | Human approval required, diff review, test validation |
| **Fix breaks functionality** | Checkpoint before apply, undo support |
| **WebSocket connection drops** | Auto-reconnect, resume from last chunk |
| **Large file performance** | Virtual scrolling, incremental diff computation |

### Security Risks

| Risk | Mitigation |
|------|------------|
| **Code sent to external AI** | Option for local LLM (Ollama), clear data handling policy |
| **Malicious repository** | Sandbox operations, no auto-execute, user confirmation |

### Safety Layers

1. **Human Approval** - Never auto-apply fixes
2. **Diff Review** - Clear visualization of all proposed changes
3. **Checkpoint System** - Automatic snapshot before applying fix
4. **Undo Support** - One-click rollback

---

## Future Considerations

### VS Code Extension

The Core module is IDE-agnostic. For VS Code:
- Extension in `extensions/vscode/`
- Reuses Core services
- VS Code-specific webview provider

### Local LLM Support

For enterprise users requiring on-premises AI:
- Architecture supports swapping Azure OpenAI for Ollama
- Configuration option for LLM endpoint

### CI/CD Integration

A headless CLI mode could enable:
- Automated scanning in CI/CD pipelines
- Fix suggestions during pull request review

### Multi-File Fixes

Some vulnerabilities require coordinated changes:
- Extend DiffZone to track multiple files
- Atomic apply/reject across file set

---

## Development Workflow

```bash
# Install all dependencies
npm install

# Run development servers
npm run dev:core          # Watch core TypeScript
npm run dev:gui           # Watch GUI (Vite)
npm run dev:desktop       # Watch desktop (Tauri + Vite)

# Build for production
npm run build             # Build all packages
npm run build:desktop     # Build desktop app

# Start backend
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
python main.py            # Runs on port 8000
```

---

## Conclusion

SecureFix IDE combines modern technologies to deliver a professional security-focused development environment:

| Aspect | Implementation |
|--------|---------------|
| **Desktop** | Tauri 2.0 (Rust backend, native performance) |
| **Frontend** | React 18 + Redux Toolkit + Tailwind CSS |
| **Editor** | Monaco (VS Code editor) |
| **Backend** | FastAPI + LangChain + Azure OpenAI |
| **Database** | SQLite with async SQLAlchemy |
| **Build** | Vite + Tauri CLI |

The architecture enables:
- **Native performance** without Electron overhead
- **Secure by default** with Rust backend
- **Streaming AI responses** for responsive UX
- **Multi-platform support** (Windows, Mac, Linux)
- **Extensibility** via VS Code extension or local LLM

---

*Document Version: 3.0*
*Last Updated: January 2026*
*For: SecureFix AI IDE Project - Phase 2*
