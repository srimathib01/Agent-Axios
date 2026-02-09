# Complete Guide to Building a LangChain ReAct Agent

> A comprehensive guide to building LangChain ReAct agents using LangGraph, including tool definition, recursive execution, response storage, and frontend implementation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How the ReAct Agent Works](#how-the-react-agent-works)
3. [Defining Tools](#defining-tools)
4. [Agent Implementation](#agent-implementation)
5. [Storing Responses and Tool Calls](#storing-responses-and-tool-calls)
6. [Frontend Implementation](#frontend-implementation)
7. [Complete Working Example](#complete-working-example)
8. [Advanced Topics](#advanced-topics)

---

## Architecture Overview

### What is a ReAct Agent?

**ReAct** (Reasoning + Acting) is a paradigm where an LLM:
1. **Reasons** about what to do next
2. **Acts** by calling tools
3. **Observes** the results
4. **Repeats** until the task is complete

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - Chat UI                                                   │
│  - Token streaming display                                   │
│  - Tool execution visualization                              │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ SSE/WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js + Express)                │
│  - ConversationManager (orchestrates conversations)          │
│  - WebSocket/SSE handlers                                    │
│  - Event streaming to frontend                               │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                   LangGraph Browser Agent                    │
│  - LangGraph's createReactAgent                              │
│  - Automatic multi-step tool execution                       │
│  - Checkpointing (MemorySaver)                               │
│  - 3-mode streaming (updates, messages, custom)             │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                         Tools Layer                          │
│  - Tool definitions (using @langchain/core/tools)            │
│  - Tool implementations (execute business logic)             │
│  - Return structured results to agent                        │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                    External Systems                          │
│  - APIs, databases, browser automation (Anchor/Playwright)   │
│  - File systems, web scraping, etc.                          │
└─────────────────────────────────────────────────────────────┘
```

---

## How the ReAct Agent Works

### The ReAct Loop (Recursive Execution)

```javascript
// LangGraph's createReactAgent implements this loop automatically:

while (!taskComplete && iterations < maxIterations) {
  // 1. REASON: LLM analyzes current state and decides what to do
  const decision = await llm.invoke([systemPrompt, ...messages]);

  // 2. ACT: Execute tool calls (if any)
  if (decision.tool_calls && decision.tool_calls.length > 0) {
    for (const toolCall of decision.tool_calls) {
      const tool = tools.find(t => t.name === toolCall.name);
      const result = await tool.invoke(toolCall.args);

      // 3. OBSERVE: Add tool result to message history
      messages.push({
        role: 'tool',
        tool_name: toolCall.name,
        content: result
      });
    }

    // 4. REPEAT: Loop back to step 1 with updated context
    continue;
  }

  // No more tool calls → Task complete
  taskComplete = true;
  return decision.content; // Final text response
}
```

### Key Concepts

1. **State Graph**: LangGraph uses a state machine with two nodes:
   - `agent` node: LLM decides next action
   - `tools` node: Execute tools and return results

2. **Message History**: Every interaction is stored as messages:
   - `HumanMessage`: User input
   - `AIMessage`: LLM responses (text + tool calls)
   - `ToolMessage`: Tool execution results

3. **Checkpointing**: State is persisted after each step for:
   - Conversation continuity across sessions
   - Resuming interrupted tasks
   - Debugging and replay

4. **Streaming**: Three streaming modes:
   - `updates`: Node-level updates (tool_start, tool_end)
   - `messages`: Token-by-token LLM output
   - `custom`: Custom progress updates from tools

---

## Defining Tools

### Tool Anatomy

A tool in LangChain consists of:
1. **Name**: Unique identifier
2. **Description**: Instructions for the LLM (when to use it)
3. **Schema**: Input parameters (using Zod)
4. **Function**: The actual implementation

### Tool Definition Pattern

```javascript
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

function createMyTool(conversationSession) {
  return tool(
    // ===== FUNCTION: Tool implementation =====
    async ({ param1, param2 }, config) => {
      try {
        // Emit progress updates (optional)
        config?.writer?.('Starting task...');

        // Access conversation context
        const { anchorClient, sessionId } = conversationSession;

        // Execute business logic
        const result = await someExternalAPI.call(param1, param2);

        // Emit completion
        config?.writer?.('✅ Task completed');

        // Return result (string or JSON string)
        return JSON.stringify({
          success: true,
          data: result,
          message: 'Task completed successfully'
        });
      } catch (error) {
        config?.writer?.(`❌ Error: ${error.message}`);
        return `Error: ${error.message}`;
      }
    },

    // ===== METADATA: Tool description and schema =====
    {
      name: 'my_tool_name',
      description: `This tool does X, Y, and Z.

      When to use:
      - Use when the user asks for X
      - Use when you need to accomplish Y

      When NOT to use:
      - Don't use for A or B (use other_tool instead)

      Input format:
      {
        "param1": "description",
        "param2": "description"
      }

      Returns:
      JSON object with success status and data.`,

      schema: z.object({
        param1: z.string()
          .min(1, 'param1 cannot be empty')
          .describe('Description of param1'),
        param2: z.number()
          .optional()
          .describe('Optional numeric parameter')
      })
    }
  );
}

module.exports = createMyTool;
```

### Real-World Tool Example: Browser Task Execution

```javascript
/**
 * PerformTaskTool - Execute browser automation tasks
 */
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

function createPerformTaskTool(conversationSession) {
  const { anchorClient, sessionId } = conversationSession;

  return tool(
    async ({ task, url }, config) => {
      try {
        // Progress: Starting
        config?.writer?.(`🔧 Starting browser task: ${task.substring(0, 80)}...`);

        if (!task) {
          return 'Error: Task description is required.';
        }

        // Progress: Preparation
        if (url) {
          config?.writer?.(`📍 Target URL: ${url}`);
        }
        config?.writer?.('🚀 Sending task to browser automation...');

        // Execute task using external API (Anchor Browser)
        const result = await anchorClient.performTask(task, url, {
          sessionId,
          agent: 'browser-use',
          provider: 'openai',
          model: 'gpt-4',
          highlight_elements: true
        });

        // Progress: Completed
        config?.writer?.('✅ Browser task completed successfully!');

        // Return full result as JSON
        return JSON.stringify(result);

      } catch (error) {
        config?.writer?.(`❌ Error: ${error.message}`);
        return `Error executing browser task: ${error.message}`;
      }
    },
    {
      name: 'anchor_perform_task',
      description: `Execute browser automation tasks using AI.

      CAPABILITIES:
      ✅ Navigate to websites
      ✅ Search, click, scroll, type
      ✅ Extract data (text, tables, lists)
      ✅ Fill forms and interact with UI
      ✅ Handle dynamic content and popups

      WHEN TO USE:
      - Quick browser operations (< 10 seconds)
      - Simple data extraction
      - Basic navigation and interaction

      INPUT FORMAT:
      {
        "task": "Natural language description of what to do",
        "url": "https://starting-url.com"  // Optional
      }

      EXAMPLES:
      {
        "task": "Go to weather.com and get temperature for San Francisco",
        "url": "https://weather.com"
      }

      RETURNS:
      JSON with: { success, message, data, current_url }`,

      schema: z.object({
        task: z.string()
          .min(1, 'Task description cannot be empty')
          .describe('Natural language task description'),
        url: z.string()
          .optional()
          .describe('Optional starting URL')
      })
    }
  );
}

module.exports = createPerformTaskTool;
```

### Tool Best Practices

1. **Clear Descriptions**: The LLM uses this to decide when to call the tool
2. **Progress Updates**: Use `config?.writer?.()` for streaming progress
3. **Error Handling**: Always catch errors and return descriptive messages
4. **Structured Returns**: Return JSON strings for complex data
5. **Context Access**: Use `conversationSession` to access shared state

---

## Agent Implementation

### Complete Agent Class

```javascript
/**
 * LangGraphBrowserAgent - ReAct agent using LangGraph
 */
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { MemorySaver } = require('@langchain/langgraph');
const { ChatAnthropic } = require('@langchain/anthropic');
const { HumanMessage } = require('@langchain/core/messages');

class LangGraphBrowserAgent {
  constructor(conversationSession, options = {}) {
    this.conversationSession = conversationSession;

    // Configuration
    this.options = {
      model: options.model || 'claude-sonnet-4-5-20250929',
      temperature: options.temperature || 0.1,
      streaming: options.streaming !== false,
      maxIterations: options.maxIterations || 20,
      parallelToolCalls: options.parallelToolCalls || false,
      ...options
    };

    // Initialize checkpointer (for state persistence)
    this.checkpointer = new MemorySaver();

    // Initialize LLM
    this.llm = new ChatAnthropic({
      modelName: this.options.model,
      temperature: this.options.temperature,
      streaming: this.options.streaming,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      maxTokens: 4096
    });

    // Initialize tools (import from your tools directory)
    const { getAllTools } = require('./tools');
    this.tools = getAllTools(conversationSession);

    // Agent will be created in start()
    this.agent = null;
  }

  /**
   * Initialize agent (call before execute)
   */
  async start() {
    if (this.agent) return;

    // Get system prompt
    const systemPrompt = this._getSystemPrompt();

    // Bind tools to LLM
    const llmWithTools = this.llm.bindTools(this.tools, {
      parallel_tool_calls: this.options.parallelToolCalls
    });

    // Create ReAct agent
    this.agent = createReactAgent({
      llm: llmWithTools,
      tools: this.tools,
      checkpointer: this.checkpointer,
      messageModifier: systemPrompt // System instructions
    });
  }

  /**
   * Get system prompt for the agent
   */
  _getSystemPrompt() {
    return `You are a helpful AI assistant with access to browser automation tools.

    Your goal is to help users accomplish tasks by:
    1. Understanding their request
    2. Breaking it down into steps
    3. Using available tools to execute each step
    4. Providing clear, natural language responses

    CRITICAL RULES:
    - Execute tasks autonomously using tools
    - Call multiple tools in sequence until task is complete
    - Only provide a text response when done or need user input
    - Never include raw JSON or tool outputs in your responses
    - Speak naturally and conversationally

    Available tools: ${this.tools.map(t => t.name).join(', ')}`;
  }

  /**
   * Execute user message (non-streaming)
   */
  async execute(input) {
    await this.start();

    // Add user message to history
    this.conversationSession.addToHistory('user', input);

    // Configuration for LangGraph
    const config = {
      configurable: {
        thread_id: this.conversationSession.conversationId
      },
      recursionLimit: this.options.maxIterations
    };

    // Invoke agent
    const result = await this.agent.invoke(
      { messages: [new HumanMessage(input)] },
      config
    );

    // Extract final message
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];
    const output = lastMessage.content || '';

    // Add to history
    this.conversationSession.addToHistory('assistant', output);

    return { output, messages };
  }

  /**
   * Execute with streaming (yields events)
   */
  async *executeStream(input, callbacks = []) {
    await this.start();

    // Add user message to history
    this.conversationSession.addToHistory('user', input);

    // Configuration with streaming modes
    const config = {
      configurable: {
        thread_id: this.conversationSession.conversationId
      },
      recursionLimit: this.options.maxIterations,
      streamMode: ["updates", "messages", "custom"] // 3-mode streaming
    };

    // Stream agent execution
    const stream = await this.agent.stream(
      { messages: [new HumanMessage(input)] },
      config
    );

    let finalOutput = '';

    // Process stream events
    for await (const [streamMode, chunk] of stream) {
      if (streamMode === "updates") {
        // Node-level updates (tool execution)
        const nodeId = Object.keys(chunk)[0];
        const nodeData = chunk[nodeId];

        if (nodeId === 'tools') {
          // Tool completed
          if (nodeData.messages) {
            for (const msg of nodeData.messages) {
              if (msg.constructor.name === 'ToolMessage') {
                yield {
                  type: 'tool_end',
                  toolName: msg.name,
                  toolOutput: 'Tool execution completed'
                };
              }
            }
          }
        } else if (nodeId === 'agent') {
          // Tool calls initiated
          if (nodeData.messages) {
            for (const msg of nodeData.messages) {
              if (msg.tool_calls && msg.tool_calls.length > 0) {
                for (const toolCall of msg.tool_calls) {
                  yield {
                    type: 'tool_start',
                    toolName: toolCall.name,
                    toolInput: toolCall.args
                  };
                }
              }
            }
          }
        }
      } else if (streamMode === "messages") {
        // Token-by-token streaming (AI messages only)
        const msg = Array.isArray(chunk) ? chunk[0] : chunk;

        // Filter: Only stream AIMessage/AIMessageChunk
        const messageType = msg?.constructor?.name;
        if (messageType === 'AIMessage' || messageType === 'AIMessageChunk') {
          const content = msg.content || '';
          if (content) {
            finalOutput += content;
            yield { type: 'token', content };
          }
        }
      } else if (streamMode === "custom") {
        // Custom progress updates from tools
        yield { type: 'custom', content: chunk };
      }
    }

    // Add final response to history
    if (finalOutput) {
      this.conversationSession.addToHistory('assistant', finalOutput);
    }

    yield { type: 'done' };
  }
}

module.exports = LangGraphBrowserAgent;
```

### How Recursive Execution Works

```javascript
// When you call agent.invoke() or agent.stream():

// 1. Agent receives user input
const userMessage = new HumanMessage("Get weather for SF");

// 2. LLM analyzes and decides to call a tool
const aiResponse = {
  content: "",
  tool_calls: [
    { name: "anchor_perform_task", args: { task: "...", url: "..." } }
  ]
};

// 3. Tool executes and returns result
const toolResult = await performTaskTool.invoke(args);
// → Returns JSON: { success: true, data: {...} }

// 4. Tool result added to message history
messages.push(new ToolMessage(toolResult, toolCall.id));

// 5. LLM sees tool result and decides next action
// Option A: Call another tool (loop continues)
// Option B: Generate final text response (loop ends)

// 6. If Option A → Go back to step 3
// 7. If Option B → Return final message to user
```

### Message Flow Visualization

```
User Input
    ↓
┌───────────────────────────────────────────────────────────┐
│ [HumanMessage: "Get weather for San Francisco"]          │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ Agent Node (LLM reasoning)                                │
│ → Decides to call: anchor_perform_task                    │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ [AIMessage with tool_calls]                               │
│ tool_calls: [{ name: "anchor_perform_task", args: {...}}]│
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ Tools Node (Execute tool)                                 │
│ → Navigate to weather.com                                 │
│ → Extract temperature data                                │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ [ToolMessage: "{success: true, data: {temp: 65F}}"]      │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ Agent Node (LLM reasoning with tool result)               │
│ → Has the data, no more tools needed                      │
│ → Generate natural language response                      │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ [AIMessage: "The temperature in SF is 65°F"]             │
└───────────────────────────────────────────────────────────┘
    ↓
User sees response
```

---

## Storing Responses and Tool Calls

### 1. LangGraph Checkpointing (Built-in Persistence)

```javascript
const { MemorySaver } = require('@langchain/langgraph');

// Initialize checkpointer
this.checkpointer = new MemorySaver();

// Create agent with checkpointing
this.agent = createReactAgent({
  llm: llmWithTools,
  tools: this.tools,
  checkpointer: this.checkpointer, // ← Enables automatic state persistence
  messageModifier: systemPrompt
});

// Invoke with thread_id for persistence
const config = {
  configurable: {
    thread_id: conversationId // Same ID = same conversation
  }
};

// All messages are automatically saved and restored
await agent.invoke({ messages: [userMessage] }, config);
```

### 2. Conversation History (Application-Level)

```javascript
/**
 * ConversationSession - Stores conversation metadata and history
 */
class ConversationSession {
  constructor(userId) {
    this.conversationId = `conv_${Date.now()}_${Math.random()}`;
    this.userId = userId;
    this.conversationHistory = [];
    this.createdAt = new Date().toISOString();
  }

  /**
   * Add message to conversation history
   */
  addToHistory(role, content, metadata = {}) {
    this.conversationHistory.push({
      role, // 'user' | 'assistant' | 'system'
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }
}
```

### 3. Extracting Tool Calls from Message History

```javascript
/**
 * Get all tool executions from agent's message history
 */
async function getToolExecutions(agent, conversationId) {
  // Get state from checkpointer
  const state = await agent.getState({
    configurable: { thread_id: conversationId }
  });

  const messages = state.values.messages || [];
  const toolExecutions = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // AIMessage with tool calls
    if (msg.constructor.name === 'AIMessage' && msg.tool_calls) {
      for (const toolCall of msg.tool_calls) {
        // Find corresponding ToolMessage
        const toolResultMsg = messages.find(
          m => m.constructor.name === 'ToolMessage' &&
               m.tool_call_id === toolCall.id
        );

        toolExecutions.push({
          toolName: toolCall.name,
          input: toolCall.args,
          output: toolResultMsg?.content,
          timestamp: msg.timestamp || new Date().toISOString()
        });
      }
    }
  }

  return toolExecutions;
}
```

### 4. Database Storage (Optional, for Production)

```javascript
/**
 * Store conversation in database
 */
async function saveConversationToDatabase(conversationSession) {
  const db = await getDatabase();

  await db.conversations.insert({
    conversationId: conversationSession.conversationId,
    userId: conversationSession.userId,
    history: conversationSession.conversationHistory,
    createdAt: conversationSession.createdAt,
    lastActivityAt: new Date().toISOString()
  });
}

/**
 * Store tool execution in database
 */
async function saveToolExecution(toolName, input, output, conversationId) {
  const db = await getDatabase();

  await db.toolExecutions.insert({
    conversationId,
    toolName,
    input: JSON.stringify(input),
    output: JSON.stringify(output),
    timestamp: new Date().toISOString()
  });
}
```

---

## Frontend Implementation

### 1. Service Layer (API Communication)

```typescript
/**
 * basicToolsService.ts - Handles communication with backend
 */

export interface MessageEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'session_created' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  data?: any;
  error?: string;
}

class BasicToolsService {
  private baseUrl = 'http://localhost:3000/api';

  /**
   * Start a new conversation
   */
  async startConversation(userId: string) {
    const response = await fetch(`${this.baseUrl}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, agentType: 'basic-tools' })
    });

    if (!response.ok) {
      throw new Error('Failed to start conversation');
    }

    return await response.json();
  }

  /**
   * Send message with streaming (Server-Sent Events)
   */
  async *sendMessageStream(conversationId: string, message: string) {
    const response = await fetch(`${this.baseUrl}/conversation/message-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message })
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    // Read SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            yield { type: 'done' } as MessageEvent;
            return;
          }

          try {
            const event = JSON.parse(data);
            yield event as MessageEvent;
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  }

  /**
   * End conversation
   */
  async endConversation(conversationId: string) {
    const response = await fetch(`${this.baseUrl}/conversation/${conversationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to end conversation');
    }
  }
}

export const basicToolsService = new BasicToolsService();
```

### 2. React Component (Chat UI)

```typescript
/**
 * BasicToolsChatApp.tsx - Main chat interface
 */
import { useState, useEffect, useRef } from 'react';
import { basicToolsService, MessageEvent } from './services/basicToolsService';
import { ChatMessage } from './components/ChatMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolUses?: ToolUse[];
}

interface ToolUse {
  name: string;
  input?: any;
  output?: any;
  status: 'running' | 'complete';
  startTime: number;
  endTime?: number;
}

export function BasicToolsChatApp() {
  // State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Current streaming message
  const [streamingContent, setStreamingContent] = useState('');
  const [currentToolUses, setCurrentToolUses] = useState<ToolUse[]>([]);

  // Start conversation on mount
  useEffect(() => {
    handleStartConversation();
  }, []);

  /**
   * Initialize conversation
   */
  const handleStartConversation = async () => {
    try {
      const userId = `user_${Date.now()}`;
      const conversation = await basicToolsService.startConversation(userId);

      setConversationId(conversation.conversationId);

      // Add welcome message
      setMessages([{
        id: `msg_${Date.now()}`,
        role: 'system',
        content: conversation.message,
        timestamp: conversation.startedAt
      }]);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  /**
   * Send message and handle streaming response
   */
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      setIsStreaming(true);
      setStreamingContent('');
      setCurrentToolUses([]);

      // Accumulate locally (state updates are async!)
      let accumulatedContent = '';
      let accumulatedToolUses: ToolUse[] = [];

      // Stream response
      for await (const event of basicToolsService.sendMessageStream(
        conversationId,
        userMessage
      )) {
        // Handle different event types
        if (event.type === 'token' && event.content) {
          // Token received - update streaming content
          accumulatedContent += event.content;
          setStreamingContent(prev => prev + event.content);

        } else if (event.type === 'tool_start') {
          // Tool execution started
          const toolUse: ToolUse = {
            name: event.toolName || 'unknown',
            input: event.toolInput,
            status: 'running',
            startTime: Date.now()
          };
          accumulatedToolUses.push(toolUse);
          setCurrentToolUses(prev => [...prev, toolUse]);

        } else if (event.type === 'tool_end') {
          // Tool execution completed
          const toolIndex = accumulatedToolUses.findIndex(
            t => t.name === event.toolName && t.status === 'running'
          );
          if (toolIndex !== -1) {
            accumulatedToolUses[toolIndex].status = 'complete';
            accumulatedToolUses[toolIndex].output = event.toolOutput;
            accumulatedToolUses[toolIndex].endTime = Date.now();
          }
          setCurrentToolUses(prev =>
            prev.map(t =>
              t.name === event.toolName && t.status === 'running'
                ? { ...t, status: 'complete', output: event.toolOutput, endTime: Date.now() }
                : t
            )
          );

        } else if (event.type === 'session_created') {
          // Browser session created (first message)
          console.log('Browser session created:', event.data);

        } else if (event.type === 'error') {
          console.error('Stream error:', event.error);
        }
      }

      // Finalize assistant message
      if (accumulatedContent || accumulatedToolUses.length > 0) {
        const assistantMsg: Message = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: accumulatedContent,
          timestamp: new Date().toISOString(),
          toolUses: accumulatedToolUses.length > 0 ? [...accumulatedToolUses] : undefined
        };

        setMessages(prev => [...prev, assistantMsg]);
        setStreamingContent('');
        setCurrentToolUses([]);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="messages">
        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            toolUses={msg.toolUses}
          />
        ))}

        {/* Streaming message */}
        {isStreaming && (streamingContent || currentToolUses.length > 0) && (
          <ChatMessage
            role="assistant"
            content={streamingContent}
            timestamp={new Date().toISOString()}
            toolUses={currentToolUses}
            isStreaming={true}
          />
        )}
      </div>

      {/* Input */}
      <div className="input-area">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type your message..."
          disabled={!conversationId || isStreaming}
        />
        <button
          onClick={handleSendMessage}
          disabled={!conversationId || !inputMessage.trim() || isStreaming}
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

### 3. ChatMessage Component (Display Messages)

```typescript
/**
 * ChatMessage.tsx - Individual message display with tool execution
 */
import { Clock, CheckCircle, Loader2 } from 'lucide-react';

export interface ToolUse {
  name: string;
  input?: any;
  output?: any;
  status: 'running' | 'complete';
  startTime: number;
  endTime?: number;
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolUses?: ToolUse[];
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, timestamp, toolUses, isStreaming }: ChatMessageProps) {
  return (
    <div className={`message message-${role}`}>
      {/* Avatar */}
      <div className="message-avatar">
        {role === 'user' ? '👤' : '🤖'}
      </div>

      <div className="message-content">
        {/* Tool executions */}
        {toolUses && toolUses.length > 0 && (
          <div className="tool-uses">
            {toolUses.map((tool, index) => (
              <div key={index} className={`tool-use tool-${tool.status}`}>
                {/* Tool header */}
                <div className="tool-header">
                  {tool.status === 'running' ? (
                    <Loader2 className="icon animate-spin" />
                  ) : (
                    <CheckCircle className="icon" />
                  )}
                  <span className="tool-name">{tool.name}</span>
                  {tool.endTime && (
                    <span className="tool-duration">
                      {((tool.endTime - tool.startTime) / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {/* Tool input (collapsible) */}
                {tool.input && (
                  <details className="tool-details">
                    <summary>Input</summary>
                    <pre>{JSON.stringify(tool.input, null, 2)}</pre>
                  </details>
                )}

                {/* Tool output (collapsible) */}
                {tool.output && (
                  <details className="tool-details">
                    <summary>Output</summary>
                    <pre>{JSON.stringify(tool.output, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message text */}
        {content && (
          <div className="message-text">
            {content}
            {isStreaming && <span className="cursor">▋</span>}
          </div>
        )}

        {/* Timestamp */}
        <div className="message-timestamp">
          <Clock className="icon" />
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
```

---

## Complete Working Example

### Backend Setup

```javascript
/**
 * server/index.js - Express server with SSE streaming
 */
const express = require('express');
const cors = require('cors');
const ConversationManager = require('../langchain/ConversationManager');

const app = express();
const conversationManager = new ConversationManager();

app.use(cors());
app.use(express.json());

/**
 * Start conversation
 */
app.post('/api/conversation/start', async (req, res) => {
  try {
    const { userId, agentType } = req.body;

    const conversation = await conversationManager.startConversation(userId, {
      agentType: agentType || 'langgraph'
    });

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send message with streaming (SSE)
 */
app.post('/api/conversation/message-stream', async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream events
    for await (const event of conversationManager.processMessageStream(
      conversationId,
      message,
      null // No WebSocket, using SSE
    )) {
      // Send event to client
      if (event.chunk) {
        res.write(`data: ${JSON.stringify(event.chunk)}\n\n`);
      }
    }

    // End stream
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * End conversation
 */
app.delete('/api/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    await conversationManager.endConversation(conversationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Frontend Setup

```typescript
/**
 * App.tsx - Main app component
 */
import { BasicToolsChatApp } from './BasicToolsChatApp';

function App() {
  return (
    <div className="app">
      <BasicToolsChatApp />
    </div>
  );
}

export default App;
```

---

## Advanced Topics

### 1. Parallel Tool Execution

```javascript
// Enable parallel tool calls
const agent = createReactAgent({
  llm: llmWithTools,
  tools: this.tools,
  checkpointer: this.checkpointer,
  messageModifier: systemPrompt
});

// Bind tools with parallel execution
const llmWithTools = this.llm.bindTools(this.tools, {
  parallel_tool_calls: true // ← Allow LLM to call multiple tools at once
});

// Example: LLM calls 3 tools simultaneously
// tool_calls: [
//   { name: "get_weather", args: { city: "SF" } },
//   { name: "get_weather", args: { city: "NYC" } },
//   { name: "get_weather", args: { city: "LA" } }
// ]
```

### 2. Custom Streaming Modes

```javascript
// Emit custom progress from tool
function createMyTool(conversationSession) {
  return tool(
    async ({ param }, config) => {
      // Emit custom progress
      config?.writer?.('Step 1: Starting...');
      await step1();

      config?.writer?.('Step 2: Processing...');
      await step2();

      config?.writer?.('Step 3: Finalizing...');
      await step3();

      config?.writer?.('✅ Complete!');

      return result;
    },
    { name: 'my_tool', description: '...', schema: z.object({...}) }
  );
}

// Frontend receives custom events
if (event.type === 'custom') {
  console.log('Progress:', event.content);
  // Display in UI: "Step 1: Starting..."
}
```

### 3. Interrupts and Human-in-the-Loop

```javascript
// Tool requests human intervention
function createAuthTool(conversationSession) {
  return tool(
    async ({ username }, config) => {
      // Check if password is needed
      const needsAuth = await checkAuthStatus();

      if (needsAuth) {
        // Return "needs_help" status
        return JSON.stringify({
          status: 'needs_help',
          help_needed: 'authentication',
          message: 'Please enter your password in the browser',
          current_url: 'https://example.com/login'
        });
      }

      // Continue normally
      return JSON.stringify({ success: true });
    },
    { name: 'login_tool', description: '...', schema: z.object({...}) }
  );
}

// Frontend handles intervention
if (event.type === 'tool_end' && event.toolOutput?.status === 'needs_help') {
  // Show intervention UI
  showInterventionDialog(event.toolOutput);
}
```

### 4. State Management with StateGraph

```javascript
/**
 * Custom state management using LangGraph StateGraph
 */
const { StateGraph } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');

// Define state schema
const AgentState = {
  messages: [],
  userData: {}, // Custom field
  taskHistory: [], // Custom field
  currentStep: 0 // Custom field
};

// Create state graph
const workflow = new StateGraph(AgentState);

// Add nodes
workflow.addNode('agent', async (state) => {
  const response = await llm.invoke(state.messages);
  return { messages: [...state.messages, response] };
});

workflow.addNode('tools', async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolResults = await executeTools(lastMessage.tool_calls);
  return {
    messages: [...state.messages, ...toolResults],
    currentStep: state.currentStep + 1
  };
});

// Add edges
workflow.addEdge('agent', 'tools');
workflow.addConditionalEdges('tools', (state) => {
  // Continue or finish
  return state.currentStep < 10 ? 'agent' : 'end';
});

// Compile
const app = workflow.compile({ checkpointer: new MemorySaver() });
```

---

## Summary

### Key Takeaways

1. **ReAct Pattern**: Reason → Act → Observe → Repeat
2. **LangGraph Automation**: `createReactAgent()` handles the loop automatically
3. **Tool Definition**: Use `@langchain/core/tools` with clear descriptions
4. **3-Mode Streaming**: Updates (nodes), Messages (tokens), Custom (progress)
5. **State Persistence**: MemorySaver checkpointer for conversation continuity
6. **Frontend Design**: Handle token streaming, tool execution display, and event processing

### Best Practices

✅ **Clear Tool Descriptions**: LLM uses this to decide when to call tools
✅ **Progress Updates**: Use `config?.writer?.()` for streaming progress
✅ **Error Handling**: Always catch and return descriptive errors
✅ **Natural Language**: Don't return raw JSON to users—speak naturally
✅ **State Management**: Use checkpointing for multi-turn conversations
✅ **Streaming First**: Always implement streaming for better UX

### Common Pitfalls

❌ **Breaking Tasks**: Don't break tasks into multiple tool calls manually
❌ **Missing Context**: Don't forget to pass conversationSession to tools
❌ **Blocking Operations**: Always use streaming for long-running tasks
❌ **Raw JSON Responses**: Never include tool outputs in text responses
❌ **Ignoring Errors**: Always handle tool execution failures gracefully

---

## Resources

- [LangChain Docs](https://js.langchain.com/)
- [LangGraph Docs](https://langchain-ai.github.io/langgraphjs/)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)
- [Anthropic Claude API](https://docs.anthropic.com/)

---

**Built with ❤️ for the Browser Agent Project**
