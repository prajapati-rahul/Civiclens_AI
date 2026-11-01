import clsx from 'clsx'
import type { FindingSeverity } from '../types'

interface Props {
  severity: FindingSeverity
  size?: 'sm' | 'md'
}

const labels: Record<FindingSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

const classes: Record<FindingSeverity, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  info: 'badge-info',
}

export default function SeverityBadge({ severity, size = 'md' }: Props) {
  return (
    <span
      className={clsx(classes[severity], size === 'sm' && 'text-[10px] px-1.5 py-0')}
      aria-label={`Severity: ${labels[severity]}`}
    >
      <span className={clsx(
        'inline-block rounded-full',
        size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        {
          'bg-red-500': severity === 'critical',
          'bg-orange-500': severity === 'high',
          'bg-amber-500': severity === 'medium',
          'bg-blue-500': severity === 'low',
          'bg-slate-400': severity === 'info',
        }
      )} />
      {labels[severity]}
    </span>
  )
}
