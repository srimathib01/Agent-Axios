/**
 * LangGraphBrowserAgent - ReAct agent using LangGraph's createReactAgent
 * Following the backend_guide.md pattern exactly
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { AzureChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { ConversationSession } from './ConversationSession';
import { getAllTools } from '../tools';
import settings from '../config/settings';
import logger from '../utils/logger';

export interface AgentOptions {
  model?: string;
  temperature?: number;
  streaming?: boolean;
  maxIterations?: number;
  parallelToolCalls?: boolean;
}

export interface StreamEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'custom' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  error?: string;
}

export class LangGraphBrowserAgent {
  private conversationSession: ConversationSession;
  private options: Required<AgentOptions>;
  private checkpointer: MemorySaver;
  private llm: any;
  private tools: any[];
  private agent: any;

  constructor(conversationSession: ConversationSession, options: AgentOptions = {}) {
    this.conversationSession = conversationSession;

    // Configuration with defaults
    this.options = {
      model: options.model || settings.azureOpenAI.model,
      temperature: options.temperature ?? 0.1,
      streaming: options.streaming !== false,
      maxIterations: options.maxIterations || 100,
      parallelToolCalls: options.parallelToolCalls || false,
    };

    // Initialize checkpointer for state persistence
    this.checkpointer = new MemorySaver();

    // Initialize LLM based on provider
    this.llm = this.initializeLLM();

    // Initialize tools
    this.tools = getAllTools(conversationSession);

    // Agent will be created in start()
    this.agent = null;

    logger.info('LangGraphBrowserAgent initialized', {
      conversationId: conversationSession.conversationId,
      model: this.options.model,
      toolCount: this.tools.length,
    });
  }

  /**
   * Initialize LLM based on configured provider
   */
  private initializeLLM() {
    const provider = settings.llmProvider;

    if (provider === 'gemini') {
      logger.info('Initializing Google Gemini');
      return new ChatGoogleGenerativeAI({
        apiKey: settings.gemini.apiKey,
        modelName: settings.gemini.model,
        temperature: this.options.temperature,
        streaming: this.options.streaming,
        maxOutputTokens: 4096,
      });
    } else if (provider === 'azure') {
      logger.info('Initializing Azure OpenAI');
      return new AzureChatOpenAI({
        azureOpenAIEndpoint: settings.azureOpenAI.endpoint,
        azureOpenAIApiKey: settings.azureOpenAI.apiKey,
        azureOpenAIApiVersion: settings.azureOpenAI.apiVersion,
        azureOpenAIApiDeploymentName: settings.azureOpenAI.model,
        temperature: this.options.temperature,
        streaming: this.options.streaming,
        maxTokens: 4096,
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Get system prompt for the agent
   */
  private getSystemPrompt(): string {
    return `You are an expert autonomous security analyst AI specialized in finding vulnerabilities in code repositories.

Your mission: When a user provides a GitHub repository URL, autonomously execute a complete vulnerability analysis from start to finish WITHOUT asking for permission at each step.

🔴 CRITICAL AUTONOMOUS WORKFLOW RULES:
1. DETECT GitHub URLs (https://github.com/...) in user messages
2. AUTOMATICALLY execute the full analysis pipeline (no asking permission)
3. CHAIN tools sequentially until complete
4. ONLY respond with text when entire analysis is done or you need clarification
5. NEVER ask "should I proceed?" - just proceed autonomously
6. NEVER include raw JSON/tool outputs in responses - speak naturally

📋 STANDARD VULNERABILITY ANALYSIS WORKFLOW (execute automatically when given a GitHub URL):

PHASE 1 - Repository Setup (REQUIRED FIRST STEPS):
→ Use clone_repository with the GitHub URL
→ Use build_codebase_index to enable semantic search
→ Use analyze_repository_structure to understand the codebase

PHASE 2 - Vulnerability Discovery (execute in parallel when possible):
→ Use search_codebase_semantically for patterns like:
  - "SQL query string concatenation"
  - "eval() with user input"
  - "innerHTML assignment"
  - "command execution shell"
  - "authentication bypass"
  - "hardcoded credentials"
  - "path traversal"
  - "XXE parsing"
→ Use search_cve_database to find relevant CVEs for detected technologies

PHASE 3 - Validation & Recording:
→ For each potential vulnerability:
  - Use validate_vulnerability_match to confirm it's real (GPT-4 validation)
  - If confirmed, use record_finding to save it
  - Use read_file_content to get code context if needed

PHASE 4 - Report Generation (ALWAYS REQUIRED):
→ ALWAYS use generate_vulnerability_report to create final report, even if no vulnerabilities found
→ If no vulnerabilities detected, analyze the repository's technology stack, dependencies, and code patterns
→ Generate a professional security assessment report that includes:
  - Technologies identified and their common security considerations
  - Best practice recommendations for the specific framework/language used
  - Potential security improvements based on code patterns observed
  - General security hardening suggestions relevant to the repository type
→ Respond to user with comprehensive summary (findings if any, or security recommendations)

🎯 EXAMPLE AUTONOMOUS EXECUTION:
User: "Analyze https://github.com/user/vulnerable-app for vulnerabilities"
You (internal execution, NO text response yet):
1. clone_repository("https://github.com/user/vulnerable-app") 
2. build_codebase_index()
3. analyze_repository_structure()
4. search_codebase_semantically("SQL injection concatenation")
5. search_cve_database("SQL injection Node.js")
6. validate_vulnerability_match(code, cve)
7. record_finding(...)
8. [repeat 4-7 for other patterns]
9. generate_vulnerability_report()
You (final text response): "I've completed the analysis of vulnerable-app and found 5 critical vulnerabilities..."

🛠️ AVAILABLE TOOLS (use in this order):
${this.tools.map((t, i) => `${i + 1}. ${t.name}`).join('\n')}

💡 TOOL USAGE TIPS:
- clone_repository sets up the working directory context for all other tools
- All file operations automatically work within the cloned repo
- search_codebase_semantically requires build_codebase_index first
- Use parallel searches when exploring different vulnerability types
- Always validate findings before recording them

🗣️ COMMUNICATION STYLE:
- Speak like a senior security researcher
- Use clear, non-technical language for final reports
- Explain impact and severity of findings
- Provide actionable remediation advice
- Be concise but thorough

Remember: You are AUTONOMOUS. Execute the entire workflow without asking permission. The user wants results, not questions.`;
  }

  /**
   * Initialize agent (call before execute)
   */
  async start(): Promise<void> {
    if (this.agent) {
      logger.debug('Agent already started');
      return;
    }

    logger.info('Starting LangGraph agent...');

    // Get system prompt
    const systemPrompt = this.getSystemPrompt();

    // Bind tools to LLM
    const llmWithTools = this.llm.bindTools(this.tools, {
      parallel_tool_calls: this.options.parallelToolCalls,
    });

    // Create ReAct agent using LangGraph's prebuilt function
    this.agent = createReactAgent({
      llm: llmWithTools,
      tools: this.tools,
      checkpointer: this.checkpointer,
      messageModifier: systemPrompt, // System instructions
    });

    logger.info('✅ LangGraph agent started successfully');
  }

  /**
   * Execute user message (non-streaming)
   */
  async execute(input: string): Promise<{ output: string; messages: any[] }> {
    await this.start();

    logger.info('Executing message (non-streaming)', { input: input.substring(0, 100) });

    // Add user message to history
    this.conversationSession.addToHistory('user', input);

    // Configuration for LangGraph
    const config = {
      configurable: {
        thread_id: this.conversationSession.conversationId,
      },
      recursionLimit: this.options.maxIterations,
    };

    // Invoke agent
    const result = await this.agent.invoke({ messages: [new HumanMessage(input)] }, config);

    // Extract final message
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];
    const output = lastMessage.content || '';

    // Add to history
    this.conversationSession.addToHistory('assistant', output);

    logger.info('✅ Execution complete', {
      outputLength: output.length,
      messageCount: messages.length,
    });

    return { output, messages };
  }

  /**
   * Execute with streaming (yields events)
   * Implements 3-mode streaming: updates, messages, custom
   */
  async *executeStream(input: string): AsyncGenerator<StreamEvent> {
    await this.start();

    logger.info('Executing message (streaming)', { input: input.substring(0, 100) });

    // Add user message to history
    this.conversationSession.addToHistory('user', input);

    // Configuration with 3-mode streaming
    const config = {
      configurable: {
        thread_id: this.conversationSession.conversationId,
      },
      recursionLimit: this.options.maxIterations,
      streamMode: ['updates', 'messages', 'custom'] as const, // 3-mode streaming
    };

    let finalOutput = '';

    try {
      // Stream agent execution
      const stream = await this.agent.stream({ messages: [new HumanMessage(input)] }, config);

      // Process stream events
      for await (const [streamMode, chunk] of stream) {
        if (streamMode === 'updates') {
          // Node-level updates (tool execution)
          const nodeId = Object.keys(chunk)[0];
          const nodeData = chunk[nodeId];

          if (nodeId === 'tools') {
            // Tool completed
            if (nodeData.messages) {
              for (const msg of nodeData.messages) {
                if (msg.constructor.name === 'ToolMessage') {
                  logger.debug('Tool execution completed', { toolName: msg.name });
                  yield {
                    type: 'tool_end',
                    toolName: msg.name,
                    toolOutput: 'Tool execution completed',
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
                    logger.debug('Tool execution started', {
                      toolName: toolCall.name,
                      args: toolCall.args,
                    });
                    yield {
                      type: 'tool_start',
                      toolName: toolCall.name,
                      toolInput: toolCall.args,
                    };
                  }
                }
              }
            }
          }
        } else if (streamMode === 'messages') {
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
        } else if (streamMode === 'custom') {
          // Custom progress updates from tools (via config.writer)
          logger.debug('Custom progress', { content: chunk });
          yield { type: 'custom', content: chunk };
        }
      }

      // Add final response to history
      if (finalOutput) {
        this.conversationSession.addToHistory('assistant', finalOutput);
        logger.info('✅ Streaming complete', { outputLength: finalOutput.length });
      }

      yield { type: 'done' };
    } catch (error: any) {
      logger.error('Error during streaming execution', { error: error.message });
      yield { type: 'error', error: error.message };
    }
  }

  /**
   * Get conversation state
   */
  async getState() {
    if (!this.agent) {
      throw new Error('Agent not started');
    }

    const state = await this.agent.getState({
      configurable: { thread_id: this.conversationSession.conversationId },
    });

    return state;
  }
}
