import axios from 'axios'
import type { Audit, AuditListItem, AuditRequest } from '../types'

// Production builds call the Render backend (override with VITE_API_URL); dev uses Vite's /api proxy
const API_ORIGIN: string = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? 'https://civiclens-ai-6shb.onrender.com' : '')

const api = axios.create({
  baseURL: `${API_ORIGIN.replace(/\/$/, '')}/api`,
  timeout: 70000, // a sleeping free Render instance takes ~50s to wake on the first call
})

export const auditsApi = {
  list: () => api.get<AuditListItem[]>('/audits'),
  get: (id: string) => api.get<Audit>(`/audits/${id}`),
  create: (data: AuditRequest) => api.post<{ id: string }>('/audits', data),
  delete: (id: string) => api.delete(`/audits/${id}`),
  clearAll: () => api.post('/audits/clear'),
  status: (id: string) => api.get<{ status: string; error_message?: string }>(`/audits/${id}/status`),
  report: (id: string) => api.get(`/audits/${id}/report`),
}

export const demoApi = {
  get: () => api.get<Audit>('/demo'),
  reset: () => api.post('/demo/reset'),
}
