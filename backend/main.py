"""
CivicLens AI – FastAPI application entry point.

Startup sequence:
  1. Load .env
  2. Initialise SQLite database
  3. Mount routers
  4. Configure CORS

Run with:
  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Load environment variables from .env (if present) before importing anything
# that reads env vars at module level.
load_dotenv()

from db.database import init_db  # noqa: E402  (after load_dotenv)
from routers.audits import router as audits_router  # noqa: E402
from routers.demo import router as demo_router  # noqa: E402


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise the database on startup."""
    print("[main] CivicLens AI backend starting up…", file=sys.stderr)
    await init_db()
    yield
    print("[main] CivicLens AI backend shutting down.", file=sys.stderr)


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CivicLens AI",
    description=(
        "AI-powered accessibility and usability auditing for public government websites. "
        "Helps citizens identify and report barriers that prevent equal access to services."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
cors_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(audits_router)
app.include_router(demo_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["system"])
async def health_check() -> dict:
    """Simple liveness probe."""
    return {"status": "ok", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Frontend (production): serve the built React app from the same origin
# ---------------------------------------------------------------------------

_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if _DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        # Real files (favicon etc.) as-is; any other path is a client-side route
        file = (_DIST / path).resolve()
        if path and file.is_file() and _DIST in file.parents:
            return FileResponse(file)
        return FileResponse(_DIST / "index.html")


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
