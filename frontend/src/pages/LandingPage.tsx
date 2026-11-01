import { Link } from 'react-router-dom'
import {
  Shield,
  Search,
  BarChart3,
  FileText,
  CheckCircle2,
  Accessibility,
  Navigation,
  BookOpen,
  Brain,
  GitCompare,
  Download,
  ArrowRight,
  Microscope,
  AlertTriangle,
  Users,
} from 'lucide-react'

const stats = [
  { value: '61%', label: 'of government websites fail basic accessibility checks', source: 'WebAIM Million, 2024' },
  { value: '42%', label: 'of citizens abandon digital government forms mid-way', source: 'Gov.uk Research, 2023' },
  { value: '3×', label: 'more likely to call a helpline after a failed digital journey', source: 'NAPA Digital Services Study' },
]

const steps = [
  { n: '01', title: 'Submit a URL', desc: 'Enter the government website URL and describe the citizen task you want to audit — e.g., "apply for a business licence".' },
  { n: '02', title: 'Automated Inspection', desc: 'CivicLens fetches pages and runs rule-based checks: accessibility, ARIA, link text, form labeling, navigation depth, and more.' },
  { n: '03', title: 'AI-Assisted Analysis', desc: 'If configured, Gemini AI evaluates content clarity, navigation logic, and citizen experience heuristics against plain-language standards.' },
  { n: '04', title: 'Actionable Report', desc: 'Receive a scored report with prioritised findings, before/after journey comparison, and exportable PDF for your team.' },
]

const capabilities = [
  { icon: Accessibility, title: 'Accessibility Checks', desc: 'Detects missing alt text, invalid ARIA roles, absent form labels, broken skip links, and non-descriptive link text.' },
  { icon: Navigation, title: 'Navigation Audit', desc: 'Measures navigation depth, identifies buried content, and flags unclear menu structures that lose citizens.' },
  { icon: BookOpen, title: 'Content Clarity', desc: 'Evaluates reading level, plain language compliance, and legal jargon that excludes non-specialist citizens.' },
  { icon: Brain, title: 'AI Analysis', desc: 'Gemini-powered heuristic review identifies structural usability issues beyond what automated rules can detect.' },
  { icon: GitCompare, title: 'Journey Comparison', desc: 'Side-by-side view of the current citizen journey vs. a redesigned prototype — shows the before/after impact.' },
  { icon: Download, title: 'Exportable Reports', desc: 'One-click PDF export with executive summary, scored findings, recommended fixes, and methodology notes.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center">
              <Microscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-navy-900 text-base">CivicLens AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/demo" className="text-sm text-slate-600 hover:text-slate-900 font-medium hidden sm:block">
              View Demo
            </Link>
            <Link to="/dashboard" className="btn-primary text-sm py-1.5 px-4">
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-navy-950 to-navy-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-navy-800 border border-navy-700 text-navy-200 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Shield className="w-3.5 h-3.5 text-civic-sky" />
            Built for government digital services
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Government websites<br />
            <span className="text-civic-sky">shouldn't lose citizens.</span>
          </h1>
          <p className="text-lg text-navy-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            CivicLens AI audits government and public-sector websites for usability barriers — accessibility failures, confusing navigation, dense legalese, and broken citizen journeys — and shows you exactly how to fix them.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/demo" className="inline-flex items-center gap-2 bg-civic-blue text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-base w-full sm:w-auto justify-center">
              <Search className="w-4 h-4" />
              Launch Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/audit/new" className="inline-flex items-center gap-2 bg-navy-800 border border-navy-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-navy-700 transition-colors text-base w-full sm:w-auto justify-center">
              <BarChart3 className="w-4 h-4" />
              Start Audit
            </Link>
          </div>
          <p className="text-xs text-navy-500 mt-5">
            No API key required for demo · Open-source methodology · Not a compliance tool
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-8">
            The problem with government digital services
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="card p-6 text-center">
                <div className="text-4xl font-black text-civic-blue mb-2">{s.value}</div>
                <p className="text-sm text-slate-700 font-medium leading-snug mb-2">{s.label}</p>
                <p className="text-xs text-slate-400">{s.source}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-600 max-w-xl mx-auto">From URL to actionable report in under two minutes.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.n} className="relative">
                <div className="text-5xl font-black text-slate-100 mb-3 select-none">{step.n}</div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 px-6 bg-navy-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">What gets checked</h2>
            <p className="text-navy-400 max-w-xl mx-auto">Comprehensive coverage of usability factors that affect real citizens.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap) => (
              <div key={cap.title} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <div className="w-10 h-10 bg-navy-700 rounded-lg flex items-center justify-center mb-4">
                  <cap.icon className="w-5 h-5 text-civic-sky" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{cap.title}</h3>
                <p className="text-xs text-navy-400 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-civic-blue">
        <div className="max-w-3xl mx-auto text-center text-white">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-5 text-blue-200" />
          <h2 className="text-3xl font-bold mb-4">Start improving citizen experience today</h2>
          <p className="text-blue-200 mb-8 leading-relaxed">
            Run an audit in minutes. No account required. See the demo first to understand what you'll get.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/demo" className="inline-flex items-center gap-2 bg-white text-civic-blue font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-base">
              <Search className="w-4 h-4" />
              See Demo Report
            </Link>
            <Link to="/audit/new" className="inline-flex items-center gap-2 bg-blue-700 border border-blue-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-800 transition-colors text-base">
              <FileText className="w-4 h-4" />
              Run Your First Audit
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 bg-navy-700 rounded flex items-center justify-center">
            <Microscope className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">CivicLens AI</span>
        </div>
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <Link to="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
          <Link to="/demo" className="hover:text-slate-300 transition-colors">Demo</Link>
          <Link to="/settings" className="hover:text-slate-300 transition-colors">Methodology</Link>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <AlertTriangle className="w-3 h-3" />
          Not a legal compliance tool. Findings require human review.
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-600">
          <Users className="w-3 h-3" />
          Built for public servants improving digital government services.
        </div>
      </footer>
    </div>
  )
}
