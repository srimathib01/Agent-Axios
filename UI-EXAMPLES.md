# AI Fix Feature - UI Examples

Visual representation of what users will see.

---

## Example 1: Vulnerability Card with Fix Button

```
┌──────────────────────────────────────────────────────────────┐
│ CVE-2024-1337                                   [HIGH]        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  SQL Injection in Database Query Handler                     │
│                                                               │
│  📄 src/db/queries.py:45-52                                  │
│  🎯 Confidence: 95.2%                                        │
│  ✅ Status: Confirmed                                        │
│                                                               │
│  Unsanitized user input is directly concatenated into        │
│  SQL query, allowing potential SQL injection attacks.        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [✨ Fix with AI]  [View Details]  [Mark Safe]        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 2: Fix Generation Dialog (Streaming)

User clicks "Fix with AI" button:

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                      [⟳ Generating]         │  │
│  │ CVE-2024-1337 - SQL Injection                         │  │
│  │                                                        │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ <<<SEARCH                                          │ │  │
│  │ │ query = "SELECT * FROM users WHERE id=" + user_id  │ │  │
│  │ │ >>>                                                │ │  │
│  │ │ <<<REPLACE                                         │ │  │
│  │ │ cursor.execute("SELECT * FROM users WHERE id = %s  │ │  │
│  │ │                                                    │ │  │
│  │ │ ▊ ← streaming cursor                              │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 3: Complete Fix with Diff View

After streaming completes:

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                                             │  │
│  │ CVE-2024-1337 - SQL Injection                         │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ src/db/queries.py                    [📋 Copy]   │  │  │
│  │ ├───────────────────────┬──────────────────────────┤  │  │
│  │ │ - Original            │ + Fixed                  │  │  │
│  │ ├───────────────────────┼──────────────────────────┤  │  │
│  │ │                       │                          │  │  │
│  │ │ query = "SELECT *     │ cursor.execute(          │  │  │
│  │ │   FROM users WHERE    │   "SELECT * FROM users   │  │  │
│  │ │   id=" + user_id      │   WHERE id = %s",        │  │  │
│  │ │                       │   [user_id]              │  │  │
│  │ │                       │ )                        │  │  │
│  │ │                       │                          │  │  │
│  │ ├───────────────────────┴──────────────────────────┤  │  │
│  │ │            [❌ Reject]  [✅ Accept & Apply]      │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 4: After Accepting Fix

User clicks "Accept & Apply":

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                                             │  │
│  │ CVE-2024-1337 - SQL Injection                         │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ ✅ Fix applied to src/db/queries.py              │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

The original card now shows:

```
┌──────────────────────────────────────────────────────────────┐
│ CVE-2024-1337                          [HIGH] [✅ FIXED]     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  SQL Injection in Database Query Handler                     │
│                                                               │
│  📄 src/db/queries.py:45-52                                  │
│  ✅ Fix applied 2 minutes ago                                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 5: After Rejecting Fix

User clicks "Reject":

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                                             │  │
│  │ CVE-2024-1337 - SQL Injection                         │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ ❌ Fix rejected                                   │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 6: Multiple Fixes in Same Dialog

When AI generates multiple SEARCH/REPLACE blocks:

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                                             │  │
│  │ CVE-2024-5678 - Multiple XSS Issues                   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │ Fix 1 of 3                                            │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ src/templates/user.html          [📋 Copy]       │  │  │
│  │ ├───────────────────────┬──────────────────────────┤  │  │
│  │ │ - Original            │ + Fixed                  │  │  │
│  │ ├───────────────────────┼──────────────────────────┤  │  │
│  │ │ <h1>{{username}}</h1> │ <h1>{{username|e}}</h1>  │  │  │
│  │ ├───────────────────────┴──────────────────────────┤  │  │
│  │ │            [❌ Reject]  [✅ Accept & Apply]      │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │ Fix 2 of 3                                            │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ src/templates/comment.html       [📋 Copy]       │  │  │
│  │ ├───────────────────────┬──────────────────────────┤  │  │
│  │ │ - Original            │ + Fixed                  │  │  │
│  │ ├───────────────────────┼──────────────────────────┤  │  │
│  │ │ <p>{{comment}}</p>    │ <p>{{comment|e}}</p>     │  │  │
│  │ ├───────────────────────┴──────────────────────────┤  │  │
│  │ │            [❌ Reject]  [✅ Accept & Apply]      │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │ Fix 3 of 3                                            │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ src/templates/post.html          [📋 Copy]       │  │  │
│  │ ├───────────────────────┬──────────────────────────┤  │  │
│  │ │ - Original            │ + Fixed                  │  │  │
│  │ ├───────────────────────┼──────────────────────────┤  │  │
│  │ │ <div>{{content}}</div>│ <div>{{content|e}}</div> │  │  │
│  │ ├───────────────────────┴──────────────────────────┤  │  │
│  │ │            [❌ Reject]  [✅ Accept & Apply]      │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

