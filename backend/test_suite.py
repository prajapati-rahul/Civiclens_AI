"""
Comprehensive test suite for CivicLens AI backend.
Tests:
- API health and demo endpoints
- SSRF Guard security policy
- Audit engine rule-based checks
- SQLite persistence and lifecycle
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from bs4 import BeautifulSoup
from fastapi.testclient import TestClient

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from main import app
from services.ai_analyzer import _extract_json_array, analyze_with_ai
from services.ssrf_guard import validate_url
from services.audit_engine import (
    check_empty_link_text,
    check_vague_links,
    check_missing_form_labels,
    check_heading_structure,
    check_image_alt_text,
    check_content_readability,
    check_language_declaration,
    check_viewport_meta,
    _compute_score,
)
from db.database import (
    init_db,
    create_audit_record,
    get_audit_by_id,
    list_audits,
    save_audit_result,
    delete_audit,
    clear_all_audits,
)

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    print("[PASS] Health check endpoint PASSED")

def test_demo_endpoint():
    res = client.get("/api/demo")
    assert res.status_code == 200
    data = res.json()
    assert data["id"].startswith("demo-")
    assert "findings" in data
    assert len(data["findings"]) >= 10
    assert data["metadata"]["overall_score"] > 0
    print(f"[PASS] Demo endpoint PASSED ({len(data['findings'])} findings served, score={data['metadata']['overall_score']})")

    reset_res = client.post("/api/demo/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["_reset"] is True
    print("[PASS] Demo reset endpoint PASSED")

def test_ssrf_guard():
    # Loopback & private IP tests
    blocked_cases = [
        "http://localhost:8000",
        "http://127.0.0.1/admin",
        "http://10.0.0.1/dashboard",
        "http://192.168.1.1/router",
        "http://172.16.0.10/internal",
        "http://169.254.169.254/latest/meta-data/",
        "ftp://example.gov",
        "file:///etc/passwd",
        "javascript:alert(1)",
    ]
    for url in blocked_cases:
        is_safe, reason = validate_url(url)
        assert not is_safe, f"Expected {url} to be blocked! Reason: {reason}"
    print(f"[PASS] SSRF Guard PASSED: {len(blocked_cases)} malicious/internal patterns correctly blocked")

    # Safe external scheme test
    safe_cases = [
        "https://example.gov",
        "http://example.org/services",
    ]
    for url in safe_cases:
        is_safe, reason = validate_url(url)
        # Note: If DNS resolves, safe should be True
        print(f"  SSRF check for {url}: safe={is_safe} ({reason})")

def test_deterministic_checks():
    audit_id = "test-audit-001"
    page_url = "https://example.gov/test"

    # 1. Missing form labels & empty links & image alt
    html = """
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
        <a href="/somewhere"></a>
        <a href="/more">Click here</a>
        <img src="/logo.png">
        <input type="text" placeholder="Your Name">
        <h2>Skipped H1</h2>
        <p>Short paragraph.</p>
    </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")

    f_empty = check_empty_link_text(soup, page_url, audit_id)
    assert len(f_empty) >= 1, "Should catch empty link"
    assert f_empty[0]["severity"] == "critical"

    f_vague = check_vague_links(soup, page_url, audit_id)
    assert len(f_vague) >= 1, "Should catch 'Click here' link"
    assert f_vague[0]["severity"] == "high"

    f_labels = check_missing_form_labels(soup, page_url, audit_id)
    assert len(f_labels) >= 1, "Should catch missing form label"

    f_img = check_image_alt_text(soup, page_url, audit_id)
    assert len(f_img) >= 1, "Should catch img without alt"

    f_h = check_heading_structure(soup, page_url, audit_id)
    assert any("H1" in f["title"] for f in f_h), "Should flag missing H1"

    f_lang = check_language_declaration(soup, page_url, audit_id)
    assert len(f_lang) == 1, "Should flag missing lang on html"

    f_vp = check_viewport_meta(soup, page_url, audit_id)
    assert len(f_vp) == 1, "Should flag missing viewport tag"

    print("[PASS] Deterministic Accessibility/Usability Checks PASSED (7 heuristic checks verified)")

