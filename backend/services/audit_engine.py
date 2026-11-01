"""
Core audit pipeline for CivicLens AI.

Pipeline:
  1. Validate URL (SSRF guard)
  2. Fetch pages with httpx
  3. Parse HTML with BeautifulSoup
  4. Run deterministic rule-based checks
  5. Run AI analysis (if GEMINI_API_KEY available)
  6. Persist result to database
  7. Return structured result dict
"""

from __future__ import annotations

import json
import math
import os
import re
import ssl
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

from .ssrf_guard import validate_url
from .accessibility import run_accessibility_checks
from .ai_analyzer import analyze_with_ai
try:
    from db.database import save_audit_result, update_audit_status
except (ImportError, ValueError):
    from ..db.database import save_audit_result, update_audit_status

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MAX_PAGES: int = int(os.getenv("MAX_PAGES_PER_AUDIT", "5"))
TIMEOUT: int = int(os.getenv("AUDIT_TIMEOUT_SECONDS", "120"))
MAX_RESPONSE_BYTES: int = 5 * 1024 * 1024  # 5 MB

_HTTPX_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36 CivicLens-Audit/1.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}

def _create_ssl_context() -> ssl.SSLContext:
    """
    Create an SSL context supporting legacy server renegotiation.
    Many government websites (e.g. *.gov.in, *.nic.in, state portals, municipal servers)
    use legacy TLS ciphers that OpenSSL 3.0+ rejects by default unless
    OP_LEGACY_SERVER_CONNECT is explicitly enabled.
    """
    ctx = ssl.create_default_context()
    ctx.options |= getattr(ssl, "OP_LEGACY_SERVER_CONNECT", 0x4)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

# Severity → numeric weight for scoring
_SEVERITY_WEIGHT: Dict[str, int] = {
    "critical": 25,
    "high": 15,
    "medium": 8,
    "low": 3,
    "info": 0,
}


# ---------------------------------------------------------------------------
# Page fetcher
# ---------------------------------------------------------------------------

