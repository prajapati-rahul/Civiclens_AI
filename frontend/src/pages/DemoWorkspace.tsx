import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  FlaskConical,
  Download,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldAlert,
  Bot,
  Layers,
  FileText,
} from 'lucide-react'
import { DEMO_AUDIT, ORIGINAL_JOURNEY, REDESIGNED_JOURNEY } from '../data/demoData'
import type { Finding, FindingSeverity, FindingCategory } from '../types'
import { formatDate, scoreColor } from '../utils/helpers'
import ScoreRing from '../components/ScoreRing'
import SeverityBadge from '../components/SeverityBadge'
import CategoryBadge from '../components/CategoryBadge'
import { exportAuditReport } from '../utils/exportReport'

export default function DemoWorkspace() {
  const [audit, setAudit] = useState(DEMO_AUDIT)
  const [selectedSeverity, setSelectedSeverity] = useState<FindingSeverity | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | 'all'>('all')
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'checklist'>('overview')
  const [exporting, setExporting] = useState(false)
  const [resetNotification, setResetNotification] = useState(false)

  // Interactive Checklist State
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    'Recent pay stub or income statement': true,
    'Current lease agreement': false,
    'Landlord contact information': true,
    'Last 3 months bank statements': false,
  })

  const toggleDoc = (doc: string) => {
    setCheckedDocs(prev => ({ ...prev, [doc]: !prev[doc] }))
  }

  const handleResetDemo = () => {
    setAudit(DEMO_AUDIT)
    setSelectedSeverity('all')
    setSelectedCategory('all')
    setSelectedFinding(null)
    setActiveTab('overview')
    setCheckedDocs({
      'Recent pay stub or income statement': true,
      'Current lease agreement': false,
      'Landlord contact information': true,
      'Last 3 months bank statements': false,
    })
    setResetNotification(true)
    setTimeout(() => setResetNotification(false), 3000)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAuditReport(audit)
    } finally {
      setExporting(false)
    }
  }

  const filteredFindings = audit.findings.filter(f => {
    const matchSev = selectedSeverity === 'all' || f.severity === selectedSeverity
    const matchCat = selectedCategory === 'all' || f.category === selectedCategory
    return matchSev && matchCat
  })

  const severityCounts = {
    critical: audit.findings.filter(f => f.severity === 'critical').length,
    high: audit.findings.filter(f => f.severity === 'high').length,
    medium: audit.findings.filter(f => f.severity === 'medium').length,
    low: audit.findings.filter(f => f.severity === 'low').length,
    info: audit.findings.filter(f => f.severity === 'info').length,
  }

  const completedDocsCount = Object.values(checkedDocs).filter(Boolean).length
  const totalDocsCount = Object.keys(checkedDocs).length

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Disclaimer Banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FlaskConical className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              Judges Demo Mode — Greenfield State Benefits Portal (Illustrative)
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              This guided demonstration illustrates audit capabilities using a verified sample baseline. All findings are labeled illustrative. No external API keys or live site network access required.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo
          </button>
        </div>
      </div>

      {resetNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Demo workspace has been reset to its pristine state for your presentation.
        </div>
      )}

      {/* Main Header */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="badge-critical text-[10px] tracking-wide uppercase">Illustrative Sample</span>
            <span className="text-xs text-slate-400">Recorded: {formatDate(audit.created_at)}</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            {audit.url}
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            <span className="text-slate-400">Citizen Goal:</span> {audit.task}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary text-sm py-2 px-4 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating PDF...' : 'Export Sample Report (PDF)'}
          </button>
          <Link to="/audit/new" className="btn-primary text-sm py-2 px-4 shadow-sm">
            Try Live URL Audit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-civic-blue text-civic-blue font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Audit Findings & Metrics ({audit.findings.length})
        </button>
        <button
          onClick={() => setActiveTab('journey')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'journey'
              ? 'border-civic-blue text-civic-blue font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Before & After Citizen Journey
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'border-civic-blue text-civic-blue font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Interactive Document Screener
        </button>
      </div>

      {/* TAB 1: OVERVIEW & FINDINGS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-5 flex items-center gap-4">
              <ScoreRing score={audit.metadata?.overall_score ?? 42} size={76} />
              <div>
                <p className="text-xs uppercase font-semibold text-slate-400">Civic Health Score</p>
                <div className="text-2xl font-bold text-slate-900">
                  {audit.metadata?.overall_score ?? 42}
                  <span className="text-xs font-normal text-slate-400"> / 100</span>
                </div>
                <p className="text-xs text-red-600 font-medium mt-0.5">Urgent Remediation</p>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase font-semibold text-slate-400 mb-2">Severity Breakdown</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-red-700 font-medium">Critical</span>
                  <span className="font-bold text-slate-800">{severityCounts.critical}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 font-medium">High</span>
                  <span className="font-bold text-slate-800">{severityCounts.high}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700 font-medium">Medium</span>
                  <span className="font-bold text-slate-800">{severityCounts.medium}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">Low / Info</span>
                  <span className="font-bold text-slate-800">{severityCounts.low + severityCounts.info}</span>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase font-semibold text-slate-400 mb-2">Inspection Scope</p>
              <div className="space-y-1 text-xs text-slate-600">
                <p><strong className="text-slate-800">4</strong> pages analyzed</p>
                <p><strong className="text-slate-800">23</strong> automated checks run</p>
                <p><strong className="text-slate-800">Deterministic</strong> mode</p>
                <p className="text-slate-400 text-[11px] pt-1">Safe simulated crawl</p>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase font-semibold text-slate-400 mb-2">Primary Barrier</p>
              <p className="text-xs font-semibold text-slate-800">Excessive Cognitive Friction</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                14 upfront form fields before eligibility confirmation + 16th grade legal readability level.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 uppercase">Severity:</span>
                <select
                  value={selectedSeverity}
                  onChange={e => setSelectedSeverity(e.target.value as any)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-civic-blue"
                  aria-label="Filter severity"
                >
                  <option value="all">All Severities ({audit.findings.length})</option>
                  <option value="critical">Critical ({severityCounts.critical})</option>
                  <option value="high">High ({severityCounts.high})</option>
                  <option value="medium">Medium ({severityCounts.medium})</option>
                  <option value="low">Low ({severityCounts.low})</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 uppercase">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value as any)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-civic-blue"
                  aria-label="Filter category"
                >
                  <option value="all">All Categories</option>
                  <option value="navigation">Navigation</option>
                  <option value="form_usability">Form Usability</option>
                  <option value="accessibility">Accessibility</option>
                  <option value="content_clarity">Content Clarity</option>
                  <option value="information_architecture">Information Architecture</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Showing {filteredFindings.length} of {audit.findings.length} findings
            </span>
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {filteredFindings.map(finding => (
              <div
                key={finding.id}
                onClick={() => setSelectedFinding(finding)}
                className={`card p-5 cursor-pointer transition-all hover:border-civic-blue hover:shadow-md ${
                  selectedFinding?.id === finding.id ? 'border-civic-blue ring-2 ring-civic-blue/20 bg-blue-50/20' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={finding.severity} />
                    <CategoryBadge category={finding.category} />
                    <span className="text-xs font-mono text-slate-400">ID: {finding.id}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Confidence: {Math.round(finding.confidence * 100)}%
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900">{finding.title}</h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  <strong className="text-slate-800">Citizen Impact:</strong> {finding.rationale}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate max-w-md font-mono text-[11px] text-slate-400">
                    {finding.page_url}
                  </span>
                  <span className="text-civic-blue font-semibold inline-flex items-center gap-1">
                    Inspect Evidence & Fix
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Evidence Inspection Drawer/Modal */}
          {selectedFinding && (
            <div className="card p-6 border-civic-blue ring-2 ring-civic-blue/20 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge-critical text-[10px] uppercase">Grounded Finding Details</span>
                  <h3 className="text-lg font-bold text-navy-900 mt-1">{selectedFinding.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="btn-secondary text-xs px-2.5 py-1"
                >
                  Close Inspection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Observed Evidence In Situ
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-mono italic leading-relaxed">
                    "{selectedFinding.evidence}"
                  </div>
                  {selectedFinding.selector && (
                    <p className="text-[11px] text-slate-500">
                      DOM Selector: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">{selectedFinding.selector}</code>
                    </p>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Prescribed Human Fix
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                    {selectedFinding.fix}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Detection Type: <span className="font-semibold text-slate-700 capitalize">{selectedFinding.detection_type.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BEFORE & AFTER COMPARISON */}
      {activeTab === 'journey' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 leading-relaxed">
            <strong>Demonstration Concept:</strong> Real-time journey transformation illustrating how fragmented, bureaucratic navigation can be restructured into a frictionless, 5-stage citizen self-service flow.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Journey */}
            <div className="card p-6 border-red-200 bg-red-50/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-red-200">
                <h3 className="text-base font-bold text-red-900">Original Citizen Experience</h3>
                <span className="badge-critical text-[10px]">6 Bottlenecks Detected</span>
              </div>

              <div className="space-y-4">
                {ORIGINAL_JOURNEY.map((step, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border border-red-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {step.step}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800">{step.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 pl-8">{step.description}</p>
                    {step.issues && (
                      <div className="pl-8 pt-1 space-y-1">
                        {step.issues.map((issue, i) => (
                          <div key={i} className="text-[11px] text-red-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Redesigned Journey */}
            <div className="card p-6 border-emerald-200 bg-emerald-50/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <h3 className="text-base font-bold text-emerald-900">Redesigned Citizen Journey</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3 h-3" />
                  Plain-Language Architecture
                </span>
              </div>

              <div className="space-y-4">
                {REDESIGNED_JOURNEY.map((step, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border border-emerald-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {step.step}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800">{step.title}</h4>
                      {step.isKeyAction && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ml-auto">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 pl-8">{step.description}</p>
                    {step.hint && (
                      <p className="text-[11px] text-slate-500 italic pl-8">
                        Tip: {step.hint}
                      </p>
                    )}
                    {step.documents && (
                      <div className="pl-8 pt-1 flex flex-wrap gap-1.5">
                        {step.documents.map((doc, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {doc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENT CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-navy-900">
                Interactive "Before You Start" Document Screener
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proactive verification preventing mid-application drop-off. Citizens verify documents prior to initiating applications.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-700">
                Prepared: {completedDocsCount} of {totalDocsCount} documents
              </span>
              <div className="w-40 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(completedDocsCount / totalDocsCount) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(checkedDocs).map(([doc, isChecked]) => (
              <div
                key={doc}
                onClick={() => toggleDoc(doc)}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  isChecked
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${isChecked ? 'text-slate-800' : 'text-slate-600'}`}>
                    {doc}
                  </span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                  {isChecked ? 'Ready' : 'Missing'}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              {completedDocsCount === totalDocsCount
                ? 'All mandatory documentation assembled. Ready to commence expedited application.'
                : 'Citizens without all documents are guided on alternative verification options before filing.'}
            </span>
            <button
              onClick={handleResetDemo}
              className="text-civic-blue font-semibold hover:underline"
            >
              Reset Screener
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
