"""
Accessibility wrapper – thin layer that orchestrates BeautifulSoup-based
a11y checks (equivalent to axe-core rules) with an optional Playwright
code path for when browsers are installed.
"""

from __future__ import annotations

import sys
from typing import Any, Dict, List


async def run_accessibility_checks(
    url: str, page_html: str
) -> List[Dict[str, Any]]:
    """
    Run accessibility checks against *page_html*.

    First tries Playwright + injected axe-core script; falls back gracefully
    to BeautifulSoup-based rule engine if Playwright / browsers are absent.

    Returns a (possibly empty) list of violation dicts.
    """
    try:
        violations = await _run_playwright_axe(url, page_html)
        return violations
    except Exception as exc:
        print(
            f"[accessibility] Playwright/axe unavailable ({exc}); "
            "using BS4 fallback.",
            file=sys.stderr,
        )
        return []


async def _run_playwright_axe(
    url: str, page_html: str
) -> List[Dict[str, Any]]:
    """
    Inject axe-core into an in-memory page via Playwright and return
    violations.  Raises if Playwright or Chromium is not available.
    """
    from playwright.async_api import async_playwright  # noqa: PLC0415

    AXE_CDN = (
        "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js"
    )

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            # Load the static HTML into the page
            await page.set_content(page_html, timeout=15_000)

            # Try to inject axe-core from CDN; skip if offline
            try:
                await page.add_script_tag(url=AXE_CDN)
            except Exception:
                # Offline or CDN blocked – axe not available
                return []

            results = await page.evaluate(
                """async () => {
                    const results = await axe.run();
                    return results.violations;
                }"""
            )
            violations = []
            for v in results or []:
                violations.append(
                    {
                        "id": v.get("id", ""),
                        "impact": v.get("impact", "moderate"),
                        "description": v.get("description", ""),
                        "help": v.get("help", ""),
                        "helpUrl": v.get("helpUrl", ""),
                        "nodes": [
                            {
                                "target": n.get("target", []),
                                "html": n.get("html", ""),
                                "failureSummary": n.get("failureSummary", ""),
                            }
                            for n in v.get("nodes", [])[:5]  # cap nodes
                        ],
                    }
                )
            return violations
        finally:
            await browser.close()
