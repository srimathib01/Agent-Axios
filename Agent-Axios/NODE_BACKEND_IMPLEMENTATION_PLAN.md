# Node.js Backend Implementation Plan

**Project:** Agent-Axios Node.js Backend with LangChain ReAct Agent  
**Date:** November 20, 2025  
**Based on:** `backend_guide.md` - Complete Guide to Building a LangChain ReAct Agent

---

## 🎯 Project Overview

Building a **complete Node.js/TypeScript backend** (`agent-axios-node-backend/`) that mirrors the Python backend's functionality using LangGraph.js and the ReAct agent pattern.

### Architecture Comparison

| Component | Python (Current) | Node.js (New) |
|-----------|------------------|---------------|
| Framework | Flask + SocketIO | Express + Socket.IO |
| ORM | SQLAlchemy | Prisma |
| Agent Library | LangChain Python + LangGraph | LangChain.js + LangGraph.js |
| LLM | Azure GPT-4 | Azure OpenAI/Anthropic Claude |
| Language | Python 3.12 | TypeScript 5.x |
| Streaming | Flask SSE | Express SSE + Socket.IO |
| Tool Definition | `@tool` decorator | `tool()` function + Zod |

---

## 📁 Directory Structure

```
agent-axios-node-backend/
├── src/
│   ├── agent/
│   │   ├── LangGraphBrowserAgent.ts      # Main ReAct agent with createReactAgent
│   │   ├── ConversationManager.ts        # Session orchestration & streaming
│   │   └── ConversationSession.ts        # Session state management
│   │
│   ├── tools/
│   │   ├── index.ts                      # Export all tools
│   │   ├── repositoryAnalysis.ts         # analyze_repository_structure
│   │   ├── fileOperations.ts             # read_file_content, list_directory_contents
│   │   ├── codebaseSearch.ts             # search_codebase_semantically
│   │   ├── cveSearch.ts                  # search_cve_database
│   │   ├── validation.ts                 # validate_vulnerability_match
│   │   ├── findingRecord.ts              # record_finding
│   │   └── reportGeneration.ts           # generate_vulnerability_report
│   │
│   ├── services/
│   │   ├── RepoService.ts                # Git clone, cleanup operations
│   │   ├── ChunkingService.ts            # Code chunking logic
│   │   ├── CodebaseIndexingService.ts    # FAISS indexing & semantic search
│   │   ├── CVERetrievalService.ts        # External CVE API client
│   │   ├── ValidationService.ts          # GPT-4 CVE validation
│   │   ├── CachingService.ts             # Redis/memory cache
│   │   └── PDFReportGenerator.ts         # PDF report generation
│   │
│   ├── routes/
│   │   ├── conversationRoutes.ts         # Chat/conversation endpoints
│   │   ├── analysisRoutes.ts             # Vulnerability analysis CRUD
│   │   ├── authRoutes.ts                 # JWT authentication
│   │   ├── repositoryRoutes.ts           # Repository management
│   │   └── chatRoutes.ts                 # General chat endpoints
│   │
│   ├── middleware/
│   │   ├── auth.ts                       # JWT verification middleware
│   │   ├── errorHandler.ts               # Global error handling
│   │   └── validation.ts                 # Request validation
│   │
│   ├── config/
│   │   ├── settings.ts                   # Environment configuration
│   │   └── database.ts                   # Prisma client singleton
│   │
│   ├── utils/
│   │   ├── logger.ts                     # Logging utility
│   │   └── helpers.ts                    # Common helper functions
│   │
│   └── server.ts                         # Express + Socket.IO setup
│
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── migrations/                       # DB migration files
│
├── data/                                 # Runtime data (same as Python)
│   ├── cache/
│   ├── faiss_indexes/
│   └── reports/
│
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔧 Core Components

### 1. LangGraph Agent (src/agent/LangGraphBrowserAgent.ts)

**Purpose:** Main ReAct agent using LangGraph's `createReactAgent`

**Key Features:**
- ✅ Uses `createReactAgent` from `@langchain/langgraph/prebuilt`
- ✅ MemorySaver for conversation persistence
- ✅ 3-mode streaming: `updates`, `messages`, `custom`
- ✅ System prompt for autonomous vulnerability detection
- ✅ Binds all 8 tools with proper descriptions
- ✅ Supports both Azure OpenAI and Anthropic Claude

**Implementation Pattern:**
```typescript
class LangGraphBrowserAgent {
  constructor(conversationSession, options) {
    this.conversationSession = conversationSession;
    this.checkpointer = new MemorySaver();
    this.llm = new ChatAnthropic({ /* config */ });
    this.tools = getAllTools(conversationSession);
    this.agent = null; // Initialized in start()
  }

