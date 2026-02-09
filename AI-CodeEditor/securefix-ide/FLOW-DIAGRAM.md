# AI Fix Feature - Flow Diagram

## User Experience Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   User sees vulnerability                    │
│                                                              │
│   CVE-2024-1337: SQL Injection in db/queries.py:45         │
│   Severity: HIGH                                            │
│   [Fix with AI] ← User clicks this                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Dialog opens - AI Fix Panel                 │
│                                                              │
│   ┌──────────────────────────────────────────────────┐     │
│   │ 🌟 AI Fix                                        │     │
│   │ CVE-2024-1337 - SQL Injection                    │     │
│   │                                                   │     │
│   │ [Generating...] ← Streaming status               │     │
│   └──────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AI streams fix token-by-token                   │
│                                                              │
│   <<<SEARCH                                                 │
│   query = "SELECT * FROM users WHERE id=" + user_id         │
│   >>>                                                       │
│   <<<REPLACE                                                │
│   cursor.execute("SELECT * FROM users WHERE id = %s", ...)  │
│   >>>                                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Code diff appears with buttons                  │
│                                                              │
│   ┌──────────────────────────────────────────────────┐     │
│   │ db/queries.py                                    │     │
│   ├──────────────────────┬───────────────────────────┤     │
│   │ - Original           │ + Fixed                   │     │
│   ├──────────────────────┼───────────────────────────┤     │
│   │ query = "SELECT *    │ cursor.execute(           │     │
│   │ FROM users WHERE     │   "SELECT * FROM users    │     │
│   │ id=" + user_id       │   WHERE id = %s",         │     │
│   │                      │   [user_id]               │     │
│   │                      │ )                         │     │
│   ├──────────────────────┴───────────────────────────┤     │
│   │              [Reject] [Accept & Apply]           │     │
│   └──────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    User decides
                     ↙          ↘
                   ↙              ↘
                 ↙                  ↘
              ↙                      ↘
           Accept                   Reject
             ↓                         ↓
┌─────────────────────┐   ┌─────────────────────┐
│  Fix applied to     │   │  Fix rejected &     │
│  db/queries.py      │   │  marked in DB       │
│                     │   │                     │
│  ✅ Success shown  │   │  ❌ Rejected shown │
└─────────────────────┘   └─────────────────────┘
```

---

## Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
         User clicks "Fix with AI" button
                           │
                           ▼
         ┌──────────────────────────────────┐
         │   FixWithAIButton.tsx            │
         │   - Opens dialog                 │
         │   - Renders AIFixPanel           │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   AIFixPanel.tsx                 │
         │   - Calls fixService             │
         │   - Manages streaming state      │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   fixService.ts                  │
         │   - POST /api/fix/stream         │
         │   - Reads SSE stream             │
         └──────────────┬───────────────────┘
                        │
                        │ HTTP POST
                        │
┌───────────────────────▼───────────────────────────────────┐
│                       BACKEND                              │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   fix_routes.py                  │
         │   - /api/fix/stream endpoint     │
         │   - Creates SSE generator        │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   ai_fix_service.py              │
         │   - Builds prompt                │
         │   - Streams from GPT-4           │
         │   - Parses SEARCH/REPLACE        │
         └──────────────┬───────────────────┘
                        │
             Does AI need more context?
                   ↙         ↘
                 Yes          No
                 ↓             ↓
    ┌────────────────────┐    Continue
    │ context_agent.py   │    streaming
    │ - Extract imports  │        ↓
    │ - Find functions   │        ↓
    │ - Read deps        │        ↓
    └─────────┬──────────┘        ↓
              │                   ↓
              └──> Retry with ────┘
                   enhanced context
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│                    Azure OpenAI GPT-4                      │
│                    Generates code fix                      │
└──────────────────────┬────────────────────────────────────┘
                       │
                       │ Streams tokens
                       │
                       ▼
         ┌──────────────────────────────────┐
         │   Parse response                 │
         │   - Extract SEARCH blocks        │
         │   - Extract REPLACE blocks       │
         └──────────────┬───────────────────┘
                        │
                        │ SSE stream
                        │
┌───────────────────────▼───────────────────────────────────┐
│                      FRONTEND                              │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   CodeFixDiff.tsx                │
         │   - Shows diff view              │
         │   - Accept/Reject buttons        │
         └──────────────┬───────────────────┘
                        │
              User clicks "Accept"
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   fixService.applyFix()          │
         │   - POST /api/fix/apply          │
         └──────────────┬───────────────────┘
                        │
                        │ HTTP POST
                        │
┌───────────────────────▼───────────────────────────────────┐
│                      BACKEND                               │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   fix_routes.py                  │
         │   - /api/fix/apply endpoint      │
         │   - Read file                    │
         │   - Replace code                 │
         │   - Write file                   │
         │   - Update DB                    │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   File System                    │
         │   - Code is modified             │
         └──────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   Database                       │
         │   - fix_applied = 1              │
         │   - fix_applied_at = NOW()       │
         └──────────────────────────────────┘
                        │
                        │ Success response
                        │
┌───────────────────────▼───────────────────────────────────┐
│                      FRONTEND                              │
│   Shows: ✅ Fix applied to db/queries.py                 │
└────────────────────────────────────────────────────────────┘
```

