"""WebSocket event handlers for real-time communication."""
from flask_socketio import emit, join_room, leave_room, Namespace
from flask import request
from app import socketio
from app.models import Analysis, db
import logging

logger = logging.getLogger(__name__)

class AnalysisNamespace(Namespace):
    """Namespace for analysis-related WebSocket events."""
    
    def on_connect(self, auth=None):
        """Handle client connection."""
        sid = request.sid if hasattr(request, 'sid') else 'unknown'
        logger.info(f"Client connected to /analysis namespace - SID: {sid[:8]}...")
        emit('connected', {'message': 'Connected to analysis namespace', 'status': 'ok'})
        logger.info("Sent 'connected' event to client")
    
    def on_disconnect(self):
        """Handle client disconnection."""
        logger.info("Client disconnected from /analysis namespace")
    
    def on_start_analysis(self, data):
        """
        Start analysis in background.
        
        Expected data: {'analysis_id': int}
        """
        try:
            analysis_id = data.get('analysis_id')
            
            if not analysis_id:
                emit('error', {'message': 'analysis_id is required'})
                return
            
            # Verify analysis exists
            analysis = db.session.query(Analysis).filter_by(analysis_id=analysis_id).first()
            
            if not analysis:
                emit('error', {'message': f'Analysis {analysis_id} not found'})
                return
            
            if analysis.status != 'pending':
                emit('error', {'message': f'Analysis {analysis_id} is already {analysis.status}'})
                return
            
            # Join analysis room
            room = f"analysis_{analysis_id}"
            join_room(room)
            logger.info(f"Client joined room: {room}")
            
            # Send acknowledgment first
            emit('analysis_started', {
                'analysis_id': analysis_id,
                'room': room,
                'message': 'Analysis started successfully'
            })
            
            logger.info(f"Starting analysis {analysis_id} in background")
            
            # Start background analysis task with orchestrator (with small delay to ensure room is joined)
            import time
            def start_with_delay():
                time.sleep(0.5)  # Small delay to ensure client is in room
                from app.services.mock_agentic_orchestrator import AgenticVulnerabilityOrchestrator
                orchestrator = AgenticVulnerabilityOrchestrator(analysis_id, socketio)
                orchestrator.run()
            
            socketio.start_background_task(target=start_with_delay)
            
        except Exception as e:
            logger.error(f"Failed to start analysis: {str(e)}")
            emit('error', {'message': str(e)})
    
    def on_get_progress(self, data):
        """
        Get current progress of analysis.
        
        Expected data: {'analysis_id': int}
        """
        try:
            analysis_id = data.get('analysis_id')
            analysis = db.session.query(Analysis).filter_by(analysis_id=analysis_id).first()
            
            if not analysis:
                emit('error', {'message': 'Analysis not found'})
                return
            
            emit('progress_response', {
                'analysis_id': analysis_id,
                'status': analysis.status,
                'total_files': analysis.total_files,
                'total_chunks': analysis.total_chunks,
                'total_findings': analysis.total_findings
            })
            
        except Exception as e:
            logger.error(f"Failed to get progress: {str(e)}")
            emit('error', {'message': str(e)})

_analysis_namespace = AnalysisNamespace('/analysis')

def register_analysis_namespace():
    """Ensure the /analysis namespace is registered on the current server."""
    # flask_socketio reuses the same Namespaces when reinitializing the app, so we
    # keep a single instance and re-register it after each socketio.init_app call.
    socketio.on_namespace(_analysis_namespace)
