import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  History,
  Search,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { auditsApi } from '../utils/api'
import type { AuditListItem, AuditStatus } from '../types'
import { formatDate, getDomainFromUrl, scoreColor } from '../utils/helpers'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'

export default function AuditHistory() {
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'>('date_desc')

  // Modals
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAudits = async () => {
    try {
      setLoading(true)
      const res = await auditsApi.list()
      setAudits(res.data)
      setError(null)
    } catch {
      setError('Failed to fetch audit history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAudits()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(true)
      await auditsApi.delete(id)
      setAudits(prev => prev.filter(a => a.id !== id))
      setDeleteId(null)
    } catch {
      setError('Failed to delete audit.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClearAll = async () => {
    try {
      setActionLoading(true)
      await auditsApi.clearAll()
      setAudits([])
      setConfirmClearOpen(false)
    } catch {
      setError('Failed to clear audit history.')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredAudits = useMemo(() => {
    return audits
      .filter(item => {
        const matchesSearch =
          item.url.toLowerCase().includes(search.toLowerCase()) ||
          item.task.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (sortBy === 'score_desc') return (b.overall_score ?? 0) - (a.overall_score ?? 0)
        if (sortBy === 'score_asc') return (a.overall_score ?? 0) - (b.overall_score ?? 0)
        return 0
      })
  }, [audits, search, statusFilter, sortBy])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-civic-blue" />
            Audit History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review past usability and accessibility audits, track improvements, and manage records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAudits}
            className="btn-secondary text-xs px-3 py-2"
            title="Refresh history list"
            aria-label="Refresh history"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {audits.length > 0 && (
            <button
              onClick={() => setConfirmClearOpen(true)}
              className="btn-danger text-xs px-3 py-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All History
            </button>
          )}
          <Link to="/audit/new" className="btn-primary text-sm py-2 px-4">
            Start New Audit
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAudits} />}

      {/* Filters and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by URL or citizen task..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-civic-blue focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as AuditStatus | 'all')}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-civic-blue"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-civic-blue"
            aria-label="Sort audits"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="score_desc">Highest Score</option>
            <option value="score_asc">Lowest Score</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner label="Loading audit history..." size="lg" />
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="card py-12">
          <EmptyState
            icon={<FileText className="w-8 h-8 text-slate-400" />}
            heading={audits.length === 0 ? 'No audits yet' : 'No matching audits'}
            description={
              audits.length === 0
                ? 'Run your first inspection to start tracking usability and accessibility metrics.'
                : 'Try adjusting your search criteria or filter options.'
            }
            action={
              audits.length === 0 ? (
                <Link to="/audit/new" className="btn-primary text-sm">
                  Start New Audit
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                  className="btn-secondary text-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Website & Citizen Task</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5">Findings</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAudits.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate max-w-xs">{getDomainFromUrl(item.url)}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-civic-blue transition-colors"
                          title="Open original website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.task}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          item.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'running'
                            ? 'bg-blue-50 text-blue-700'
                            : item.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {item.overall_score !== undefined && item.overall_score !== null ? (
                        <span className={`font-bold ${scoreColor(item.overall_score)}`}>
                          {item.overall_score} / 100
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{item.findings_count}</span>
                        {item.critical_count > 0 && (
                          <span className="badge-critical text-[10px] px-1.5 py-0.2">
                            {item.critical_count} critical
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={item.status === 'completed' ? `/audit/${item.id}/results` : `/audit/${item.id}/progress`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-civic-blue hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete audit"
                          aria-label="Delete audit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Single Modal */}
      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete Audit Record"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this audit record? All associated findings and inspection data will be permanently removed.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteId(null)}
              className="btn-secondary text-xs px-3 py-2"
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteId && handleDelete(deleteId)}
              className="btn-danger text-xs px-3 py-2"
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear All Modal */}
      <Modal
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear All Audit History"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <span>
              This will remove all {audits.length} stored audit records and findings. This action cannot be undone.
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Are you sure you want to continue?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setConfirmClearOpen(false)}
              className="btn-secondary text-xs px-3 py-2"
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              className="btn-danger text-xs px-3 py-2"
              disabled={actionLoading}
            >
              {actionLoading ? 'Clearing...' : 'Clear All'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
