"""
AI Analyzer — supports multiple AI providers to evaluate collected page text
for citizen usability and accessibility barriers:
1. Groq Cloud (ultra-fast inference via GROQ_API_KEY or auto-detected gsk_... keys)
2. xAI (Grok via XAI_API_KEY: models grok-2-latest, grok-beta)
3. Google Gemini via GEMINI_API_KEY (model: gemini-1.5-flash)

Falls back gracefully (returns None) when:
- No AI key is configured
- An API call times out, encounters a rate limit, or returns invalid JSON
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any, Dict, List, Optional
import httpx

XAI_API_KEY: str = os.getenv("XAI_API_KEY", "")
XAI_MODEL: str = os.getenv("XAI_MODEL", "grok-2-latest")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

_MAX_CHARS_PER_PAGE = 3_000
_MAX_PAGES_TO_SEND = 3

REQUIRED_FINDING_KEYS = {
    "title",
    "category",
    "severity",
    "page_url",
    "evidence",
    "rationale",
    "fix",
    "confidence",
    "detection_type",
}


def _extract_json_array(raw_text: str) -> Optional[List[Dict[str, Any]]]:
    """Robustly parse a JSON array from raw model output."""
    raw = raw_text.strip()

    # 1. Check for markdown code fences (```json [...] ``` or ``` [...])
    if "```" in raw:
        match = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", raw)
        if match:
            raw = match.group(1).strip()
        else:
            parts = raw.split("```")
            if len(parts) >= 2:
                candidate = parts[1].strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                raw = candidate

    # 2. Extract outermost [ ... ]
    if not (raw.startswith("[") and raw.endswith("]")):
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1 and end > start:
            raw = raw[start : end + 1]

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return None

        clean: List[Dict[str, Any]] = []
        for item in parsed:
            if isinstance(item, dict) and REQUIRED_FINDING_KEYS.issubset(item.keys()):
                clean.append(item)
        return clean
    except Exception as exc:
        print(f"[ai_analyzer] JSON parse failed: {exc}", file=sys.stderr)
        return None


def _build_prompt(
    url: str,
    task: str,
    pages_content: List[Dict[str, Any]],
    existing_findings: List[Dict[str, Any]],
) -> tuple[str, str]:
    """Construct system prompt and user prompt."""
    page_summaries: List[str] = []
    for page in pages_content[:_MAX_PAGES_TO_SEND]:
        text = (page.get("text") or "")[:_MAX_CHARS_PER_PAGE]
        page_summaries.append(f"URL: {page.get('url', url)}\nContent:\n{text}")

    existing_titles = json.dumps(
        [f.get("title", "") for f in existing_findings], indent=2
    )

    system_instruction = (
        "You are an expert civic-technology auditor specializing in government digital services "
        "usability, Plain Writing Act compliance, WCAG 2.1 accessibility, and citizen task completion. "
        "Your role is to detect concrete user-experience friction points and accessibility barriers "
        "grounded solely in verified public page content."
    )

    user_prompt = f"""Analyze the following public government website content for usability, accessibility, \
navigation, and information-clarity issues that would prevent a citizen from \
successfully completing this task: "{task}"

Website: {url}

Page Content (collected from public pages):
{chr(10).join(page_summaries)}

Existing rule-based findings already detected (do NOT duplicate these):
{existing_titles}

Return a JSON array of NEW findings grounded exclusively in the content provided above.
Rules:
1. Do NOT invent issues not evidenced by the provided page text.
2. Do NOT fabricate selectors, statistics, or compliance status.
3. If no additional issues exist, return an empty array [].

Each finding object in the array must conform exactly to this schema:
{{
  "title": "Short descriptive issue title",
  "category": "accessibility|navigation|content_clarity|form_usability|information_architecture|mobile_usability",
  "severity": "critical|high|medium|low|info",
  "page_url": "<exact URL from the content above where this issue appears>",
  "evidence": "<direct quote or precise description of the problematic content from the page text>",
  "rationale": "<why this is a barrier for citizens trying to complete the stated task>",
  "fix": "<specific, actionable recommendation>",
  "confidence": 0.85,
  "detection_type": "ai_suggested"
}}

