import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FlaskConical } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { auditsApi } from '../utils/api'
import type { AuditListItem } from '../types'
import { getDomainFromUrl, timeAgo, truncate, towerColor } from '../utils/helpers'
import ErrorAlert from '../components/ErrorAlert'

// three.js is heavy: load the 3D scene only on this page
const CivicCity3D = lazy(() => import('../components/CivicCity3D'))

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Falls back to the plain dashboard if the GPU/WebGL scene crashes
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function useCountUp(target: number): number {
  const [value, setValue] = useState(reducedMotion ? target : 0)
  const from = useRef(value)
  useEffect(() => {
    if (reducedMotion) { setValue(target); return }
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400)
      const v = Math.round(begin + (target - begin) * (1 - Math.pow(1 - p, 3)))
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [webgl] = useState(hasWebGL)

  const fetchAudits = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await auditsApi.list()
      setAudits(res.data)
    } catch {
      setError('Could not load audits. Make sure the backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAudits() }, [])

  // Live mode: while any audit is in progress, refresh so its tower rises when it finishes
  const live = audits.some(a => a.status === 'pending' || a.status === 'running')
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => { auditsApi.list().then(r => setAudits(r.data)).catch(() => {}) }, 4000)
    return () => clearInterval(t)
  }, [live])

  const completed = audits.filter(a => a.status === 'completed')
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, a) => s + (a.overall_score ?? 0), 0) / completed.length)
    : 0
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const kpis = [
    { label: 'Sites audited', value: audits.length, hint: 'towers in the city' },
    { label: 'Average score', value: avgScore, suffix: '/100', hint: 'across completed audits' },
    { label: 'Critical issues', value: audits.reduce((s, a) => s + a.critical_count, 0), alert: true, hint: 'fix these first' },
    { label: 'This week', value: audits.filter(a => new Date(a.created_at).getTime() >= oneWeekAgo).length, hint: 'audits in the last 7 days' },
  ]

  // API lists newest first; plot the 10 newest oldest → newest
  const trend = completed.slice(0, 10).reverse().map(a => ({
    name: getDomainFromUrl(a.url).replace(/^www\./, '').slice(0, 14),
    score: a.overall_score ?? 0,
  }))

  const openAudit = (a: AuditListItem) =>
    navigate(a.status === 'completed' ? `/audit/${a.id}/results` : `/audit/${a.id}/progress`)

  const sceneFallback = (
    <div className="h-full flex items-center justify-center text-sm text-taupe-300 px-6 text-center">
      3D view isn't available in this browser. Your audits are listed below.
    </div>
  )

  return (
    <div className="min-h-full bg-taupe-950 text-taupe-200">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {error && <ErrorAlert message={error} onRetry={fetchAudits} />}

        {/* Hero: live 3D city of audited sites */}
        <section className="relative flex flex-col xl:block overflow-hidden rounded-[28px] bg-[#14110f] border border-white/[0.06] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]" aria-label="Audit city">
          <div
            className="h-[320px] sm:h-[480px] lg:h-[600px]"
            role="img"
            aria-label={`3D map of ${audits.length} audited sites. Each tower is one site; taller and greener means a better usability score.`}
          >
            {/* From xl up the city sits right of the headline instead of behind it */}
            <div className="h-full xl:ml-[340px]">
              {loading ? <div className="h-full animate-pulse bg-[#17130f]" /> : !webgl ? sceneFallback : (
                <SceneBoundary fallback={sceneFallback}>
                  <Suspense fallback={<div className="h-full animate-pulse bg-[#17130f]" />}>
                    <CivicCity3D audits={audits} onSelect={openAudit} reducedMotion={reducedMotion} />
                  </Suspense>
                </SceneBoundary>
              )}
            </div>
          </div>

          {/* Fades so the text column and KPI bar sit on calm ground and the scene edge blends in */}
          <div className="pointer-events-none absolute inset-y-0 left-[340px] w-32 bg-gradient-to-r from-[#14110f] to-transparent hidden xl:block" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#14110f] to-transparent hidden lg:block" />

          {/* Below xl: text sits above the 3D view; xl+: it overlays the scene's left side */}
          <div className="order-first xl:order-none pointer-events-none xl:absolute left-0 top-0 z-30 p-6 sm:p-9 pb-0 xl:pb-9 max-w-xl xl:max-w-[430px] space-y-4">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-amber-400">
              <span className="relative flex h-2 w-2">
                {live && <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              {live ? 'Live · audit in progress' : 'Civic command center'}
            </p>
            <h1 className="font-display text-[2rem] sm:text-5xl xl:text-[2.4rem] 2xl:text-[2.85rem] font-medium tracking-[-0.035em] leading-[1.04] text-white [text-wrap:balance]">
              Every government site, <span className="text-taupe-400">as a city you can walk&nbsp;through.</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-taupe-300 max-w-sm">
              Each tower is an audited website. Taller means easier for citizens to use. Drag to orbit, click a tower to open it.
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] text-taupe-300" aria-label="Tower colours">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />80+ good</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />60–79 / running</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />below 60 / failed</li>
            </ul>
            <div className="pointer-events-auto flex flex-wrap items-center gap-3 pt-1">
              <Link to="/audit/new" className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-[#14110f] hover:bg-amber-300 transition-colors shadow-[0_0_30px_-6px_rgba(245,158,11,0.6)]">
                <Plus className="w-4 h-4" />
                New audit
              </Link>
              <Link to="/demo" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white border border-white/15 hover:bg-white/[0.06] transition-colors">
                <FlaskConical className="w-4 h-4" />
                Demo
              </Link>
            </div>
          </div>
          {!loading && !error && audits.length === 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
              <div className="glass p-6 max-w-sm text-center space-y-3">
                <p className="text-white font-medium">The city is empty</p>
                <p className="text-sm text-taupe-300">Run your first audit and watch its tower rise here.</p>
                <Link to="/audit/new" className="btn-primary text-sm justify-center">
                  <Plus className="w-4 h-4" />
                  Start an audit
                </Link>
              </div>
            </div>
          )}

          {/* KPI bar: overlays the scene on large screens, sits under it on small ones */}
          <div className="z-30 p-4 sm:p-6 pt-0 lg:pt-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:pointer-events-none">
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08]">
              {kpis.map(k => <Kpi key={k.label} {...k} loading={loading} />)}
            </dl>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Score trend */}
          <section className="glass p-5 lg:col-span-3">
            <h2 className="text-sm font-medium text-white">Score trend</h2>
            <p className="text-xs text-taupe-300 mt-0.5">Last {trend.length || 10} completed audits, oldest to newest</p>
            {trend.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-taupe-300">No completed audits yet</div>
            ) : (
              <div className="h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f5a524" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#f5a524" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#b8aba1' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: '#b8aba1' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => [`${v}/100`, 'Score']}
                      contentStyle={{ background: '#1a1614', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#f5a524' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#f5a524"
                      strokeWidth={2.5}
                      fill="url(#scoreFill)"
                      dot={{ r: 3, fill: '#1a1614', stroke: '#f5a524', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: '#f5a524' }}
                      isAnimationActive={!reducedMotion}
                      animationDuration={1400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Live activity */}
          <section className="glass p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">Activity</h2>
              <Link to="/history" className="text-xs text-glow-degraded hover:underline">View all</Link>
            </div>
            {audits.length === 0 ? (
              <p className="text-sm text-taupe-300 mt-6">{loading ? 'Loading…' : 'No audits yet.'}</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/5">
                {audits.slice(0, 6).map((a, i) => {
                  const color = towerColor(a)
                  const busy = a.status === 'pending' || a.status === 'running'
                  return (
                    <li key={a.id} className="motion-safe:animate-[rise_0.5s_ease-out_both]" style={{ animationDelay: `${i * 70}ms` }}>
                      <Link to={a.status === 'completed' ? `/audit/${a.id}/results` : `/audit/${a.id}/progress`} className="flex items-center gap-3 py-3 rounded-lg hover:bg-white/5 -mx-2 px-2 transition-colors">
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                          {busy && <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: color }} />}
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-white truncate">{getDomainFromUrl(a.url)}</span>
                          <span className="block text-xs text-taupe-300 truncate">{truncate(a.task, 60)}</span>
                        </span>
                        <span className="text-right flex-shrink-0">
                          <span className="block text-sm font-semibold tabular-nums" style={{ color }}>
                            {a.status === 'completed' ? a.overall_score ?? '—' : a.status}
                          </span>
                          <span className="block text-xs text-taupe-400">{timeAgo(a.created_at)}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

interface KpiProps { label: string; value: number; suffix?: string; alert?: boolean; hint: string; loading: boolean }

function Kpi({ label, value, suffix, alert, hint, loading }: KpiProps) {
  const shown = useCountUp(loading ? 0 : value)
  return (
    <div className="bg-[#14110f]/90 backdrop-blur-md px-5 py-4 sm:px-6 sm:py-5">
      <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-taupe-400">{label}</dt>
      <dd className="mt-2">
        <span className="flex items-baseline gap-1">
          <span className={`font-display text-4xl sm:text-[2.6rem] font-light leading-none tracking-[-0.04em] tabular-nums ${alert && value > 0 ? 'text-rose-400' : 'text-white'}`}>
            {shown}
          </span>
          {suffix && <span className="font-mono text-xs text-taupe-400">{suffix}</span>}
        </span>
        <span className="mt-2 block text-xs text-taupe-400">{hint}</span>
      </dd>
    </div>
  )
}
