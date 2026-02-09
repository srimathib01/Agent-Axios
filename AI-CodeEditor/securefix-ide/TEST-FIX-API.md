# Testing the AI Fix API

## 1. Start the Backend

```bash
cd "c:\Users\HP\OneDrive\Desktop\Agent-Axios\AI-CodeEditor\securefix-ide\backend"
python main.py
```

You should see:
```
INFO:     Starting SecureFix AI Fix Engine...
INFO:     Azure OpenAI configured: gpt-4
INFO:     Database initialized
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 2. Test Service Configuration

```bash
curl http://localhost:8000/api/fix/test
```

**Expected Output:**
```json
{
  "status": "ok",
  "message": "AI fix service is configured and ready",
  "service_initialized": true
}
```

**If you get an error**, check:
1. `.env` file has Azure OpenAI keys
2. `langchain-openai` is installed: `pip install langchain-openai`

---

## 3. Test Fix Generation (Streaming)

```bash
curl -N -X POST http://localhost:8000/api/fix/stream \
  -H "Content-Type: application/json" \
  -d '{
    "vulnerability": {
      "cve_id": "CVE-2024-TEST",
      "severity": "HIGH",
      "title": "SQL Injection",
      "description": "Unsanitized user input"
    },
    "code_context": {
      "file_path": "test.py",
      "line_start": 1,
      "line_end": 1,
      "vulnerable_code": "query = \"SELECT * FROM users WHERE id=\" + user_id",
      "surrounding_context": "def get_user(user_id):\n    query = \"SELECT * FROM users WHERE id=\" + user_id\n    return db.execute(query)"
    }
  }'
```

**Expected Output (SSE stream):**
```
data: {"type": "chunk", "content": "<<<"}
data: {"type": "chunk", "content": "SEARCH"}
data: {"type": "chunk", "content": "\nquery = \"SELECT * FROM users WHERE id=\" + user_id"}
data: {"type": "chunk", "content": "\n>>>"}
data: {"type": "chunk", "content": "\n<<<REPLACE"}
data: {"type": "chunk", "content": "\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", [user_id])"}
data: {"type": "chunk", "content": "\n>>>"}
data: {"type": "complete", "fix": {"type": "fix", "search_blocks": [...], "replace_blocks": [...], "raw_response": "..."}}
```

**What you should SEE:**
- ✅ Tokens streaming in real-time
- ✅ `<<<SEARCH` and `<<<REPLACE` blocks
- ✅ NO "please provide code" messages
- ✅ Actual code fix

**What you should NOT see:**
- ❌ "I need to see the vulnerable code"
- ❌ "Please provide the code"
- ❌ Repetitive messages
- ❌ Conversational text

---

## 4. Common Issues

### Issue: "AI service not configured"

**Problem**: Azure OpenAI keys not set

**Solution**: Edit `backend/.env`:
```env
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

Then restart backend.

---

### Issue: "Module not found: langchain_openai"

**Problem**: Dependency not installed

**Solution**:
```bash
pip install langchain-openai
```

---

### Issue: Loading forever, no output

**Problem**: Streaming issue or AI timeout

**Check backend logs**:
- Look for errors in terminal where `python main.py` is running
- Check if AI is actually being called
- Verify Azure OpenAI endpoint is accessible

**Debug**:
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if service initializes
curl http://localhost:8000/api/fix/test
```

---

### Issue: AI asks "please provide code"

**Problem**: Prompt not properly configured (shouldn't happen with new code)

**Solution**: Verify `backend/app/services/ai_fix_service.py` has the CRITICAL RULES prompt (lines 58-79)

---

## 5. Frontend Testing

Once backend works, test from frontend:

```typescript
// In your desktop app console
fetch('http://localhost:8000/api/fix/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vulnerability: {
      cve_id: 'CVE-TEST',
      severity: 'HIGH',
      title: 'Test',
      description: ''
    },
    code_context: {
      file_path: 'test.py',
      line_start: 1,
      line_end: 1,
      vulnerable_code: 'query = "SELECT * FROM users WHERE id=" + user_id',
      surrounding_context: ''
    }
  })
}).then(r => r.text()).then(console.log)
```

---

## 6. Verify Inline Diff Display

Once you get the fix response with `<<<SEARCH` / `<<<REPLACE` blocks:

1. The ChatMessage component should parse them
2. Display side-by-side diff (red = original, green = fixed)
3. Show Accept & Reject buttons

If this doesn't happen, the frontend components still need to be created/updated.

---

## Success Checklist

- [ ] Backend starts without errors
- [ ] `/api/fix/test` returns `"service_initialized": true`
- [ ] `/api/fix/stream` returns SSE stream
- [ ] Stream contains `<<<SEARCH` and `<<<REPLACE` blocks
- [ ] NO "please provide code" messages
- [ ] Actual code fix is generated

---

**Last Updated**: January 28, 2026
