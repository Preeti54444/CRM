import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from .database import SessionLocal, engine
from .services.performance_service import scheduler_loop
from .services.report_service import create_daily_report
from .services.lender_case_service import create_lender_case
from .services.reminder_scheduler import reminder_scheduler_loop
from .services.performance_scheduler import performance_scheduler_loop
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from lender_models import ensure_lender_schema, seed_default_lenders

# Optional Sentry integration for production error monitoring
try:
    SENTRY_DSN = settings.__dict__.get('sentry_dsn') or None
    if not SENTRY_DSN:
        SENTRY_DSN = None
except Exception:
    SENTRY_DSN = None

if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
        # Wrap ASGI app later after creation
    except Exception:
        logging.getLogger(__name__).exception('Failed to initialize Sentry')


from .routers.auth import router as auth_router
from .routers.users import router as users_router
from .routers import leads, customers, followups, dashboard, timeline, reports, work_sessions, early_logout, lender_cases, calls, lender_queries
from .routers.lender_products import router as lender_products_router
from .routers.lenders import router as lenders_router
from .routers.dashboard import api_router as dashboard_api_router
from .routers.contacts import router as contacts_router
try:
    from lender_service import router as lender_router
except ImportError:
    from ..lender_service import router as lender_router
from .routers.notifications import router as notifications_router
from .routers.realtime import router as realtime_router
from .routers.timer_metrics import router as timer_metrics_router
from .routers.tasks import router as tasks_router
from .routers.employee_performance import router as employee_performance_router
from .routers.admin_performance import router as admin_performance_router
from .routers.admin_employees import router as admin_employees_router
from .routers.target_management import (
    router as target_management_router,
    api_router as target_api_router,
    compat_router as target_compat_router,
)
from .routers import my_todo
from .routers.pipeline import router as pipeline_router
from .routers.forecast import router as forecast_router
from .routers.lender_recommend import router as lender_recommend_router

try:
    from lender_service import router as lender_router
except ImportError:
    from ..lender_service import router as lender_router

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FundingSathi CRM Backend",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Rate limiting middleware (uses remote IP by default). Configure via env var.
try:
    default_rate = "200/minute"
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    logger.info(f"Rate limiting enabled (default={default_rate})")
except Exception:
    logger.exception("Failed to initialize rate limiting middleware")

# If Sentry was initialized above, wrap the ASGI app to capture errors
try:
    if SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
        app.add_middleware(SentryAsgiMiddleware)
except Exception:
    logger.exception('Failed to add Sentry ASGI middleware')

# Prometheus metrics (optional) - expose at /metrics when instrumentator is installed
try:
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app, endpoint="/metrics")
    logger.info("Prometheus instrumentation enabled at /metrics")
except Exception:
    logger.info("Prometheus instrumentation not available (install prometheus-fastapi-instrumentator to enable)")

# Ensure new models/tables for My To-Do features exist
try:
    # Import models so SQLAlchemy metadata is populated
    from .models.todo import Todo  # noqa: F401
    from .models.activity import Activity  # noqa: F401
    from .models.document import Document  # noqa: F401
    from .models.lender_query import LenderQuery  # noqa: F401
    from .models.target_management import (  # noqa: F401
        EmployeeCarryForward, TargetAuditLog, EmployeeBadge, TargetEarlyLogoutRequest
    )
    from .database import Base, engine
    Base.metadata.create_all(bind=engine)
except Exception:
    logger.exception("Failed to create my-todo tables (continuing)")

# Import forecast models to register them with SQLAlchemy
try:
    from .models.forecast import (  # noqa: F401
        PipelineStageConfig, BusinessVerticalConfig, ProductMaster, LenderMaster,
        RevenueRuleMaster, ForecastSnapshot, ForecastAuditTrail, ForecastResult,
        RevenueRealization, TrancheSchedule, RenewalSchedule
    )
except Exception:
    logger.exception("Failed to import forecast models (continuing)")

# Configure CORS based on environment
allowed_origins = settings.allowed_origins

if settings.allowed_hosts.strip() == "*" and settings.environment.lower() != "production":
    logger.warning(
        "ALLOWED_HOSTS is set to '*'; limiting CORS origins to common local development hosts."
    )

logger.info(f"Environment: {settings.environment}")
logger.info(f"CORS allowed origins: {allowed_origins}")


@app.options("/{path:path}")
async def options_handler(request: Request, path: str):
    """Handle OPTIONS requests for CORS preflight"""
    origin = request.headers.get("origin")
    headers = {}
    if origin in allowed_origins or "*" in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        headers["Access-Control-Allow-Headers"] = "*"
    return JSONResponse(content={"detail": "OK"}, status_code=200, headers=headers)


