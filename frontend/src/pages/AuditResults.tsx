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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { auditsApi } from '../utils/api'
import type { Audit, FindingCategory, FindingSeverity } from '../types'
import { formatDate, getDomainFromUrl, scoreColor } from '../utils/helpers'
import ScoreRing from '../components/ScoreRing'
import SeverityBadge from '../components/SeverityBadge'
import CategoryBadge from '../components/CategoryBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import EmptyState from '../components/EmptyState'
import { exportAuditReport } from '../utils/exportReport'

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
  const [exporting, setExporting] = useState(false)

  const fetchAudit = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await auditsApi.get(id)
      setAudit(res.data)
    } catch {
      setError('Could not load audit results.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAudit() }, [id])

  const severityChart = useMemo(() => {
    if (!audit) return []
    return SEVERITY_ORDER.map(s => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      count: audit.findings.filter(f => f.severity === s).length,
      color: SEVERITY_COLORS[s],
    })).filter(x => x.count > 0)
  }, [audit])

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

  const score = audit.metadata?.overall_score ?? 0
  const aiMode = audit.metadata?.ai_mode

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Audit Results
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
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
          <p className="text-sm text-slate-600 mt-1 italic">"{audit.task}"</p>
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

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <ScoreRing score={score} size={72} />
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Overall Score</p>
            <p className={`text-2xl font-black ${scoreColor(score)}`}>{score}/100</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {score >= 80 ? 'Good' : score >= 60 ? 'Needs work' : 'Poor'}
            </p>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Findings</p>
          <p className="text-3xl font-black text-slate-800">{audit.findings.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            {audit.findings.filter(f => f.severity === 'critical').length} critical
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Pages Inspected</p>
          <p className="text-3xl font-black text-slate-800">{audit.metadata?.pages_inspected ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">{audit.metadata?.checks_run ?? '—'} checks run</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">By Severity</p>
          {SEVERITY_ORDER.map(s => {
            const count = audit.findings.filter(f => f.severity === s).length
            if (count === 0) return null
            return (
              <div key={s} className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[s] }} />
                <span className="text-xs text-slate-600 capitalize">{s}</span>
                <span className="text-xs font-bold text-slate-700 ml-auto">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary text */}
      {audit.metadata?.summary && (
        <div className="card p-5 border-l-4 border-civic-blue">
          <p className="text-sm text-slate-700 leading-relaxed">{audit.metadata.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Severity Distribution</h2>
          {severityChart.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">No findings</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={severityChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Findings table */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-700 mr-auto">
              Findings
              {filteredFindings.length !== audit.findings.length && (
                <span className="ml-2 text-xs text-slate-400">
                  ({filteredFindings.length} of {audit.findings.length})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as FindingSeverity | 'all')}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-civic-blue"
                aria-label="Filter by severity"
              >
                <option value="all">All severities</option>
                {SEVERITY_ORDER.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as FindingCategory | 'all')}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-civic-blue"
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
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredFindings.map((finding, idx) => (
                <Link
                  key={finding.id}
                  to={`/audit/${id}/findings/${finding.id}`}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group"
                  aria-label={`View finding: ${finding.title}`}
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: SEVERITY_COLORS[finding.severity] + '22' }}>
                    <AlertTriangle className="w-3 h-3" style={{ color: SEVERITY_COLORS[finding.severity] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <SeverityBadge severity={finding.severity} size="sm" />
                      <CategoryBadge category={finding.category} size="sm" />
                    </div>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-civic-blue transition-colors leading-snug">
                      {finding.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {finding.evidence.slice(0, 80)}…
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-civic-blue flex-shrink-0 mt-1 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
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
    </div>
  )
}
