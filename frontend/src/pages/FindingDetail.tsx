import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle2,
  Cpu,
  Brain,
  ChevronLeft,
} from 'lucide-react'
import { auditsApi } from '../utils/api'
import type { Audit, Finding } from '../types'
import { DEMO_AUDIT } from '../data/demoData'
import SeverityBadge from '../components/SeverityBadge'
import CategoryBadge from '../components/CategoryBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import { categoryLabel } from '../utils/helpers'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

export default function FindingDetail() {
  const { id, findingId } = useParams<{ id: string; findingId: string }>()
  const navigate = useNavigate()
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    if (id === 'demo' || id === 'demo-001') {
      setAudit(DEMO_AUDIT)
      setLoading(false)
      return
    }
    auditsApi.get(id)
      .then(res => setAudit(res.data))
      .catch(() => {
        setAudit(DEMO_AUDIT)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  }
  if (error || !audit) {
    return <div className="p-6 max-w-xl mx-auto mt-8"><ErrorAlert message={error ?? 'Not found.'} /></div>
  }

  const sortedFindings: Finding[] = [...audit.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )
  const currentIdx = sortedFindings.findIndex(f => f.id === findingId)
  const finding = sortedFindings[currentIdx]
  const prevFinding = currentIdx > 0 ? sortedFindings[currentIdx - 1] : null
  const nextFinding = currentIdx < sortedFindings.length - 1 ? sortedFindings[currentIdx + 1] : null

  if (!finding) {
    return <div className="p-6 max-w-xl mx-auto mt-8"><ErrorAlert message="Finding not found." /></div>
  }

  const confidencePct = Math.round(finding.confidence * 100)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link to={`/audit/${id}/results`} className="hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          Results
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium truncate max-w-[280px]">{finding.title}</span>
      </nav>

      {/* Finding header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <SeverityBadge severity={finding.severity} />
          <CategoryBadge category={finding.category} />
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            finding.detection_type === 'ai_suggested'
              ? 'bg-violet-100 text-violet-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {finding.detection_type === 'ai_suggested' ? <Brain className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
            {finding.detection_type === 'ai_suggested' ? 'AI Suggested' : finding.detection_type === 'rule_based' ? 'Rule-Based' : 'Automated'}
          </span>
          <span className="text-xs text-slate-400 ml-auto">
            Finding {currentIdx + 1} of {sortedFindings.length}
          </span>
        </div>

        <h1 className="text-lg font-bold text-slate-900 mb-4 leading-snug">{finding.title}</h1>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Page:</span>
          <a
            href={finding.page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-civic-blue hover:underline flex items-center gap-1 text-sm truncate max-w-sm"
          >
            {finding.page_url}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>

        {finding.selector && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-slate-500">Selector:</span>
            <code className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              {finding.selector}
            </code>
          </div>
        )}
      </div>

      {/* Evidence */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Evidence
        </h2>
        <blockquote className="bg-slate-50 border-l-4 border-slate-300 pl-4 py-3 pr-3 rounded-r-lg">
          <p className="text-sm text-slate-700 leading-relaxed font-mono">{finding.evidence}</p>
        </blockquote>
      </div>

      {/* Why it matters */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-civic-blue" />
          Why this matters for citizens
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">{finding.rationale}</p>
      </div>

      {/* Recommended fix */}
      <div className="card p-5 border-green-200 bg-green-50">
        <h2 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Recommended Fix
        </h2>
        <p className="text-sm text-green-900 leading-relaxed">{finding.fix}</p>
      </div>

      {/* Confidence + disclaimer */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Confidence</h2>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${confidencePct}%`,
                backgroundColor: confidencePct >= 90 ? '#16a34a' : confidencePct >= 70 ? '#d97706' : '#dc2626',
              }}
            />
          </div>
          <span className="text-sm font-bold text-slate-700">{confidencePct}%</span>
        </div>
        {finding.detection_type === 'ai_suggested' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Not automatically verified.</strong> This finding was generated by AI heuristic analysis and has not been confirmed by automated rules. It should be reviewed by a qualified usability or accessibility professional before acting on it.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => prevFinding && navigate(`/audit/${id}/findings/${prevFinding.id}`)}
          disabled={!prevFinding}
          className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
          aria-label="Previous finding"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        <Link to={`/audit/${id}/results`} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          All findings ({sortedFindings.length})
        </Link>

        <button
          onClick={() => nextFinding && navigate(`/audit/${id}/findings/${nextFinding.id}`)}
          disabled={!nextFinding}
          className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
          aria-label="Next finding"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