async def _fetch_page(client: httpx.AsyncClient, url: str) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Fetch a single page. Validates each redirect URL through the SSRF guard.
    Returns (dict, error_message).
    """
    try:
        response = await client.get(url, follow_redirects=True)

        if response.status_code >= 400:
            msg = f"HTTP {response.status_code} {response.reason_phrase}"
            print(f"[audit_engine] HTTP error {msg} for {url}", file=sys.stderr)
            return None, msg

        # Check final URL after redirects
        final_url = str(response.url)
        if final_url != url:
            safe, reason = validate_url(final_url)
            if not safe:
                msg = f"Redirect to unsafe URL blocked: {reason}"
                print(f"[audit_engine] {msg}", file=sys.stderr)
                return None, msg

        # Limit response size
        content_length = int(response.headers.get("content-length", 0))
        if content_length > MAX_RESPONSE_BYTES:
            msg = f"Page too large ({content_length} bytes, limit is {MAX_RESPONSE_BYTES})"
            print(f"[audit_engine] {msg}", file=sys.stderr)
            return None, msg

        html = response.text[:MAX_RESPONSE_BYTES]
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(separator=" ", strip=True)

        return {"url": final_url, "html": html, "text": text, "soup": soup}, None

    except httpx.TimeoutException:
        url_lower = url.lower()
        if any(b in url_lower for b in ("irctc.co.in", "tatkal", "railway")):
            msg = "Request timed out: This portal (IRCTC) enforces an aggressive anti-bot firewall (Akamai Bot Manager) that rejects automated web inspection tools. Please try standard public portals like scholarship.up.gov.in, digitalindia.gov.in, or uidai.gov.in."
        else:
            msg = "Request timed out after 15s: Server took too long to respond or has an active bot-protection firewall blocking automated inspection tools."
        print(f"[audit_engine] {msg} for {url}", file=sys.stderr)
        return None, msg
    except Exception as exc:
        msg = f"Connection error: {exc}"
        print(f"[audit_engine] Error fetching {url}: {exc}", file=sys.stderr)
        return None, msg


def _discover_internal_links(soup: BeautifulSoup, base_url: str) -> List[str]:
    """Extract unique internal links from a page, up to MAX_PAGES."""
    base_parsed = urlparse(base_url)
    base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
    seen: set[str] = {base_url}
    links: List[str] = []

    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        # Skip anchors, mailto, tel, javascript
        if href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        # Only same-origin
        if f"{parsed.scheme}://{parsed.netloc}" != base_origin:
            continue
        # Strip fragments
        clean = parsed._replace(fragment="").geturl()
        if clean not in seen:
            seen.add(clean)
            links.append(clean)
            if len(links) >= MAX_PAGES - 1:
                break

    return links


# ---------------------------------------------------------------------------
# Deterministic checks
# ---------------------------------------------------------------------------

def _make_finding(
    audit_id: str,
    title: str,
    category: str,
    severity: str,
    page_url: str,
    evidence: str,
    rationale: str,
    fix: str,
    confidence: float = 0.95,
    detection_type: str = "rule_based",
    selector: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "audit_id": audit_id,
        "title": title,
        "category": category,
        "severity": severity,
        "page_url": page_url,
        "evidence": evidence,
        "rationale": rationale,
        "fix": fix,
        "confidence": confidence,
        "detection_type": detection_type,
        "selector": selector,
    }


def check_empty_link_text(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Flag <a> elements with no meaningful text content."""
    findings: List[Dict[str, Any]] = []
    for tag in soup.find_all("a", href=True):
        text = tag.get_text(strip=True)
        aria_label = tag.get("aria-label", "").strip()
        title_attr = tag.get("title", "").strip()
        img_alt = ""
        img = tag.find("img")
        if img and isinstance(img, Tag):
            img_alt = img.get("alt", "").strip()

        has_accessible_text = bool(text or aria_label or title_attr or img_alt)
        if not has_accessible_text:
            href = tag.get("href", "")[:80]
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title="Empty link text",
                    category="accessibility",
                    severity="critical",
                    page_url=page_url,
                    evidence=f'<a href="{href}"> (no visible text, no aria-label, no title)',
                    rationale=(
                        "Screen reader users hear 'link' with no context, making "
                        "navigation impossible for visually impaired citizens."
                    ),
                    fix=(
                        "Add descriptive text inside the <a> tag, or use "
                        "aria-label='Description of destination' on the element."
                    ),
                    selector=f'a[href="{href}"]',
                )
            )
    return findings


_VAGUE_PATTERNS = re.compile(
    r"^(click here|read more|learn more|more|here|details|info|"
    r"link|continue|go|see more|find out more|click|tap here|view more)$",
    re.IGNORECASE,
)