  async start() {
    const llmWithTools = this.llm.bindTools(this.tools);
    this.agent = createReactAgent({
      llm: llmWithTools,
      tools: this.tools,
      checkpointer: this.checkpointer,
      messageModifier: systemPrompt
    });
  }

  async *executeStream(input, callbacks) {
    // 3-mode streaming implementation
    const stream = await this.agent.stream(
      { messages: [new HumanMessage(input)] },
      { 
        streamMode: ["updates", "messages", "custom"],
        configurable: { thread_id: conversationId }
      }
    );

    for await (const [streamMode, chunk] of stream) {
      if (streamMode === "updates") { /* tool execution */ }
      else if (streamMode === "messages") { /* token streaming */ }
      else if (streamMode === "custom") { /* tool progress */ }
    }
  }
}
```

---

### 2. Agent Tools (8 Total)

All tools follow the guide's pattern with Zod schemas and custom streaming:

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';

export const createToolName = (conversationSession) => {
  return tool(
    async (input, config: LangGraphRunnableConfig) => {
      try {
        // Emit progress updates
        config?.writer?.('Starting task...');
        
        // Business logic
        const result = await executeLogic(input);
        
        config?.writer?.('✅ Task completed');
        
        // Return JSON string
        return JSON.stringify({ success: true, data: result });
      } catch (error) {
        config?.writer?.(`❌ Error: ${error.message}`);
        return JSON.stringify({ error: error.message, success: false });
      }
    },
    {
      name: 'tool_name',
      description: `Clear description for LLM about when to use this tool...`,
      schema: z.object({
        param: z.string().describe('Parameter description')
      })
    }
  );
};
```

#### Tool List:

1. **analyze_repository_structure**
   - Analyzes repo structure, detects technologies
   - Returns: file count, languages, frameworks
   - Uses caching for performance

2. **read_file_content**
   - Reads file content with line limits
   - Returns: content, line count, truncation status

3. **list_directory_contents**
   - Lists files/directories with optional recursion
   - Returns: files array, directories array

4. **search_codebase_semantically**
   - FAISS-based semantic search
   - Returns: relevant code chunks with similarity scores

5. **search_cve_database**
   - Queries external CVE API
   - Returns: matching CVEs with scores, filters by CVSS

6. **validate_vulnerability_match**
   - GPT-4 validation of CVE against code
   - Returns: is_vulnerable, confidence, reasoning

7. **record_finding**
   - Saves confirmed CVE finding to database
   - Returns: success confirmation

8. **generate_vulnerability_report**
   - Creates PDF report of all findings
   - Returns: report file path

---

### 3. ConversationManager (src/agent/ConversationManager.ts)

**Purpose:** Orchestrate agent conversations and handle streaming

**Key Methods:**
```typescript
class ConversationManager {
  private sessions: Map<string, ConversationSession>;
  
  async startConversation(userId: string, options) {
    // Create new session with agent
    // Return conversationId
  }
  
  async *processMessageStream(conversationId: string, message: string) {
    // Get session and agent
    // Stream agent execution
    // Yield events: token, tool_start, tool_end, custom, done
  }
  
  async endConversation(conversationId: string) {
    // Cleanup session
    // Save to database
  }
}
```

**Event Types:**
- `token`: AI response tokens
- `tool_start`: Tool execution begins
- `tool_end`: Tool execution completes
- `custom`: Tool progress updates
- `session_created`: New session info
- `error`: Error occurred
- `done`: Streaming complete

---

### 4. Database Schema (Prisma)

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int            @id @default(autoincrement())
  username      String         @unique
  email         String         @unique
  passwordHash  String
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  analyses      Analysis[]
  chatMessages  ChatMessage[]
}

