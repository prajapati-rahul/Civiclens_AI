import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldAlert, ArrowRight, Sparkles } from 'lucide-react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  FileCheck,
  FlaskConical,
} from 'lucide-react'
import { auditsApi } from '../utils/api'
import ProgressBar from '../components/ProgressBar'
import ErrorAlert from '../components/ErrorAlert'

type Stage = {
  key: string
  label: string
  icon: React.ElementType
}


const VERIFIED_GOV_SITES = [
  {
    name: 'UP Scholarship Portal',
    url: 'https://scholarship.up.gov.in/',
    task: 'Apply for Postmatric Scholarship scheme as a student',
  },
  {
    name: 'Digital India',
    url: 'https://digitalindia.gov.in/',
    task: 'Discover digital citizen services and public infrastructure initiatives',
  },
  {
    name: 'UIDAI (Aadhaar)',
    url: 'https://uidai.gov.in/',
    task: 'Update demographic address and download e-Aadhaar card',
  },
  {
    name: 'USA.gov',
    url: 'https://www.usa.gov/',
    task: 'Apply for federal government assistance and food benefits',
  },
]

// /status only reports pending | running | completed | failed, so show exactly those steps.
const STAGES: Stage[] = [
  { key: 'pending', label: 'Queued', icon: Clock },
  { key: 'running', label: 'Fetching pages and running checks', icon: Search },
  { key: 'completed', label: 'Results ready', icon: FileCheck },
]

export default function AuditProgress() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>('pending')
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageIdx = Math.max(0, STAGES.findIndex(s => s.key === status))

  useEffect(() => {
    if (!id) return

    const poll = async () => {
      try {
        const res = await auditsApi.status(id)
        const data = res.data
        setStatus(data.status)

        if (data.status === 'completed') {
          clearInterval(intervalRef.current!)
          setTimeout(() => navigate(`/audit/${id}/results`), 800)
        } else if (data.status === 'failed') {
          clearInterval(intervalRef.current!)
          setError(data.error_message ?? 'The audit failed. The site may be unreachable or returned an error.')
        }
      } catch {
        setError('Lost connection to the backend. Is it still running?')
        clearInterval(intervalRef.current!)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => clearInterval(intervalRef.current!)
  }, [id, navigate])

  const displayProgress = ((stageIdx + 1) / STAGES.length) * 100

  return (
    <div className="p-6 max-w-2xl mx-auto mt-8">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {status === 'completed' ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : status === 'failed' ? (
              <XCircle className="w-8 h-8 text-red-500" />
            ) : (
              <div className="w-8 h-8 border-4 border-blue-200 border-t-civic-blue rounded-full animate-spin" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            {status === 'completed' ? 'Audit Complete' : status === 'failed' ? 'Audit Failed' : 'Audit in Progress'}
          </h1>
          <p className="text-sm text-slate-500" aria-live="polite">{status === 'failed' ? 'Stopped' : STAGES[stageIdx].label}</p>
        </div>

        {error ? (
          <div className="space-y-5">
            <ErrorAlert title="Audit Failed" message={error} />

            {/* Explanatory context for bot protection / timeouts */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-left">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">Why do some portals block automated audits?</h4>
                  <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                    High-frequency ticketing and banking systems (such as IRCTC or payment gateways) deploy strict anti-bot firewalls (Akamai Bot Manager, Radware) to prevent ticket scalping. CivicLens AI follows security boundaries and never bypasses anti-bot controls.
                  </p>
                </div>
              </div>
            </div>

            {/* One-click suggestions */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Try one of these verified public citizen services (100% accessible for audits):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VERIFIED_GOV_SITES.map((site) => (
                  <Link
                    key={site.name}
                    to={`/audit/new?url=${encodeURIComponent(site.url)}&task=${encodeURIComponent(site.task)}`}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/40 text-slate-800 text-xs transition-all group"
                  >
                    <div>
                      <div className="font-medium text-slate-900 group-hover:text-blue-700">{site.name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{site.url}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link to="/audit/new" className="btn-primary flex-1 justify-center text-sm">
                Try Different URL
              </Link>
              <Link to="/demo" className="btn-secondary flex-1 justify-center text-sm">
                <FlaskConical className="w-4 h-4" />
                View Demo Instead
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ProgressBar
              value={displayProgress}
              label={`Step ${stageIdx + 1} of ${STAGES.length}`}
              color={status === 'completed' ? 'green' : 'blue'}
              size="md"
            />

            <div className="mt-8 space-y-3">
              {STAGES.map((stage, idx) => {
                const done = idx < stageIdx || status === 'completed'
                const active = idx === stageIdx && status !== 'completed'
                const pending = idx > stageIdx && status !== 'completed'

                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      done ? 'bg-green-100' : active ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <stage.icon className={`w-4 h-4 ${active ? 'text-civic-blue' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      done ? 'text-green-700' : active ? 'text-civic-blue' : pending ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {stage.label}
                      {active && <span className="ml-2 text-xs text-blue-400 animate-pulse">Running…</span>}
                    </span>
                  </div>
                )
              })}
            </div>

            {status !== 'failed' && status !== 'completed' && (
              <p className="text-xs text-slate-400 text-center mt-8">
                This usually takes 1–2 minutes. You can safely leave this page — results will be saved.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
