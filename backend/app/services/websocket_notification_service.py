"""
Notification delivery service with error handling and logging
"""
import asyncio
import logging
from typing import Dict, Any

from ..websocket.connection_manager import connection_manager

logger = logging.getLogger(__name__)


async def send_notification_to_user(
    user_id: str, 
    message: Dict[str, Any]
) -> bool:
    """
    Send notification to a specific user with error handling
    
    Args:
        user_id: Target user ID
        message: Message dict to send
        
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        await connection_manager.send_personal_message(user_id, message)
        logger.info(f"✓ Notification sent to user {user_id}: {message.get('type', 'unknown')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send notification to user {user_id}: {e}")
        return False


async def broadcast_notification(message: Dict[str, Any]) -> int:
    """
    Broadcast notification to all connected users with error handling
    
    Args:
        message: Message dict to broadcast
        
    Returns:
        Number of users notified
    """
    try:
        total = len(connection_manager.active_connections)
        await connection_manager.broadcast(message)
        logger.info(f"Broadcast notification sent to {total} users")
        return total
    except Exception as e:
        logger.error(f"Failed to broadcast notification: {e}")
        return 0


def send_notification_sync(user_id: str, message: Dict[str, Any]) -> None:
    """
    Synchronous wrapper for sending notifications via BackgroundTasks
    Runs the async function in the current event loop
    
    Args:
        user_id: Target user ID
        message: Message dict to send
    """
    try:
        # Get the current event loop if running in async context
        try:
            loop = asyncio.get_running_loop()
            # If we're already in an async context, create a task
            loop.create_task(send_notification_to_user(user_id, message))
            logger.debug(f"Scheduled notification task for user {user_id}")
        except RuntimeError:
            # No event loop running, create a new one
            asyncio.run(send_notification_to_user(user_id, message))
    except Exception as e:
        logger.error(f"Error in send_notification_sync: {e}")


async def send_notification_to_user_from_bg(user_id: str, message: Dict[str, Any]) -> None:
    """
    Async wrapper for sending notifications from background tasks
    
    Args:
        user_id: Target user ID
        message: Message dict to send
    """
    try:
        await send_notification_to_user(user_id, message)
    except Exception as e:
        logger.error(f"Error sending notification from background: {e}")


async def broadcast_data_sync_event(entity_type: str, action: str, payload: Any) -> int:
    """
    Broadcast data synchronization event to all connected users
    
    Args:
        entity_type: Type of entity (lead, task, sod, eod, wod, etc.)
        action: Action performed (create, update, delete, sync)
        payload: Data payload for the sync event
        
    Returns:
        Number of users notified
    """
    try:
        message = {
            "type": "data_sync_event",
            "entity_type": entity_type,
            "action": action,
            "payload": payload
        }
        total = len(connection_manager.active_connections)
        await connection_manager.broadcast(message)
        logger.info(f"Data sync event broadcast: {entity_type} {action} to {total} users")
        return total
    except Exception as e:
        logger.error(f"Failed to broadcast data sync event: {e}")
        return 0


def broadcast_data_sync_sync(entity_type: str, action: str, payload: Any) -> None:
    """
    Synchronous wrapper for broadcasting data sync events via BackgroundTasks
    
    Args:
        entity_type: Type of entity (lead, task, sod, eod, wod, etc.)
        action: Action performed (create, update, delete, sync)
        payload: Data payload for the sync event
    """
    try:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(broadcast_data_sync_event(entity_type, action, payload))
            logger.debug(f"Scheduled data sync broadcast for {entity_type} {action}")
        except RuntimeError:
            asyncio.run(broadcast_data_sync_event(entity_type, action, payload))
    except Exception as e:
        logger.error(f"Error in broadcast_data_sync_sync: {e}")