model Repository {
  id            Int            @id @default(autoincrement())
  url           String         @unique
  name          String
  description   String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  analyses      Analysis[]
}

model Analysis {
  id            Int            @id @default(autoincrement())
  repoUrl       String
  repoId        Int?
  analysisType  String         // SHORT, MEDIUM, HARD
  status        String         @default("pending") // pending, running, completed, failed
  startTime     DateTime       @default(now())
  endTime       DateTime?
  configJson    Json?
  errorMessage  String?
  totalFiles    Int            @default(0)
  totalChunks   Int            @default(0)
  totalFindings Int            @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  repository    Repository?    @relation(fields: [repoId], references: [id])
  codeChunks    CodeChunk[]
  cveFindings   CVEFinding[]
}

model CodeChunk {
  id            Int            @id @default(autoincrement())
  analysisId    Int
  filePath      String
  chunkIndex    Int
  content       String
  startLine     Int
  endLine       Int
  language      String?
  createdAt     DateTime       @default(now())
  
  analysis      Analysis       @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  
  @@index([analysisId])
}

model CVEFinding {
  id                    Int       @id @default(autoincrement())
  analysisId            Int
  cveId                 String
  filePath              String
  chunkId               Int?
  severity              String?   // critical, high, medium, low
  confidenceScore       Float
  validationStatus      String    @default("pending") // pending, confirmed, false_positive
  validationExplanation String?
  cveDescription        String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  analysis              Analysis  @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  
  @@index([analysisId])
  @@index([cveId])
}

model ChatMessage {
  id            Int       @id @default(autoincrement())
  userId        Int
  sessionId     String
  role          String    // user, assistant, system
  content       String
  analysisId    Int?
  createdAt     DateTime  @default(now())
  
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([sessionId])
  @@index([userId])
}

model Notification {
  id            Int       @id @default(autoincrement())
  userId        Int
  type          String    // analysis_complete, error, info
  message       String
  isRead        Boolean   @default(false)
  relatedId     Int?
  createdAt     DateTime  @default(now())
  
  @@index([userId])
}
```

---

### 5. API Routes

#### Conversation Routes (`/api/conversation`)

```typescript
// POST /api/conversation/start
// Body: { userId: string, agentType?: string }
// Response: { conversationId, message, startedAt }

// POST /api/conversation/message-stream
// Body: { conversationId: string, message: string }
// Response: Server-Sent Events stream

// DELETE /api/conversation/:conversationId
// Response: { success: boolean }
```

#### Analysis Routes (`/api/analysis`)

```typescript
// POST /api/analysis/start
// Body: { repoUrl: string, analysisType: string }
// Response: { analysisId, status }

// GET /api/analysis/:id
// Response: { analysis: Analysis }

// GET /api/analysis/:id/findings
// Response: { findings: CVEFinding[] }

// GET /api/analysis/:id/report
// Response: PDF file stream
```

#### Auth Routes (`/api/auth`)

```typescript
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/refresh
// GET /api/auth/me
```

---

### 6. Services Layer

#### RepoService
```typescript
class RepoService {
  async clone(repoUrl: string): Promise<string>
  async cleanup(repoPath: string): Promise<void>
  async getRepoInfo(repoPath: string): Promise<RepoInfo>
}
```

#### ChunkingService
```typescript
class ChunkingService {
  async chunkCode(filePath: string, maxChunkSize: number): Promise<CodeChunk[]>
  async semanticSplit(content: string, language: string): Promise<string[]>
}
```

#### CodebaseIndexingService
```typescript
class CodebaseIndexingService {
  async buildIndex(repoPath: string, analysisId: number): Promise<void>
  async search(query: string, limit: number): Promise<SearchResult[]>
  async loadIndex(analysisId: number): Promise<boolean>
}
```

#### CVERetrievalService
```typescript
class CVERetrievalService {
  async searchByText(query: string, options: SearchOptions): Promise<CVE[]>
  async fetchCVEById(cveId: string): Promise<CVE>
}
```

#### ValidationService
```typescript
class ValidationService {
  async validateCVEMatch(params: ValidationParams): Promise<ValidationResult>
}
```

---

### 7. Streaming Architecture

**3-Mode Streaming Pattern:**

```typescript
// In LangGraphBrowserAgent.executeStream()

