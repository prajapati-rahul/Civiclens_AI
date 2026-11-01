"""
Demo router – serves static illustrative audit data for the CivicLens AI UI.

Endpoints
---------
GET  /api/demo        — Return the pre-built demo audit
POST /api/demo/reset  — Return the same data (idempotent reset for frontend)
"""

from __future__ import annotations

from fastapi import APIRouter

try:
    from data.demo_audit import get_demo_audit
except (ImportError, ValueError):
    from ..data.demo_audit import get_demo_audit

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("", response_model=dict)
async def get_demo() -> dict:
    """
    Return the static demo audit for the Greenfield State Benefits Portal.
    This data is entirely fictional and clearly labelled as illustrative.
    """
    return get_demo_audit()


@router.post("/reset", response_model=dict)
async def reset_demo() -> dict:
    """
    Reset the demo to its initial state.
    Since the demo data is static, this simply returns the same payload.
    """
    data = get_demo_audit()
    data["_reset"] = True
    return data
