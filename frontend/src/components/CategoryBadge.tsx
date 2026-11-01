import clsx from 'clsx'
import type { FindingCategory } from '../types'
import { categoryLabel } from '../utils/helpers'

interface Props {
  category: FindingCategory
  size?: 'sm' | 'md'
}

const categoryClasses: Record<FindingCategory, string> = {
  accessibility: 'bg-purple-100 text-purple-700',
  navigation: 'bg-sky-100 text-sky-700',
  content_clarity: 'bg-teal-100 text-teal-700',
  form_usability: 'bg-indigo-100 text-indigo-700',
  information_architecture: 'bg-pink-100 text-pink-700',
  mobile_usability: 'bg-emerald-100 text-emerald-700',
}

export default function CategoryBadge({ category, size = 'md' }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        categoryClasses[category],
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
      )}
    >
      {categoryLabel(category)}
    </span>
  )
}