Return ONLY the raw JSON array with no commentary and no markdown wrapper."""

    return system_instruction, user_prompt


async def _analyze_with_groq(
    api_key: str,
    system_instruction: str,
    user_prompt: str,
    model_name: str,
) -> Optional[List[Dict[str, Any]]]:
    """Call Groq Cloud completions API endpoint."""
    print(f"[ai_analyzer] Invoking Groq Cloud API ({model_name})...", file=sys.stderr)
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    clean_findings = _extract_json_array(content)
                    if clean_findings is not None:
                        print(
                            f"[ai_analyzer] Groq returned {len(clean_findings)} grounded finding(s).",
                            file=sys.stderr,
                        )
                        return clean_findings
            print(
                f"[ai_analyzer] Groq API returned status {resp.status_code}: {resp.text[:200]}",
                file=sys.stderr,
            )
            return None
    except Exception as exc:
        print(f"[ai_analyzer] Groq API request failed: {exc}", file=sys.stderr)
        return None


async def _analyze_with_xai(
    api_key: str,
    system_instruction: str,
    user_prompt: str,
) -> Optional[List[Dict[str, Any]]]:
    """Call xAI Grok completions API endpoint."""
    print(f"[ai_analyzer] Invoking xAI Grok API ({XAI_MODEL})...", file=sys.stderr)
    url = "https://api.x.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": XAI_MODEL,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    clean_findings = _extract_json_array(content)
                    if clean_findings is not None:
                        print(
                            f"[ai_analyzer] xAI Grok returned {len(clean_findings)} grounded finding(s).",
                            file=sys.stderr,
                        )
                        return clean_findings

            # If model name failed, try grok-beta fallback
            if resp.status_code == 404 and XAI_MODEL != "grok-beta":
                print(
                    "[ai_analyzer] xAI model not found; retrying with grok-beta...",
                    file=sys.stderr,
                )
                payload["model"] = "grok-beta"
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        return _extract_json_array(content)

            print(
                f"[ai_analyzer] xAI API error: {resp.status_code} - {resp.text[:200]}",
                file=sys.stderr,
            )
            return None
    except Exception as exc:
        print(f"[ai_analyzer] xAI request failed: {exc}", file=sys.stderr)
        return None


async def _analyze_with_gemini(
    api_key: str,
    system_instruction: str,
    user_prompt: str,
) -> Optional[List[Dict[str, Any]]]:
    """Call Google Gemini API."""
    print("[ai_analyzer] Invoking Google Gemini 1.5 Flash API...", file=sys.stderr)
    try:
        import google.generativeai as genai  # noqa: PLC0415

        genai.configure(api_key=api_key.strip())
        model = genai.GenerativeModel("gemini-1.5-flash")
        full_prompt = f"{system_instruction}\n\n{user_prompt}"

        response = model.generate_content(full_prompt)
        raw = response.text or ""
        return _extract_json_array(raw)
    except Exception as exc:
        print(f"[ai_analyzer] Gemini request failed: {exc}", file=sys.stderr)
        return None


async def analyze_with_ai(
    url: str,
    task: str,
    pages_content: List[Dict[str, Any]],
    existing_findings: List[Dict[str, Any]],
) -> Optional[List[Dict[str, Any]]]:
    """
    Analyze collected pages using available AI provider (Groq, xAI, or Gemini).
    Auto-detects provider based on API key prefix or environment variable.
    """
    xai_key = os.getenv("XAI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Filter placeholders
    if xai_key in ("your_xai_api_key_here", ""):
        xai_key = ""
    if groq_key in ("your_groq_api_key_here", ""):
        groq_key = ""
    if gemini_key in ("your_gemini_api_key_here", ""):
        gemini_key = ""

    # Smart detection: gsk_ prefix indicates a Groq Cloud key
    if xai_key.startswith("gsk_") and not groq_key:
        groq_key = xai_key
        xai_key = ""

    if not groq_key and not xai_key and not gemini_key:
        print(
            "[ai_analyzer] No AI API key configured. Using deterministic rule-based analysis.",
            file=sys.stderr,
        )
        return None

    system_instruction, user_prompt = _build_prompt(
        url, task, pages_content, existing_findings
    )

    # 1. Groq (ultra-low latency LPU)
    if groq_key:
        findings = await _analyze_with_groq(
            groq_key, system_instruction, user_prompt, GROQ_MODEL
        )
        if findings is not None:
            return findings

    # 2. xAI (Grok)
    if xai_key:
        findings = await _analyze_with_xai(
            xai_key, system_instruction, user_prompt
        )
        if findings is not None:
            return findings

    # 3. Google Gemini
    if gemini_key:
        findings = await _analyze_with_gemini(
            gemini_key, system_instruction, user_prompt
        )
        if findings is not None:
            return findings

    return None
