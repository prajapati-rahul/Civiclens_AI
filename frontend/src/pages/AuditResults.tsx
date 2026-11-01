import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Download,
  GitCompare,
  History,
  Filter,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Cpu,
  Brain,
  ChevronRight,
  Globe,
  Clock,
} from 'lucide-react'
import { auditsApi } from '../utils/api'
import type { Audit, FindingCategory, FindingSeverity } from '../types'
import { formatDate, getDomainFromUrl, auditLoadError, truncate } from '../utils/helpers'
import AuditControlRoom from '../components/AuditControlRoom'
import SeverityBadge from '../components/SeverityBadge'
import CategoryBadge from '../components/CategoryBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import EmptyState from '../components/EmptyState'
import { exportAuditReport } from '../utils/exportReport'
import { DEMO_AUDIT } from '../data/demoData'
import FindingInspectionModal from '../components/FindingInspectionModal'
import type { Finding } from '../types'

const SEVERITY_ORDER: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info']
const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#3b82f6', info: '#94a3b8'
}

export default function AuditResults() {
  const { id } = useParams<{ id: string }>()
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | 'all'>('all')
  const [modalFinding, setModalFinding] = useState<Finding | null>(null)
  const [exporting, setExporting] = useState(false)

  const fetchAudit = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    if (id === 'demo' || id === 'demo-001') {
      setAudit(DEMO_AUDIT)
      setLoading(false)
      return
    }
    try {
      const res = await auditsApi.get(id)
      setAudit(res.data)
    } catch (err) {
      setAudit(null)
      setError(auditLoadError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAudit() }, [id])

  const filteredFindings = useMemo(() => {
    if (!audit) return []
    return audit.findings
      .filter(f => severityFilter === 'all' || f.severity === severityFilter)
      .filter(f => categoryFilter === 'all' || f.category === categoryFilter)
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
  }, [audit, severityFilter, categoryFilter])

  const handleExport = async () => {
    if (!audit) return
    setExporting(true)
    try {
      await exportAuditReport(audit)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner label="Loading results…" size="lg" />
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-8">
        <ErrorAlert message={error ?? 'Audit not found.'} onRetry={fetchAudit} />
      </div>
    )
  }

  const aiMode = audit.metadata?.ai_mode

  return (
    <div className="min-h-full bg-slate-950 text-slate-200">
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-glow-normal" />
            Audit Results
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-300">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {getDomainFromUrl(audit.url)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {audit.completed_at ? formatDate(audit.completed_at) : '—'}
            </span>
            {aiMode && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                aiMode === 'ai_enhanced'
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {aiMode === 'ai_enhanced' ? <Brain className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                {aiMode === 'ai_enhanced' ? 'AI Enhanced' : 'Deterministic'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-200 mt-1 italic">"{audit.task}"</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <Link to={`/audit/${id}/journey`} className="btn-secondary text-sm py-1.5 px-3">
            <GitCompare className="w-3.5 h-3.5" />
            Journey
          </Link>
          <Link to="/history" className="btn-secondary text-sm py-1.5 px-3">
            <History className="w-3.5 h-3.5" />
            History
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary text-sm py-1.5 px-3"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      <AuditControlRoom
        audit={audit}
        activeCategory={categoryFilter}
        onCategory={setCategoryFilter}
        onFinding={setModalFinding}
      />

      {/* Summary text */}
      {audit.metadata?.summary && (
        <div className="glass p-5 border-l-4 border-l-glow-degraded">
          <p className="text-sm text-slate-200 leading-relaxed">{audit.metadata.summary}</p>
        </div>
      )}

      {/* Findings table */}
        <div className="glass overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-white mr-auto">
              Findings
              {filteredFindings.length !== audit.findings.length && (
                <span className="ml-2 text-xs text-slate-300">
                  ({filteredFindings.length} of {audit.findings.length})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as FindingSeverity | 'all')}
                className="text-xs bg-taupe-900 text-slate-200 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-glow-degraded"
                aria-label="Filter by severity"
              >
                <option value="all">All severities</option>
                {SEVERITY_ORDER.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as FindingCategory | 'all')}
                className="text-xs bg-taupe-900 text-slate-200 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-glow-degraded"
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                <option value="accessibility">Accessibility</option>
                <option value="navigation">Navigation</option>
                <option value="content_clarity">Content Clarity</option>
                <option value="form_usability">Form Usability</option>
                <option value="information_architecture">Info Architecture</option>
                <option value="mobile_usability">Mobile Usability</option>
              </select>
            </div>
          </div>

          {filteredFindings.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              heading="No findings match filters"
              description="Try changing the severity or category filter."
            />
          ) : (
            <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
              {filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  onClick={() => setModalFinding(finding)}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-white/5 transition-colors group cursor-pointer"
                  aria-label={`Inspect finding: ${finding.title}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setModalFinding(finding)
                    }
                  }}
                >
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: SEVERITY_COLORS[finding.severity] + "22" }}
                  >
                    <AlertTriangle className="w-3 h-3" style={{ color: SEVERITY_COLORS[finding.severity] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <SeverityBadge severity={finding.severity} size="sm" />
                      <CategoryBadge category={finding.category} size="sm" />
                    </div>
                    <p className="text-sm font-medium text-white group-hover:text-glow-degraded transition-colors leading-snug">
                      {finding.title}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5 truncate">
                      {truncate(finding.evidence, 95)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-glow-degraded opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                      Inspect & Fix
                    </span>
                    <ChevronRight className="w-4 h-4 text-taupe-400 group-hover:text-glow-degraded transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link to={`/audit/${id}/journey`} className="btn-primary text-sm py-2 px-4">
          <GitCompare className="w-4 h-4" />
          View Citizen Journey Comparison
        </Link>
        <Link to="/demo" className="btn-secondary text-sm py-2 px-4">
          <FlaskConical className="w-4 h-4" />
          See Demo for Reference
        </Link>
      </div>
      {/* Pop-up Inspection Modal */}
      <FindingInspectionModal
        finding={modalFinding}
        onClose={() => setModalFinding(null)}
        currentIndex={modalFinding ? filteredFindings.findIndex(f => f.id === modalFinding.id) : undefined}
        totalCount={filteredFindings.length}
        onPrev={
          modalFinding && filteredFindings.findIndex(f => f.id === modalFinding.id) > 0
            ? () => {
                const idx = filteredFindings.findIndex(f => f.id === modalFinding.id)
                setModalFinding(filteredFindings[idx - 1])
              }
            : undefined
        }
        onNext={
          modalFinding && filteredFindings.findIndex(f => f.id === modalFinding.id) < filteredFindings.length - 1
            ? () => {
                const idx = filteredFindings.findIndex(f => f.id === modalFinding.id)
                setModalFinding(filteredFindings[idx + 1])
              }
            : undefined
        }
      />
    </div>
    </div>
  )
}
