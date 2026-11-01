import clsx from 'clsx'

interface Props {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  color?: 'blue' | 'green' | 'amber' | 'red' | 'slate'
  size?: 'sm' | 'md'
}

const colorClasses = {
  blue: 'bg-civic-blue',
  green: 'bg-civic-green',
  amber: 'bg-civic-amber',
  red: 'bg-civic-red',
  slate: 'bg-slate-400',
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'blue',
  size = 'md',
}: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
          {showValue && <span className="text-xs text-slate-500">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-slate-200 rounded-full overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2.5'
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={clsx('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
