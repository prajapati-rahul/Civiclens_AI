"""
REST API router for audit lifecycle management.

Endpoints
---------
POST   /api/audits              — Start a new audit (async background task)
GET    /api/audits              — List audits (paginated)
GET    /api/audits/{id}         — Get full audit detail
DELETE /api/audits/{id}         — Delete an audit
GET    /api/audits/{id}/status  — Poll audit status
GET    /api/audits/{id}/report  — Get report-ready data
POST   /api/audits/clear        — Delete all audits
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

try:
    from db.database import (
        clear_all_audits,
        create_audit_record,
        delete_audit,
        get_audit_by_id,
        list_audits,
        save_audit_result,
    )
    from models.schemas import (
        AuditListItem,
        AuditMetadata,
        AuditRequest,
        AuditResponse,
        AuditStatus,
        Finding,
    )
    from services.audit_engine import run_audit
except (ImportError, ValueError):
    from ..db.database import (
        clear_all_audits,
        create_audit_record,
        delete_audit,
        get_audit_by_id,
        list_audits,
        save_audit_result,
    )
    from ..models.schemas import (
        AuditListItem,
        AuditMetadata,
        AuditRequest,
        AuditResponse,
        AuditStatus,
        Finding,
    )
    from ..services.audit_engine import run_audit

router = APIRouter(prefix="/api/audits", tags=["audits"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_audit_response(row: dict) -> AuditResponse:
    """Convert a raw DB row dict into an AuditResponse model."""
    metadata: Optional[AuditMetadata] = None
    findings: List[Finding] = []

    result_json = row.get("result_json")
    if result_json:
        try:
            result = json.loads(result_json)
            raw_meta = result.get("metadata")
            raw_findings = result.get("findings", [])

            if raw_meta:
                metadata = AuditMetadata(**raw_meta)

            for f in raw_findings:
                try:
                    findings.append(Finding(**f))
                except Exception as exc:
                    print(f"[audits] Skipping malformed finding: {exc}", file=sys.stderr)
        except json.JSONDecodeError as exc:
            print(f"[audits] result_json parse error: {exc}", file=sys.stderr)

    return AuditResponse(
        id=row["id"],
        url=row["url"],
        task=row["task"],
        scope=row["scope"],
        description=row.get("description"),
        status=AuditStatus(row["status"]),
        created_at=row["created_at"],
        completed_at=row.get("completed_at"),
        error_message=row.get("error_message"),
        metadata=metadata,
        findings=findings,
    )


def _row_to_list_item(row: dict) -> AuditListItem:
    """Convert a DB row to a lightweight list-item model."""
    findings_count = 0
    critical_count = 0
    overall_score: Optional[int] = None

    result_json = row.get("result_json")
    if result_json:
        try:
            result = json.loads(result_json)
            raw_findings = result.get("findings", [])
            findings_count = len(raw_findings)
            critical_count = sum(
                1 for f in raw_findings if f.get("severity") == "critical"
            )
            meta = result.get("metadata", {})
            if meta:
                overall_score = meta.get("overall_score")
        except json.JSONDecodeError:
            pass

    return AuditListItem(
        id=row["id"],
        url=row["url"],
        task=row["task"],
        status=AuditStatus(row["status"]),
        created_at=row["created_at"],
        completed_at=row.get("completed_at"),
        findings_count=findings_count,
        critical_count=critical_count,
        overall_score=overall_score,
    )


# ---------------------------------------------------------------------------
# Background task wrapper
# ---------------------------------------------------------------------------

async def _run_audit_task(
    audit_id: str,
    url: str,
    task: str,
    scope: str,
    description: str,
) -> None:
    """Wrapper that runs the audit engine and handles top-level exceptions."""
    try:
        await run_audit(audit_id, url, task, scope, description)
    except Exception as exc:
        print(f"[audits] Unhandled error in audit {audit_id}: {exc}", file=sys.stderr)
        completed_at = datetime.now(timezone.utc).isoformat()
        await save_audit_result(
            audit_id,
            "failed",
            completed_at,
            json.dumps({}),
            error_message=str(exc),
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=AuditResponse, status_code=202)
async def start_audit(
    request: AuditRequest,
    background_tasks: BackgroundTasks,
) -> AuditResponse:
    """
    Start a new audit in the background.
    Returns 202 Accepted with the initial audit record (status=pending).
    Poll GET /api/audits/{id}/status for progress.
    """
    audit_id = str(uuid.uuid4())
    url_str = str(request.url)
    created_at = datetime.now(timezone.utc).isoformat()

    await create_audit_record(
        audit_id=audit_id,
        url=url_str,
        task=request.task,
        scope=request.scope,
        description=request.description,
        created_at=created_at,
    )

    background_tasks.add_task(
        _run_audit_task,
        audit_id,
        url_str,
        request.task,
        request.scope,
        request.description or "",
    )

    return AuditResponse(
        id=audit_id,
        url=url_str,
        task=request.task,
        scope=request.scope,
        description=request.description,
        status=AuditStatus.PENDING,
        created_at=created_at,
        completed_at=None,
        error_message=None,
        metadata=None,
        findings=[],
    )


@router.get("", response_model=List[AuditListItem])
async def list_all_audits(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> List[AuditListItem]:
    """Return a paginated list of audits (newest first)."""
    rows = await list_audits(limit=limit, offset=offset)
    return [_row_to_list_item(r) for r in rows]


@router.post("/clear", response_model=dict)
async def clear_audits() -> dict:
    """Delete all audit records from the database."""
    count = await clear_all_audits()
    return {"deleted": count, "message": f"Cleared {count} audit(s)."}


@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit(audit_id: str) -> AuditResponse:
    """Return full detail for a single audit including all findings."""
    row = await get_audit_by_id(audit_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Audit '{audit_id}' not found.")
    return _row_to_audit_response(row)


@router.delete("/{audit_id}", response_model=dict)
async def delete_audit_by_id(audit_id: str) -> dict:
    """Delete a specific audit record."""
    deleted = await delete_audit(audit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Audit '{audit_id}' not found.")
    return {"deleted": True, "id": audit_id}


@router.get("/{audit_id}/status", response_model=dict)
async def get_audit_status(audit_id: str) -> dict:
    """
    Lightweight status polling endpoint.
    Returns status, findings_count, and overall_score when available.
    """
    row = await get_audit_by_id(audit_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Audit '{audit_id}' not found.")

    findings_count = 0
    overall_score: Optional[int] = None
    result_json = row.get("result_json")
    if result_json:
        try:
            result = json.loads(result_json)
            findings_count = len(result.get("findings", []))
            meta = result.get("metadata", {})
            if meta:
                overall_score = meta.get("overall_score")
        except json.JSONDecodeError:
            pass

    return {
        "id": audit_id,
        "status": row["status"],
        "created_at": row["created_at"],
        "completed_at": row.get("completed_at"),
        "error_message": row.get("error_message"),
        "findings_count": findings_count,
        "overall_score": overall_score,
    }


@router.get("/{audit_id}/report", response_model=dict)
async def get_audit_report(audit_id: str) -> dict:
    """
    Return a report-ready dict including all findings, metadata, and
    severity distribution — suitable for PDF export or detailed display.
    """
    row = await get_audit_by_id(audit_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Audit '{audit_id}' not found.")

    response = _row_to_audit_response(row)

    severity_counts: dict[str, int] = {
        "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0
    }
    category_counts: dict[str, int] = {}
    for f in response.findings:
        severity_counts[f.severity.value] = severity_counts.get(f.severity.value, 0) + 1
        category_counts[f.category.value] = category_counts.get(f.category.value, 0) + 1

    return {
        "audit": response.model_dump(),
        "severity_distribution": severity_counts,
        "category_distribution": category_counts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
