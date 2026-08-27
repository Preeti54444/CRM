import os
import sys
from typing import Awaitable, Callable


BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Serverless functions should not start perpetual background workers.
os.environ.setdefault("SCHEDULER_ENABLED", "false")

from app.main import app as fastapi_app


class ApiPrefix:
    def __init__(self, application):
        self.application = application

    async def __call__(self, scope, receive, send):
        if scope["type"] in {"http", "websocket"}:
            path = scope.get("path", "")
            if path == "/api" or path.startswith("/api/"):
                scope = dict(scope)
                scope["path"] = path[4:] or "/"
                scope["raw_path"] = scope.get("raw_path", b"")[4:] or b"/"
        await self.application(scope, receive, send)


app = ApiPrefix(fastapi_app)