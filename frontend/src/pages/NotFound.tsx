import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-civic-blue flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-navy-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
        The audit page or resource you requested does not exist or has been relocated.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to="/dashboard" className="btn-primary text-sm py-2 px-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <Link to="/demo" className="btn-secondary text-sm py-2 px-4">
          Open Demo Workspace
        </Link>
      </div>
    </div>
  )
}
