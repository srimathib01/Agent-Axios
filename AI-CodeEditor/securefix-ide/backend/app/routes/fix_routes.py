"""
Fix generation API routes for FastAPI.
Provides streaming code fix generation with minimal fluff.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import logging
import asyncio
import threading
import queue

from app.services.ai_fix_service import AIFixService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fix", tags=["fix"])
ai_fix_service = None  # Initialize lazily


def get_ai_fix_service():
    """Get or create AI fix service instance."""
    global ai_fix_service
    if ai_fix_service is None:
        try:
            logger.info("Initializing AI fix service...")
            ai_fix_service = AIFixService()
            logger.info("AI fix service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AI fix service: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"AI service not configured: {str(e)}"
            )
    return ai_fix_service


# Pydantic models
class Vulnerability(BaseModel):
    cve_id: str
    severity: str
    title: str
    description: str = ""


class CodeContext(BaseModel):
    file_path: str
    line_start: int
    line_end: int
    vulnerable_code: str
    surrounding_context: str = ""
    imports: List[str] = []
    function_context: str = ""


class FixRequest(BaseModel):
    vulnerability: Vulnerability
    code_context: CodeContext


class ApplyFixRequest(BaseModel):
    file_path: str
    search_block: str
    replace_block: str
    vulnerability_id: Optional[str] = None


class RejectFixRequest(BaseModel):
    vulnerability_id: str
    reason: str = "User rejected"


@router.post("/stream")
async def stream_fix(request: FixRequest):
    """
    Generate a code fix with SSE streaming.

    Returns:
        StreamingResponse with SSE events
    """
    try:
        service = get_ai_fix_service()

        def generate():
            """SSE generator function - must be sync for StreamingResponse."""
            import queue
            import threading

            message_queue = queue.Queue()

            def on_chunk(content: str):
                message_queue.put(('chunk', content))

            def on_complete(parsed: Dict[str, Any]):
                message_queue.put(('complete', parsed))
                message_queue.put(('done', None))

            def on_error(error: str):
                message_queue.put(('error', error))
                message_queue.put(('done', None))

            # Run generation in background thread
            def run_generation():
                try:
                    service.generate_fix_stream(
                        vulnerability=request.vulnerability.dict(),
                        code_context=request.code_context.dict(),
                        on_chunk=on_chunk,
                        on_complete=on_complete,
                        on_error=on_error
                    )
                except Exception as e:
                    logger.error(f"Error in stream_fix: {e}")
                    message_queue.put(('error', str(e)))
                    message_queue.put(('done', None))

            thread = threading.Thread(target=run_generation)
            thread.start()

            # Yield messages from queue
            while True:
                msg_type, content = message_queue.get()

                if msg_type == 'done':
                    break
                elif msg_type == 'chunk':
                    yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
                elif msg_type == 'complete':
                    yield f"data: {json.dumps({'type': 'complete', 'fix': content})}\n\n"
                elif msg_type == 'error':
                    yield f"data: {json.dumps({'type': 'error', 'error': content})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        logger.error(f"Failed to start fix streaming: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_fix(request: FixRequest):
    """
    Generate a code fix (non-streaming).

    Returns:
        JSON with fix details
    """
    try:
        service = get_ai_fix_service()

        result = {'status': 'generating'}
        chunks = []

        def on_chunk(content):
            chunks.append(content)

        def on_complete(parsed):
            result['status'] = parsed['type']
            result['fix'] = parsed

        def on_error(error):
            result['status'] = 'error'
            result['error'] = error

        service.generate_fix_stream(
            vulnerability=request.vulnerability.dict(),
            code_context=request.code_context.dict(),
            on_chunk=on_chunk,
            on_complete=on_complete,
            on_error=on_error
        )

        return result

    except Exception as e:
        logger.error(f"Fix generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply")
async def apply_fix(request: ApplyFixRequest):
    """
    Apply an accepted fix to the actual file.

    Returns:
        JSON with success status
    """
    try:
        file_path = request.file_path
        search_block = request.search_block
        replace_block = request.replace_block

        # Read the file
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f'File not found: {file_path}')

        # Apply the fix
        if search_block not in content:
            raise HTTPException(
                status_code=400,
                detail='Search block not found in file. Code may have changed.'
            )

        updated_content = content.replace(search_block, replace_block, 1)

        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        return {
            'status': 'success',
            'message': f'Fix applied to {file_path}',
            'updated_file': file_path
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to apply fix: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reject")
async def reject_fix(request: RejectFixRequest):
    """
    Reject a generated fix.

    Returns:
        JSON with success status
    """
    return {
        'status': 'success',
        'message': 'Fix rejected',
        'vulnerability_id': request.vulnerability_id,
        'reason': request.reason
    }


@router.get("/test")
async def test_service():
    """
    Test endpoint to verify AI fix service is configured correctly.

    Returns:
        JSON with service status
    """
    try:
        service = get_ai_fix_service()
        return {
            'status': 'ok',
            'message': 'AI fix service is configured and ready',
            'service_initialized': True
        }
    except HTTPException as e:
        return {
            'status': 'error',
            'message': str(e.detail),
            'service_initialized': False
        }
    except Exception as e:
        logger.error(f"Test endpoint error: {e}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e),
            'service_initialized': False
        }


@router.websocket("/ws/fix")
async def websocket_fix(websocket: WebSocket):
    """
    WebSocket endpoint for fix generation.
    Expects: { type: 'fix_request', vulnerability: {...}, codeContext: {...} }
    Sends: { type: 'fix_chunk', content: '...', done: false/true, search_blocks: [...], replace_blocks: [...] }
    """
    await websocket.accept()
    logger.info("WebSocket fix connection established")

    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received fix request: {data.get('type')}")

            if data.get('type') == 'fix_request':
                try:
                    service = get_ai_fix_service()

                    vuln_data = data.get('vulnerability', {})
                    code_ctx = data.get('codeContext', {})

                    # Use queue for thread-safe communication
                    message_queue = queue.Queue()
                    all_chunks = []

                    def on_chunk(content: str):
                        all_chunks.append(content)
                        message_queue.put(('chunk', content))

                    def on_complete(parsed: Dict[str, Any]):
                        full_content = ''.join(all_chunks)
                        message_queue.put(('complete', {
                            'full_content': full_content,
                            'search_blocks': parsed.get('search_blocks', []),
                            'replace_blocks': parsed.get('replace_blocks', [])
                        }))
                        message_queue.put(('done', None))

                    def on_error(error: str):
                        message_queue.put(('error', error))
                        message_queue.put(('done', None))

                    def run_generation():
                        try:
                            vuln_dict = {
                                'cve_id': vuln_data.get('cwe', 'UNKNOWN'),
                                'severity': vuln_data.get('severity', 'MEDIUM'),
                                'title': vuln_data.get('description', 'Security vulnerability'),
                                'description': vuln_data.get('recommendation', ''),
                                'recommendation': vuln_data.get('recommendation', '')
                            }
                            code_dict = {
                                'file_path': code_ctx.get('file_path', 'unknown'),
                                'line_start': code_ctx.get('start_line', 1),
                                'line_end': code_ctx.get('end_line', 1),
                                'vulnerable_code': code_ctx.get('vulnerable_code', ''),
                                'surrounding_context': code_ctx.get('surrounding_code', ''),
                                'imports': code_ctx.get('imports', []),
                                'language': code_ctx.get('language', 'javascript')
                            }
                            logger.info(f"Fix generation input - vuln: {vuln_dict}")
                            logger.info(f"Fix generation input - code: file={code_dict['file_path']}, lines={code_dict['line_start']}-{code_dict['line_end']}, code_len={len(code_dict['vulnerable_code'])}")
                            service.generate_fix_stream(
                                vulnerability=vuln_dict,
                                code_context=code_dict,
                                on_chunk=on_chunk,
                                on_complete=on_complete,
                                on_error=on_error
                            )
                        except Exception as e:
                            message_queue.put(('error', str(e)))
                            message_queue.put(('done', None))

                    # Start generation in background thread
                    thread = threading.Thread(target=run_generation)
                    thread.start()

                    # Send messages from queue to WebSocket
                    while True:
                        try:
                            msg_type, content = message_queue.get(timeout=0.1)
                        except queue.Empty:
                            continue

                        if msg_type == 'done':
                            break
                        elif msg_type == 'chunk':
                            await websocket.send_json({
                                'type': 'fix_chunk',
                                'content': content,
                                'done': False
                            })
                        elif msg_type == 'complete':
                            await websocket.send_json({
                                'type': 'fix_chunk',
                                'content': '',
                                'done': True,
                                'full_content': content['full_content'],
                                'search_blocks': content['search_blocks'],
                                'replace_blocks': content['replace_blocks']
                            })
                        elif msg_type == 'error':
                            await websocket.send_json({
                                'type': 'fix_error',
                                'message': content
                            })

                    thread.join()

                except Exception as e:
                    logger.error(f"Fix generation error: {e}", exc_info=True)
                    await websocket.send_json({
                        'type': 'fix_error',
                        'message': str(e)
                    })

    except WebSocketDisconnect:
        logger.info("WebSocket fix connection closed")
    except Exception as e:
        logger.error(f"WebSocket fix error: {e}", exc_info=True)


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for chat.
    Expects: { type: 'chat_message', content: '...', context: {...} }
           or { type: 'quick_action', action: '...', vulnerability: {...} }
    Sends: { type: 'chat_chunk', content: '...', done: false/true }
    """
    await websocket.accept()
    logger.info("WebSocket chat connection established")

    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received chat message: {data.get('type')}")

            msg_type = data.get('type')

            if msg_type in ['chat_message', 'quick_action']:
                try:
                    service = get_ai_fix_service()

                    content = data.get('content', '')
                    context = data.get('context', {})
                    action = data.get('action', 'chat')
                    # Extract vulnerability from context.vulnerability or top-level vulnerability
                    vuln = data.get('vulnerability', context.get('vulnerability', {}))

                    # Build prompt based on action
                    prompt = content

                    # Use queue for thread-safe communication
                    message_queue = queue.Queue()
                    all_chunks = []

                    def on_chunk(chunk_content: str):
                        all_chunks.append(chunk_content)
                        message_queue.put(('chunk', chunk_content))

                    def on_complete(parsed: Dict[str, Any]):
                        full_content = ''.join(all_chunks)
                        message_queue.put(('complete', full_content))
                        message_queue.put(('done', None))

                    def on_error(error: str):
                        message_queue.put(('error', error))
                        message_queue.put(('done', None))

                    def run_chat():
                        try:
                            # Pass full vulnerability context to chat_stream
                            service.chat_stream(
                                message=prompt,
                                context={
                                    'vulnerability': {
                                        'cwe': vuln.get('cwe', ''),
                                        'cweName': vuln.get('cweName', ''),
                                        'severity': vuln.get('severity', ''),
                                        'description': vuln.get('description', ''),
                                        'recommendation': vuln.get('recommendation', ''),
                                        'file_path': vuln.get('file_path', context.get('currentFile', context.get('current_file', ''))),
                                        'codeSnippet': vuln.get('codeSnippet', ''),
                                        'owasp': vuln.get('owasp', ''),
                                        'startLine': vuln.get('startLine', ''),
                                        'endLine': vuln.get('endLine', ''),
                                    },
                                    'current_file': context.get('currentFile', context.get('current_file', '')),
                                    'recent_fix': context.get('recent_fix', '')
                                },
                                on_chunk=on_chunk,
                                on_complete=on_complete,
                                on_error=on_error
                            )
                        except Exception as e:
                            message_queue.put(('error', str(e)))
                            message_queue.put(('done', None))

                    # Start chat in background thread
                    thread = threading.Thread(target=run_chat)
                    thread.start()

                    # Send messages from queue to WebSocket
                    while True:
                        try:
                            msg_type_q, content_q = message_queue.get(timeout=0.1)
                        except queue.Empty:
                            continue

                        if msg_type_q == 'done':
                            break
                        elif msg_type_q == 'chunk':
                            await websocket.send_json({
                                'type': 'chat_chunk',
                                'content': content_q,
                                'done': False
                            })
                        elif msg_type_q == 'complete':
                            await websocket.send_json({
                                'type': 'chat_chunk',
                                'content': '',
                                'done': True,
                                'full_content': content_q
                            })
                        elif msg_type_q == 'error':
                            await websocket.send_json({
                                'type': 'chat_error',
                                'message': content_q
                            })

                    thread.join()

                except Exception as e:
                    logger.error(f"Chat error: {e}", exc_info=True)
                    await websocket.send_json({
                        'type': 'chat_error',
                        'message': str(e)
                    })

    except WebSocketDisconnect:
        logger.info("WebSocket chat connection closed")
    except Exception as e:
        logger.error(f"WebSocket chat error: {e}", exc_info=True)