for await (const [streamMode, chunk] of stream) {
  if (streamMode === "updates") {
    // Node-level updates (tool execution)
    if (nodeId === 'tools') {
      yield { type: 'tool_end', toolName, toolOutput };
    } else if (nodeId === 'agent') {
      yield { type: 'tool_start', toolName, toolInput };
    }
  }
  
  else if (streamMode === "messages") {
    // Token-by-token AI responses
    if (msg.constructor.name === 'AIMessage') {
      yield { type: 'token', content: msg.content };
    }
  }
  
  else if (streamMode === "custom") {
    // Custom progress from tools via config.writer
    yield { type: 'custom', content: chunk };
  }
}
```

**Frontend Integration:**

```typescript
// SSE Client
for await (const event of basicToolsService.sendMessageStream(id, message)) {
  if (event.type === 'token') {
    // Append to streaming message
  } else if (event.type === 'tool_start') {
    // Show tool execution UI
  } else if (event.type === 'custom') {
    // Display progress update
  }
}
```

---

## 📦 Dependencies

### Production Dependencies

```json
{
  "@langchain/langgraph": "^0.2.3",
  "@langchain/core": "^0.3.15",
  "@langchain/openai": "^0.3.11",
  "@langchain/anthropic": "^0.3.7",
  "@langchain/community": "^0.3.14",
  "@prisma/client": "^5.22.0",
  "express": "^4.21.1",
  "socket.io": "^4.8.1",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "zod": "^3.23.8",
  "simple-git": "^3.27.0",
  "faiss-node": "^0.5.1",
  "pdfkit": "^0.15.0",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "axios": "^1.7.9",
  "winston": "^3.17.0"
}
```

### Development Dependencies

```json
{
  "typescript": "^5.7.2",
  "@types/node": "^22.10.1",
  "@types/express": "^4.17.21",
  "@types/cors": "^2.8.17",
  "@types/bcrypt": "^5.0.2",
  "@types/jsonwebtoken": "^9.0.7",
  "@types/pdfkit": "^0.13.5",
  "ts-node": "^10.9.2",
  "ts-node-dev": "^2.0.0",
  "prisma": "^5.22.0",
  "@typescript-eslint/eslint-plugin": "^8.15.0",
  "@typescript-eslint/parser": "^8.15.0",
  "eslint": "^9.15.0"
}
```

---

## ⚙️ Configuration

### Environment Variables (.env.example)

```env
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agent_axios

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_MODEL=gpt-4

# Anthropic (Alternative)
ANTHROPIC_API_KEY=your-anthropic-key

# CVE Service
CVE_SERVICE_BASE_URL=http://140.238.227.29:5000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Paths
DATA_DIR=./data
CACHE_DIR=./data/cache
FAISS_DIR=./data/faiss_indexes
REPORTS_DIR=./data/reports

# LangSmith (Optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-key
LANGCHAIN_PROJECT=agent-axios-node
```

---

## 🚀 Implementation Steps

### Phase 1: Project Setup ✅
1. Create directory structure
2. Initialize package.json with TypeScript
3. Install core dependencies
4. Setup tsconfig.json
5. Create .env.example

### Phase 2: Database ✅
1. Create Prisma schema
2. Generate Prisma client
3. Create initial migration
4. Setup database connection singleton

### Phase 3: Core Agent ✅
1. Implement LangGraphBrowserAgent
2. Implement ConversationSession
3. Setup MemorySaver checkpointing
4. Configure LLM (Azure/Anthropic)

### Phase 4: Tools ✅
1. Create tool factory functions (8 tools)
2. Add Zod schemas for each tool
3. Implement business logic
4. Add custom streaming with config.writer

### Phase 5: Services ✅
1. RepoService (git operations)
2. ChunkingService (code splitting)
3. CodebaseIndexingService (FAISS)
4. CVERetrievalService (API client)
5. ValidationService (GPT-4)
6. PDFReportGenerator
7. CachingService

### Phase 6: ConversationManager ✅
1. Session management
2. Agent orchestration
3. Stream processing
4. Event emission

### Phase 7: API Routes ✅
1. Conversation routes (SSE streaming)
2. Analysis routes
3. Auth routes
4. Repository routes
5. Chat routes

### Phase 8: Real-time Updates ✅
1. Socket.IO server setup
2. Event emitters
3. Room management
4. Progress tracking

### Phase 9: Middleware & Utils ✅
1. JWT authentication
2. Error handling
3. Request validation
4. Logging utility

### Phase 10: Testing & Documentation ✅
1. Integration tests
2. API documentation
3. README with examples
4. Deployment guide

---

## 🔄 ReAct Loop Visualization

```
User Message: "Analyze repository for CVEs"
    ↓
