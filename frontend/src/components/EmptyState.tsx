import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  heading: string
  description: string
  action?: ReactNode
}

export default function EmptyState({ icon, heading, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">{heading}</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-5">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
