"""Chat service for AI assistant conversations."""
from app.models import ChatMessage, Analysis, db
from sqlalchemy import and_, desc, func
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

class ChatService:
    """Service for chat operations."""
    
    @staticmethod
    def create_session_id():
        """Generate unique session ID for chat."""
        return f"chat_{uuid.uuid4().hex[:16]}"
    
    @staticmethod
    def send_message(user_id, session_id, role, content, analysis_id=None):
        """Save a chat message.
        
        Args:
            user_id: User ID
            session_id: Chat session ID
            role: Message role (user, assistant, system)
            content: Message content
            analysis_id: Optional analysis ID reference
            
        Returns:
            ChatMessage object or None
        """
        try:
            message = ChatMessage(
                user_id=user_id,
                session_id=session_id,
                role=role,
                content=content,
                analysis_id=analysis_id
            )
            
            db.session.add(message)
            db.session.commit()
            
            logger.info(f"Chat message saved: {role} in session {session_id}")
            return message
            
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def get_chat_history(user_id, session_id=None, page=1, per_page=50):
        """Get chat history for user.
        
        Args:
            user_id: User ID
            session_id: Optional session ID filter
            page: Page number
            per_page: Items per page
            
        Returns:
            Dict with messages, total, page info
        """
        try:
            query = db.session.query(ChatMessage).filter_by(user_id=user_id)
            
            if session_id:
                query = query.filter_by(session_id=session_id)
            
            query = query.order_by(ChatMessage.created_at.asc())
            
            total = query.count()
            messages = query.limit(per_page).offset((page - 1) * per_page).all()
            
            return {
                'messages': [m.to_dict() for m in messages],
                'total': total,
                'page': page,
                'per_page': per_page,
                'pages': (total + per_page - 1) // per_page
            }
            
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}")
            return None
    
    @staticmethod
    def get_sessions(user_id):
        """Get all chat sessions for user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of session dicts with session_id and last message
        """
        try:
            session_base = db.session.query(
                ChatMessage.session_id.label('session_id'),
                func.max(ChatMessage.created_at).label('last_message_at'),
                func.count(ChatMessage.message_id).label('message_count')
            ).filter(
                ChatMessage.user_id == user_id
            ).group_by(
                ChatMessage.session_id
            ).subquery()

            first_user_messages = db.session.query(
                ChatMessage.session_id.label('session_id'),
                ChatMessage.content.label('content'),
                func.row_number().over(
                    partition_by=ChatMessage.session_id,
                    order_by=ChatMessage.created_at.asc()
                ).label('row_number')
            ).filter(
                ChatMessage.user_id == user_id,
                ChatMessage.role == 'user'
            ).subquery()

            sessions = db.session.query(
                session_base.c.session_id,
                session_base.c.last_message_at,
                session_base.c.message_count,
                first_user_messages.c.content
            ).outerjoin(
                first_user_messages,
                and_(
                    session_base.c.session_id == first_user_messages.c.session_id,
                    first_user_messages.c.row_number == 1
                )
            ).order_by(
                desc(session_base.c.last_message_at)
            ).all()

            return [
                {
                    'session_id': session.session_id,
                    'last_message_at': session.last_message_at.isoformat() if session.last_message_at else None,
                    'message_count': session.message_count,
                    'preview': (session.content or '')[:100]
                }
                for session in sessions
            ]
            
        except Exception as e:
            logger.error(f"Error getting sessions: {str(e)}")
            return None
    
    @staticmethod
    def delete_session(user_id, session_id):
        """Delete all messages in a session.
        
        Args:
            user_id: User ID
            session_id: Session ID
            
        Returns:
            Number of messages deleted or None
        """
        try:
            result = db.session.query(ChatMessage).filter_by(
                user_id=user_id,
                session_id=session_id
            ).delete()
            
            db.session.commit()
            logger.info(f"Deleted {result} messages from session {session_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error deleting session: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def generate_ai_response(user_message, session_id, user_id, analysis_id=None):
        """Generate AI response to user message.
        
        This is a placeholder that should be integrated with your AI service.
        
        Args:
            user_message: User's message
            session_id: Chat session ID
            user_id: User ID
            analysis_id: Optional analysis ID for context
            
        Returns:
            AI response string
        """
        # TODO: Integrate with actual AI service (Azure OpenAI, etc.)
        # For now, return a placeholder response
        
        if analysis_id:
            analysis = db.session.query(Analysis).filter_by(
                analysis_id=analysis_id
            ).first()
            
            if analysis:
                return f"I understand you're asking about the analysis of {analysis.repo_url}. The scan is currently {analysis.status}. How can I help you further?"
        
        return "I'm here to help you understand your vulnerability scan results. Please ask me anything about your repositories, analyses, or CVE findings."
