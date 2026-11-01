import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  XCircle,
  CheckCircle2,
  ChevronLeft,
  AlertTriangle,
  FileText,
  ArrowRight,
  Lightbulb,
} from 'lucide-react'
import { auditsApi } from '../utils/api'
import type { Audit } from '../types'
import { ORIGINAL_JOURNEY, REDESIGNED_JOURNEY, DEMO_AUDIT } from '../data/demoData'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

export default function JourneyComparison() {
  const { id } = useParams<{ id: string }>()
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'split' | 'original' | 'redesigned'>('split')

  useEffect(() => {
    if (!id) return
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

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  if (error || !audit) return <div className="p-6 max-w-xl mx-auto mt-8"><ErrorAlert message={error ?? 'Not found.'} /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link to={`/audit/${id}/results`} className="hover:text-slate-700 flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Results
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Citizen Journey</span>
        </nav>
        <h1 className="text-xl font-bold text-slate-900">Citizen Journey Comparison</h1>
        <p className="text-sm text-slate-500 mt-1">
          Task: <em>"{audit.task}"</em>
        </p>
      </div>

      {/* Sample label */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800">SAMPLE REDESIGN — For illustrative purposes only</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            The redesigned journey below is a prototype concept based on common usability best practices. It is not a prescriptive design specification. Always consult with citizens, legal experts, and accessibility specialists before implementing service changes.
          </p>
        </div>
      </div>

      {/* Tab selector (mobile) */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 w-fit lg:hidden">
        {(['split', 'original', 'redesigned'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
              activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'split' ? 'Side by Side' : tab === 'original' ? 'Current' : 'Redesigned'}
          </button>
        ))}
      </div>

      {/* Journey columns */}
      <div className={`grid gap-6 ${activeTab === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Original */}
        {(activeTab === 'split' || activeTab === 'original') && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Current Journey</h2>
                <p className="text-xs text-slate-500">As experienced by citizens today</p>
              </div>
            </div>

            <div className="space-y-4">
              {ORIGINAL_JOURNEY.map((step) => (
                <div key={step.step} className="card p-4 border-l-4 border-red-300">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-800 mb-1">{step.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{step.description}</p>
                      {step.issues && step.issues.length > 0 && (
                        <ul className="space-y-1">
                          {step.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redesigned */}
        {(activeTab === 'split' || activeTab === 'redesigned') && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Redesigned Journey</h2>
                <p className="text-xs text-slate-500">Prototype concept — for illustration</p>
              </div>
            </div>

            <div className="space-y-4">
              {REDESIGNED_JOURNEY.map((step, idx) => (
                <div key={step.step} className={`card p-4 border-l-4 ${step.isKeyAction ? 'border-green-400 bg-green-50' : 'border-green-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      step.isKeyAction ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'
                    }`}>
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                        {step.title}
                        {step.isKeyAction && (
                          <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0 rounded-full font-medium">Key action</span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{step.description}</p>
                      {step.hint && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 mb-2">
                          <Lightbulb className="w-3 h-3 flex-shrink-0" />
                          {step.hint}
                        </div>
                      )}
                      {step.documents && step.documents.length > 0 && (
                        <ul className="space-y-1">
                          {step.documents.map((doc, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-green-800">
                              <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {doc}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Back to results */}
      <div className="pt-2">
        <Link to={`/audit/${id}/results`} className="btn-secondary text-sm py-2 px-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Results
        </Link>
      </div>
    </div>
  )
}
