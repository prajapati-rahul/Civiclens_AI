"""
Pydantic schemas / models for CivicLens AI API.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, HttpUrl


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AuditStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FindingSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingCategory(str, Enum):
    ACCESSIBILITY = "accessibility"
    NAVIGATION = "navigation"
    CONTENT_CLARITY = "content_clarity"
    FORM_USABILITY = "form_usability"
    INFORMATION_ARCHITECTURE = "information_architecture"
    MOBILE_USABILITY = "mobile_usability"


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class AuditRequest(BaseModel):
    url: HttpUrl
    task: str
    scope: str  # "homepage", "full_site", "specific_path"
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# Result / response models
# ---------------------------------------------------------------------------

class Finding(BaseModel):
    id: str
    audit_id: str
    title: str
    category: FindingCategory
    severity: FindingSeverity
    page_url: str
    evidence: str
    rationale: str
    fix: str
    confidence: float
    detection_type: str  # "automated", "ai_suggested", "rule_based"
    selector: Optional[str] = None


class AuditMetadata(BaseModel):
    audit_id: str
    summary: str
    overall_score: int
    pages_inspected: int
    checks_run: int
    ai_mode: str  # "ai_enhanced", "deterministic"


class AuditResponse(BaseModel):
    id: str
    url: str
    task: str
    scope: str
    description: Optional[str]
    status: AuditStatus
    created_at: str
    completed_at: Optional[str]
    error_message: Optional[str]
    metadata: Optional[AuditMetadata]
    findings: List[Finding]


class AuditListItem(BaseModel):
    id: str
    url: str
    task: str
    status: AuditStatus
    created_at: str
    completed_at: Optional[str]
    findings_count: int
    critical_count: int
    overall_score: Optional[int]
