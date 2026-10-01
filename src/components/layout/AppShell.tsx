import clsx from 'clsx'
import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Toaster } from '@/components/ui/Toaster'
import { CreateIssueModal } from '@/components/issue/CreateIssueModal'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useHotkeys, useSequenceHotkeys } from '@/hooks/useHotkeys'
import { usePresence } from '@/hooks/usePresence'
import { useLookups, useNotifications } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { useUI } from '@/lib/store'
import { runScheduledAutomations } from '@/lib/automations'
import { CommandPalette } from './CommandPalette'
import { ErrorBoundary } from './ErrorBoundary'
import { Header } from './Header'
import { ShortcutsModal } from './ShortcutsModal'
import { Sidebar } from './Sidebar'

const routeLabel = (path: string): string => {
  if (path === '/app') return 'Home'
  const seg = path.split('/')[2] ?? 'app'
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace('-', ' ')
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { sidebarOpen, mobileNavOpen, setMobileNav, setPalette, toggleSidebar } = useUI()
  const notifications = useNotifications(user?.id)
  const { userMap } = useLookups()
  const peers = usePresence(user, routeLabel(location.pathname))

  const [newIssue, setNewIssue] = useState(false)
  const [shortcuts, setShortcuts] = useState(false)

  useScrollLock(mobileNavOpen)

  // Time-based rules (stale work, due soon) get one sweep per session.
  useEffect(() => {
    const timer = window.setTimeout(() => { runScheduledAutomations() }, 2500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => { setMobileNav(false) }, [location.pathname, setMobileNav])

  useHotkeys([
    { combo: 'mod+k', handler: () => setPalette(true), allowInInput: true },
    { combo: 'mod+\\', handler: toggleSidebar, allowInInput: true },
    { combo: 'c', handler: () => setNewIssue(true) },
    { combo: '/', handler: () => setPalette(true) },
    { combo: '?', handler: () => setShortcuts(true) },
    { combo: 'shift+?', handler: () => setShortcuts(true) },
  ], [setPalette, toggleSidebar])

  useSequenceHotkeys({
    gh: () => navigate('/app'),
    gm: () => navigate('/app/my-work'),
    gi: () => navigate('/app/inbox'),
    gp: () => navigate('/app/projects'),
    gs: () => navigate('/app/spaces'),
    gc: () => navigate('/app/cycles'),
    ga: () => navigate('/app/activity'),
  }, [navigate])

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="flex min-h-[100dvh] bg-canvas lg:h-[100dvh]">
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden shrink-0 border-r border-line transition-[width] duration-200 lg:block',
          sidebarOpen ? 'w-[248px]' : 'w-0 overflow-hidden',
        )}
      >
        <div className="h-full w-[248px]">
          <Sidebar unreadCount={unread} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[95] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 animate-fade-in" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[290px] border-r border-line shadow-lift animate-slide-up">
            <button
              onClick={() => setMobileNav(false)}
              className="absolute right-2 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken"
              aria-label="Close navigation"
            >
              <Icon name="x" size={16} />
            </button>
            <Sidebar unreadCount={unread} onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          peers={peers}
          notifications={notifications}
          userMap={userMap}
          onNewIssue={() => setNewIssue(true)}
          onShortcuts={() => setShortcuts(true)}
        />

        <main className="flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<ShellFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette />
      <Toaster />
      <ShortcutsModal open={shortcuts} onClose={() => setShortcuts(false)} />
      <CreateIssueModal
        open={newIssue}
        onClose={() => setNewIssue(false)}
        onCreated={(id) => navigate(`/app/issues/${id}`)}
      />
    </div>
  )
}

function ShellFallback() {
  return (
    <div className="space-y-4 p-6">
      <div className="skeleton h-8 w-52" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="skeleton h-72" />
    </div>
  )
}
