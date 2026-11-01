import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  title?: string
  message: string
  onRetry?: () => void
}

export default function ErrorAlert({ title = 'Something went wrong', message, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">{title}</p>
          <p className="text-sm text-red-700 mt-0.5 leading-relaxed">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