def test_scoring_algorithm():
    test_findings = [
        {"title": "A", "severity": "critical"},  # 25
        {"title": "B", "severity": "high"},      # 15
        {"title": "C", "severity": "medium"},    # 8
    ]
    score = _compute_score(test_findings)
    assert score == 73, f"Expected score 73, got {score}"  # 100 * e^(-48/150)

    # Repeats of one issue cost far less than distinct issues
    one_issue_repeated = [{"title": "Missing alt", "severity": "critical"} for _ in range(10)]
    ten_distinct_issues = [{"title": f"Issue {i}", "severity": "critical"} for i in range(10)]
    score_repeated = _compute_score(one_issue_repeated)
    score_distinct = _compute_score(ten_distinct_issues)
    assert score_repeated == 74, f"Expected 74, got {score_repeated}"
    assert score_distinct == 19, f"Expected 19, got {score_distinct}"

    # Stays within [0, 100]
    assert _compute_score([{"title": f"x{i}", "severity": "critical"} for i in range(100)]) == 0
    score_empty = _compute_score([])
    assert score_empty == 100, f"Expected 100, got {score_empty}"
    print("[PASS] Scoring engine PASSED (issue grouping, repeat damping and [0,100] bounding)")

async def test_database_lifecycle():
    await init_db()

    test_id = "test-live-isolated-001"
    # Ensure test-id does not exist prior to test
    await delete_audit(test_id)
    await create_audit_record(
        audit_id=test_id,
        url="https://civic.example.gov",
        task="Renew driver license",
        scope="homepage",
        description="Citizen needs urgent renewal",
        created_at="2026-10-30T10:00:00Z",
    )

    row = await get_audit_by_id(test_id)
    assert row is not None
    assert row["status"] == "pending"
    assert row["task"] == "Renew driver license"

    res_json = json.dumps({
        "metadata": {"overall_score": 75, "summary": "Acceptable with minor fixes"},
        "findings": [{"id": "f1", "title": "Missing label", "severity": "critical", "category": "form_usability"}]
    })
    await save_audit_result(
        audit_id=test_id,
        status="completed",
        completed_at="2026-10-30T10:01:00Z",
        result_json=res_json,
    )

    updated = await get_audit_by_id(test_id)
    assert updated["status"] == "completed"
    assert "Acceptable" in updated["result_json"]

    audits = await list_audits()
    assert len(audits) >= 1

    deleted = await delete_audit(test_id)
    assert deleted is True

    print("[PASS] Database CRUD Lifecycle PASSED")

def test_ai_analyzer_json_parsing():
    sample_finding = {
        "title": "Unclear button label",
        "category": "navigation",
        "severity": "high",
        "page_url": "https://example.gov",
        "evidence": "Found button with text 'Submit 1'",
        "rationale": "Confuses citizens on action",
        "fix": "Use descriptive action verbs",
        "confidence": 0.9,
        "detection_type": "ai_suggested",
    }
    raw_fenced = f"```json\n[{json.dumps(sample_finding)}]\n```"
    parsed_fenced = _extract_json_array(raw_fenced)
    assert parsed_fenced is not None and len(parsed_fenced) == 1
    assert parsed_fenced[0]["title"] == "Unclear button label"

    # Conversational text before array
    raw_mixed = f"Here are the findings based on my review:\n[{json.dumps(sample_finding)}]\nHope this helps!"
    parsed_mixed = _extract_json_array(raw_mixed)
    assert parsed_mixed is not None and len(parsed_mixed) == 1

    # Malformed item missing required key
    invalid_item = [{"title": "Missing other fields"}]
    parsed_invalid = _extract_json_array(json.dumps(invalid_item))
    assert parsed_invalid == []

    print("[PASS] AI Analyzer Multi-Provider JSON Parser PASSED (fenced, mixed, & validation)")

def run_all_tests():
    print("\n--- Running CivicLens AI Backend Test Suite ---")
    test_health()
    test_demo_endpoint()
    test_ssrf_guard()
    test_deterministic_checks()
    test_scoring_algorithm()
    test_ai_analyzer_json_parsing()
    asyncio.run(test_database_lifecycle())
    print("\n==============================================")
    print("ALL TESTS PASSED SUCCESSFULLY! (100% Verified)")
    print("==============================================\n")

if __name__ == "__main__":
    run_all_tests()
