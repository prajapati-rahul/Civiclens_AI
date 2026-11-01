import { useEffect, useState } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Info,
  Copy,
  Check,
  Bot,
  Wrench,
} from 'lucide-react'
import type { Finding } from '../types'
import SeverityBadge from './SeverityBadge'
import CategoryBadge from './CategoryBadge'

interface Props {
  finding: Finding | null
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  currentIndex?: number
  totalCount?: number
}

export default function FindingInspectionModal({
  finding,
  onClose,
  onPrev,
  onNext,
  currentIndex,
  totalCount,
}: Props) {
  const [copied, setCopied] = useState(false)

  // Keyboard navigation: Escape to close, Left/Right arrows to navigate
  useEffect(() => {
    if (!finding) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev()
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [finding, onClose, onPrev, onNext])

  if (!finding) return null

  const handleCopyEvidence = () => {
    const textToCopy = finding.selector
      ? `Selector: ${finding.selector}\nEvidence: ${finding.evidence}`
      : finding.evidence
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const confidencePct = Math.round(finding.confidence * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-finding-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={finding.severity} />
                <CategoryBadge category={finding.category} />
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {finding.id}
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                  {finding.detection_type === 'ai_suggested' ? (
                    <>
                      <Bot className="w-3 h-3 text-blue-600" />
                      AI Suggested
                    </>
                  ) : (
                    <>
                      <Wrench className="w-3 h-3 text-slate-500" />
                      Rule-based Heuristic
                    </>
                  )}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-auto">
                  Confidence: <span className="text-slate-800">{confidencePct}%</span>
                </span>
              </div>

              <h2
                id="modal-finding-title"
                className="text-lg sm:text-xl font-bold text-navy-900 leading-snug"
              >
                {finding.title}
              </h2>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-400">Target Page:</span>
                <a
                  href={finding.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-civic-blue hover:underline inline-flex items-center gap-1 truncate max-w-md"
                  title="Open target URL"
                >
                  {finding.page_url}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors flex-shrink-0 -mr-2 -mt-2"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Section 1: In Situ Evidence */}
          <div className="card p-4 border-red-200 bg-red-50/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Observed Evidence In Situ
              </h3>
              <button
                onClick={handleCopyEvidence}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded shadow-xs transition-colors"
                title="Copy evidence text"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Evidence
                  </>
                )}
              </button>
            </div>

            <blockquote className="p-3 bg-white rounded-lg border border-red-200 text-xs sm:text-sm text-slate-700 font-mono italic leading-relaxed shadow-xs">
              "{finding.evidence}"
            </blockquote>

            {finding.selector && (
              <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                <span className="font-semibold text-slate-600">DOM Selector:</span>
                <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200 truncate">
                  {finding.selector}
                </code>
              </div>
            )}
          </div>

          {/* Section 2: Why This Matters (Citizen Impact) */}
          <div className="card p-4 border-slate-200 bg-white space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-civic-blue" />
              Citizen Impact & Usability Barrier
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-5">
              {finding.rationale}
            </p>
          </div>

          {/* Section 3: Prescribed Human Fix */}
          <div className="card p-4 border-emerald-200 bg-emerald-50/25 space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Recommended Remediation & Fix
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-5 font-medium">
              {finding.fix}
            </p>
          </div>

          {finding.detection_type === 'ai_suggested' && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed flex items-start gap-2">
              <Bot className="w-4 h-4 text-civic-blue flex-shrink-0 mt-0.5" />
              <span>
                <strong>AI Transparency Note:</strong> This finding was derived from LLM semantic analysis of extracted public page text. In accordance with responsible civic technology guidelines, AI findings should be verified by human auditors prior to public release.
              </span>
            </div>
          )}
        </div>

        {/* Footer with Prev / Next Navigation */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {onPrev && (
              <button
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous finding (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}

            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-xs font-semibold text-slate-500 px-2">
                Finding {currentIndex + 1} of {totalCount}
              </span>
            )}

            {onNext && (
              <button
                onClick={onNext}
                disabled={currentIndex !== undefined && totalCount !== undefined && currentIndex >= totalCount - 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next finding (Right Arrow)"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
