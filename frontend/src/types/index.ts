export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed'
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type FindingCategory = 'accessibility' | 'navigation' | 'content_clarity' | 'form_usability' | 'information_architecture' | 'mobile_usability'
export type DetectionType = 'automated' | 'ai_suggested' | 'rule_based'
export type AuditScope = 'homepage' | 'full_site' | 'specific_path'

export interface Finding {
  id: string
  audit_id: string
  title: string
  category: FindingCategory
  severity: FindingSeverity
  page_url: string
  evidence: string
  rationale: string
  fix: string
  confidence: number
  detection_type: DetectionType
  selector?: string
}

export interface AuditMetadata {
  audit_id: string
  summary: string
  overall_score: number
  pages_inspected: number
  checks_run: number
  ai_mode: 'ai_enhanced' | 'deterministic'
}

export interface Audit {
  id: string
  url: string
  task: string
  scope: AuditScope
  description?: string
  status: AuditStatus
  created_at: string
  completed_at?: string
  error_message?: string
  metadata?: AuditMetadata
  findings: Finding[]
}

export interface AuditListItem {
  id: string
  url: string
  task: string
  status: AuditStatus
  created_at: string
  completed_at?: string
  findings_count: number
  critical_count: number
  overall_score?: number
}

export interface AuditRequest {
  url: string
  task: string
  scope: AuditScope
  description?: string
}

export interface JourneyStep {
  step: number
  title: string
  description: string
  issues?: string[]
  timeEstimate?: string
}

export interface RedesignedStep {
  step: number
  title: string
  description: string
  documents?: string[]
  hint?: string
  isKeyAction?: boolean
}
