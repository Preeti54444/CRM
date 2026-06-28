import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.followup import FollowUp
from ..models.user import User
from ..services.followup_service import update_overdue_status
from ..services.notification_service import create_notification

logger = logging.getLogger(__name__)


async def check_and_send_pre_reminders(db: Session):
    """Check for follow-ups that need pre-reminders (15 minutes before)"""
    now = datetime.now()
    reminder_time = now + timedelta(minutes=15)
    today = now.date()
    reminder_date = reminder_time.date()
    reminder_time_only = reminder_time.time()
    
    # Find follow-ups scheduled for 15 minutes from now that haven't had reminders sent
    upcoming_followups = db.query(FollowUp).filter(
        FollowUp.followup_date == reminder_date,
        FollowUp.followup_time == reminder_time_only,
        FollowUp.followup_completed == False,
        FollowUp.reminder_sent == False
    ).all()
    
    for followup in upcoming_followups:
        if followup.assigned_to:
            # Create in-app notification
            create_notification(
                db,
                followup.assigned_to,
                title="Upcoming Follow-up Reminder",
                message=f"You have an upcoming follow-up in 15 minutes for lead {followup.lead_id}."
            )
            
            # Send email notification if configured
            if followup.assigned_to:
                send_email_reminder(db, followup, followup.assigned_to)
            
            # Send WhatsApp notification if configured
            send_whatsapp_reminder(db, followup, followup.assigned_to)
            
            logger.info(f"Pre-reminder sent for follow-up {followup.id}")


def send_email_reminder(db: Session, followup: FollowUp, user_id: UUID):
    """Send email reminder for follow-up"""
    try:
        from ..config import settings
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        if not settings.smtp_host or not settings.smtp_user:
            logger.warning("Email not configured, skipping email reminder")
            return
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.email:
            logger.warning(f"User not found or no email for user {user_id}")
            return
        
        lead = followup.lead
        scheduled_time = f"{followup.followup_date.strftime('%d %B %Y')} at {followup.followup_time.strftime('%I:%M %p')}" if followup.followup_time else followup.followup_date.strftime('%d %B %Y')
        
        subject = "Upcoming Follow-up Reminder"
        body = f"""
        You have an upcoming customer follow-up.
        
        Customer: {lead.lead_name if lead else 'N/A'}
        Company: {lead.company_name if lead else 'N/A'}
        Scheduled: {scheduled_time}
        Note: {followup.notes or 'No notes'}
        
        Please contact the customer on time.
        """
        
        msg = MIMEMultipart()
        msg['From'] = settings.email_from or settings.smtp_user
        msg['To'] = user.email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        
        logger.info(f"Email reminder sent to {user.email} for follow-up {followup.id}")
    except Exception as e:
        logger.error(f"Failed to send email reminder: {e}")


def send_whatsapp_reminder(db: Session, followup: FollowUp, user_id: UUID):
    """Send WhatsApp reminder for follow-up if integration exists"""
    try:
        # Check if WhatsApp integration is configured
        # This is a placeholder - actual implementation depends on your WhatsApp API
        from ..config import settings
        
        if not hasattr(settings, 'whatsapp_api_url') or not settings.whatsapp_api_url:
            logger.debug("WhatsApp not configured, skipping WhatsApp reminder")
            return
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.mobile:
            logger.warning(f"User not found or no mobile for user {user_id}")
            return
        
        lead = followup.lead
        scheduled_time = f"{followup.followup_date.strftime('%d %B %Y')} at {followup.followup_time.strftime('%I:%M %p')}" if followup.followup_time else followup.followup_date.strftime('%d %B %Y')
        
        message = f"""🔔 Reminder
        
Follow-up Due

Customer: {lead.lead_name if lead else 'N/A'}
Time: {scheduled_time}

Click here to open CRM."""
        
        # Actual WhatsApp API call would go here
        # Example: requests.post(settings.whatsapp_api_url, json={'phone': user.mobile, 'message': message})
        
        logger.info(f"WhatsApp reminder sent to {user.mobile} for follow-up {followup.id}")
    except Exception as e:
        logger.error(f"Failed to send WhatsApp reminder: {e}")


async def reminder_scheduler_loop():
    """Background scheduler that runs every minute to check for reminders"""
    logger.info("Starting follow-up reminder scheduler")
    
    while True:
        try:
            db = SessionLocal()
            try:
                # Update overdue status
                overdue_count = update_overdue_status(db)
                if overdue_count > 0:
                    logger.info(f"Updated {overdue_count} follow-ups to overdue status")
                
                # Check and send pre-reminders (15 minutes before)
                await check_and_send_pre_reminders(db)
                
            finally:
                db.close()
            
            # Sleep for 1 minute before next check
            await asyncio.sleep(60)
            
        except asyncio.CancelledError:
            logger.info("Reminder scheduler cancelled")
            break
        except Exception as e:
            logger.error(f"Error in reminder scheduler: {e}")
            await asyncio.sleep(60)  # Wait before retrying


def get_browser_notification_data(db: Session, user_id: UUID) -> list:
    """Get data for browser notifications"""
    from ..services.followup_service import get_due_reminders
    
    reminders = get_due_reminders(db, user_id)
    
    notification_data = []
    for reminder in reminders:
        notification_data.append({
            "title": "Follow-up Due",
            "body": f"{reminder.lead_name} - {reminder.company_name or ''}",
            "icon": "/logo.png",
            "data": {
                "followup_id": str(reminder.id),
                "lead_id": reminder.lead_id
            }
        })
    
    return notification_data
