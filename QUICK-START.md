# AI Fix Feature - Quick Start Guide

Get the AI fix feature running in **5 minutes**.

---

## Step 1: Backend Setup (2 minutes)

### 1.1 Navigate to backend
```bash
cd c:\Users\HP\OneDrive\Desktop\Agent-Axios\Agent-Axios\agent-axios-backend
```

### 1.2 Install dependencies (if needed)
```bash
pip install langchain-openai
```

### 1.3 Set up environment variables

Edit `.env` file and add:

```env
# Azure OpenAI (required)
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 1.4 Run database migration

**Option A: Run migration script**
```bash
python migrations/add_fix_fields.py
```

**Option B: Delete database to recreate (easier)**
```bash
# Windows
del instance\securefix.db

# Then restart the app - tables will be recreated
```

### 1.5 Start backend
```bash
python run.py
```

You should see:
```
* Running on http://127.0.0.1:5000
```

---

## Step 2: Frontend Setup (1 minute)

### 2.1 Navigate to frontend
```bash
cd c:\Users\HP\OneDrive\Desktop\Agent-Axios\Agent-Axios\agent-axios-frontend
```

### 2.2 Verify API URL

Check `.env` or `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 2.3 Start frontend
```bash
npm run dev
```

You should see:
```
  VITE ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

---

## Step 3: Add Fix Button (2 minutes)

### 3.1 Open your vulnerability display component

Example: Update Reports page or wherever you show vulnerabilities.

### 3.2 Import the component

```tsx
import { FixWithAIButton } from '@/components/fix';
```

### 3.3 Add the button

```tsx
function VulnerabilityCard({ finding }) {
  return (
    <Card>
      <CardHeader>
        <h3>{finding.cve_id}</h3>
        <p>{finding.title}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {finding.file_path}
        </p>

        {/* Add this button */}
        <FixWithAIButton
          vulnerabilityId={finding.finding_id}
          vulnerability={{
            cve_id: finding.cve_id,
            severity: finding.severity,
            title: finding.title || finding.cve_id,
            description: finding.description || finding.cve_description || ''
          }}
          codeContext={{
            file_path: finding.file_path,
            line_start: 1,  // TODO: Extract from finding
            line_end: 10,   // TODO: Extract from finding
            vulnerable_code: finding.code_snippet || '',
            surrounding_context: finding.context || ''
          }}
          onFixApplied={() => {
            // Refresh your findings list
            console.log('Fix applied!');
          }}
        />
      </CardContent>
    </Card>
  );
}
```

### 3.4 Save and refresh

The "Fix with AI" button should now appear on each vulnerability.

---

## Step 4: Test It! (1 minute)

### 4.1 Navigate to a report with vulnerabilities

Open your app at `http://localhost:5173` and go to a page showing vulnerabilities.

### 4.2 Click "Fix with AI"

A dialog should open and start streaming the fix.

### 4.3 Review the fix

You'll see:
- Streaming text as AI generates the fix
- A code diff showing original vs fixed code
- Accept and Reject buttons

### 4.4 Click "Accept & Apply"

The fix will be applied to the actual file!

---

## Troubleshooting

### "LLM not configured" error

**Problem**: Backend can't connect to Azure OpenAI

**Solution**:
1. Check `.env` has correct Azure credentials
2. Restart backend: `python run.py`

---

### Fix button doesn't appear

**Problem**: Component import failed

**Solution**:
1. Check component path: `@/components/fix`
2. Verify all files were created
3. Check browser console for errors

---

### "File not found" when applying fix

**Problem**: File path is incorrect

**Solution**:
1. Ensure `file_path` in codeContext matches actual file
2. Use absolute or relative paths consistently
3. Check file exists in repository

---

### No streaming/fix generation hangs

**Problem**: Backend connection issue

**Solution**:
1. Check backend is running on port 5000
2. Check CORS settings
3. Check browser Network tab for errors

---

## Next Steps

### ✅ Customize the UI

Edit these files to match your design:
- `CodeFixDiff.tsx` - Diff viewer styling
- `AIFixPanel.tsx` - Panel layout
- `FixWithAIButton.tsx` - Button appearance

### ✅ Add to more views

Add the button to:
- Vulnerability detail pages
- Dashboard widgets
- Reports export view
- Notification alerts

### ✅ Enhance code context extraction

Currently you need to provide:
- `line_start` and `line_end`
- `vulnerable_code`
- `surrounding_context`

Create a utility function to extract this from your data:

```tsx
function extractCodeContext(finding: Finding): CodeContext {
  // TODO: Implement based on your data structure
  return {
    file_path: finding.file_path,
    line_start: finding.line_number,
    line_end: finding.line_number + 5,
    vulnerable_code: finding.code_snippet,
    surrounding_context: finding.full_context
  };
}
```

### ✅ Monitor usage

Track:
- How many fixes are generated
- Acceptance rate
- Rejection reasons
- Common fix patterns

Add analytics in `handleAcceptFix` and `handleRejectFix`.

---

## Key Files Reference

### Backend
- **API Routes**: `app/routes/fix_routes.py`
- **AI Service**: `app/services/ai_fix_service.py`
- **Context Agent**: `app/services/context_agent.py`

### Frontend
- **Main Button**: `src/components/fix/FixWithAIButton.tsx`
- **Fix Panel**: `src/components/fix/AIFixPanel.tsx`
- **Diff Viewer**: `src/components/fix/CodeFixDiff.tsx`
- **API Client**: `src/services/fixService.ts`

### Documentation
- **Full Guide**: `AI-FIX-FEATURE.md`
- **Flow Diagrams**: `FLOW-DIAGRAM.md`
- **Summary**: `IMPLEMENTATION-SUMMARY.md`

---

## Need Help?

1. **Check logs**:
   - Backend: Console output where `python run.py` is running
   - Frontend: Browser DevTools Console (F12)

2. **Read full documentation**:
   - [AI-FIX-FEATURE.md](./AI-CodeEditor/securefix-ide/AI-FIX-FEATURE.md)
   - [FLOW-DIAGRAM.md](./AI-CodeEditor/securefix-ide/FLOW-DIAGRAM.md)

3. **Test API directly**:
   ```bash
   curl -X POST http://localhost:5000/api/fix/stream \
     -H "Content-Type: application/json" \
     -d '{"vulnerability": {...}, "code_context": {...}}'
   ```

---

## Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Database migrated with new columns
- [ ] Azure OpenAI credentials configured
- [ ] Fix button appears in UI
- [ ] Click button opens dialog
- [ ] Fix streams and appears
- [ ] Accept button works
- [ ] File is modified correctly
- [ ] Database updated with fix status

---

**You're ready to fix vulnerabilities with AI!** 🎉

**Quick Start Version**: 1.0.0
**Last Updated**: January 2026
