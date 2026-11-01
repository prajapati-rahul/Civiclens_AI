"""
AI Analyzer – calls Google Gemini to suggest additional usability findings
beyond what the deterministic engine catches.

Falls back gracefully (returns None) when:
- GEMINI_API_KEY is not set
- The API call fails for any reason
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List, Optional

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# Maximum characters of page text sent per page to stay within token budget
_MAX_CHARS_PER_PAGE = 3_000
_MAX_PAGES_TO_SEND = 3


async def analyze_with_ai(
    url: str,
    task: str,
    pages_content: List[Dict[str, Any]],
    existing_findings: List[Dict[str, Any]],
) -> Optional[List[Dict[str, Any]]]:
    """
    Ask Gemini to find additional usability / accessibility issues.

    Parameters
    ----------
    url:               Target site URL (for context).
    task:              The citizen task description.
    pages_content:     List of dicts with keys 'url' and 'text'.
    existing_findings: Already-detected findings (to avoid duplication).

    Returns
    -------
    List of finding dicts or None if AI is unavailable / errored.
    """
    if not GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai  # noqa: PLC0415

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Build page summaries, capped per page
        page_summaries: List[str] = []
        for page in pages_content[:_MAX_PAGES_TO_SEND]:
            text = (page.get("text") or "")[:_MAX_CHARS_PER_PAGE]
            page_summaries.append(f"URL: {page['url']}\nContent:\n{text}")

        existing_titles = json.dumps(
            [f.get("title", "") for f in existing_findings], indent=2
        )

        prompt = f"""You are a government digital services accessibility and usability expert.

Analyze the following public government website content for usability, accessibility, \
navigation, and information-clarity issues that would prevent a citizen from \
successfully completing this task: {task}

Website: {url}

Page Content (collected from public pages):
{chr(10).join(page_summaries)}

Existing rule-based findings already detected (do NOT duplicate these):
{existing_titles}

Return a JSON array of NEW findings grounded exclusively in the content above. \
Do NOT invent issues not evidenced by the provided text. \
Do NOT fabricate selectors, statistics, or compliance status. \
If no additional issues exist, return an empty array [].

Each finding object must conform exactly to this structure:
{{
  "title": "Short descriptive issue title",
  "category": "accessibility|navigation|content_clarity|form_usability|information_architecture|mobile_usability",
  "severity": "critical|high|medium|low|info",
  "page_url": "<exact URL from the content above where this issue appears>",
  "evidence": "<direct quote or precise description of the problematic content from the page text>",
  "rationale": "<why this is a barrier for citizens trying to complete the stated task>",
  "fix": "<specific, actionable recommendation>",
  "confidence": <float between 0.0 and 1.0>,
  "detection_type": "ai_suggested"
}}

Return ONLY the raw JSON array with no markdown fences, no preamble, no commentary."""

        response = model.generate_content(prompt)
        raw = (response.text or "").strip()

        # Strip markdown fences if the model wrapped the output
        if raw.startswith("```"):
            parts = raw.split("```")
            # parts[1] is the fenced block content
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return None

        # Basic sanitisation – keep only dicts with required keys
        required = {
            "title", "category", "severity", "page_url",
            "evidence", "rationale", "fix", "confidence", "detection_type",
        }
        clean: List[Dict[str, Any]] = []
        for item in parsed:
            if isinstance(item, dict) and required.issubset(item.keys()):
                clean.append(item)

        return clean

    except Exception as exc:
        print(f"[ai_analyzer] AI analysis failed: {exc}", file=sys.stderr)
        return None
