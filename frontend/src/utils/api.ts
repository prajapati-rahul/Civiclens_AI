import axios from 'axios'
import type { Audit, AuditListItem, AuditRequest } from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const auditsApi = {
  list: () => api.get<AuditListItem[]>('/audits'),
  get: (id: string) => api.get<Audit>(`/audits/${id}`),
  create: (data: AuditRequest) => api.post<{ id: string }>('/audits', data),
  delete: (id: string) => api.delete(`/audits/${id}`),
  clearAll: () => api.post('/audits/clear'),
  status: (id: string) => api.get<{ status: string; progress?: number; message?: string }>(`/audits/${id}/status`),
  report: (id: string) => api.get(`/audits/${id}/report`),
}

export const demoApi = {
  get: () => api.get<Audit>('/demo'),
  reset: () => api.post('/demo/reset'),
}
