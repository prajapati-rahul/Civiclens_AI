import { format, formatDistanceToNow } from 'date-fns'
import type { FindingSeverity, FindingCategory } from '../types'

export function formatDate(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy HH:mm')
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function severityColor(severity: FindingSeverity): string {
  const map: Record<FindingSeverity, string> = {
    critical: 'text-red-700 bg-red-100',
    high: 'text-orange-700 bg-orange-100',
    medium: 'text-amber-700 bg-amber-100',
    low: 'text-blue-700 bg-blue-100',
    info: 'text-slate-600 bg-slate-100',
  }
  return map[severity]
}

export function severityDot(severity: FindingSeverity): string {
  const map: Record<FindingSeverity, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
    info: 'bg-slate-400',
  }
  return map[severity]
}

export function categoryLabel(category: FindingCategory): string {
  const map: Record<FindingCategory, string> = {
    accessibility: 'Accessibility',
    navigation: 'Navigation',
    content_clarity: 'Content Clarity',
    form_usability: 'Form Usability',
    information_architecture: 'Information Architecture',
    mobile_usability: 'Mobile Usability',
  }
  return map[category]
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

export function scoreRingColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#d97706'
  return '#dc2626'
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '…'
}
