import {
  ShieldCheck,
  Cpu,
  Lock,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  FileCheck,
} from 'lucide-react'

export default function Settings() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
          Audit Methodology & Transparency
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Understanding CivicLens AI's verification pipeline, supported automated checks, AI safety parameters, and privacy protocols.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-civic-blue flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Bounded Inspection</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            All audits operate within strict safety envelopes: maximum 5 pages, 120-second hard timeouts, SSRF protections against internal IP networks, and read-only non-authenticated navigation.
          </p>
        </div>

        <div className="card p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Deterministic First</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Core findings are based on deterministic HTML parsing rules and accessibility standards. The engine operates reliably with zero external API dependencies in fallback mode.
          </p>
        </div>

        <div className="card p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Zero Citizen Data</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            CivicLens AI audits public interface structure only. It never prompts for, transmits, or stores citizen Personally Identifiable Information (PII), form data, or session cookies.
          </p>
        </div>
      </div>

      {/* Methodology Section */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-civic-blue" />
          Inspection Pipeline Architecture
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          When a public URL and citizen task are provided, CivicLens AI initiates a bounded, sandboxed inspection cycle:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5">
            <span className="text-xs font-bold text-civic-blue uppercase">Phase 1</span>
            <h3 className="text-sm font-semibold text-slate-800">SSRF & Safety Guard</h3>
            <p className="text-xs text-slate-500">
              Validates scheme (HTTP/HTTPS only), resolves DNS, blocks private/local RFC 1918 subnets, loopbacks, and cloud metadata endpoints.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5">
            <span className="text-xs font-bold text-civic-blue uppercase">Phase 2</span>
            <h3 className="text-sm font-semibold text-slate-800">Scoped Ingestion</h3>
            <p className="text-xs text-slate-500">
              Fetches up to 5 same-origin public pages with strict response limits (5MB per page), standard browser User-Agents, and redirect tracking.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5">
            <span className="text-xs font-bold text-civic-blue uppercase">Phase 3</span>
            <h3 className="text-sm font-semibold text-slate-800">Rule-Based Checks</h3>
            <p className="text-xs text-slate-500">
              Parses DOM tree for WCAG and usability rules: empty links, unlabelled inputs, skipped headings, unhelpful anchor copy, and readability metrics.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5">
            <span className="text-xs font-bold text-civic-blue uppercase">Phase 4</span>
            <h3 className="text-sm font-semibold text-slate-800">Grounded Task AI</h3>
            <p className="text-xs text-slate-500">
              If an API key is configured, an LLM evaluates the citizen journey against actual collected text to identify cognitive hurdles and jargon barriers.
            </p>
          </div>
        </div>
      </div>

      {/* Supported Checks Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-civic-blue" />
              Supported Heuristics & Deterministic Checks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The platform clearly differentiates between machine-verified signals and AI recommendations.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Check Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Default Severity</th>
                <th className="px-6 py-3">Standard Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Missing Form Field Labels</td>
                <td className="px-6 py-3.5">Form Usability</td>
                <td className="px-6 py-3.5"><span className="badge-info">Deterministic</span></td>
                <td className="px-6 py-3.5"><span className="badge-critical">Critical</span></td>
                <td className="px-6 py-3.5">WCAG 2.1 SC 1.3.1 / 4.1.2</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Empty or Whitespace-Only Links</td>
                <td className="px-6 py-3.5">Accessibility</td>
                <td className="px-6 py-3.5"><span className="badge-info">Deterministic</span></td>
                <td className="px-6 py-3.5"><span className="badge-critical">Critical</span></td>
                <td className="px-6 py-3.5">WCAG 2.1 SC 2.4.4</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Missing Image Alternative Text</td>
                <td className="px-6 py-3.5">Accessibility</td>
                <td className="px-6 py-3.5"><span className="badge-info">Deterministic</span></td>
                <td className="px-6 py-3.5"><span className="badge-critical">Critical</span></td>
                <td className="px-6 py-3.5">WCAG 2.1 SC 1.1.1</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Vague Link Labels ("Click here", "More")</td>
                <td className="px-6 py-3.5">Navigation</td>
                <td className="px-6 py-3.5"><span className="badge-info">Deterministic</span></td>
                <td className="px-6 py-3.5"><span className="badge-high">High</span></td>
                <td className="px-6 py-3.5">WCAG 2.1 SC 2.4.4 / USWDS</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Missing Document Primary Language</td>
                <td className="px-6 py-3.5">Accessibility</td>
                <td className="px-6 py-3.5"><span className="badge-info">Deterministic</span></td>
                <td className="px-6 py-3.5"><span className="badge-high">High</span></td>
                <td className="px-6 py-3.5">WCAG 2.1 SC 3.1.1</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Skipped Heading Levels (e.g. H1 to H3)</td>
                <td className="px-6 py-3.5">Information Architecture</td>
                <td className="px-6 py-3.5"><span className="badge-info">Deterministic</span></td>
                <td className="px-6 py-3.5"><span className="badge-medium">Medium</span></td>
                <td className="px-6 py-3.5">WCAG 2.1 SC 1.3.1</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Extreme Paragraph Length & Legalese Density</td>
                <td className="px-6 py-3.5">Content Clarity</td>
                <td className="px-6 py-3.5"><span className="badge-info">Deterministic</span></td>
                <td className="px-6 py-3.5"><span className="badge-medium">Medium</span></td>
                <td className="px-6 py-3.5">Plain Writing Act of 2010</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-800">Task-Specific Navigation Friction</td>
                <td className="px-6 py-3.5">Navigation / UX</td>
                <td className="px-6 py-3.5"><span className="badge-low">AI Grounded</span></td>
                <td className="px-6 py-3.5"><span className="badge-high">High</span></td>
                <td className="px-6 py-3.5">Contextual Citizen Heuristics</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Limitations & Responsible Use */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-base font-bold text-slate-800">AI Limitations & Non-Certification</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            CivicLens AI provides diagnostic screening and civic design suggestions. It is <strong>not</strong> a formal certification of WCAG 2.1/2.2 compliance, Section 508 legal conformity, or ADA compliance.
          </p>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>AI suggestions are grounded in extracted page text but require professional human verification.</li>
            <li>Checks that cannot be assessed due to dynamic client-side rendering are reported as <em>Not Assessed</em>, never as passed.</li>
            <li>No statistical hallucination or fabricated selectors are permitted.</li>
          </ul>
        </div>

        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-2 text-civic-blue">
            <Scale className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-base font-bold text-slate-800">Responsible Civic Technology</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Redesigned citizen journey prototypes are educational illustrations designed to highlight opportunities for plain language and simplified navigation.
          </p>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>Simulated citizen flows never submit data to government agencies.</li>
            <li>Eligibility criteria in prototypes are illustrative and must not be treated as legal advice.</li>
            <li>All inspection traces respect robots policies and refrain from bypassing CAPTCHAs or rate limits.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
