import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .database import SessionLocal
from .services.performance_service import scheduler_loop
from .services.report_service import create_daily_report
from .services.lender_case_service import create_lender_case
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .routers.auth import router as auth_router
from .routers.users import router as users_router
from .routers import leads, customers, followups, dashboard, timeline, reports, work_sessions, early_logout
from .routers import lender_cases
from .routers.notifications import router as notifications_router
from .routers.realtime import router as realtime_router
from .routers.tasks import router as tasks_router

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

is_production = settings.environment.lower() == "production"
app = FastAPI(
    title="FundingSathi CRM Backend",
    version="1.0.0",
    docs_url="/api/docs" if not is_production else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if not is_production else None,
)

# Configure CORS based on environment
allowed_origins = settings.allowed_origins

if settings.allowed_hosts.strip() == "*" and settings.environment.lower() != "production":
    logger.warning(
        "ALLOWED_HOSTS is set to '*'; limiting CORS origins to common local development hosts."
    )

logger.info(f"Environment: {settings.environment}")
logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-JSON-Response"],
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
from .routers.performance import router as performance_router
app.include_router(performance_router)
from .routers.debug import router as debug_router
if not is_production:
    app.include_router(debug_router)

# Serve frontend static files for LAN/remote browser testing
frontend_dir = Path(__file__).resolve().parent.parent.parent / 'frontend'
if frontend_dir.exists():
    app.mount('/frontend', StaticFiles(directory=str(frontend_dir), html=True), name='frontend')


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "FundingSathi CRM Backend Running",
    }


# Legacy compatibility: serve OpenAPI at /openapi.json for older frontend code
if not is_production:
    @app.get("/openapi.json")
    async def legacy_openapi():
        return JSONResponse(content=app.openapi())


@app.on_event("startup")
async def startup_scheduler():
    if settings.scheduler_enabled:
        logger.info("Starting performance scheduler")
        app.state.scheduler_task = asyncio.create_task(scheduler_loop())
    else:
        logger.info("Performance scheduler is disabled")


@app.on_event("shutdown")
async def shutdown_scheduler():
    scheduler_task = getattr(app.state, "scheduler_task", None)
    if scheduler_task and not scheduler_task.done():
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            logger.info("Performance scheduler task cancelled")


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

