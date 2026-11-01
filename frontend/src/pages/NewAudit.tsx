import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import {
  Globe,
  User,
  Layout,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-react'
import { auditsApi } from '../utils/api'
import type { AuditScope } from '../types'
import ErrorAlert from '../components/ErrorAlert'

const scopes: { value: AuditScope; label: string; desc: string }[] = [
  { value: 'homepage', label: 'Homepage only', desc: 'Audits just the main landing page. Fast and focused.' },
  { value: 'full_site', label: 'Top-level pages', desc: 'Audits the homepage + up to 5 linked sub-pages.' },
  { value: 'specific_path', label: 'Specific path', desc: 'Audits a specific URL path you provide.' },
]


const SAMPLE_AUDITS = [
  {
    name: 'UP Scholarship Portal',
    url: 'https://scholarship.up.gov.in/',
    task: 'Apply for Postmatric Scholarship scheme as a student',
    badge: 'State Gov (India)',
  },
  {
    name: 'Digital India',
    url: 'https://digitalindia.gov.in/',
    task: 'Discover digital citizen services and public infrastructure initiatives',
    badge: 'National Portal',
  },
  {
    name: 'UIDAI (Aadhaar)',
    url: 'https://uidai.gov.in/',
    task: 'Update demographic address and download e-Aadhaar card',
    badge: 'Identity Service',
  },
  {
    name: 'USA.gov',
    url: 'https://www.usa.gov/',
    task: 'Apply for federal government assistance and food benefits',
    badge: 'Federal Portal (US)',
  },
]

const checks = [
  'Missing or non-descriptive alt text',
  'Invalid ARIA roles and attributes',
  'Form inputs without visible labels',
  'Non-descriptive link text ("click here")',
  'Navigation depth and menu structure',
  'Content reading level and plain language',
  'Skip navigation links',
  'Page language declaration',
  'Heading hierarchy and structure',
  'Contact accessibility (phone-only services)',
]

function isValidHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export default function NewAudit() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialUrl = searchParams.get('url') || ''
  const initialTask = searchParams.get('task') || ''

  const [form, setForm] = useState({
    url: initialUrl,
    task: initialTask,
    scope: 'homepage' as AuditScope,
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.url.trim()) {
      e.url = 'URL is required.'
    } else if (!isValidHttpsUrl(form.url)) {
      e.url = 'Enter a valid URL starting with https:// or http://'
    }
    if (!form.task.trim()) {
      e.task = 'Describe the citizen task so the AI can focus its analysis.'
    } else if (form.task.trim().length < 10) {
      e.task = 'Task description must be at least 10 characters.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setApiError(null)
    try {
      const res = await auditsApi.create({
        url: form.url.trim(),
        task: form.task.trim(),
        scope: form.scope,
        description: form.description.trim() || undefined,
      })
      navigate(`/audit/${res.data.id}/progress`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Could not start audit. Make sure the backend is running on port 8000.'
      setApiError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">New Audit</h1>
        <p className="text-sm text-slate-500 mt-1">Configure and run a usability audit on a government website.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            {apiError && <ErrorAlert message={apiError} onRetry={() => setApiError(null)} />}

            {/* Quick Presets */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Quick-load verified public government portal:
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_AUDITS.map(sample => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, url: sample.url, task: sample.task }))
                      setErrors({})
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50 transition-colors shadow-2xs"
                  >
                    <span>{sample.name}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{sample.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* URL */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-1.5">
                <Globe className="inline w-4 h-4 mr-1 text-slate-400" />
                Website URL <span className="text-red-500">*</span>
              </label>
              <input
                id="url"
                type="text"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://www.example.gov/services"
                className={`w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-civic-blue focus:ring-offset-0 ${
                  errors.url ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                aria-describedby={errors.url ? 'url-error' : 'url-hint'}
              />
              {errors.url ? (
                <p id="url-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.url}
                </p>
              ) : (
                <div id="url-hint" className="mt-1.5 space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400" />
                    Only public government/civic websites. SSRF protections are enforced server-side.
                  </p>
                  <p className="text-[11px] text-slate-400 pl-4">
                    Note: Portals with anti-bot firewalls (e.g. IRCTC, banking) reject automated inspection. Public state/federal citizen portals audit seamlessly.
                  </p>
                </div>
              )}
            </div>

            {/* Task */}
            <div>
              <label htmlFor="task" className="block text-sm font-medium text-slate-700 mb-1.5">
                <User className="inline w-4 h-4 mr-1 text-slate-400" />
                Citizen task <span className="text-red-500">*</span>
              </label>
              <input
                id="task"
                type="text"
                value={form.task}
                onChange={e => setForm(f => ({ ...f, task: e.target.value }))}
                placeholder="e.g. Apply for emergency rental assistance"
                className={`w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-civic-blue ${
                  errors.task ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                aria-describedby={errors.task ? 'task-error' : 'task-hint'}
              />
              {errors.task ? (
                <p id="task-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.task}
                </p>
              ) : (
                <p id="task-hint" className="mt-1.5 text-xs text-slate-500">
                  What is a citizen trying to accomplish? This guides the AI analysis.
                </p>
              )}
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Layout className="inline w-4 h-4 mr-1 text-slate-400" />
                Audit scope
              </label>
              <div className="space-y-2">
                {scopes.map(s => (
                  <label
                    key={s.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.scope === s.value
                        ? 'border-civic-blue bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={s.value}
                      checked={form.scope === s.value}
                      onChange={() => setForm(f => ({ ...f, scope: s.value }))}
                      className="mt-0.5 accent-civic-blue"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-800">{s.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="desc" className="block text-sm font-medium text-slate-700 mb-1.5">
                <FileText className="inline w-4 h-4 mr-1 text-slate-400" />
                Additional context <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="desc"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Any specific concerns, citizen demographics, or known issues to investigate…"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-blue resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center py-2.5 text-sm"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting audit…
                </>
              ) : (
                <>
                  Start Audit
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Estimated time</h3>
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-1">1–2 min</p>
            <p className="text-xs text-slate-500">Results are ready as soon as the audit completes. You can monitor progress in real-time.</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-semibold text-slate-700">What gets checked</h3>
            </div>
            <ul className="space-y-1.5">
              {checks.map(c => (
                <li key={c} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-civic-blue mt-1.5 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-1">AI analysis</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  AI-enhanced analysis requires a Gemini API key configured in settings. Without one, rule-based checks still run and produce actionable findings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
