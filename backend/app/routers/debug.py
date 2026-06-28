from fastapi import APIRouter, Body, status
from pydantic import BaseModel
from ..websocket.connection_manager import connection_manager

router = APIRouter(prefix="/debug", tags=["debug"])

class DebugNotify(BaseModel):
    user_id: str
    title: str = "Debug Notification"
    message: str = "Test message"

@router.post("/notify", status_code=status.HTTP_200_OK)
async def debug_notify(payload: DebugNotify = Body(...)):
    data = {
        "type": "notification_event",
        "payload": {
            "id": payload.user_id + "-dbg",
            "title": payload.title,
            "message": payload.message,
            "type": "debug",
            "related_task_id": None,
            "is_read": False,
            "created_at": None,
        },
    }
    await connection_manager.send_personal_message(payload.user_id, data)
    return {"detail": "sent"}
