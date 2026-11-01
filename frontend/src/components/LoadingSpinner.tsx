interface Props {
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
}

export default function LoadingSpinner({ label = 'Loading…', size = 'md' }: Props) {
  return (
    <div className="inline-flex flex-col items-center gap-3" role="status" aria-live="polite">
      <div
        className={`${sizes[size]} rounded-full border-slate-200 border-t-civic-blue animate-spin`}
        aria-hidden="true"
      />
      {label && <span className="text-sm text-slate-500">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  )
}