def check_vague_links(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Flag links with generic / vague text that provides no destination context."""
    findings: List[Dict[str, Any]] = []
    seen_texts: set[str] = set()

    for tag in soup.find_all("a", href=True):
        text = tag.get_text(strip=True)
        if not text:
            continue
        normalized = text.lower().strip()
        if _VAGUE_PATTERNS.match(normalized) and normalized not in seen_texts:
            seen_texts.add(normalized)
            href = tag.get("href", "")[:80]
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title=f'Vague link text: "{text}"',
                    category="accessibility",
                    severity="high",
                    page_url=page_url,
                    evidence=f'<a href="{href}">{text}</a>',
                    rationale=(
                        "Generic link text ('click here', 'read more', etc.) "
                        "is meaningless when read out of context by a screen reader "
                        "or when scanning the page for relevant links."
                    ),
                    fix=(
                        f"Replace '{text}' with a descriptive phrase that explains "
                        "where the link goes, e.g. 'Apply for housing benefit'."
                    ),
                    selector=f'a[href="{href}"]',
                )
            )
    return findings


def check_missing_form_labels(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Flag form inputs that have no associated <label>."""
    findings: List[Dict[str, Any]] = []
    labeled_ids: set[str] = set()

    for label in soup.find_all("label"):
        for_attr = label.get("for", "").strip()
        if for_attr:
            labeled_ids.add(for_attr)

    unlabeled_types = {"text", "email", "tel", "number", "password",
                       "search", "url", "date", "time", "file",
                       "checkbox", "radio", "textarea", "select"}

    for tag in soup.find_all(["input", "textarea", "select"]):
        input_type = tag.get("type", "text").lower()
        if input_type in ("hidden", "submit", "button", "reset", "image"):
            continue
        if input_type not in unlabeled_types and tag.name == "input":
            continue

        input_id = tag.get("id", "").strip()
        aria_label = tag.get("aria-label", "").strip()
        aria_labelledby = tag.get("aria-labelledby", "").strip()
        placeholder = tag.get("placeholder", "").strip()

        has_label = (
            (input_id and input_id in labeled_ids)
            or aria_label
            or aria_labelledby
        )
        if not has_label:
            name = tag.get("name", tag.get("id", "unnamed"))[:40]
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title=f"Form input missing label: '{name}'",
                    category="form_usability",
                    severity="critical",
                    page_url=page_url,
                    evidence=(
                        f"<{tag.name} type='{input_type}' name='{name}'"
                        + (f" placeholder='{placeholder}'" if placeholder else "")
                        + "> has no associated <label> element."
                    ),
                    rationale=(
                        "Screen readers cannot announce the field purpose without "
                        "a label. Placeholder text disappears on input and does not "
                        "replace a persistent label. Citizens with disabilities may "
                        "be unable to complete the form."
                    ),
                    fix=(
                        f"Add <label for='{name}'>Descriptive name</label> and "
                        f"set id='{name}' on the input, or add "
                        "aria-label='Descriptive name' to the input element."
                    ),
                    selector=f"{tag.name}[name='{name}']",
                )
            )
    return findings


def check_heading_structure(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Validate heading hierarchy: no h1, multiple h1s, skipped levels."""
    findings: List[Dict[str, Any]] = []
    headings = soup.find_all(re.compile(r"^h[1-6]$", re.IGNORECASE))

    h1_tags = [h for h in headings if h.name.lower() == "h1"]

    if not h1_tags:
        findings.append(
            _make_finding(
                audit_id=audit_id,
                title="Page missing H1 heading",
                category="accessibility",
                severity="high",
                page_url=page_url,
                evidence="No <h1> element found on the page.",
                rationale=(
                    "An H1 heading identifies the page's main topic. "
                    "Screen readers use it to orient users, and its absence "
                    "makes the page structure unclear."
                ),
                fix=(
                    "Add a single, descriptive <h1> element that summarises "
                    "the page purpose (e.g. <h1>Apply for Universal Credit</h1>)."
                ),
            )
        )
    elif len(h1_tags) > 1:
        texts = [h.get_text(strip=True)[:50] for h in h1_tags]
        findings.append(
            _make_finding(
                audit_id=audit_id,
                title=f"Multiple H1 headings found ({len(h1_tags)})",
                category="accessibility",
                severity="medium",
                page_url=page_url,
                evidence=f"H1 texts found: {texts}",
                rationale=(
                    "Multiple H1 headings create ambiguity about the page's "
                    "primary subject and degrade SEO and screen-reader navigation."
                ),
                fix=(
                    "Use exactly one <h1> for the main page title; "
                    "demote additional headings to <h2> or lower."
                ),
            )
        )

    # Check for skipped levels
    levels = [int(h.name[1]) for h in headings]
    for i in range(1, len(levels)):
        if levels[i] - levels[i - 1] > 1:
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title=f"Skipped heading level: H{levels[i-1]} → H{levels[i]}",
                    category="accessibility",
                    severity="medium",
                    page_url=page_url,
                    evidence=(
                        f"Heading jumps from H{levels[i-1]} "
                        f"('{headings[i-1].get_text(strip=True)[:40]}') "
                        f"to H{levels[i]} "
                        f"('{headings[i].get_text(strip=True)[:40]}')."
                    ),
                    rationale=(
                        "Skipping heading levels breaks the logical document "
                        "outline, confusing screen reader users who navigate "
                        "by heading level."
                    ),
                    fix=(
                        f"Restructure headings so H{levels[i-1]} is "
                        f"followed by H{levels[i-1]+1}, not H{levels[i]}."
                    ),
                )
            )
            break  # Report the first skip only to avoid noise

    return findings


def check_image_alt_text(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Flag <img> elements missing an alt attribute."""
    findings: List[Dict[str, Any]] = []
    for img in soup.find_all("img"):
        if not isinstance(img, Tag):
            continue
        if img.get("alt") is None:  # attribute absent (not empty string)
            src = img.get("src", "")[:60]
            aria_label = img.get("aria-label", "").strip()
            role = img.get("role", "").strip()
            # Skip decorative images declared via role=presentation/none
            if role in ("presentation", "none"):
                continue
            if aria_label:
                continue  # has aria-label, acceptable
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title="Image missing alt attribute",
                    category="accessibility",
                    severity="critical",
                    page_url=page_url,
                    evidence=f'<img src="{src}"> has no alt attribute.',
                    rationale=(
                        "Without alt text, screen readers announce the image "
                        "filename or 'image', providing no information to blind "
                        "or low-vision citizens."
                    ),
                    fix=(
                        "Add alt='Descriptive text' to every informative image. "
                        "For purely decorative images use alt='' and role='presentation'."
                    ),
                    selector=f'img[src="{src}"]',
                )
            )
    return findings


