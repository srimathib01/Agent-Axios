/**
 * Conversation Routes
 * Handles chat/conversation endpoints with SSE streaming
 */

import { Router, Request, Response } from 'express';
import { ConversationManager } from '../agent/ConversationManager';
import logger from '../utils/logger';

const router = Router();
const conversationManager = new ConversationManager();

/**
 * POST /api/conversation/start
 * Start a new conversation
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { userId, agentType } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const conversation = await conversationManager.startConversation({
      userId,
      agentType: agentType || 'langgraph',
    });

    res.json(conversation);
  } catch (error: any) {
    logger.error(`Error starting conversation: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/conversation/message-stream
 * Send message with Server-Sent Events streaming
 */
router.post('/message-stream', async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'conversationId and message are required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Stream events
    try {
      for await (const event of conversationManager.processMessageStream(conversationId, message)) {
        // Send event to client
        if (event.chunk) {
          res.write(`data: ${JSON.stringify(event.chunk)}\n\n`);
        }
      }

      // End stream
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError: any) {
      logger.error(`Streaming error: ${streamError.message}`);
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    logger.error(`Error in message-stream: ${error.message}`);
    
    // If headers not sent, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/conversation/message
 * Send message without streaming (regular JSON response)
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'conversationId and message are required' });
    }

    const response = await conversationManager.processMessage(conversationId, message);

    res.json({
      conversationId,
      response,
    });
  } catch (error: any) {
    logger.error(`Error processing message: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/conversation/:conversationId
 * End a conversation
 */
router.delete('/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    await conversationManager.endConversation(conversationId);

    res.json({ success: true, message: 'Conversation ended' });
  } catch (error: any) {
    logger.error(`Error ending conversation: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversation/:conversationId
 * Get conversation info
 */
router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const conversation = conversationManager.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation.getInfo());
  } catch (error: any) {
    logger.error(`Error getting conversation: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversation
 * Get all active conversations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const conversations = conversationManager.getActiveConversations();

    res.json({
      count: conversations.length,
      conversations,
    });
  } catch (error: any) {
    logger.error(`Error getting conversations: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;
