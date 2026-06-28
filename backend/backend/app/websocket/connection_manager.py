import logging
from collections import defaultdict
from typing import DefaultDict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: DefaultDict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[str(user_id)].append(websocket)
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[str(user_id)])}")

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(str(user_id), [])
        if websocket in connections:
            connections.remove(websocket)
            logger.info(f"User {user_id} disconnected. Remaining connections: {len(connections)}")
        if not connections:
            self.active_connections.pop(str(user_id), None)
            logger.info(f"All connections closed for user {user_id}")

    async def send_personal_message(self, user_id: str, message: dict) -> None:
        connections = list(self.active_connections.get(str(user_id), []))
        if not connections:
            logger.warning(f"No active connections for user {user_id}")
            return
        
        for websocket in connections:
            try:
                await websocket.send_json(message)
                logger.debug(f"Message sent to user {user_id}: {message.get('type', 'unknown')}")
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
                self.disconnect(user_id, websocket)

    async def broadcast(self, message: dict) -> None:
        total_sockets = sum(len(sockets) for sockets in self.active_connections.values())
        logger.debug(f"Broadcasting message to {total_sockets} connections")
        
        for user_id, sockets in list(self.active_connections.items()):
            for websocket in list(sockets):
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast to user {user_id}: {e}")
                    self.disconnect(user_id, websocket)


connection_manager = ConnectionManager()
