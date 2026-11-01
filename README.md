# CivicLens AI

> **Auditing Government Digital Services for Citizen Usability, Accessibility, and Information Clarity**

CivicLens AI is a civic-technology web application built for hackathon evaluation and real-world civic digital services inspection. It audits public government websites against specific citizen tasks (e.g., *"Apply for emergency rental assistance"* or *"Renew driver's license"*), detects actionable accessibility and cognitive barriers with grounded evidence, and presents an interactive before-and-after redesigned citizen journey.

---

## Table of Contents
1. [Product Vision & Problem Statement](#product-vision--problem-statement)
2. [Key Capabilities & Architecture](#key-capabilities--architecture)
3. [Safety & Bounded Inspection Pipeline (SSRF Guard)](#safety--bounded-inspection-pipeline-ssrf-guard)
4. [AI & Deterministic Fallback Mode](#ai--deterministic-fallback-mode)
5. [Presentation Runbook (3–5 Minute Hackathon Pitch)](#presentation-runbook-35-minute-hackathon-pitch)
6. [Quick Start & Installation](#quick-start--installation)
7. [Running the Application](#running-the-application)
8. [Automated Testing & Verification](#automated-testing--verification)
9. [Project Directory Structure](#project-directory-structure)
10. [Limitations & Responsible Use Disclosure](#limitations--responsible-use-disclosure)

---

## Product Vision & Problem Statement

Government digital portals are the primary gateway for citizens seeking vital social safety net benefits, licensing, and legal relief. However:
- **61%** of public digital services fail basic automated accessibility standards (WCAG).
- Complex legal jargon and multi-tiered nested navigation cause **over 40% of citizens to abandon applications mid-way**.
- Frustrated applicants flood understaffed telephone call centers or offices.

**CivicLens AI** bridges this gap:
1. **Targeted Citizen Task Audits:** Evaluates pages not in isolation, but through the lens of a specific citizen goal.
2. **Deterministic Evidence:** Extracts real selectors, exact DOM quotes, and tangible barriers—no fabricated selectors or hallucinated scores.
3. **Actionable Remediation:** Prescribes plain-language translations and human-centered fixes.
4. **Before-and-After Journey Transformation:** Contrasts the friction-heavy original flow against an interactive 5-stage plain-language redesign with document pre-screeners.
5. **Auditor PDF Export:** Instant, professional executive PDF reports ready for civic stakeholders and engineering leads.

---

## Key Capabilities & Architecture

CivicLens AI is structured as a modern, decoupled full-stack application:

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, jsPDF, html2canvas.
  - Custom civic design system (restrained navy/slate palette, accessible contrast, responsive desktop/mobile layouts).
  - Client-side validation, error alerts, empty states, and dynamic status polling.
- **Backend:** Python 3.12, FastAPI, BeautifulSoup4, HTTPX, SQLite3 (WAL/standard transaction engine).
  - Non-blocking asynchronous task execution with background audit runners.
  - RESTful API with status polling, full report generation, and CRUD history management.
- **Persistence:** Local SQLite database storing audits, findings, timestamps, and execution metadata. Zero external database infrastructure needed.

---

## Safety & Bounded Inspection Pipeline (SSRF Guard)

The audit engine is designed strictly for public, safe inspection:
- **SSRF Protection (`services/ssrf_guard.py`):**
  - Blocks internal loopbacks (`127.0.0.0/8`, `localhost`, `::1`).
  - Blocks RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Blocks cloud instance metadata services (`169.254.169.254`, `metadata.google.internal`).
  - Resolves hostnames and validates all resolved IP addresses before establishing connections.
  - Re-evaluates redirects at every hop.
- **Strict Bounds:**
  - Hard limit of 5 same-origin pages per audit.
  - 120-second hard timeout.
  - 5 MB maximum page payload limit.
  - Read-only HTTP GET requests with custom User-Agent.
  - **Zero interaction with authentication, CAPTCHAs, or citizen form submission.**

---

## AI & Deterministic Fallback Mode

CivicLens AI runs in two distinct, transparent modes:
1. **Deterministic Rule-Based Mode (Default / 100% Offline Capable):**
   - Automatically assesses 8 deterministic checks from collected DOM:
     - Missing form labels (`<input>` without associated `<label>` or `aria-label`).
     - Empty link anchors or whitespace-only link text.
     - Missing image alternative text (`<img>` missing `alt`).
     - Non-descriptive link copy ("click here", "read more").
     - Missing HTML document `lang` attribute.
     - Missing or disabled mobile viewport tags.
     - Skipped heading hierarchy (e.g., jumping from `<h1>` to `<h3>`).
     - Extreme paragraph length and readability hurdles.
   - Calculates bounded quality score (0–100) using weighted deductions.
2. **AI-Enhanced Mode (Grounded in Real Extracted Text):**
   - When a `GEMINI_API_KEY` is provided, Google Gemini 1.5 Flash evaluates extracted page text against the user's specific citizen task.
   - AI findings are strictly grounded in collected text, flagged with an "AI Suggested" badge, and marked for human review.
   - If an AI call times out or encounters invalid JSON, the system recovers gracefully without discarding deterministic findings.

---

## Presentation Runbook (3–5 Minute Hackathon Pitch)

Follow this script to demonstrate CivicLens AI to judges in 3–5 minutes without any API keys or network dependencies:

### Step 1: Landing Page & Problem Pitch (0:00 – 0:45)
- Open `http://localhost:5173`.
- Show the hero section: *"Government websites shouldn't lose citizens."*
- Highlight the problem stats: 61% of public sites fail accessibility; 42% of citizens drop off.
- Click **"Launch Demo Workspace"** (or use the top navigation button).

### Step 2: The Guided Demo Workspace & Findings (0:45 – 1:45)
- Point out the **Amber Banner**: clearly indicates that this is an illustrative, verified demonstration baseline for the *"Greenfield State Benefits Portal"*.
- Highlight the **Civic Health Score (42 / 100)** and severity breakdown (2 Critical, 4 High, 2 Medium).
- Filter findings by **Critical** severity or **Form Usability** category.
- Click on the critical finding: *"Application form has 14 required fields before eligibility is confirmed"*.
- Show the **In Situ Evidence Quote** and the specific **Prescribed Human Fix**.

### Step 3: Before & After Citizen Journey (1:45 – 2:45)
- Click the **"Before & After Citizen Journey"** tab.
- Walk through the side-by-side comparison:
  - **Left (Original):** 6-step bureaucratic maze (6 menu clicks, 16th-grade legal reading level, no document notice, abrupt errors).
  - **Right (Redesigned):** Plain-language 5-step flow (homepage fast-track, 60-second eligibility screener, clear document checklist, progress tracker).

### Step 4: Interactive Document Screener & PDF Export (2:45 – 3:30)
- Switch to the **"Interactive Document Screener"** tab.
- Toggle document checkmarks: show how citizens can verify requirements *before* starting an application.
- Click **"Export Sample Report (PDF)"**: open the generated multi-page professional PDF report with executive summary, methodology notes, and score breakdowns.

### Step 5: Transparency & Live Audit Option (3:30 – 4:00)
- Navigate to **"Methodology"** in the sidebar: show the transparent disclosure of heuristics, safety limits, and responsible AI guardrails.
- Click **"Start New Audit"** to demonstrate live URL inspection and client-side SSRF rejection (e.g. typing `http://localhost:8000` or `127.0.0.1` immediately shows the security warning).

---

## Quick Start & Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (tested on Python 3.12)

### 1. Clone & Set Up Backend
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```
*(Optional)* Add your Gemini API key to `backend/.env` for AI-enhanced mode:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 2. Set Up Frontend
```bash
cd ../frontend
npm install
```

---

## Running the Application

### 1. Start the Backend API
```bash
cd backend
# With virtual environment activated:
uvicorn main:app --reload --port 8000
```
- API Health probe: `http://localhost:8000/api/health`
- Interactive OpenAPI docs: `http://localhost:8000/api/docs`

### 2. Start the Frontend Development Server
```bash
cd frontend
npm run dev
```
- Open `http://localhost:5173` in your browser.

---

## Automated Testing & Verification

The backend includes a comprehensive test suite covering health checks, demo endpoints, SSRF guard edge cases, 7 deterministic checks, scoring algorithms, and database CRUD:

```bash
cd backend
.venv\Scripts\python test_suite.py
```

### Observed Test Results
```
[DB] Database initialised at civiclens.db

--- Running CivicLens AI Backend Test Suite ---
[PASS] Health check endpoint PASSED
[PASS] Demo endpoint PASSED (12 findings served, score=22)
[PASS] Demo reset endpoint PASSED
[PASS] SSRF Guard PASSED: 9 malicious/internal patterns correctly blocked
  SSRF check for http://example.org/services: safe=True (ok)
[PASS] Deterministic Accessibility/Usability Checks PASSED (7 heuristic checks verified)
[PASS] Scoring engine PASSED (accurate weighting and [0,100] bounding)
[PASS] Database CRUD Lifecycle PASSED

==============================================
ALL TESTS PASSED SUCCESSFULLY! (100% Verified)
==============================================
```

### Frontend Production Build Verification
```bash
cd frontend
npm run build
```
Build output:
```
✓ 3119 modules transformed.
dist/index.html                           0.84 kB
dist/assets/index-BTaJR0Qt.css           40.77 kB
dist/assets/index-Bj58Tr-e.js         1,110.53 kB
✓ built in 14.22s with zero TypeScript errors
```

---

## Project Directory Structure

```
CivicLens AI/
├── backend/
│   ├── main.py                  # FastAPI app entry point & CORS configuration
│   ├── requirements.txt         # Pinned backend dependencies
│   ├── test_suite.py            # Comprehensive test harness
│   ├── .env.example             # Environment variable template
│   ├── data/
│   │   └── demo_audit.py        # Illustrative Greenfield State Benefits Portal dataset
│   ├── db/
│   │   └── database.py          # SQLite schema, queries, and connection manager
│   ├── models/
│   │   └── schemas.py           # Pydantic v2 data models & validation schemas
│   ├── routers/
│   │   ├── audits.py            # Audit lifecycle endpoints (create, status, list, report)
│   │   └── demo.py              # Demo endpoints with idempotent reset
│   └── services/
│       ├── audit_engine.py      # Core inspection pipeline & 8 deterministic heuristic rules
│       ├── ssrf_guard.py        # IP validation, range blocking & DNS resolution guard
│       ├── accessibility.py     # DOM-level WCAG & optional Playwright wrapper
│       └── ai_analyzer.py       # Grounded Gemini 1.5 Flash heuristic integration
│
├── frontend/
│   ├── package.json             # React 18, Vite, Tailwind, Recharts, jsPDF
│   ├── vite.config.ts           # Vite bundler config with backend proxy
│   ├── tailwind.config.js       # Navy/slate civic design system palette
│   ├── index.html               # Semantic HTML root with Inter font
│   └── src/
│       ├── App.tsx              # React Router v6 routing table
│       ├── main.tsx             # Root React hydration
│       ├── types/index.ts       # Typed API contracts matching backend models
│       ├── utils/
│       │   ├── api.ts           # Axios client with typed endpoints
│       │   ├── helpers.ts       # Date formatters, score indicators & badges
│       │   └── exportReport.ts  # Multi-page jsPDF report generator
│       ├── data/
│       │   └── demoData.ts      # Static demonstration audit & citizen journeys
│       ├── components/
│       │   ├── Layout.tsx        # Responsive sidebar, navigation, and topbar
│       │   ├── ScoreRing.tsx     # Animated SVG radial score gauge
│       │   ├── SeverityBadge.tsx # Critical, High, Medium, Low status badges
│       │   ├── CategoryBadge.tsx # Usability category pill badges
│       │   ├── Modal.tsx         # Accessible dialog with focus trap
│       │   ├── EmptyState.tsx    # Standardized empty states
│       │   ├── ErrorAlert.tsx    # Error banners with retry triggers
│       │   └── LoadingSpinner.tsx# Screen-reader friendly spinners
│       └── pages/
│           ├── LandingPage.tsx   # Public value proposition & workflow
│           ├── Dashboard.tsx     # Metrics cards, recent audits, score chart
│           ├── NewAudit.tsx      # Target URL input, scope selection, SSRF guidance
│           ├── AuditProgress.tsx # Real-time stage polling with fallback recovery
│           ├── AuditResults.tsx  # Findings matrix, severity filters, score summary
│           ├── FindingDetail.tsx # Deep inspection: DOM quote, impact, suggested fix
│           ├── JourneyComparison.tsx # Side-by-side original vs redesigned journey
│           ├── DemoWorkspace.tsx # Judges 1-click sandbox with interactive checklist
│           ├── AuditHistory.tsx  # Searchable audit catalog with sorting & deletion
│           ├── Settings.tsx      # Methodology, check reference, AI limits
│           └── NotFound.tsx      # 404 handler
├── .env.example                 # Root configuration template
└── README.md                    # Product specification & runbook
```

---

## Limitations & Responsible Use Disclosure

- **Diagnostic Screening Only:** CivicLens AI is an automated diagnostic and redesign screening tool. It does **not** provide formal legal certification of Section 508 or WCAG 2.1/2.2 conformity.
- **Unassessed Signals:** Pages containing heavy client-side JavaScript Single Page Application (SPA) state changes or dynamic user flows that require authentication are marked as *Not Assessed*, never as passed.
- **Sample Redesigns are Illustrative:** Redesigned prototypes demonstrate human-centered information architecture principles and do not represent officially endorsed forms or real submissions to government agencies.
