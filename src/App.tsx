import { Suspense, lazy, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Icon } from '@/components/ui/Icon'
import { AuthProvider, useAuth } from '@/lib/auth'
import { seedDatabase } from '@/lib/seed'

/** React.lazy expects a default export; our pages are named. */
const named = <T extends Record<string, any>>(loader: () => Promise<T>, key: keyof T) =>
  lazy(async () => ({ default: (await loader())[key] }))

const Login = named(() => import('@/pages/auth/Login'), 'Login')
const SwitchUser = named(() => import('@/pages/auth/SwitchUser'), 'SwitchUser')

const Home = named(() => import('@/pages/app/Home'), 'Home')
const MyWork = named(() => import('@/pages/app/MyWork'), 'MyWork')
const Inbox = named(() => import('@/pages/app/Inbox'), 'Inbox')
const AllIssues = named(() => import('@/pages/app/AllIssues'), 'AllIssues')
const IssueDetail = named(() => import('@/pages/app/IssueDetail'), 'IssueDetail')
const Projects = named(() => import('@/pages/app/Projects'), 'Projects')
const ProjectWizard = named(() => import('@/pages/app/ProjectWizard'), 'ProjectWizard')
const ProjectDetail = named(() => import('@/pages/app/ProjectDetail'), 'ProjectDetail')
const Roadmap = named(() => import('@/pages/app/Roadmap'), 'Roadmap')
const Cycles = named(() => import('@/pages/app/Cycles'), 'Cycles')
const CycleDetail = named(() => import('@/pages/app/CycleDetail'), 'CycleDetail')
const Goals = named(() => import('@/pages/app/Goals'), 'Goals')
const Spaces = named(() => import('@/pages/app/Spaces'), 'Spaces')
const SpaceDetail = named(() => import('@/pages/app/SpaceDetail'), 'SpaceDetail')
const Docs = named(() => import('@/pages/app/Docs'), 'Docs')
const DocDetail = named(() => import('@/pages/app/DocDetail'), 'DocDetail')
const Teams = named(() => import('@/pages/app/Teams'), 'Teams')
const TeamWizard = named(() => import('@/pages/app/TeamWizard'), 'TeamWizard')
const TeamDetail = named(() => import('@/pages/app/TeamDetail'), 'TeamDetail')
const Insights = named(() => import('@/pages/app/Insights'), 'Insights')
const Workload = named(() => import('@/pages/app/Workload'), 'Workload')
const ActivityPage = named(() => import('@/pages/app/ActivityPage'), 'ActivityPage')
const Automations = named(() => import('@/pages/app/Automations'), 'Automations')
const People = named(() => import('@/pages/app/People'), 'People')
const PersonDetail = named(() => import('@/pages/app/PersonDetail'), 'PersonDetail')
const Settings = named(() => import('@/pages/app/Settings'), 'Settings')
const SavedViewPage = named(() => import('@/pages/app/SavedViewPage'), 'SavedViewPage')
const NotFound = named(() => import('@/pages/app/NotFound'), 'NotFound')

function Booting({ message }: { message: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-2xl shadow-glow animate-pulse-ring">🛰️</div>
        <p className="text-sm font-medium text-muted">{message}</p>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Booting message="Restoring your session…" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

function Shell() {
  const [seeded, setSeeded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    seedDatabase()
      .then(() => setSeeded(true))
      .catch((e) => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div className="grid min-h-[100dvh] place-items-center p-6 text-center">
        <div>
          <Icon name="alert-triangle" size={28} className="mx-auto mb-3 text-rose-500" />
          <p className="text-sm font-semibold text-ink">Could not open the local database</p>
          <p className="mt-1 max-w-sm text-sm text-muted">{error}</p>
        </div>
      </div>
    )
  }
  if (!seeded) return <Booting message="Preparing your workspace…" />

  return (
    <Suspense fallback={<Booting message="Loading…" />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/switch" element={<SwitchUser />} />
      <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="my-work" element={<MyWork />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="issues" element={<AllIssues />} />
        <Route path="issues/:id" element={<IssueDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<ProjectWizard />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="cycles" element={<Cycles />} />
        <Route path="cycles/:id" element={<CycleDetail />} />
        <Route path="goals" element={<Goals />} />
        <Route path="spaces" element={<Spaces />} />
        <Route path="spaces/:id" element={<SpaceDetail />} />
        <Route path="docs" element={<Docs />} />
        <Route path="docs/:id" element={<DocDetail />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/new" element={<TeamWizard />} />
        <Route path="teams/:id" element={<TeamDetail />} />
        <Route path="insights" element={<Insights />} />
        <Route path="workload" element={<Workload />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="automations" element={<Automations />} />
        <Route path="people" element={<People />} />
        <Route path="people/:id" element={<PersonDetail />} />
        <Route path="views/:id" element={<SavedViewPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
    </Suspense>
  )
}

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </HashRouter>
  )
}
