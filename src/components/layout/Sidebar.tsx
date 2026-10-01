import clsx from 'clsx'
import { NavLink, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { MenuDivider, MenuItem, MenuLabel, Popover } from '@/components/ui/Popover'
import { Collapsible } from '@/components/ui/misc'
import { useAuth } from '@/lib/auth'
import { useUI } from '@/lib/store'
import { useProjects, useSavedViews, useSpaces, useTeams, useWorkspace } from '@/hooks/useData'
import { healthMeta, projectStatusMeta } from '@/lib/constants'

const MAIN: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/app', label: 'Home', icon: 'home', end: true },
  { to: '/app/my-work', label: 'My work', icon: 'user' },
  { to: '/app/inbox', label: 'Inbox', icon: 'inbox' },
  { to: '/app/issues', label: 'All issues', icon: 'list-todo' },
]

const PLAN: { to: string; label: string; icon: IconName }[] = [
  { to: '/app/projects', label: 'Projects', icon: 'folder-kanban' },
  { to: '/app/roadmap', label: 'Roadmap', icon: 'gantt' },
  { to: '/app/cycles', label: 'Cycles', icon: 'repeat' },
  { to: '/app/goals', label: 'Goals', icon: 'target' },
]

const KNOW: { to: string; label: string; icon: IconName }[] = [
  { to: '/app/spaces', label: 'Shared spaces', icon: 'boxes' },
  { to: '/app/docs', label: 'Docs', icon: 'file-text' },
]

const MONITOR: { to: string; label: string; icon: IconName }[] = [
  { to: '/app/insights', label: 'Insights', icon: 'bar-chart' },
  { to: '/app/workload', label: 'Workload', icon: 'gauge' },
  { to: '/app/activity', label: 'Activity', icon: 'activity' },
  { to: '/app/automations', label: 'Automations', icon: 'zap' },
]

function NavRow({ to, label, icon, end, badge, onNavigate }: {
  to: string; label: string; icon: IconName; end?: boolean; badge?: number; onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
    >
      <Icon name={icon} size={15} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? <span className="rounded bg-brand-600 px-1.5 text-2xs font-bold text-white">{badge}</span> : null}
    </NavLink>
  )
}