┌─────────────────────────────────────────────────────┐
│ ConversationManager.processMessageStream()          │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ LangGraphBrowserAgent.executeStream()               │
│ → createReactAgent starts ReAct loop                │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ ITERATION 1: Agent Node (LLM Reasoning)             │
│ → Decides to call: analyze_repository_structure     │
│ → Emits: tool_start event                           │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ ITERATION 1: Tools Node (Execute)                   │
│ → Runs: analyze_repository_structure                │
│ → Custom: "Analyzing 250 files..."                  │
│ → Returns: { total_files: 250, languages: {...} }   │
│ → Emits: tool_end event                             │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ ITERATION 2: Agent Node (LLM Reasoning)             │
│ → Sees repo structure, decides next action          │
│ → Decides to call: search_codebase_semantically     │
│ → Emits: tool_start event                           │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ ITERATION 2: Tools Node (Execute)                   │
│ → Runs: search_codebase_semantically                │
│ → Custom: "Building FAISS index..."                 │
│ → Returns: [chunk1, chunk2, ...]                    │
│ → Emits: tool_end event                             │
└─────────────────────────────────────────────────────┘
    ↓
... (continues for search_cve_database, validate_vulnerability_match, etc.)
    ↓
┌─────────────────────────────────────────────────────┐
│ FINAL ITERATION: Agent Node (LLM Response)          │
│ → No more tools needed                              │
│ → Generates natural language response               │
│ → Streams tokens: "I found 3 vulnerabilities..."    │
│ → Emits: token events                               │
└─────────────────────────────────────────────────────┘
    ↓
Done
```

---

## 📊 Key Metrics to Track

- **Agent Performance:**
  - Average iterations per task
  - Tool call frequency
  - Success rate by tool
  - Average response time

- **Vulnerability Detection:**
  - CVEs found per analysis
  - Validation accuracy
  - False positive rate
  - Average confidence scores

- **System Performance:**
  - FAISS index build time
  - Repository clone time
  - Stream latency
  - Database query performance

---

## 🎯 Success Criteria

✅ All 8 tools implemented with Zod schemas  
✅ 3-mode streaming functional (updates, messages, custom)  
✅ ReAct loop executes autonomously  
✅ Database operations work via Prisma  
✅ SSE streaming delivers real-time updates  
✅ Socket.IO emits progress events  
✅ JWT authentication protects routes  
✅ FAISS indexing works correctly  
✅ CVE validation uses GPT-4  
✅ PDF reports generate successfully  
✅ Frontend can consume all APIs  
✅ Documentation is comprehensive  

---

## 🔗 References

- **LangGraph.js Docs:** https://langchain-ai.github.io/langgraphjs/
- **LangChain.js Docs:** https://js.langchain.com/
- **Prisma Docs:** https://www.prisma.io/docs
- **ReAct Paper:** https://arxiv.org/abs/2210.03629
- **Backend Guide:** `/home/ubuntu/sem/backend_guide.md`

---

## 📝 Notes

- Follow the guide's patterns exactly for tool definition and streaming
- Use `config?.writer?.()` for custom progress updates in tools
- Return JSON strings from tools, not raw objects
- Let the LLM generate natural language responses (don't include tool outputs)
- Use checkpointing for conversation persistence
- Implement proper error handling in all tools
- Cache expensive operations (repo analysis, FAISS indexes)
- Use TypeScript for type safety throughout

---

**Status:** Ready for implementation  
**Last Updated:** November 20, 2025
