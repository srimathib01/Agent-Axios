/**
 * Simple test script for the Node.js backend API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testConversationAPI() {
  console.log('🧪 Testing Node.js Backend API\n');

  try {
    // Test 1: Start a conversation
    console.log('1️⃣ Starting conversation...');
    const startResponse = await axios.post(`${BASE_URL}/api/conversation/start`, {
      userId: 'test-user-123',
      agentType: 'langgraph'
    });

    const { conversationId } = startResponse.data;
    console.log('✅ Conversation started:', conversationId);
    console.log('   Response:', startResponse.data.message);
    console.log('');

    // Test 2: Send a simple message (streaming)
    console.log('2️⃣ Sending message with streaming...');
    console.log('   Message: "Hello! Can you explain what tools you have?"');
    console.log('');

    const streamResponse = await axios.post(
      `${BASE_URL}/api/conversation/message-stream`,
      {
        conversationId,
        message: 'Hello! Can you explain what tools you have available?'
      },
      { responseType: 'stream' }
    );

    console.log('📡 Streaming response:');
    console.log('─'.repeat(60));

    let tokenCount = 0;
    let toolsUsed = [];
    let customMessages = [];

    streamResponse.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            console.log('\n' + '─'.repeat(60));
            console.log('✅ Stream completed');
            return;
          }

          try {
            const event = JSON.parse(data);
            
            if (event.type === 'token') {
              process.stdout.write(event.content);
              tokenCount++;
            } else if (event.type === 'tool_start') {
              console.log(`\n🔧 Tool started: ${event.toolName}`);
              console.log(`   Input:`, JSON.stringify(event.toolInput, null, 2));
              toolsUsed.push(event.toolName);
            } else if (event.type === 'tool_end') {
              console.log(`✅ Tool completed: ${event.toolName}`);
            } else if (event.type === 'custom') {
              console.log(`📢 ${event.content}`);
              customMessages.push(event.content);
            } else if (event.type === 'error') {
              console.error(`❌ Error: ${event.error}`);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    });

    // Wait for stream to complete
    await new Promise((resolve) => {
      streamResponse.data.on('end', () => {
        console.log('\n');
        console.log('📊 Stream Statistics:');
        console.log(`   Tokens received: ${tokenCount}`);
        console.log(`   Tools used: ${toolsUsed.join(', ') || 'None'}`);
        console.log(`   Custom messages: ${customMessages.length}`);
        console.log('');
        resolve();
      });
    });

    // Test 3: End conversation
    console.log('3️⃣ Ending conversation...');
    await axios.delete(`${BASE_URL}/api/conversation/${conversationId}`);
    console.log('✅ Conversation ended successfully');
    console.log('');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
testConversationAPI();
