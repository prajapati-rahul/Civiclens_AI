import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
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
import type { AuditListItem } from '../types'
import { formatDate, getDomainFromUrl, scoreColor } from '../utils/helpers'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import EmptyState from '../components/EmptyState'
import SeverityBadge from '../components/SeverityBadge'

function statusIcon(status: AuditListItem['status']) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    case 'pending': return <Clock className="w-4 h-4 text-amber-500" />
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
  }
}

function scoreBar(score: number | undefined) {
  if (score == null) return <span className="text-xs text-slate-400">—</span>
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className={`text-xs font-semibold ${scoreColor(score)}`}>{score}</span>
    </div>
  )
}

export default function Dashboard() {
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const completed = audits.filter(a => a.status === 'completed')
  const totalCritical = audits.reduce((sum, a) => sum + a.critical_count, 0)
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.overall_score ?? 0), 0) / completed.length)
    : null

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thisWeek = audits.filter(a => new Date(a.created_at) >= oneWeekAgo).length

  const chartData = completed.slice(-10).map(a => ({
    name: getDomainFromUrl(a.url).replace('www.', '').slice(0, 12),
    score: a.overall_score ?? 0,
  }))

  const recentAudits = [...audits].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  const metrics = [
    { label: 'Total Audits', value: audits.length, icon: BarChart2, color: 'bg-blue-50 text-blue-600' },
    { label: 'Avg Score', value: avgScore != null ? avgScore : '—', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'Critical Issues', value: totalCritical, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'This Week', value: thisWeek, icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your government website audits</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/demo" className="btn-secondary text-sm py-1.5 px-3">
            <FlaskConical className="w-3.5 h-3.5" />
            Demo
          </Link>
          <Link to="/audit/new" className="btn-primary text-sm py-1.5 px-3">
            <Plus className="w-3.5 h-3.5" />
            New Audit
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{m.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-800">
              {loading ? <div className="h-8 w-10 bg-slate-200 rounded animate-pulse" /> : m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Score by Audit (recent 10)</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <LoadingSpinner label="Loading chart…" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              No completed audits yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: number) => [`${val}/100`, 'Score']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.score >= 80 ? '#16a34a' : entry.score >= 60 ? '#d97706' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent audits */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Recent Audits</h2>
            <Link to="/history" className="text-xs text-civic-blue hover:underline">View all</Link>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorAlert message={error} onRetry={fetchAudits} />
            </div>
          ) : recentAudits.length === 0 ? (
            <EmptyState
              icon={<BarChart2 className="w-6 h-6" />}
              heading="No audits yet"
              description="Start your first audit to see results here."
              action={
                <Link to="/audit/new" className="btn-primary text-sm py-1.5 px-3">
                  <Plus className="w-3.5 h-3.5" />
                  New Audit
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentAudits.map(audit => (
                <li key={audit.id}>
                  <Link
                    to={audit.status === 'completed' ? `/audit/${audit.id}/results` : `/audit/${audit.id}/progress`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-shrink-0">{statusIcon(audit.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-civic-blue transition-colors">
                        {getDomainFromUrl(audit.url)}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{audit.task}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {scoreBar(audit.overall_score)}
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(audit.created_at)}</p>
                    </div>
                    {audit.critical_count > 0 && (
                      <SeverityBadge severity="critical" size="sm" />
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/audit/new"
          className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow group border-2 border-dashed border-slate-200 hover:border-civic-blue"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Plus className="w-6 h-6 text-civic-blue" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 group-hover:text-civic-blue transition-colors">Start New Audit</h3>
            <p className="text-sm text-slate-500 mt-0.5">Audit a government website in ~2 minutes</p>
          </div>
        </Link>
        <Link
          to="/demo"
          className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow group border-2 border-dashed border-slate-200 hover:border-violet-400"
        >
          <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center group-hover:bg-violet-100 transition-colors">
            <FlaskConical className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">Open Demo</h3>
            <p className="text-sm text-slate-500 mt-0.5">Explore a sample audit of a benefits portal</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
