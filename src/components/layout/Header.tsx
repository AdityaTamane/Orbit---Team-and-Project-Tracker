import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { MenuDivider, MenuItem, MenuLabel, Popover } from '@/components/ui/Popover'
import { Tooltip } from '@/components/ui/misc'
import { useUI } from '@/lib/store'
import type { Notification, Presence, User } from '@/lib/types'
import { NotificationBell } from './NotificationPanel'

export function Header({ user, peers, notifications, userMap, onNewIssue, onShortcuts }: {
  user: User | null
  peers: Presence[]
  notifications: Notification[]
  userMap: Map<string, User>
  onNewIssue: () => void
  onShortcuts: () => void
}) {
  const navigate = useNavigate()
  const { setMobileNav, setPalette, theme, setTheme, toggleSidebar } = useUI()

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line glass px-3 sm:px-4">
      <button
        onClick={() => setMobileNav(true)}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Icon name="menu" size={18} />
      </button>
      <button
        onClick={toggleSidebar}
        className="hidden h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink lg:grid"
        aria-label="Toggle sidebar"
      >
        <Icon name="layers" size={17} />
      </button>

      <button
        onClick={() => setPalette(true)}
        className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-sunken/50 px-2.5 text-[13px] text-faint transition hover:text-muted sm:max-w-xs lg:hidden"
      >
        <Icon name="search" size={14} />
        <span>Search…</span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {peers.length > 0 && (
          <div className="mr-1 hidden items-center gap-1 sm:flex">
            <div className="flex -space-x-1.5">
              {peers.slice(0, 3).map((p) => (
                <Tooltip key={p.userId} label={`${p.name} · ${p.label}`}>
                  <span className="relative">
                    <Avatar name={p.name} color={p.color} size="sm" ring />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-surface" />
                  </span>
                </Tooltip>
              ))}
            </div>
            {peers.length > 3 && <span className="text-2xs font-semibold text-faint">+{peers.length - 3}</span>}
          </div>
        )}

        <Button variant="primary" size="sm" icon="plus" onClick={onNewIssue} className="hidden sm:inline-flex">New issue</Button>
        <Button variant="primary" size="sm" icon="plus" onClick={onNewIssue} className="sm:hidden" aria-label="New issue" />

        {user && <NotificationBell notifications={notifications} userMap={userMap} userId={user.id} />}

        <Popover
          width={220}
          trigger={({ toggle, ref }) => (
            <button ref={ref as any} onClick={toggle} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink" aria-label="Settings and help">
              <Icon name="more-vertical" size={17} />
            </button>
          )}
        >
          {(close) => (
            <div className="py-1">
              <MenuLabel>Appearance</MenuLabel>
              <MenuItem icon={<Icon name="sun" size={14} />} active={theme === 'light'} onClick={() => { setTheme('light'); close() }}>Light</MenuItem>
              <MenuItem icon={<Icon name="moon" size={14} />} active={theme === 'dark'} onClick={() => { setTheme('dark'); close() }}>Dark</MenuItem>
              <MenuItem icon={<Icon name="laptop" size={14} />} active={theme === 'system'} onClick={() => { setTheme('system'); close() }}>System</MenuItem>
              <MenuDivider />
              <MenuItem icon={<Icon name="keyboard" size={14} />} onClick={() => { onShortcuts(); close() }}>Keyboard shortcuts</MenuItem>
              <MenuItem icon={<Icon name="command" size={14} />} onClick={() => { setPalette(true); close() }}>Command palette</MenuItem>
              <MenuItem icon={<Icon name="settings" size={14} />} onClick={() => { navigate('/app/settings'); close() }}>Workspace settings</MenuItem>
            </div>
          )}
        </Popover>
      </div>
    </header>
  )
}