def check_content_readability(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Flag very long paragraphs and detect complex/dense language patterns."""
    findings: List[Dict[str, Any]] = []
    long_para_threshold = 300  # words

    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        words = text.split()
        if len(words) > long_para_threshold:
            snippet = " ".join(words[:20]) + "…"
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title=f"Excessively long paragraph ({len(words)} words)",
                    category="content_clarity",
                    severity="medium",
                    page_url=page_url,
                    evidence=f'Paragraph starting with: "{snippet}"',
                    rationale=(
                        "Very long paragraphs are cognitively demanding and "
                        "make it harder for citizens – especially those with "
                        "low literacy or cognitive disabilities – to find "
                        "the information they need."
                    ),
                    fix=(
                        "Break this paragraph into shorter paragraphs (≤ 5 sentences), "
                        "use bullet lists for multiple items, and apply Plain English "
                        "guidelines (aim for Grade 8 reading level)."
                    ),
                    confidence=0.80,
                )
            )
            break  # One finding per page is sufficient; avoid noise

    # Detect passive voice / legalese density (heuristic)
    full_text = soup.get_text()
    legalese_words = [
        "hereinafter", "notwithstanding", "aforementioned",
        "pursuant to", "in accordance with", "thereof", "hereunder",
        "whereas", "whereunto",
    ]
    found_legalese = [w for w in legalese_words if w in full_text.lower()]
    if len(found_legalese) >= 3:
        findings.append(
            _make_finding(
                audit_id=audit_id,
                title="Legal / bureaucratic language detected",
                category="content_clarity",
                severity="medium",
                page_url=page_url,
                evidence=f"Legalese terms found: {', '.join(found_legalese[:5])}",
                rationale=(
                    "Bureaucratic language significantly reduces comprehension "
                    "for citizens with lower literacy levels, non-native speakers, "
                    "and those in stressful situations."
                ),
                fix=(
                    "Rewrite content using Plain English: short sentences, "
                    "active voice, common words. Refer to GOV.UK content design "
                    "principles as a model."
                ),
                confidence=0.75,
            )
        )

    return findings


def check_language_declaration(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Flag missing lang attribute on the <html> element."""
    findings: List[Dict[str, Any]] = []
    html_tag = soup.find("html")
    if html_tag and isinstance(html_tag, Tag):
        lang = html_tag.get("lang", "").strip()
        if not lang:
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title="Missing lang attribute on <html> element",
                    category="accessibility",
                    severity="high",
                    page_url=page_url,
                    evidence='<html> element has no lang attribute.',
                    rationale=(
                        "Without a lang attribute, screen readers cannot switch "
                        "to the correct language/accent, degrading comprehension "
                        "for visually impaired users."
                    ),
                    fix='Add lang="en" (or appropriate BCP 47 language tag) to the <html> element.',
                    selector="html",
                )
            )
    return findings