---

## Context Agent Flow

```
┌─────────────────────────────────────────────────────────────┐
│   AI responds: "I need import statements and function       │
│                 signature for validate_input()"            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │   ContextAgent.gather_context()  │
         └──────────────┬───────────────────┘
                        │
            Parses request into tasks:
              1. Extract imports
              2. Find validate_input() signature
                        │
           ┌────────────┴────────────┐
           │                         │
           ▼                         ▼
    Extract imports          Find functions
           │                         │
    ┌──────────────┐         ┌──────────────┐
    │ import re    │         │ def validate │
    │ import sql   │         │ _input(data, │
    │ from django  │         │  schema):    │
    └──────────────┘         └──────────────┘
           │                         │
           └────────────┬────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   Combine context                │
         │   {                              │
         │     imports: [...],              │
         │     functions: [...],            │
         │     dependencies: {...}          │
         │   }                              │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   ai_fix_service.py              │
         │   - Enhance code_context         │
         │   - Retry fix generation         │
         └──────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │   GPT-4 with full context        │
         │   - Now generates accurate fix   │
         └──────────────────────────────────┘
```

---

## Data Flow

### Request Data (Frontend → Backend)

```json
{
  "vulnerability": {
    "cve_id": "CVE-2024-1337",
    "severity": "HIGH",
    "title": "SQL Injection",
    "description": "Unsanitized user input"
  },
  "code_context": {
    "file_path": "src/db/queries.py",
    "line_start": 45,
    "line_end": 52,
    "vulnerable_code": "query = \"SELECT * ...\"",
    "surrounding_context": "def get_user(user_id):\n  ..."
  }
}
```

### Streaming Response (Backend → Frontend)

```
data: {"type": "chunk", "content": "<<<"}
data: {"type": "chunk", "content": "SEARCH"}
data: {"type": "chunk", "content": "\nquery"}
...
data: {"type": "complete", "fix": {
  "type": "fix",
  "search_blocks": ["query = \"SELECT * FROM users WHERE id=\" + user_id"],
  "replace_blocks": ["cursor.execute(\"SELECT * FROM users WHERE id = %s\", [user_id])"],
  "raw_response": "<<<SEARCH\n...\n>>>"
}}
```

### Apply Fix Request

```json
{
  "file_path": "src/db/queries.py",
  "search_block": "query = \"SELECT * FROM users WHERE id=\" + user_id",
  "replace_block": "cursor.execute(\"SELECT * FROM users WHERE id = %s\", [user_id])",
  "vulnerability_id": 123
}
```

### Apply Fix Response

```json
{
  "status": "success",
  "message": "Fix applied to src/db/queries.py",
  "updated_file": "src/db/queries.py"
}
```

---

## Component Hierarchy

```
Reports.tsx (or any vulnerability list view)
  │
  ├── VulnerabilityCard
  │   └── FixWithAIButton ← User clicks
  │       └── Dialog
  │           └── AIFixPanel
  │               ├── Streaming status
  │               ├── Error display
  │               └── CodeFixDiff (when complete)
  │                   ├── Diff view
  │                   ├── Accept button
  │                   └── Reject button
```

---

## State Flow

```
AIFixPanel State:
  idle → generating → complete → accepted/rejected
   ↓         ↓           ↓            ↓
  Wait    Stream      Show      Show success
          chunks      diff      message
```

---

## Error Handling Flow

```
Error during generation
        ↓
ai_fix_service.py catches exception
        ↓
on_error callback triggered
        ↓
SSE sends error event
        ↓
Frontend shows error UI
        ↓
User can retry or close
```

---

**Diagram Version**: 1.0.0
**Last Updated**: January 2026
