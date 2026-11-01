import { AlertTriangle, Globe } from 'lucide-react'
import clsx from 'clsx'
import type { Audit, Finding, FindingCategory, FindingSeverity } from '../types'
import { categoryLabel, getDomainFromUrl, scoreRingColor } from '../utils/helpers'
import SeverityBadge from './SeverityBadge'

type Health = 'normal' | 'degraded' | 'critical'

const HEALTH_COLOR: Record<Health, string> = { normal: '#4ade80', degraded: '#f5a524', critical: '#f43f5e' }
const HEALTH_LABEL: Record<Health, string> = { normal: 'Normal', degraded: 'Degraded', critical: 'Critical' }

// Category nodes in the 600×400 map viewBox, around the audited site at (300, 200).
const NODES: { category: FindingCategory; x: number; y: number }[] = [
  { category: 'accessibility', x: 110, y: 70 },
  { category: 'navigation', x: 490, y: 70 },
  { category: 'content_clarity', x: 80, y: 200 },
  { category: 'form_usability', x: 520, y: 200 },
  { category: 'information_architecture', x: 120, y: 330 },
  { category: 'mobile_usability', x: 490, y: 330 },
]

function healthOf(findings: Finding[]): Health {
  if (findings.some(f => f.severity === 'critical')) return 'critical'
  if (findings.some(f => f.severity === 'high' || f.severity === 'medium')) return 'degraded'
  return 'normal'
}

interface Props {
  audit: Audit
  activeCategory: FindingCategory | 'all'
  onCategory: (category: FindingCategory | 'all') => void
  onFinding: (finding: Finding) => void
}