def check_viewport_meta(
    soup: BeautifulSoup, page_url: str, audit_id: str
) -> List[Dict[str, Any]]:
    """Flag missing or incorrectly configured viewport meta tag."""
    findings: List[Dict[str, Any]] = []
    viewport = soup.find("meta", attrs={"name": re.compile(r"^viewport$", re.IGNORECASE)})

    if not viewport:
        findings.append(
            _make_finding(
                audit_id=audit_id,
                title="Missing viewport meta tag",
                category="mobile_usability",
                severity="high",
                page_url=page_url,
                evidence="No <meta name='viewport'> tag found in <head>.",
                rationale=(
                    "Without a viewport meta tag the browser renders the page "
                    "at desktop width on mobile devices, requiring citizens to "
                    "zoom and pan, which is especially problematic for those "
                    "with motor or visual impairments."
                ),
                fix=(
                    "Add <meta name='viewport' content='width=device-width, "
                    "initial-scale=1'> inside <head>."
                ),
                selector="head",
            )
        )
    else:
        content = viewport.get("content", "")
        if "user-scalable=no" in content or "maximum-scale=1" in content:
            findings.append(
                _make_finding(
                    audit_id=audit_id,
                    title="Viewport disables user zoom",
                    category="mobile_usability",
                    severity="high",
                    page_url=page_url,
                    evidence=f'<meta name="viewport" content="{content}">',
                    rationale=(
                        "Disabling user zoom prevents citizens with low vision "
                        "from enlarging text. This violates WCAG 2.1 Success "
                        "Criterion 1.4.4 (Resize text)."
                    ),
                    fix=(
                        "Remove 'user-scalable=no' and 'maximum-scale' restrictions. "
                        "Use: <meta name='viewport' content='width=device-width, initial-scale=1'>."
                    ),
                    selector="meta[name='viewport']",
                )
            )

    return findings


# ---------------------------------------------------------------------------
# Scoring helper
# ---------------------------------------------------------------------------

def _compute_score(findings: List[Dict[str, Any]]) -> int:
    """
    Compute an overall score 0–100.

    Findings are grouped by issue (title). Each distinct issue costs its worst
    severity weight; repeats of the same issue (e.g. 40 images missing alt text)
    add only a log-scaled extra. The total maps onto 0–100 with an exponential
    curve, so scores spread out instead of hitting 0 after a handful of issues.
    Roughly: 6 distinct critical issues ≈ 37, 1 critical issue ≈ 85.
    """
    groups: Dict[Any, List[int]] = {}
    for f in findings:
        # Untitled findings can't be matched as repeats, so each counts on its own
        key = f.get("title") or id(f)
        groups.setdefault(key, []).append(_SEVERITY_WEIGHT.get(f.get("severity", "info"), 0))
    deduction = sum(max(ws) * (1 + 0.25 * math.log2(len(ws))) for ws in groups.values())
    return max(0, min(100, round(100 * math.exp(-deduction / 150))))


# ---------------------------------------------------------------------------
# Main audit pipeline
# ---------------------------------------------------------------------------

