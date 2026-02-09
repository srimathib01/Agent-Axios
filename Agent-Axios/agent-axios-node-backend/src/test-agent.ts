/**
 * Simple test to verify the agent works
 */

import { ConversationSession } from './agent/ConversationSession';
import { LangGraphBrowserAgent } from './agent/LangGraphBrowserAgent';
import logger from './utils/logger';

async function testAgent() {
  logger.info('='.repeat(80));
  logger.info('🧪 TESTING LANGGRAPH REACT AGENT');
  logger.info('='.repeat(80));

  // Create a test conversation
  const session = new ConversationSession({
    userId: 'test-user',
    agentType: 'langgraph',
  });

  logger.info('✅ Created conversation session', {
    conversationId: session.conversationId,
  });

  // Create agent (using mock mode if no API key)
  const agent = new LangGraphBrowserAgent(session, {
    provider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'azure',
    temperature: 0.1,
  });

  logger.info('✅ Created LangGraph agent');

  // Test message
  const testMessage = 'Analyze the repository at /home/ubuntu/sem/agent-axios-node-backend';

  logger.info('📨 Sending test message:', { message: testMessage });
  logger.info('-'.repeat(80));

  try {
    let fullResponse = '';
    
    for await (const event of agent.executeStream(testMessage)) {
      if (event.type === 'token') {
        process.stdout.write(event.content);
        fullResponse += event.content;
      } else if (event.type === 'tool_start') {
        logger.info(`\n🔧 Tool Started: ${event.toolName}`);
        logger.info(`   Input: ${JSON.stringify(event.toolInput).substring(0, 100)}`);
      } else if (event.type === 'tool_end') {
        logger.info(`✅ Tool Completed: ${event.toolName}`);
      } else if (event.type === 'custom') {
        logger.info(`📢 Progress: ${event.content}`);
      } else if (event.type === 'error') {
        logger.error(`❌ Error: ${event.error}`);
      } else if (event.type === 'done') {
        logger.info('\n' + '='.repeat(80));
        logger.info('✅ STREAMING COMPLETE');
      }
    }

    logger.info('Final response length:', fullResponse.length);
    logger.info('Conversation history:', session.getHistory().length, 'messages');

  } catch (error: any) {
    logger.error('❌ Test failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  }

  logger.info('='.repeat(80));
  logger.info('✅ TEST COMPLETED SUCCESSFULLY');
  logger.info('='.repeat(80));
}

// Run test
testAgent().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
