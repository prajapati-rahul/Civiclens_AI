import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Plus,
  History,
  Settings,
  FlaskConical,
  Menu,
  X,
  ChevronRight,
  Microscope,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/audit/new', icon: Plus, label: 'New Audit' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/demo', icon: FlaskConical, label: 'Demo' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-60 bg-navy-900 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-navy-700">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-civic-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <Microscope className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
            </div>
            <div>
              <span className="text-white font-bold text-sm leading-none block">CivicLens</span>
              <span className="text-navy-300 text-[10px] font-medium tracking-wide">AI Audit</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center text-navy-400 hover:text-white rounded"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1" aria-label="Main navigation">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-navy-700 text-white'
                    : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-civic-sky' : 'text-navy-400 group-hover:text-navy-200')} />
                  {label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-navy-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom footer */}
        <div className="px-4 py-4 border-t border-navy-800">
          <p className="text-[10px] text-navy-500 leading-relaxed">
            CivicLens AI v1.0<br />
            <span className="text-navy-600">For government digital services</span>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Breadcrumb />
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/demo"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors border border-violet-200"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              View Demo
            </Link>
            <Link
              to="/audit/new"
              className="btn-primary text-sm py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              New Audit
            </Link>
          </div>
        </header>

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Breadcrumb() {
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)

  const crumbMap: Record<string, string> = {
    dashboard: 'Dashboard',
    audit: 'Audit',
    new: 'New Audit',
    progress: 'Progress',
    results: 'Results',
    findings: 'Finding',
    journey: 'Journey',
    history: 'History',
    settings: 'Settings',
    demo: 'Demo',
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm">
        {pathParts.map((part, idx) => {
          const isId = part.match(/^[0-9a-f-]{8,}$/) || part === 'demo-001'
          if (isId) return null
          const label = crumbMap[part] ?? part
          const isLast = idx === pathParts.length - 1 || pathParts[idx + 1]?.match(/^[0-9a-f-]{8,}$/)

          return (
            <li key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
              <span className={isLast ? 'font-medium text-slate-700' : 'text-slate-400'}>
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