Each fix can be accepted or rejected independently!

---

## Example 7: AI Needs More Context

When AI can't generate fix without additional information:

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                                             │  │
│  │ CVE-2024-9999 - Weak Cryptography                     │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │ ⚠️ Need more context                                  │  │
│  │                                                        │  │
│  │ The AI needs additional code context to generate      │  │
│  │ an accurate fix:                                      │  │
│  │                                                        │  │
│  │  • Import statements for cryptography library         │  │
│  │  • Function signature for encrypt_data()              │  │
│  │  • Available cryptographic algorithms in project      │  │
│  │                                                        │  │
│  │ [🔄 Gathering context...] ← Auto-gathering           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

Then automatically:

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                                             │  │
│  │ CVE-2024-9999 - Weak Cryptography                     │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │ ✅ Context gathered, regenerating fix...              │  │
│  │                                                        │  │
│  │ [Streaming new fix with enhanced context...]          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 8: Error Handling

If something goes wrong:

```
┌──────────────────────────────────────────────────────────────┐
│  AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│  Review the proposed fix and accept or reject the changes    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 AI Fix                                             │  │
│  │ CVE-2024-1337 - SQL Injection                         │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ ⚠️ Failed to generate fix                        │  │  │
│  │ │                                                   │  │  │
│  │ │ Azure OpenAI API connection timeout               │  │  │
│  │ │                                                   │  │  │
│  │ │ [🔄 Retry]  [❌ Close]                           │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Comparison: Old vs New Approach

### ❌ Old Approach (Generic Recommendations)

```
┌──────────────────────────────────────────────────────────────┐
│ AI Recommendation                                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Certainly! I can help you fix this SQL injection             │
│ vulnerability. SQL injection is a serious security issue     │
│ that occurs when user input is directly concatenated into    │
│ SQL queries without proper sanitization.                     │
│                                                               │
│ Here's what you should do:                                   │
│                                                               │
│ 1. Use parameterized queries instead of string concatenation │
│ 2. Implement input validation                                │
│ 3. Follow the principle of least privilege                   │
│ 4. Consider using an ORM framework                           │
│                                                               │
│ Example code:                                                │
│                                                               │
│ cursor.execute("SELECT * FROM users WHERE id = %s",          │
│                [user_id])                                    │
│                                                               │
│ Would you like me to explain more about SQL injection        │
│ prevention?                                                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

User has to manually implement this. No accept/reject. Lots of text.

### ✅ New Approach (Focused Code Fix)

```
┌──────────────────────────────────────────────────────────────┐
│ AI-Generated Fix                                      [×]    │
├──────────────────────────────────────────────────────────────┤
│ Review the proposed fix and accept or reject the changes    │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ src/db/queries.py                        [📋 Copy]       │ │
│ ├───────────────────────┬──────────────────────────────────┤ │
│ │ - Original            │ + Fixed                          │ │
│ ├───────────────────────┼──────────────────────────────────┤ │
│ │ query = "SELECT *     │ cursor.execute(                  │ │
│ │   FROM users WHERE    │   "SELECT * FROM users           │ │
│ │   id=" + user_id      │   WHERE id = %s",                │ │
│ │                       │   [user_id]                      │ │
│ │                       │ )                                │ │
│ ├───────────────────────┴──────────────────────────────────┤ │
│ │            [❌ Reject]  [✅ Accept & Apply]              │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Direct code. One-click apply. No fluff. 🎯

---

## Color Scheme

The components use semantic colors:

- **Red/Pink**: Removed/vulnerable code
- **Green**: Added/fixed code
- **Yellow**: Warnings, context needed
- **Purple**: AI branding (sparkles icon)
- **Gray**: Neutral actions (reject, copy)

---

## Responsive Design

The dialog adapts to screen size:

- **Desktop**: Full side-by-side diff
- **Mobile**: Stacked diff view
- **Max height**: 90vh with scroll

---

**UI Examples Version**: 1.0.0
**Last Updated**: January 2026
