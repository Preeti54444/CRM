import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError

from ..auth.jwt import decode_token
from ..auth.dependencies import raise_invalid_credentials
from ..websocket.connection_manager import connection_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["websocket"])


def get_user_id_from_token(token: str) -> str:
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing 'sub' claim")
            raise_invalid_credentials()
        return user_id
    except (JWTError, ValueError) as e:
        logger.error(f"Invalid token: {e}")
        raise_invalid_credentials()


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket) -> None:
    # Accept connection immediately to avoid timeout
    await websocket.accept()
    
    token = websocket.query_params.get("token")
    if not token:
        logger.warning("WebSocket connection attempt without token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = get_user_id_from_token(token)
        logger.info(f"WebSocket connection established for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket token validation failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await connection_manager.connect(user_id, websocket)
    try:
        # Send welcome message
        await websocket.send_json({"type": "connection_established", "user_id": user_id})
        
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            logger.debug(f"Received message from user {user_id}: {data}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnect for user {user_id}")
        connection_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        connection_manager.disconnect(user_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass