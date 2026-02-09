/**
 * Comprehensive test suite for the Node.js backend
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConversation() {
  console.log('\n🧪 Test 1: Basic Conversation');
  console.log('─'.repeat(60));

  try {
    // Start conversation
    console.log('1️⃣ Starting conversation...');
    const startRes = await axios.post(`${API_BASE}/conversation/start`, {
      userId: 'test-user-123',
      agentType: 'langgraph',
    });

    console.log('✅ Conversation started:', startRes.data.conversationId);
    const conversationId = startRes.data.conversationId;

    await sleep(1000);

    // Send simple message
    console.log('\n2️⃣ Sending simple message...');
    const response = await axios.post(
      `${API_BASE}/conversation/message-stream`,
      {
        conversationId,
        message: 'Hello! What can you help me with?',
      },
      { responseType: 'text' }
    );

    console.log('✅ Response received (SSE stream)');

    // End conversation
    await sleep(500);
    await axios.delete(`${API_BASE}/conversation/${conversationId}`);
    console.log('✅ Conversation ended\n');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testToolUsage() {
  console.log('\n🧪 Test 2: Tool Usage - Repository Analysis');
  console.log('─'.repeat(60));

  try {
    // Start conversation
    const startRes = await axios.post(`${API_BASE}/conversation/start`, {
      userId: 'test-user-456',
      agentType: 'langgraph',
    });

    const conversationId = startRes.data.conversationId;
    console.log('✅ Conversation started:', conversationId);

    await sleep(1000);

    // Send message that should trigger tool usage
    console.log('\n2️⃣ Asking agent to analyze a directory...');
    console.log('   Message: "Can you list the contents of the current directory?"');

    let toolsUsed = [];
    let responseText = '';

    const response = await axios.post(
      `${API_BASE}/conversation/message-stream`,
      {
        conversationId,
        message: 'List the contents of the /home/ubuntu/sem directory',
      },
      { responseType: 'stream' }
    );

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('\n✅ Stream completed');
            return;
          }

          try {
            const event = JSON.parse(data);
            
            if (event.type === 'tool_start') {
              console.log(`   🔧 Tool started: ${event.toolName}`);
              toolsUsed.push(event.toolName);
            } else if (event.type === 'tool_end') {
              console.log(`   ✓ Tool completed: ${event.toolName}`);
            } else if (event.type === 'custom') {
              console.log(`   📝 Progress: ${event.content}`);
            } else if (event.type === 'token') {
              responseText += event.content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });

    await new Promise((resolve) => {
      response.data.on('end', resolve);
    });

    console.log(`\n✅ Tools used: ${toolsUsed.join(', ') || 'None'}`);
    console.log(`✅ Response length: ${responseText.length} characters`);

    // End conversation
    await sleep(500);
    await axios.delete(`${API_BASE}/conversation/${conversationId}`);
    console.log('✅ Conversation ended\n');

    if (toolsUsed.length === 0) {
      console.log('⚠️  WARNING: No tools were used! The agent should have used list_directory_contents');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testCVESearch() {
  console.log('\n🧪 Test 3: CVE Database Search');
  console.log('─'.repeat(60));

  try {
    const startRes = await axios.post(`${API_BASE}/conversation/start`, {
      userId: 'test-user-789',
      agentType: 'langgraph',
    });

    const conversationId = startRes.data.conversationId;
    console.log('✅ Conversation started:', conversationId);

    await sleep(1000);

    console.log('\n2️⃣ Asking agent to search for SQL injection CVEs...');

    let toolsUsed = [];
    let cveFound = false;

    const response = await axios.post(
      `${API_BASE}/conversation/message-stream`,
      {
        conversationId,
        message: 'Search the CVE database for SQL injection vulnerabilities. Find at least 3 relevant CVEs.',
      },
      { responseType: 'stream' }
    );

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('\n✅ Stream completed');
            return;
          }

          try {
            const event = JSON.parse(data);
            
            if (event.type === 'tool_start') {
              console.log(`   🔧 Tool started: ${event.toolName}`);
              toolsUsed.push(event.toolName);
              if (event.toolName === 'search_cve_database') {
                cveFound = true;
              }
            } else if (event.type === 'tool_end') {
              console.log(`   ✓ Tool completed: ${event.toolName}`);
            } else if (event.type === 'custom') {
              console.log(`   📝 Progress: ${event.content}`);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });

    await new Promise((resolve) => {
      response.data.on('end', resolve);
    });

    console.log(`\n✅ Tools used: ${toolsUsed.join(', ') || 'None'}`);
    console.log(`✅ CVE search tool used: ${cveFound ? 'Yes' : 'No'}`);

    // End conversation
    await sleep(500);
    await axios.delete(`${API_BASE}/conversation/${conversationId}`);
    console.log('✅ Conversation ended\n');

    if (!cveFound) {
      console.log('⚠️  WARNING: CVE search tool was not used! Check if CVE service is available.');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 COMPREHENSIVE BACKEND TESTS');
  console.log('═'.repeat(60));

  try {
    await testConversation();
    await sleep(2000);

    await testToolUsage();
    await sleep(2000);

    await testCVESearch();

    console.log('\n' + '═'.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60) + '\n');
  } catch (error) {
    console.log('\n' + '═'.repeat(60));
    console.log('❌ TESTS FAILED');
    console.log('═'.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run tests
runAllTests();