export default function AuditControlRoom({ audit, activeCategory, onCategory, onFinding }: Props) {
  const score = Math.max(0, Math.min(100, audit.metadata?.overall_score ?? 0))
  const scoreColor = scoreRingColor(score)
  const count = (s: FindingSeverity) => audit.findings.filter(f => f.severity === s).length
  const alerts = audit.findings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 4)
  const nodes = NODES.map(n => {
    const findings = audit.findings.filter(f => f.category === n.category)
    return { ...n, count: findings.length, health: healthOf(findings) }
  })
  const statusHealth: Health = audit.status === 'completed' ? 'normal' : audit.status === 'failed' ? 'critical' : 'degraded'

  return (
    <section aria-label="Audit control room" className="rounded-3xl bg-taupe-900 text-taupe-200 p-4 sm:p-5 space-y-4 ring-1 ring-white/5">
      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <Pill label="Site" value={getDomainFromUrl(audit.url)} />
        <Pill label="Status" value={audit.status} health={statusHealth} />
        <Pill label="Analysis" value={audit.metadata?.ai_mode === 'ai_enhanced' ? 'AI enhanced' : 'Deterministic'} />
        <Pill label="Scope" value={audit.scope.replace('_', ' ')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-4">
          {/* Score gauge */}
          <div className="glass p-4">
            <p className="text-sm font-medium text-white">Citizen usability score</p>
            <svg viewBox="0 0 200 118" className="w-full max-w-[220px] mx-auto mt-2" role="img" aria-label={`Score ${score} out of 100`}>
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round" />
              <path
                d="M20 100 A80 80 0 0 1 180 100"
                fill="none"
                stroke={scoreColor}
                strokeWidth="14"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${score} 100`}
                style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
              />
              <text x="100" y="92" textAnchor="middle" fill="#fff" fontSize="36" fontWeight="600">{score}</text>
              <text x="20" y="117" textAnchor="middle" fill="#b8aba1" fontSize="11">0</text>
              <text x="180" y="117" textAnchor="middle" fill="#b8aba1" fontSize="11">100</text>
            </svg>
            <p className="text-center text-xs mt-1" style={{ color: scoreColor }}>
              {score >= 80 ? 'Good' : score >= 60 ? 'Needs work' : 'Poor'}
            </p>
          </div>

          {/* Alerts */}
          <div className="glass p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-white">
              <AlertTriangle className="w-4 h-4 text-glow-critical" aria-hidden="true" />
              Alerts
            </h3>
            {alerts.length === 0 ? (
              <p className="text-xs text-taupe-300 mt-2">No critical or high-severity findings.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {alerts.map(f => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onFinding(f)}
                      className="w-full text-left rounded-xl bg-white/5 hover:bg-white/10 border-l-2 p-3 transition-colors"
                      style={{ borderColor: f.severity === 'critical' ? HEALTH_COLOR.critical : HEALTH_COLOR.degraded }}
                    >
                      <SeverityBadge severity={f.severity} size="sm" />
                      <span className="block text-sm text-white mt-1 leading-snug">{f.title}</span>
                      <span className="block text-xs text-taupe-300 mt-0.5">{categoryLabel(f.category)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Site map */}
        <div className="glass p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">Site map by check category</h3>
            {activeCategory !== 'all' && (
              <button type="button" onClick={() => onCategory('all')} className="text-xs text-glow-degraded hover:underline">
                Show all categories
              </button>
            )}
          </div>

          {/* Below sm the nodes fall back to a plain 2-column grid without lines. */}
          <div className="grid grid-cols-2 gap-2 sm:block sm:relative sm:aspect-[3/2]">
            <svg viewBox="0 0 600 400" className="hidden sm:block absolute inset-0 w-full h-full" aria-hidden="true">
              {nodes.map(n => (
                <path
                  key={n.category}
                  d={`M300 200 H${n.x} V${n.y}`}
                  fill="none"
                  stroke={HEALTH_COLOR[n.health]}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="0.1 8"
                  className="flow-line"
                  style={{
                    filter: `drop-shadow(0 0 4px ${HEALTH_COLOR[n.health]})`,
                    opacity: activeCategory === 'all' || activeCategory === n.category ? 1 : 0.25,
                  }}
                />
              ))}
            </svg>

            <div className="col-span-2 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 rounded-2xl bg-taupe-950 border border-white/10 px-5 py-3 text-center shadow-[0_0_40px_rgba(245,165,36,0.25)]">
              <Globe className="w-5 h-5 mx-auto text-glow-degraded" aria-hidden="true" />
              <p className="text-sm font-semibold text-white mt-1 max-w-[160px] mx-auto truncate">{getDomainFromUrl(audit.url)}</p>
              <p className="text-xs text-taupe-300">{audit.findings.length} findings</p>
            </div>

            {nodes.map(n => {
              const active = activeCategory === n.category
              return (
                <button
                  key={n.category}
                  type="button"
                  onClick={() => onCategory(active ? 'all' : n.category)}
                  aria-pressed={active}
                  aria-label={`${categoryLabel(n.category)}: ${n.count} findings, ${HEALTH_LABEL[n.health]}. Filter findings list.`}
                  style={{ left: `${(n.x / 600) * 100}%`, top: `${(n.y / 400) * 100}%` }}
                  className={clsx(
                    'sm:absolute sm:-translate-x-1/2 sm:-translate-y-1/2 rounded-xl border px-3 py-2 text-left bg-taupe-950 hover:bg-taupe-800 transition-colors',
                    active ? 'border-glow-degraded' : 'border-white/10'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-white sm:whitespace-nowrap">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: HEALTH_COLOR[n.health], boxShadow: `0 0 6px ${HEALTH_COLOR[n.health]}` }}
                    />
                    {categoryLabel(n.category)}
                  </span>
                  <span className="block text-xs text-taupe-300 mt-0.5">{n.count} findings</span>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <ul className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-xs text-taupe-300" aria-label="Status legend">
            <LegendItem health="normal" text="Normal: only low or info findings" />
            <LegendItem health="degraded" text="Degraded: medium or high findings" />
            <LegendItem health="critical" text="Critical: at least one critical finding" />
          </ul>
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Critical findings" value={count('critical')} health={count('critical') ? 'critical' : 'normal'} />
        <Tile label="High findings" value={count('high')} health={count('high') ? 'degraded' : 'normal'} />
        <Tile label="Pages inspected" value={audit.metadata?.pages_inspected ?? '—'} />
        <Tile label="Checks run" value={audit.metadata?.checks_run ?? '—'} />
      </div>
    </section>
  )
}

function Dot({ health }: { health: Health }) {
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: HEALTH_COLOR[health] }} aria-hidden="true" />
}

function Pill({ label, value, health }: { label: string; value: string; health?: Health }) {
  return (
    <div className="glass rounded-xl px-3 py-1.5">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-taupe-300">
        {health && <Dot health={health} />}
        {label}
      </p>
      {/* Domains stay lowercase; status/scope words get capitalised */}
      <p className={clsx('text-sm text-white font-medium truncate max-w-[200px]', label !== 'Site' && 'capitalize')}>{value}</p>
    </div>
  )
}

function Tile({ label, value, health }: { label: string; value: number | string; health?: Health }) {
  return (
    <div className="glass p-3">
      <p className="flex items-center justify-between gap-2 text-xs text-taupe-300">
        {label}
        {health && <Dot health={health} />}
      </p>
      <p className="text-3xl font-light text-white mt-1">{value}</p>
    </div>
  )
}

function LegendItem({ health, text }: { health: Health; text: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <Dot health={health} />
      {text}
    </li>
  )
}
