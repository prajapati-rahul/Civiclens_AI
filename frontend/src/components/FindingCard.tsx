import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { Finding } from '../types'
import SeverityBadge from './SeverityBadge'
import CategoryBadge from './CategoryBadge'
import { truncate, getDomainFromUrl } from '../utils/helpers'

interface Props {
  finding: Finding
  linkTo?: string
  onClick?: () => void
}

export default function FindingCard({ finding, linkTo, onClick }: Props) {
  const inner = (
    <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SeverityBadge severity={finding.severity} />
            <CategoryBadge category={finding.category} />
            {finding.detection_type === 'ai_suggested' && (
              <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0 rounded-full font-medium">AI</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-800 group-hover:text-civic-blue transition-colors leading-snug">
            {finding.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {truncate(finding.evidence, 120)}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5 group-hover:text-civic-blue transition-colors" />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 truncate max-w-[220px]">
          {getDomainFromUrl(finding.page_url)}
        </span>
        <span className="text-[11px] text-slate-400">
          {Math.round(finding.confidence * 100)}% confidence
        </span>
      </div>
    </div>
  )

  if (linkTo) {
    return <Link to={linkTo}>{inner}</Link>
  }
  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{inner}</button>
  }
  return inner
}
