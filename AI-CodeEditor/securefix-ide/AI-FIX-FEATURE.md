# AI Fix Feature - Implementation Guide

## Overview

The AI Fix feature provides **focused, minimal code fixes** for detected vulnerabilities with:

- ✅ **Direct code generation** (no generic recommendations)
- ✅ **Inline accept/reject buttons**
- ✅ **Minimal streaming responses** (no fluff)
- ✅ **Auto-navigation agent** for context gathering
- ✅ **Real-time fix application** to files

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Components                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FixWithAIButton  →  AIFixPanel  →  CodeFixDiff             │
│       ↓                  ↓              ↓                    │
│   Trigger fix      Stream fix      Accept/Reject            │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ SSE/WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  fix_routes.py  →  ai_fix_service.py  →  context_agent.py  │
│       ↓                  ↓                      ↓            │
│   API endpoints     GPT-4 streaming      Auto-gather context│
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                    Azure OpenAI GPT-4
```

---

## Backend Setup

### 1. Install Dependencies

```bash
cd agent-axios-backend
pip install langchain-openai
```

### 2. Environment Variables

Add to your `.env`:

```env
# Azure OpenAI (required)
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 3. Database Migration

Add new columns to `cve_findings` table:

```sql
ALTER TABLE cve_findings ADD COLUMN title VARCHAR(255);
ALTER TABLE cve_findings ADD COLUMN description TEXT;
ALTER TABLE cve_findings ADD COLUMN fix_applied INTEGER DEFAULT 0;
ALTER TABLE cve_findings ADD COLUMN fix_applied_at DATETIME;
ALTER TABLE cve_findings ADD COLUMN fix_rejected INTEGER DEFAULT 0;
ALTER TABLE cve_findings ADD COLUMN fix_rejection_reason VARCHAR(255);
```

Or simply delete your database to recreate with new schema:

```bash
rm agent-axios-backend/securefix.db
```

### 4. Start Backend

```bash
cd agent-axios-backend
python run.py
```

Backend will be available at `http://localhost:5000`

---

## Frontend Setup

### 1. Install Dependencies (if needed)

```bash
cd agent-axios-frontend
npm install
```

### 2. Environment Variables

Update `.env` or `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Start Frontend

```bash
npm run dev
```

---

## API Endpoints

### Generate Fix (SSE Streaming)

```http
POST /api/fix/stream
Content-Type: application/json

{
  "vulnerability": {
    "cve_id": "CVE-2024-1337",
    "severity": "HIGH",
    "title": "SQL Injection",
    "description": "Unsanitized user input in query"
  },
  "code_context": {
    "file_path": "src/db/queries.py",
    "line_start": 45,
    "line_end": 52,
    "vulnerable_code": "query = \"SELECT * FROM users WHERE id=\" + user_id",
    "surrounding_context": "..."
  }
}
```

**Response (SSE)**:

```
data: {"type": "chunk", "content": "<<<SEARCH"}
data: {"type": "chunk", "content": "\nquery = \"SELECT * FROM"}
...
data: {"type": "complete", "fix": {
  "type": "fix",
  "search_blocks": ["..."],
  "replace_blocks": ["..."],
  "raw_response": "..."
}}
```

### Apply Fix

```http
POST /api/fix/apply
Content-Type: application/json

{
  "file_path": "src/db/queries.py",
  "search_block": "original code",
  "replace_block": "fixed code",
  "vulnerability_id": 123
}
```

**Response**:

```json
{
  "status": "success",
  "message": "Fix applied to src/db/queries.py",
  "updated_file": "src/db/queries.py"
}
```

### Reject Fix

```http
POST /api/fix/reject
Content-Type: application/json

{
  "vulnerability_id": 123,
  "reason": "Not applicable"
}
```

---

## Frontend Integration

### Basic Usage

```tsx
import { FixWithAIButton } from '@/components/fix';

function VulnerabilityCard({ finding }) {
  return (
    <div>
      <h3>{finding.cve_id}</h3>
      <p>{finding.title}</p>

      <FixWithAIButton
        vulnerabilityId={finding.finding_id}
        vulnerability={{
          cve_id: finding.cve_id,
          severity: finding.severity,
          title: finding.title,
          description: finding.description
        }}
        codeContext={{
          file_path: finding.file_path,
          line_start: 45,
          line_end: 52,
          vulnerable_code: extractVulnerableCode(finding),
          surrounding_context: extractContext(finding)
        }}
        onFixApplied={() => {
          // Refresh findings
          refetchFindings();
        }}
      />
    </div>
  );
}
```

### Advanced Usage - Custom Panel

```tsx
import { AIFixPanel } from '@/components/fix';