async def run_audit(
    audit_id: str,
    url: str,
    task: str,
    scope: str,
    description: str,
) -> Dict[str, Any]:
    """
    Execute the full audit pipeline.

    Returns a result dict that is also persisted to the database.
    """
    await update_audit_status(audit_id, "running")

    # 1. SSRF guard on the root URL
    safe, reason = validate_url(url)
    if not safe:
        err = f"URL rejected by security policy: {reason}"
        completed_at = datetime.now(timezone.utc).isoformat()
        await save_audit_result(
            audit_id, "failed", completed_at, json.dumps({}), error_message=err
        )
        return {"error": err}

    pages_data: List[Dict[str, Any]] = []
    all_findings: List[Dict[str, Any]] = []
    checks_run = 0

    ssl_context = _create_ssl_context()
    async with httpx.AsyncClient(
        headers=_HTTPX_HEADERS,
        verify=ssl_context,
        timeout=httpx.Timeout(15.0, connect=10.0),
        max_redirects=5,
    ) as client:
        # 2. Fetch root page
        root_data, fetch_err = await _fetch_page(client, url)
        if root_data is None:
            err = f"Failed to fetch {url}: {fetch_err or 'Server unreachable'}"
            completed_at = datetime.now(timezone.utc).isoformat()
            await save_audit_result(
                audit_id, "failed", completed_at, json.dumps({}), error_message=err
            )
            return {"error": err}

        pages_data.append(root_data)

        # 3. Discover additional pages if scope demands it
        if scope in ("full_site", "specific_path") and MAX_PAGES > 1:
            root_soup = root_data["soup"]
            internal_links = _discover_internal_links(root_soup, url)
            for link in internal_links[: MAX_PAGES - 1]:
                safe_link, _ = validate_url(link)
                if not safe_link:
                    continue
                page_data, _ = await _fetch_page(client, link)
                if page_data:
                    pages_data.append(page_data)

    # 4. Run deterministic checks on each page
    check_fns = [
        check_empty_link_text,
        check_vague_links,
        check_missing_form_labels,
        check_heading_structure,
        check_image_alt_text,
        check_content_readability,
        check_language_declaration,
        check_viewport_meta,
    ]

    for page in pages_data:
        soup = page["soup"]
        page_url = page["url"]
        for fn in check_fns:
            try:
                findings = fn(soup, page_url, audit_id)
                all_findings.extend(findings)
                checks_run += 1
            except Exception as exc:
                print(
                    f"[audit_engine] Check {fn.__name__} failed on {page_url}: {exc}",
                    file=sys.stderr,
                )

    # 5. AI analysis
    ai_mode = "deterministic"
    pages_for_ai = [{"url": p["url"], "text": p["text"]} for p in pages_data]
    ai_findings = await analyze_with_ai(url, task, pages_for_ai, all_findings)
    if ai_findings:
        ai_mode = "ai_enhanced"
        for af in ai_findings:
            # Normalise and add IDs
            af["id"] = str(uuid.uuid4())
            af["audit_id"] = audit_id
            af["selector"] = af.get("selector")
            # Clamp confidence
            try:
                af["confidence"] = max(0.0, min(1.0, float(af["confidence"])))
            except (ValueError, TypeError):
                af["confidence"] = 0.7
            all_findings.append(af)

    # 6. Compute metadata
    score = _compute_score(all_findings)
    completed_at = datetime.now(timezone.utc).isoformat()

    metadata = {
        "audit_id": audit_id,
        "summary": (
            f"Audit of {url} completed. "
            f"{len(all_findings)} issue(s) found across {len(pages_data)} page(s). "
            f"Overall quality score: {score}/100."
        ),
        "overall_score": score,
        "pages_inspected": len(pages_data),
        "checks_run": checks_run,
        "ai_mode": ai_mode,
    }

    result = {
        "metadata": metadata,
        "findings": all_findings,
    }

    # 7. Persist
    await save_audit_result(
        audit_id,
        "completed",
        completed_at,
        json.dumps(result),
    )

    return result
