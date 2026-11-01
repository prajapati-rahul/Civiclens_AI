import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import NewAudit from './pages/NewAudit'
import AuditProgress from './pages/AuditProgress'
import AuditResults from './pages/AuditResults'
import FindingDetail from './pages/FindingDetail'
import JourneyComparison from './pages/JourneyComparison'
import AuditHistory from './pages/AuditHistory'
import Settings from './pages/Settings'
import DemoWorkspace from './pages/DemoWorkspace'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/audit/new" element={<NewAudit />} />
        <Route path="/audit/:id/progress" element={<AuditProgress />} />
        <Route path="/audit/:id/results" element={<AuditResults />} />
        <Route path="/audit/:id/findings/:findingId" element={<FindingDetail />} />
        <Route path="/audit/:id/journey" element={<JourneyComparison />} />
        <Route path="/history" element={<AuditHistory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/demo" element={<DemoWorkspace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