function CustomFixView() {
  return (
    <AIFixPanel
      vulnerabilityId={123}
      vulnerability={vulnerabilityData}
      codeContext={codeContextData}
      onFixApplied={() => console.log('Applied!')}
      onFixRejected={() => console.log('Rejected')}
    />
  );
}
```

---

## AI Fix Prompt Design

The AI is instructed to:

1. **Generate ONLY code** - no "Certainly I can help", no explanations
2. **Output SEARCH/REPLACE blocks**:
   ```
   <<<SEARCH
   vulnerable_code_here
   >>>
   <<<REPLACE
   secure_code_here
   >>>
   ```
3. **Request context when needed**:
   ```
   <<<NEED_CONTEXT
   I need to see the import statements
   I need the function signature for validate_input()
   >>>
   ```

### Context Agent

When AI requests context, the `ContextAgent` automatically:

- Extracts imports from the file
- Finds function signatures
- Locates class definitions
- Reads dependency files (requirements.txt, package.json)
- Finds related code files

Then regenerates the fix with enhanced context.

---

## User Experience Flow

1. **User clicks "Fix with AI"** on a vulnerability
2. **Dialog opens** with streaming fix generation
3. **AI streams fix** token-by-token (minimal text)
4. **Code diff appears** with side-by-side comparison
5. **User reviews** the changes
6. **User clicks "Accept & Apply"** or "Reject"
7. **Backend applies fix** to the actual file
8. **Success confirmation** shown inline

### Minimal Streaming Example

Instead of:
```
"Certainly! I can help you fix this SQL injection vulnerability.
Let me analyze the code and provide a secure solution..."
```

You get:
```
<<<SEARCH
query = "SELECT * FROM users WHERE id=" + user_id
>>>
<<<REPLACE
cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
>>>
```

---

## File Structure

### Backend

```
agent-axios-backend/
├── app/
│   ├── routes/
│   │   └── fix_routes.py          # API endpoints
│   ├── services/
│   │   ├── ai_fix_service.py      # GPT-4 fix generation
│   │   └── context_agent.py       # Auto context gathering
│   └── models/
│       └── cve_finding.py         # Updated model
```

### Frontend

```
agent-axios-frontend/
├── src/
│   ├── components/
│   │   └── fix/
│   │       ├── FixWithAIButton.tsx    # Trigger button
│   │       ├── AIFixPanel.tsx         # Fix generation panel
│   │       ├── CodeFixDiff.tsx        # Diff viewer
│   │       └── index.ts               # Exports
│   └── services/
│       └── fixService.ts              # API client
```

---

## Testing

### Manual Testing

1. Start backend: `python run.py`
2. Start frontend: `npm run dev`
3. Navigate to a report with vulnerabilities
4. Click "Fix with AI" on any finding
5. Review the streamed fix
6. Click "Accept & Apply" to test file modification

### API Testing (cURL)

```bash
# Generate fix
curl -X POST http://localhost:5000/api/fix/stream \
  -H "Content-Type: application/json" \
  -d '{
    "vulnerability": {
      "cve_id": "CVE-2024-TEST",
      "severity": "HIGH",
      "title": "SQL Injection",
      "description": "Test vulnerability"
    },
    "code_context": {
      "file_path": "test.py",
      "line_start": 1,
      "line_end": 1,
      "vulnerable_code": "query = \"SELECT * FROM users WHERE id=\" + user_id"
    }
  }'
```

---

## Customization

### Change AI Model

Edit `ai_fix_service.py`:

```python
return AzureChatOpenAI(
    deployment_name="gpt-4o",  # Change model here
    temperature=0.05,  # Lower = more deterministic
    streaming=True
)
```

### Adjust Context Lines

Edit `context_agent.py`:

```python
def extract_code_block(self, ..., context_lines: int = 15):  # Default: 10
```

### Customize UI Theme

Edit `CodeFixDiff.tsx` colors:

```tsx
<div className="bg-green-50 dark:bg-green-950/20">
  {/* Customize diff colors */}
</div>
```

---

## Troubleshooting

### "LLM not configured" Error

- Check `.env` has Azure OpenAI credentials
- Restart backend after adding credentials

### Fix Not Applying

- Ensure file path is correct and file exists
- Check search block exactly matches file content
- Verify backend has write permissions

### Streaming Not Working

- Check CORS settings in backend
- Verify SSE endpoint is accessible
- Check browser console for errors

### Context Agent Errors

- Ensure repository path is correct
- Check file encoding (UTF-8 expected)
- Verify file permissions

---

## Future Enhancements

- [ ] Multi-file fix support
- [ ] Git integration (create branch + commit)
- [ ] Fix history and rollback
- [ ] AI-powered test generation for fixes
- [ ] Batch fix application
- [ ] Custom prompt templates per CWE

---

## License

Part of the Agent-Axios Project

---

**Document Version**: 1.0.0
**Last Updated**: January 2026
