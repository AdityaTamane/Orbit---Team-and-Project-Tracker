import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { Kbd } from '@/components/ui/Badge'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useDocs, useIssues, useLookups, useSpaces } from '@/hooks/useData'
import { searchAll } from '@/lib/search'
import type { SearchHit } from '@/lib/search'
import { useRecents, useUI } from '@/lib/store'

interface Command {
  id: string
  label: string
  hint?: string
  icon: IconName
  group: string
  run: () => void
  shortcut?: string
}

const KIND_ICON: Record<SearchHit['kind'], IconName> = {
  issue: 'check-square', project: 'folder-kanban', doc: 'file-text',
  user: 'user', team: 'users', space: 'boxes',
}

export function CommandPalette() {
  const navigate = useNavigate()
  const { paletteOpen, setPalette, theme, setTheme } = useUI()
  const { users, teams, projects } = useLookups()
  const issues = useIssues()
  const docs = useDocs()
  const spaces = useSpaces()
  const recents = useRecents()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  useScrollLock(paletteOpen)

  useEffect(() => {
    if (paletteOpen) { setQuery(''); setActive(0) }
  }, [paletteOpen])

  const commands = useMemo<Command[]>(() => [
    { id: 'new-issue', label: 'New issue', icon: 'plus', group: 'Create', shortcut: 'C', run: () => navigate('/app/issues?new=1') },
    { id: 'new-project', label: 'New project', hint: 'Run the onboarding wizard', icon: 'folder-kanban', group: 'Create', run: () => navigate('/app/projects/new') },
    { id: 'new-team', label: 'New team', icon: 'users', group: 'Create', run: () => navigate('/app/teams/new') },
    { id: 'new-doc', label: 'New doc', icon: 'file-text', group: 'Create', run: () => navigate('/app/docs?new=1') },
    { id: 'go-home', label: 'Go to Home', icon: 'home', group: 'Navigate', run: () => navigate('/app') },
    { id: 'go-my-work', label: 'Go to My work', icon: 'user', group: 'Navigate', shortcut: 'G then M', run: () => navigate('/app/my-work') },
    { id: 'go-inbox', label: 'Go to Inbox', icon: 'inbox', group: 'Navigate', shortcut: 'G then I', run: () => navigate('/app/inbox') },
    { id: 'go-projects', label: 'Go to Projects', icon: 'folder-kanban', group: 'Navigate', shortcut: 'G then P', run: () => navigate('/app/projects') },
    { id: 'go-roadmap', label: 'Go to Roadmap', icon: 'gantt', group: 'Navigate', run: () => navigate('/app/roadmap') },
    { id: 'go-cycles', label: 'Go to Cycles', icon: 'repeat', group: 'Navigate', run: () => navigate('/app/cycles') },
    { id: 'go-goals', label: 'Go to Goals', icon: 'target', group: 'Navigate', run: () => navigate('/app/goals') },
    { id: 'go-spaces', label: 'Go to Shared spaces', icon: 'boxes', group: 'Navigate', shortcut: 'G then S', run: () => navigate('/app/spaces') },
    { id: 'go-insights', label: 'Go to Insights', icon: 'bar-chart', group: 'Navigate', run: () => navigate('/app/insights') },
    { id: 'go-workload', label: 'Go to Workload', icon: 'gauge', group: 'Navigate', run: () => navigate('/app/workload') },
    { id: 'go-automations', label: 'Go to Automations', icon: 'zap', group: 'Navigate', run: () => navigate('/app/automations') },
    { id: 'go-activity', label: 'Go to Activity', icon: 'activity', group: 'Navigate', run: () => navigate('/app/activity') },
    { id: 'go-people', label: 'Go to People', icon: 'users', group: 'Navigate', run: () => navigate('/app/people') },
    { id: 'go-settings', label: 'Go to Settings', icon: 'settings', group: 'Navigate', run: () => navigate('/app/settings') },
    { id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, icon: theme === 'dark' ? 'sun' : 'moon', group: 'Preferences', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    { id: 'switch-user', label: 'Switch user', hint: 'See the app as a teammate', icon: 'repeat', group: 'Preferences', run: () => navigate('/switch') },
  ], [navigate, theme, setTheme])

  const hits = useMemo(
    () => (query.trim() ? searchAll(query, { issues, projects, docs, users, teams, spaces }, 18) : []),
    [query, issues, projects, docs, users, teams, spaces],
  )

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
  }, [commands, query])

  type Row = { key: string; group: string; render: () => React.ReactNode; run: () => void }

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []

    if (!query.trim() && recents.items.length) {
      for (const r of recents.items) {
        out.push({
          key: `recent-${r.id}`, group: 'Recent',
          run: () => navigate(r.link),
          render: () => (
            <>
              <span className="w-4 shrink-0 text-center">{r.icon ?? <Icon name="history" size={15} />}</span>
              <span className="min-w-0 flex-1 truncate">{r.label}</span>
              <span className="shrink-0 text-2xs text-faint">{r.sublabel}</span>
            </>
          ),
        })
      }
    }

    for (const c of filteredCommands) {
      out.push({
        key: c.id, group: c.group, run: c.run,
        render: () => (
          <>
            <Icon name={c.icon} size={15} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate">{c.label}</span>
            {c.hint && <span className="hidden shrink-0 text-2xs text-faint sm:block">{c.hint}</span>}
            {c.shortcut && <Kbd>{c.shortcut}</Kbd>}
          </>
        ),
      })
    }

    for (const h of hits) {
      out.push({
        key: `hit-${h.kind}-${h.id}`, group: 'Results', run: () => navigate(h.link),
        render: () => (
          <>
            {h.kind === 'user'
              ? <Avatar name={h.title} color={h.color} size="xs" />
              : h.icon
                ? <span className="w-4 shrink-0 text-center text-sm">{h.icon}</span>
                : <Icon name={KIND_ICON[h.kind]} size={15} className="shrink-0 text-muted" />}
            <span className="min-w-0 flex-1 truncate">{h.title}</span>
            <span className="shrink-0 text-2xs uppercase tracking-wide text-faint">{h.subtitle}</span>
          </>
        ),
      })
    }
    return out
  }, [query, filteredCommands, hits, recents.items, navigate])

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    if (!paletteOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPalette(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(rows.length - 1, a + 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const row = rows[active]
        if (row) { row.run(); setPalette(false) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paletteOpen, rows, active, setPalette])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!paletteOpen) return null

  let lastGroup = ''

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[10vh]">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in" onClick={() => setPalette(false)} />
      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-raised shadow-lift animate-scale-in">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Icon name="search" size={17} className="shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search issues, projects, docs, people — or run a command…"
            className="w-full border-0 bg-transparent py-3.5 text-base text-ink placeholder:text-faint focus:outline-none sm:text-sm"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[54vh] overflow-y-auto py-1.5">
          {!rows.length && (
            <p className="px-4 py-8 text-center text-sm text-faint">No matches for “{query}”.</p>
          )}
          {rows.map((row, i) => {
            const showGroup = row.group !== lastGroup
            lastGroup = row.group
            return (
              <div key={row.key}>
                {showGroup && <p className="px-4 pb-1 pt-2.5 text-2xs font-bold uppercase tracking-wider text-faint">{row.group}</p>}
                <button
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { row.run(); setPalette(false) }}
                  className={clsx(
                    'flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition',
                    i === active ? 'bg-brand-500/12 text-ink' : 'text-muted hover:bg-sunken',
                  )}
                >
                  {row.render()}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-sunken/60 px-4 py-2 text-2xs text-faint">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>?</Kbd> shortcuts</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
