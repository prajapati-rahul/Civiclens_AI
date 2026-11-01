import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Globe,
  Search,
  Brain,
  FileCheck,
  Layers,
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

const STAGES: Stage[] = [
  { key: 'validating', label: 'Validating URL', icon: Globe },
  { key: 'fetching', label: 'Fetching pages', icon: Search },
  { key: 'analyzing', label: 'Running checks', icon: Layers },
  { key: 'ai', label: 'AI analysis', icon: Brain },
  { key: 'compiling', label: 'Compiling results', icon: FileCheck },
]

function messageToStage(msg?: string): number {
  if (!msg) return 0
  const m = msg.toLowerCase()
  if (m.includes('compil') || m.includes('result')) return 4
  if (m.includes('ai') || m.includes('gemini') || m.includes('analyz')) return 3
  if (m.includes('check') || m.includes('inspect')) return 2
  if (m.includes('fetch') || m.includes('crawl') || m.includes('page')) return 1
  if (m.includes('valid')) return 0
  return 1
}

export default function AuditProgress() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>('pending')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string>('Starting audit…')
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageIdx = messageToStage(message)

  useEffect(() => {
    if (!id) return

    const poll = async () => {
      try {
        const res = await auditsApi.status(id)
        const data = res.data
        setStatus(data.status)
        if (data.progress != null) setProgress(data.progress)
        if (data.message) setMessage(data.message)

        if (data.status === 'completed') {
          clearInterval(intervalRef.current!)
          setTimeout(() => navigate(`/audit/${id}/results`), 800)
        } else if (data.status === 'failed') {
          clearInterval(intervalRef.current!)
          setError(data.message ?? 'The audit failed. The site may be unreachable or returned an error.')
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

  const displayProgress = status === 'completed' ? 100 : Math.max(progress, (stageIdx / STAGES.length) * 90 + 5)

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
          <p className="text-sm text-slate-500">{message}</p>
        </div>

        {error ? (
          <div className="space-y-4">
            <ErrorAlert title="Audit Failed" message={error} />
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/audit/new" className="btn-primary flex-1 justify-center text-sm">
                Try Again
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
              label={`${Math.round(displayProgress)}% complete`}
              showValue
              color={status === 'completed' ? 'green' : 'blue'}
              size="md"
            />

            <div className="mt-8 space-y-3">
              {STAGES.map((stage, idx) => {
                const done = idx < stageIdx || status === 'completed'
                const active = idx === stageIdx && status === 'running'
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
