"""Chat routes for AI assistant."""
from flask import Blueprint, request, jsonify, Response
from app.services.auth_service import require_auth, get_current_user
from app.services.chat_service import ChatService
import logging
import json
import time

logger = logging.getLogger(__name__)

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/message', methods=['POST'])
@require_auth
def send_message():
    """Send a chat message and get AI response.
    
    Expected JSON:
    {
        "message": "User message",
        "sessionId": "optional_session_id",
        "analysisId": 123 (optional)
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        session_id = data.get('sessionId') or ChatService.create_session_id()
        analysis_id = data.get('analysisId')
        
        # Save user message
        user_msg = ChatService.send_message(
            user_id=user.user_id,
            session_id=session_id,
            role='user',
            content=user_message,
            analysis_id=analysis_id
        )
        
        if not user_msg:
            return jsonify({'error': 'Failed to save message'}), 500
        
        # Generate AI response
        ai_response = ChatService.generate_ai_response(
            user_message=user_message,
            session_id=session_id,
            user_id=user.user_id,
            analysis_id=analysis_id
        )
        
        # Save AI response
        ai_msg = ChatService.send_message(
            user_id=user.user_id,
            session_id=session_id,
            role='assistant',
            content=ai_response,
            analysis_id=analysis_id
        )
        
        if not ai_msg:
            return jsonify({'error': 'Failed to save AI response'}), 500
        
        return jsonify({
            'session_id': session_id,
            'user_message': user_msg.to_dict(),
            'ai_message': ai_msg.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return jsonify({'error': 'Failed to send message'}), 500


@chat_bp.route('/stream', methods=['POST'])
@require_auth
def stream_message():
    """Stream AI response for a message.
    
    Expected JSON:
    {
        "message": "User message",
        "sessionId": "optional_session_id",
        "analysisId": 123 (optional)
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        session_id = data.get('sessionId') or ChatService.create_session_id()
        analysis_id = data.get('analysisId')
        
        # Save user message
        user_msg = ChatService.send_message(
            user_id=user.user_id,
            session_id=session_id,
            role='user',
            content=user_message,
            analysis_id=analysis_id
        )
        
        if not user_msg:
            return jsonify({'error': 'Failed to save message'}), 500
        
        def generate():
            """Generate streaming response."""
            # Generate AI response
            ai_response = ChatService.generate_ai_response(
                user_message=user_message,
                session_id=session_id,
                user_id=user.user_id,
                analysis_id=analysis_id
            )
            
            # Simulate streaming by sending word by word
            words = ai_response.split()
            for i, word in enumerate(words):
                chunk = word + (' ' if i < len(words) - 1 else '')
                yield f"data: {json.dumps({'content': chunk})}\n\n"
                time.sleep(0.05)  # Small delay for streaming effect
            
            # Send completion signal
            yield f"data: {json.dumps({'done': True})}\n\n"
            
            # Save complete AI response
            ChatService.send_message(
                user_id=user.user_id,
                session_id=session_id,
                role='assistant',
                content=ai_response,
                analysis_id=analysis_id
            )
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        logger.error(f"Error streaming message: {str(e)}")
        return jsonify({'error': 'Failed to stream message'}), 500


@chat_bp.route('/history', methods=['GET'])
@require_auth
def get_history():
    """Get chat history.
    
    Query params:
    - sessionId: Optional session ID filter
    - page: Page number (default 1)
    - perPage: Items per page (default 50)
    """
    try:
        user = get_current_user()
        
        session_id = request.args.get('sessionId')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('perPage', 50, type=int)
        
        result = ChatService.get_chat_history(
            user_id=user.user_id,
            session_id=session_id,
            page=page,
            per_page=per_page
        )
        
        if result is None:
            return jsonify({'error': 'Failed to get history'}), 500
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting history: {str(e)}")
        return jsonify({'error': 'Failed to get history'}), 500


@chat_bp.route('/sessions', methods=['GET'])
@require_auth
def get_sessions():
    """Get all chat sessions for user."""
    try:
        user = get_current_user()
        sessions = ChatService.get_sessions(user.user_id)
        
        if sessions is None:
            return jsonify({'error': 'Failed to get sessions'}), 500
        
        return jsonify({'sessions': sessions})
        
    except Exception as e:
        logger.error(f"Error getting sessions: {str(e)}")
        return jsonify({'error': 'Failed to get sessions'}), 500


@chat_bp.route('/sessions/<session_id>', methods=['DELETE'])
@require_auth
def delete_session(session_id):
    """Delete a chat session."""
    try:
        user = get_current_user()
        count = ChatService.delete_session(user.user_id, session_id)
        
        if count is None:
            return jsonify({'error': 'Failed to delete session'}), 500
        
        return jsonify({
            'message': f'Session deleted ({count} messages)',
            'count': count
        })
        
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        return jsonify({'error': 'Failed to delete session'}), 500
