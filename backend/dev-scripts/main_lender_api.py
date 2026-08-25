from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from lender_service import router as lender_router
from lender_models import Base, ensure_lender_schema, seed_default_lenders
from db import engine, SessionLocal

app = FastAPI(title='Lender Matching API')

# Allow CORS for local frontend during development (open during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(lender_router)


def init_db():
    Base.metadata.create_all(bind=engine)
    ensure_lender_schema(engine)
    with SessionLocal() as session:
        seeded = seed_default_lenders(session)
        if seeded:
            print(f'Seeded {seeded} default lenders')


@app.on_event('startup')
def on_startup():
    init_db()


# Development helpers: respond to frontend's root paths so preflight/GETs don't 404
from fastapi.responses import JSONResponse

@app.options('/{path_name:path}')
def preflight(path_name: str):
    return JSONResponse(status_code=200, content={})


@app.get('/leads')
def get_leads(limit: int = 1000):
    return []


@app.get('/users')
def get_users():
    return []


@app.get('/followups/statistics')
def followups_statistics():
    return {}


@app.get('/followups/due-reminders')
def followups_due_reminders():
    return []