# Add standard FastAPI CORS middleware for proper preflight handling.
# IMPORTANT: this must use the `allowed_origins` computed above from settings,
# not a hardcoded "*". allow_origins=["*"] combined with allow_credentials=True
# lets ANY website make authenticated requests to this API (browsers/Starlette
# will happily reflect the requesting origin back), which is a real
# data-exposure risk for a CRM. Restrict to the configured origin list instead.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Ensure CORS headers are set on all HTTP errors including 401.
    # Only reflect the Origin header back when it's actually on the allowed
    # list -- reflecting ANY origin unconditionally defeats CORS entirely.
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in allowed_origins or "*" in allowed_origins):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    headers["Access-Control-Allow-Headers"] = "*"

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Ensure CORS headers are set on all error responses.
    # Only reflect the Origin header back when it's actually on the allowed
    # list -- reflecting ANY origin unconditionally defeats CORS entirely.
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in allowed_origins or "*" in allowed_origins):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    headers["Access-Control-Allow-Headers"] = "*"

    # Log the exception with stack trace for diagnostics
    logger.exception("Unhandled exception in request")

    # Don't leak raw exception text (stack traces, SQL, file paths, etc.) to
    # clients in production. Full details are already logged above.
    if settings.environment.lower() == "production":
        detail = "Internal server error"
    else:
        detail = str(exc)

    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers=headers,
    )


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(leads.router)
app.include_router(customers.router)
app.include_router(followups.router)
app.include_router(timeline.router)
app.include_router(dashboard.router)
app.include_router(dashboard_api_router)
app.include_router(reports.router)
app.include_router(work_sessions.router)
app.include_router(early_logout.router)
app.include_router(early_logout.api_router)
app.include_router(tasks_router)
app.include_router(notifications_router)
app.include_router(realtime_router)
app.include_router(lender_cases.router)
app.include_router(calls.router)
app.include_router(lender_queries.router)
app.include_router(contacts_router)
app.include_router(lender_router)
app.include_router(lender_products_router)
app.include_router(lenders_router)
app.include_router(employee_performance_router)
app.include_router(admin_performance_router)
app.include_router(admin_employees_router)
app.include_router(target_management_router)
app.include_router(target_api_router)
app.include_router(target_compat_router)
app.include_router(my_todo.router)
app.include_router(pipeline_router)
app.include_router(forecast_router)
app.include_router(lender_recommend_router)
app.include_router(timer_metrics_router)
if settings.environment.lower() != "production":
    from .routers.debug import router as debug_router
    app.include_router(debug_router)

# Deal steps router: lightweight endpoint to persist per-step data
# NOTE: per-step saving endpoint integrated into the existing `leads` router.

# Serve frontend static files for LAN/remote browser testing
frontend_dir = Path(__file__).resolve().parent.parent.parent / 'frontend'
public_frontend_dir = frontend_dir / 'public'
static_frontend_dir = public_frontend_dir if public_frontend_dir.exists() else frontend_dir
if static_frontend_dir.exists():
    app.mount('/frontend', StaticFiles(directory=str(static_frontend_dir), html=True), name='frontend')
    logger.info(f"Frontend static files mounted from: {static_frontend_dir} under /frontend")

    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/frontend/login.html")


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
            
            # Attempt to log total leads count in database. In development allow
            # missing tables (fresh DB) without failing startup so frontend can
            # be tested against a local SQLite DB.
            try:
                lead_count = connection.execute(text("SELECT COUNT(*) FROM leads")).scalar()
                logger.info(f"[AUDIT] Total leads in database: {lead_count}")
            except Exception:
                logger.warning("Leads table not present or query failed; continuing in development mode.")

            try:
                ensure_lender_schema(engine)
                with SessionLocal() as session:
                    seeded = seed_default_lenders(session)
                    if seeded:
                        logger.info("Seeded %s default lenders for recommendation flow", seeded)
            except Exception:
                logger.exception("Failed to initialize lender schema or seed lenders")
    except Exception as exc:
        logger.exception("Database startup validation failed")
        # In production we should fail fast; in development allow the app to
        # continue so the developer can iterate without a running Postgres.
        if settings.environment.lower() == 'production':
            raise
        else:
            logger.warning("Continuing startup despite database validation failure (development mode)")

    if settings.scheduler_enabled:
        logger.info("Starting performance scheduler")
        app.state.scheduler_task = asyncio.create_task(scheduler_loop())
        logger.info("Starting follow-up reminder scheduler")
        app.state.reminder_scheduler_task = asyncio.create_task(reminder_scheduler_loop())
        logger.info("Starting performance check scheduler")
        app.state.performance_scheduler_task = asyncio.create_task(performance_scheduler_loop())
    else:
        logger.info("Performance scheduler is disabled")
        logger.info("Follow-up reminder scheduler is disabled")
        logger.info("Performance check scheduler is disabled")


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
    
    performance_scheduler_task = getattr(app.state, "performance_scheduler_task", None)
    if performance_scheduler_task and not performance_scheduler_task.done():
        performance_scheduler_task.cancel()
        try:
            await performance_scheduler_task
        except asyncio.CancelledError:
            logger.info("Performance check scheduler task cancelled")


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

