# SecureFix AI IDE

AI-Powered Security Vulnerability Detection and Fix Generation for VS Code.

## Overview

SecureFix AI IDE is a VS Code extension that integrates with the Phase 1 Repository Analyzer backend to provide:

- **Real-time vulnerability detection** with CWE mapping
- **AI-powered fix suggestions** with streaming responses (Cursor-style)
- **Inline diff visualization** with accept/reject workflow (Void-style)
- **Interactive AI chat** for vulnerability explanations

## Architecture

The project follows a three-layer architecture inspired by Continue.dev:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SecureFix Extension                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐     │
│  │    GUI      │  │  Extension  │  │         Core            │     │
│  │   Layer     │  │    Layer    │  │        Layer            │     │
│  │             │  │             │  │                         │     │
│  │ • Vuln Panel│  │ • Commands  │  │ • VulnerabilityService  │     │
│  │ • AI Chat   │←→│ • Decorators│←→│ • FixGeneratorService   │     │
│  │ • Diff View │  │ • Webview   │  │ • DiffService           │     │
│  │             │  │             │  │                         │     │
│  │   React +   │  │  VS Code    │  │   TypeScript            │     │
│  │  Tailwind   │  │    API      │  │                         │     │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
securefix-ide/
├── core/                    # Business logic (IDE-agnostic)
│   ├── src/
│   │   ├── protocol/        # Message type definitions
│   │   ├── services/        # Core services
│   │   └── types/           # Type definitions
│   └── package.json
│
├── gui/                     # React webview
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # React hooks
│   │   ├── store/           # Redux store
│   │   └── pages/           # Main views
│   └── package.json
│
├── extensions/
│   └── vscode/              # VS Code extension
│       ├── src/
│       │   ├── commands/    # Command handlers
│       │   ├── decorations/ # Editor decorations
│       │   └── webview/     # Webview provider
│       └── package.json
│
└── package.json             # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- VS Code 1.76+

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd securefix-ide
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

### Development

1. Open the project in VS Code:
   ```bash
   code .
   ```

2. Start the development watchers:
   ```bash
   # Terminal 1: Watch core
   npm run dev:core

   # Terminal 2: Watch GUI
   npm run dev:gui

   # Terminal 3: Watch extension
   npm run watch:extension
   ```

3. Press F5 to launch the Extension Development Host

### Commands

The extension provides the following commands:

| Command | Shortcut | Description |
|---------|----------|-------------|
| `SecureFix: Clone Repository` | - | Clone a Git repository for scanning |
| `SecureFix: Scan Workspace` | `Ctrl+Shift+S` | Trigger vulnerability scan |
| `SecureFix: Fix Selected Vulnerability` | `Ctrl+Shift+F` | Generate AI fix |
| `SecureFix: Accept Fix` | `Enter` | Accept pending fix |
| `SecureFix: Reject Fix` | `Escape` | Reject pending fix |
| `SecureFix: Go to Next Fix` | `Ctrl+Shift+Y` | Navigate to next fix |
| `SecureFix: Go to Previous Fix` | `Ctrl+Shift+U` | Navigate to previous fix |

## Configuration

Configure the extension in VS Code settings:

```json
{
  "securefix.backendUrl": "http://localhost:8000",
  "securefix.apiKey": "",
  "securefix.autoScan": true,
  "securefix.showInlineDecorations": true,
  "securefix.severity.filter": ["critical", "high", "medium", "low"]
}
```

## Message Protocol

Components communicate through a typed message protocol:

### GUI → Core Messages
- `request_fix` - Request AI fix generation
- `apply_fix` - Apply a suggested fix
- `reject_fix` - Reject a suggested fix
- `chat_message` - Send chat message

### Core → GUI Messages
- `fix_stream_chunk` - Streaming fix content
- `fix_complete` - Fix generation complete
- `vulnerability_list` - Vulnerability list update
- `scan_progress` - Scan progress update

### Extension ↔ Core Messages
- `file_opened` - File opened in editor
- `show_decoration` - Show vulnerability decorations
- `create_diff_zone` - Create inline diff
- `apply_edit` - Apply edit to file

## Backend Integration

The extension connects to the Phase 1 Repository Analyzer backend:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | POST | Start vulnerability scan |
| `/api/scan/{id}/status` | GET | Get scan status |
| `/ws/fix` | WebSocket | Stream fix generation |
| `/ws/chat` | WebSocket | Chat with AI |

## Technology Stack

- **GUI**: React 18, TypeScript, Tailwind CSS, Redux Toolkit
- **Extension**: VS Code Extension API, esbuild
- **Core**: TypeScript, WebSocket

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