export function Sidebar({ unreadCount, onNavigate }: { unreadCount: number; onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const workspace = useWorkspace()
  const teams = useTeams()
  const projects = useProjects()
  const spaces = useSpaces()
  const savedViews = useSavedViews()
  const { setPalette } = useUI()

  const myProjects = projects.filter((p) => p.status !== 'completed' && p.status !== 'canceled').slice(0, 7)
  const mySpaces = spaces.filter((s) => !user || s.visibility === 'open' || s.memberIds.includes(user.id)).slice(0, 5)

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Workspace */}
      <div className="p-2.5">
        <Popover
          width={252}
          align="start"
          trigger={({ toggle, ref }) => (
            <button ref={ref as any} onClick={toggle} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-sunken">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-gradient text-base shadow-sm">
                {workspace?.logoEmoji ?? '🛰️'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-ink">{workspace?.name ?? 'Orbit'}</span>
                <span className="block truncate text-2xs capitalize text-faint">{workspace?.plan ?? 'free'} plan</span>
              </span>
              <Icon name="chevrons-up-down" size={14} className="shrink-0 text-faint" />
            </button>
          )}
        >
          {(close) => (
            <div className="py-1">
              <MenuLabel>Workspace</MenuLabel>
              <MenuItem icon={<Icon name="settings" size={14} />} onClick={() => { navigate('/app/settings'); close() }}>Settings</MenuItem>
              <MenuItem icon={<Icon name="users" size={14} />} onClick={() => { navigate('/app/people'); close() }}>Members</MenuItem>
              <MenuItem icon={<Icon name="keyboard" size={14} />} onClick={() => { setPalette(true); close() }}>Command palette</MenuItem>
              <MenuDivider />
              <MenuItem icon={<Icon name="logout" size={14} />} danger onClick={() => { logout(); close() }}>Sign out</MenuItem>
            </div>
          )}
        </Popover>
      </div>

      {/* Search trigger */}
      <div className="px-2.5 pb-2">
        <button
          onClick={() => setPalette(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-line bg-sunken/60 px-2.5 py-1.5 text-[13px] text-faint transition hover:border-faint/40 hover:text-muted"
        >
          <Icon name="search" size={14} />
          <span className="flex-1 text-left">Search…</span>
          <span className="rounded border border-line bg-surface px-1 text-2xs font-semibold">⌘K</span>
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
        <div className="space-y-0.5">
          {MAIN.map((item) => (
            <NavRow key={item.to} {...item} badge={item.to === '/app/inbox' ? unreadCount : undefined} onNavigate={onNavigate} />
          ))}
        </div>

        <div>
          <p className="px-2.5 pb-1 text-2xs font-bold uppercase tracking-wider text-faint">Plan</p>
          <div className="space-y-0.5">{PLAN.map((i) => <NavRow key={i.to} {...i} onNavigate={onNavigate} />)}</div>
        </div>

        <div>
          <p className="px-2.5 pb-1 text-2xs font-bold uppercase tracking-wider text-faint">Knowledge</p>
          <div className="space-y-0.5">{KNOW.map((i) => <NavRow key={i.to} {...i} onNavigate={onNavigate} />)}</div>
        </div>

        <div>
          <p className="px-2.5 pb-1 text-2xs font-bold uppercase tracking-wider text-faint">Monitor</p>
          <div className="space-y-0.5">{MONITOR.map((i) => <NavRow key={i.to} {...i} onNavigate={onNavigate} />)}</div>
        </div>

        {savedViews.length > 0 && (
          <Collapsible title="Saved views" defaultOpen={false} count={savedViews.length}>
            <div className="space-y-0.5 pt-0.5">
              {savedViews.map((v) => (
                <NavLink
                  key={v.id}
                  to={`/app/views/${v.id}`}
                  onClick={onNavigate}
                  className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
                >
                  <span className="w-[15px] shrink-0 text-center text-xs">{v.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{v.name}</span>
                  {v.shared && <Icon name="users" size={12} className="shrink-0 text-faint" />}
                </NavLink>
              ))}
            </div>
          </Collapsible>
        )}

        <Collapsible
          title="Teams"
          count={teams.length}
          action={
            <button onClick={() => navigate('/app/teams/new')} className="grid h-6 w-6 place-items-center rounded text-faint hover:bg-sunken hover:text-ink" aria-label="New team">
              <Icon name="plus" size={14} />
            </button>
          }
        >
          <div className="space-y-0.5 pt-0.5">
            {teams.map((t) => (
              <NavLink
                key={t.id}
                to={`/app/teams/${t.id}`}
                onClick={onNavigate}
                className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
              >
                <span className="w-[15px] shrink-0 text-center text-xs">{t.icon}</span>
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                <span className="shrink-0 font-mono text-2xs text-faint">{t.key}</span>
              </NavLink>
            ))}
          </div>
        </Collapsible>

        <Collapsible
          title="Projects"
          count={projects.length}
          action={
            <button onClick={() => navigate('/app/projects/new')} className="grid h-6 w-6 place-items-center rounded text-faint hover:bg-sunken hover:text-ink" aria-label="New project">
              <Icon name="plus" size={14} />
            </button>
          }
        >
          <div className="space-y-0.5 pt-0.5">
            {myProjects.map((p) => (
              <NavLink
                key={p.id}
                to={`/app/projects/${p.id}`}
                onClick={onNavigate}
                className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
                title={`${p.name} · ${projectStatusMeta(p.status).label}`}
              >
                <span className="w-[15px] shrink-0 text-center text-xs">{p.icon}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: healthMeta(p.health).dot }} />
              </NavLink>
            ))}
            {projects.length > myProjects.length && (
              <NavLink to="/app/projects" onClick={onNavigate} className="nav-item text-faint">
                <span className="w-[15px] shrink-0 text-center"><Icon name="more-horizontal" size={14} /></span>
                <span>All projects</span>
              </NavLink>
            )}
          </div>
        </Collapsible>

        {mySpaces.length > 0 && (
          <Collapsible title="Spaces" defaultOpen={false} count={mySpaces.length}>
            <div className="space-y-0.5 pt-0.5">
              {mySpaces.map((s) => (
                <NavLink
                  key={s.id}
                  to={`/app/spaces/${s.id}`}
                  onClick={onNavigate}
                  className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
                >
                  <span className="w-[15px] shrink-0 text-center text-xs">{s.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.visibility !== 'open' && <Icon name="lock" size={11} className="shrink-0 text-faint" />}
                </NavLink>
              ))}
            </div>
          </Collapsible>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-line p-2.5">
        <Popover
          width={240}
          align="start"
          side="top"
          trigger={({ toggle, ref }) => (
            <button ref={ref as any} onClick={toggle} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-sunken">
              <Avatar user={user} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{user?.name}</span>
                <span className="block truncate text-2xs text-faint">{user?.title}</span>
              </span>
              <Icon name="chevrons-up-down" size={14} className="shrink-0 text-faint" />
            </button>
          )}
        >
          {(close) => (
            <div className="py-1">
              <MenuItem icon={<Icon name="user" size={14} />} onClick={() => { navigate(`/app/people/${user?.id}`); close() }}>Your profile</MenuItem>
              <MenuItem icon={<Icon name="settings" size={14} />} onClick={() => { navigate('/app/settings'); close() }}>Preferences</MenuItem>
              <MenuItem icon={<Icon name="repeat" size={14} />} onClick={() => { navigate('/switch'); close() }}>Switch user</MenuItem>
              <MenuDivider />
              <MenuItem icon={<Icon name="logout" size={14} />} danger onClick={() => { logout(); close() }}>Sign out</MenuItem>
            </div>
          )}
        </Popover>
      </div>
    </div>
  )
}
