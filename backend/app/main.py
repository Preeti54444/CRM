import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .database import SessionLocal, engine
from .services.performance_service import scheduler_loop
from .services.report_service import create_daily_report
from .services.lender_case_service import create_lender_case
from .services.reminder_scheduler import reminder_scheduler_loop
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .config import settings


from .routers.auth import router as auth_router
from .routers.users import router as users_router
from .routers import leads, customers, followups, dashboard, timeline, reports, work_sessions, early_logout
from .routers import lender_cases, calls
from .routers.notifications import router as notifications_router
from .routers.realtime import router as realtime_router
from .routers.tasks import router as tasks_router

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FundingSathi CRM Backend",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Configure CORS based on environment
allowed_origins = settings.allowed_origins

if settings.allowed_hosts.strip() == "*" and settings.environment.lower() != "production":
    logger.warning(
        "ALLOWED_HOSTS is set to '*'; limiting CORS origins to common local development hosts."
    )

logger.info(f"Environment: {settings.environment}")
logger.info(f"CORS allowed origins: {allowed_origins}")

# Add standard FastAPI CORS middleware for proper preflight handling
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Ensure CORS headers are set on all HTTP errors including 401
    origin = request.headers.get("origin")
    allowed_origins = settings.allowed_origins
    
    headers = {}
    if origin in allowed_origins or "*" in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        headers["Access-Control-Allow-Headers"] = "*"
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Ensure CORS headers are set on all error responses
    origin = request.headers.get("origin")
    allowed_origins = settings.allowed_origins
    
    headers = {}
    if origin in allowed_origins or "*" in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        headers["Access-Control-Allow-Headers"] = "*"
    
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers
    )


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(leads.router)
app.include_router(customers.router)
app.include_router(followups.router)
app.include_router(timeline.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(work_sessions.router)
app.include_router(early_logout.router)
app.include_router(tasks_router)
app.include_router(notifications_router)
app.include_router(realtime_router)
app.include_router(lender_cases.router)
app.include_router(calls.router)
from .routers.debug import router as debug_router
app.include_router(debug_router)

# Serve frontend static files for LAN/remote browser testing
frontend_dir = Path(__file__).resolve().parent.parent.parent / 'frontend'
if frontend_dir.exists():
    app.mount('/frontend', StaticFiles(directory=str(frontend_dir), html=True), name='frontend')
    logger.info(f"Frontend static files mounted from: {frontend_dir} under /frontend")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "FundingSathi CRM Backend Running",
    }


# Legacy compatibility: serve OpenAPI at /openapi.json for older frontend code
@app.get("/openapi.json")
async def legacy_openapi():
    return JSONResponse(content=app.openapi())


@app.on_event("startup")
async def startup_scheduler():
    # Log DATABASE_URL for debugging (mask password)
    db_url = settings.database_url
    if db_url:
        # Mask password in URL for security
        masked_url = db_url.split('@')[-1] if '@' in db_url else db_url
        logger.info(f"[AUDIT] DATABASE_URL (masked): postgresql://****:****@{masked_url}")
    
    # Validate database connectivity on startup.
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("Database connection verified: %s", result.scalar())
            
            # Log total leads count in database
            lead_count = connection.execute(text("SELECT COUNT(*) FROM leads")).scalar()
            logger.info(f"[AUDIT] Total leads in PostgreSQL database: {lead_count}")
    except Exception as exc:
        logger.exception("Database startup validation failed")
        raise

    if settings.scheduler_enabled:
        logger.info("Starting performance scheduler")
        app.state.scheduler_task = asyncio.create_task(scheduler_loop())
        logger.info("Starting follow-up reminder scheduler")
        app.state.reminder_scheduler_task = asyncio.create_task(reminder_scheduler_loop())
    else:
        logger.info("Performance scheduler is disabled")
        logger.info("Follow-up reminder scheduler is disabled")


@app.on_event("shutdown")
async def shutdown_scheduler():
    scheduler_task = getattr(app.state, "scheduler_task", None)
    if scheduler_task and not scheduler_task.done():
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            logger.info("Performance scheduler task cancelled")
    
    reminder_scheduler_task = getattr(app.state, "reminder_scheduler_task", None)
    if reminder_scheduler_task and not reminder_scheduler_task.done():
        reminder_scheduler_task.cancel()
        try:
            await reminder_scheduler_task
        except asyncio.CancelledError:
            logger.info("Reminder scheduler task cancelled")


# MIGRATION COMPLETE: Legacy /api.php and /crm/api.php handlers have been removed.
# Frontend has been migrated to use native FastAPI endpoints directly.
# All requests now go through authenticated FastAPI routes.
# 
# REMOVED ROUTES:
# - @app.api_route("/api.php", methods=["GET", "POST", "OPTIONS"])
# - @app.api_route("/crm/api.php", methods=["GET", "POST", "OPTIONS"])
#
# If you need to restore legacy support for any reason, these handlers are preserved
# in git history and can be restored from a previous commit.
#
# Direct FastAPI endpoints used by frontend:
# - POST /sod, POST /eod, POST /wod (with authentication)
# - GET /sod, GET /eod, GET /wod (with authentication)
# - POST /leads, GET /leads, PUT /leads/{id}, DELETE /leads/{id}
# - POST /lender, GET /lender (with authentication)
# - POST /tasks, GET /tasks, PUT /tasks/{id}
# - POST /followups, GET /followups, PUT /followups/{id}
# - GET /notifications, WebSocket /ws
# - GET /users, POST /auth/login, POST /auth/register
# - GET /health (public health check endpoint)

