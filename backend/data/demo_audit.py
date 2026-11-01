"""
Static demo audit data for CivicLens AI.

This represents a fully illustrative (fictional) audit of the
"Greenfield State Benefits Portal" — used to show the UI without
requiring a live audit run.

The demo URL https://demo.example-benefits-portal.gov is clearly fictional
and will never resolve; it exists solely as sample data.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

DEMO_AUDIT_ID = "demo-00000000-0000-0000-0000-000000000001"
DEMO_URL = "https://demo.example-benefits-portal.gov"
DEMO_TASK = "Apply for unemployment benefit and check application status"
DEMO_CREATED_AT = "2026-10-01T09:00:00+00:00"
DEMO_COMPLETED_AT = "2026-10-01T09:02:15+00:00"

# ------------------------------------------------------------------
# Findings
# ------------------------------------------------------------------

DEMO_FINDINGS = [
    {
        "id": "demo-f001",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Apply Now button has no descriptive label",
        "category": "accessibility",
        "severity": "critical",
        "page_url": f"{DEMO_URL}/apply",
        "evidence": '<a href="/apply/start" class="btn btn-primary">Apply Now</a> — '
                    "button label provides no context about which benefit is being applied for.",
        "rationale": (
            "Screen reader users navigating by button/link list hear 'Apply Now' "
            "repeatedly across the page with no way to distinguish which programme "
            "each refers to, making it impossible to complete the application task."
        ),
        "fix": (
            "Replace with descriptive text: 'Apply for Unemployment Benefit'. "
            "If space is a constraint, keep the visible text short but add "
            "aria-label='Apply for Unemployment Benefit' to the element."
        ),
        "confidence": 0.97,
        "detection_type": "rule_based",
        "selector": 'a.btn.btn-primary[href="/apply/start"]',
    },
    {
        "id": "demo-f002",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Application status form missing field labels",
        "category": "form_usability",
        "severity": "critical",
        "page_url": f"{DEMO_URL}/status",
        "evidence": (
            '<input type="text" placeholder="Enter your reference number"> '
            "has no associated <label> element; placeholder text is the only identifier."
        ),
        "rationale": (
            "Placeholder text disappears when a citizen starts typing, removing the "
            "only cue about what the field expects. Screen readers do not reliably "
            "announce placeholder text as a label, leaving blind users unable to "
            "complete the status-check form."
        ),
        "fix": (
            "Add <label for='ref-number'>Application reference number</label> "
            "and set id='ref-number' on the input. "
            "Keep placeholder text as a secondary hint (e.g. 'e.g. UC-2024-123456')."
        ),
        "confidence": 0.98,
        "detection_type": "rule_based",
        "selector": 'input[type="text"][placeholder="Enter your reference number"]',
    },
    {
        "id": "demo-f003",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Page missing <html lang> attribute",
        "category": "accessibility",
        "severity": "high",
        "page_url": DEMO_URL,
        "evidence": "The root <html> element has no lang attribute.",
        "rationale": (
            "Without a language declaration, text-to-speech assistive technology "
            "may use the wrong pronunciation rules, making the content difficult "
            "to understand for citizens who rely on screen readers."
        ),
        "fix": 'Add lang="en" (or the appropriate BCP 47 tag) to the opening <html> tag.',
        "confidence": 0.99,
        "detection_type": "rule_based",
        "selector": "html",
    },
    {
        "id": "demo-f004",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Hero banner images have no alt text",
        "category": "accessibility",
        "severity": "critical",
        "page_url": DEMO_URL,
        "evidence": (
            '<img src="/assets/hero-benefits.jpg" class="hero-img"> '
            "— alt attribute entirely absent (not empty)."
        ),
        "rationale": (
            "Screen readers announce the image filename ('hero-benefits dot jpg') "
            "instead of meaningful content, disrupting the reading flow and "
            "providing no informational value to visually impaired citizens."
        ),
        "fix": (
            "Add descriptive alt text: alt='Greenfield State logo and welcome banner'. "
            "If the image is purely decorative, use alt='' and role='presentation'."
        ),
        "confidence": 0.97,
        "detection_type": "rule_based",
        "selector": 'img.hero-img[src="/assets/hero-benefits.jpg"]',
    },
    {
        "id": "demo-f005",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Navigation skips heading levels (H1 → H3)",
        "category": "accessibility",
        "severity": "medium",
        "page_url": f"{DEMO_URL}/apply",
        "evidence": (
            "Page heading order: <h1>Apply for Benefits</h1> → "
            "<h3>Step 1: Personal Details</h3> — H2 level skipped entirely."
        ),
        "rationale": (
            "Skipping heading levels breaks the logical document outline. "
            "Screen reader users who navigate by heading level expect a logical "
            "hierarchy and will miss content when levels are skipped."
        ),
        "fix": (
            "Restructure headings so each step sub-heading uses <h2>, not <h3>. "
            "Example: <h2>Step 1: Personal Details</h2>."
        ),
        "confidence": 0.94,
        "detection_type": "rule_based",
        "selector": "h3",
    },
    {
        "id": "demo-f006",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Eligibility page contains excessive legalese",
        "category": "content_clarity",
        "severity": "medium",
        "page_url": f"{DEMO_URL}/eligibility",
        "evidence": (
            "Page contains: 'Notwithstanding the aforementioned provisions, "
            "claimants must pursuant to Section 14(b) hereunder demonstrate…' "
            "(Flesch-Kincaid Grade Level estimated > 18)."
        ),
        "rationale": (
            "Complex legal language excludes citizens with lower literacy, "
            "non-native English speakers, and those under cognitive stress — "
            "all groups disproportionately represented among benefit applicants."
        ),
        "fix": (
            "Rewrite eligibility criteria in Plain English. Example: "
            "'You may qualify if you worked at least 6 months in the last year "
            "and lost your job through no fault of your own.' "
            "Aim for Grade 8 reading level (Flesch-Kincaid)."
        ),
        "confidence": 0.85,
        "detection_type": "ai_suggested",
        "selector": None,
    },
    {
        "id": "demo-f007",
        "audit_id": DEMO_AUDIT_ID,
        "title": "No viewport meta tag on mobile landing page",
        "category": "mobile_usability",
        "severity": "high",
        "page_url": DEMO_URL,
        "evidence": "No <meta name='viewport'> found in <head> on the homepage.",
        "rationale": (
            "Without a viewport meta tag, mobile browsers render the page at "
            "desktop width (~980 px), forcing citizens to zoom and pan "
            "to read or interact with content — a severe usability barrier "
            "for over 60% of users who access government services via mobile."
        ),
        "fix": (
            "Add inside <head>: "
            "<meta name='viewport' content='width=device-width, initial-scale=1'>."
        ),
        "confidence": 0.99,
        "detection_type": "rule_based",
        "selector": "head",
    },
    {
        "id": "demo-f008",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Vague 'Click here' links on documents page",
        "category": "accessibility",
        "severity": "high",
        "page_url": f"{DEMO_URL}/documents",
        "evidence": (
            "Multiple instances of <a href='...'>Click here</a> used to link "
            "to required document checklists. "
            "Example: 'To download the ID checklist, click here.'"
        ),
        "rationale": (
            "'Click here' is meaningless out of context. Screen reader users "
            "navigating the links list hear only 'click here' repeated, with "
            "no indication of what will be downloaded or why it is relevant "
            "to their application."
        ),
        "fix": (
            "Replace with descriptive text: "
            "'Download the ID document checklist (PDF)'. "
            "Always make the link text the destination or action, not the mechanics."
        ),
        "confidence": 0.96,
        "detection_type": "rule_based",
        "selector": 'a[href*="checklist"]',
    },
    {
        "id": "demo-f009",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Error messages do not identify the field in error",
        "category": "form_usability",
        "severity": "high",
        "page_url": f"{DEMO_URL}/apply",
        "evidence": (
            "On form submission with invalid data, the page displays: "
            "'Please correct the errors above.' with a generic red border "
            "on all fields — no specific field-level error messages."
        ),
        "rationale": (
            "Generic error messages force citizens to guess which fields are "
            "wrong. This is especially disorienting for screen reader users "
            "who cannot see the visual red borders, and for those with cognitive "
            "disabilities who may not understand what went wrong."
        ),
        "fix": (
            "Display field-level error messages immediately adjacent to each "
            "invalid field. Example: 'National Insurance number is invalid — "
            "use the format QQ 12 34 56 A'. "
            "Link error summary at the top of the page to the relevant field."
        ),
        "confidence": 0.88,
        "detection_type": "ai_suggested",
        "selector": ".error-message",
    },
    {
        "id": "demo-f010",
        "audit_id": DEMO_AUDIT_ID,
        "title": "No skip-to-main-content link",
        "category": "navigation",
        "severity": "medium",
        "page_url": DEMO_URL,
        "evidence": (
            "Page has no 'Skip to main content' link before the navigation menu. "
            "The navigation contains 14 links that keyboard users must tab through "
            "on every page."
        ),
        "rationale": (
            "Keyboard-only users and screen reader users must tab through all "
            "navigation links before reaching the main content on every page load. "
            "WCAG 2.1 Success Criterion 2.4.1 requires bypass mechanisms."
        ),
        "fix": (
            "Add a visually hidden skip link as the first focusable element: "
            "<a href='#main-content' class='skip-link'>Skip to main content</a>. "
            "Make it visible on focus and target the <main> element."
        ),
        "confidence": 0.92,
        "detection_type": "ai_suggested",
        "selector": "body > :first-child",
    },
    {
        "id": "demo-f011",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Session timeout warning inaccessible",
        "category": "accessibility",
        "severity": "high",
        "page_url": f"{DEMO_URL}/apply",
        "evidence": (
            "A 5-minute session timeout modal appears but uses a visual-only "
            "countdown timer with no ARIA live region; screen readers do not "
            "announce the warning."
        ),
        "rationale": (
            "Citizens who rely on screen readers will not be warned before "
            "their session expires, potentially losing all entered application "
            "data mid-form. This is a critical barrier for users who take "
            "longer to complete forms due to disability."
        ),
        "fix": (
            "Wrap the timeout warning in an ARIA live region: "
            "aria-live='assertive' aria-atomic='true'. "
            "Also offer a 'Extend session' button that is keyboard-accessible "
            "and focused automatically when the dialog appears."
        ),
        "confidence": 0.82,
        "detection_type": "ai_suggested",
        "selector": "#session-timeout-modal",
    },
    {
        "id": "demo-f012",
        "audit_id": DEMO_AUDIT_ID,
        "title": "Benefits comparison table has no table headers",
        "category": "information_architecture",
        "severity": "medium",
        "page_url": f"{DEMO_URL}/compare",
        "evidence": (
            "The benefits comparison table uses <td> for all cells including "
            "column headers (Benefit Type, Amount, Duration, Eligibility) — "
            "no <th> elements used."
        ),
        "rationale": (
            "Without proper <th> header cells, screen readers cannot associate "
            "data cells with their column/row headers, making the table "
            "unnavigable for blind citizens who need to compare benefit options "
            "to make an informed choice."
        ),
        "fix": (
            "Replace header row <td> cells with <th scope='col'> cells. "
            "Example: <th scope='col'>Benefit Type</th>. "
            "For row headers, use <th scope='row'>."
        ),
        "confidence": 0.91,
        "detection_type": "ai_suggested",
        "selector": "table tr:first-child td",
    },
]

# ------------------------------------------------------------------
# Metadata
# ------------------------------------------------------------------

DEMO_METADATA = {
    "audit_id": DEMO_AUDIT_ID,
    "summary": (
        "Audit of the Greenfield State Benefits Portal identified 12 issues "
        "across 4 pages. The site has significant accessibility barriers that "
        "would prevent citizens with disabilities from completing the unemployment "
        "benefit application. Priority areas: missing form labels, absent alt text, "
        "and inaccessible error handling. Overall score: 22/100."
    ),
    "overall_score": 22,
    "pages_inspected": 4,
    "checks_run": 32,
    "ai_mode": "ai_enhanced",
}

# ------------------------------------------------------------------
# Journey comparison (illustrative before/after citizen journey)
# ------------------------------------------------------------------

DEMO_JOURNEY = {
    "task": DEMO_TASK,
    "steps": [
        {
            "step": 1,
            "label": "Find the application form",
            "current_experience": (
                "Citizen lands on homepage. No clear 'Apply for benefits' "
                "call to action visible above the fold. Must scroll past 3 "
                "banner images with no alt text."
            ),
            "barrier_ids": ["demo-f001", "demo-f004"],
            "improved_experience": (
                "A clearly labelled, high-contrast 'Apply for Unemployment Benefit' "
                "button is the primary action above the fold, "
                "with all images having descriptive alt text."
            ),
        },
        {
            "step": 2,
            "label": "Complete personal details form",
            "current_experience": (
                "Form fields use placeholders only — labels disappear when "
                "citizen starts typing, causing confusion especially on mobile. "
                "Screen readers cannot identify field purpose."
            ),
            "barrier_ids": ["demo-f002"],
            "improved_experience": (
                "All fields have persistent, visible labels above the input. "
                "Error messages appear inline, specifically describing what "
                "correction is needed."
            ),
        },
        {
            "step": 3,
            "label": "Understand eligibility criteria",
            "current_experience": (
                "Eligibility page uses complex legal language at reading Grade 18+. "
                "Many citizens abandon here — unable to determine if they qualify."
            ),
            "barrier_ids": ["demo-f006"],
            "improved_experience": (
                "Plain English eligibility criteria with a simple yes/no "
                "eligibility checker tool. Grade 8 reading level."
            ),
        },
        {
            "step": 4,
            "label": "Upload supporting documents",
            "current_experience": (
                "Documents page uses 'Click here' links with no context. "
                "Mobile users cannot easily interact due to missing viewport tag."
            ),
            "barrier_ids": ["demo-f007", "demo-f008"],
            "improved_experience": (
                "Descriptive 'Download ID document checklist (PDF, 45KB)' links. "
                "Page is fully responsive on mobile devices."
            ),
        },
        {
            "step": 5,
            "label": "Check application status",
            "current_experience": (
                "Status form has an unlabelled reference number field. "
                "Generic error messages don't explain what's wrong."
            ),
            "barrier_ids": ["demo-f002", "demo-f009"],
            "improved_experience": (
                "Labelled field with format hint. "
                "Field-level error: 'Reference number must be in format UC-YYYY-XXXXXX'."
            ),
        },
    ],
}

# ------------------------------------------------------------------
# Full demo audit response payload
# ------------------------------------------------------------------

def get_demo_audit() -> dict:
    """Return the complete demo audit as a serialisable dict."""
    return {
        "id": DEMO_AUDIT_ID,
        "url": DEMO_URL,
        "task": DEMO_TASK,
        "scope": "full_site",
        "description": (
            "Illustrative audit of the fictional Greenfield State Benefits Portal. "
            "This data is for demonstration purposes only and does not represent "
            "any real website."
        ),
        "status": "completed",
        "created_at": DEMO_CREATED_AT,
        "completed_at": DEMO_COMPLETED_AT,
        "error_message": None,
        "metadata": DEMO_METADATA,
        "findings": DEMO_FINDINGS,
        "journey": DEMO_JOURNEY,
        "is_demo": True,
    }
