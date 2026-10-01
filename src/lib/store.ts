import { create } from 'zustand'
import type { GroupBy, IssueFilter, SortBy, ViewLayout } from './types'

/* ── Theme & chrome ─────────────────────────────────────────── */

type Theme = 'light' | 'dark' | 'system'
type Density = 'comfortable' | 'compact'

const readTheme = (): Theme => (localStorage.getItem('orbit:theme') as Theme) ?? 'system'
const readDensity = (): Density => (localStorage.getItem('orbit:density') as Density) ?? 'comfortable'

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0b0c15' : '#ffffff')
}

interface UIState {
  theme: Theme
  density: Density
  sidebarOpen: boolean
  mobileNavOpen: boolean
  paletteOpen: boolean
  setTheme: (t: Theme) => void
  setDensity: (d: Density) => void
  toggleSidebar: () => void
  setMobileNav: (open: boolean) => void
  setPalette: (open: boolean) => void
}

export const useUI = create<UIState>((set) => ({
  theme: readTheme(),
  density: readDensity(),
  sidebarOpen: localStorage.getItem('orbit:sidebar') !== 'closed',
  mobileNavOpen: false,
  paletteOpen: false,
  setTheme: (theme) => {
    localStorage.setItem('orbit:theme', theme)
    applyTheme(theme)
    set({ theme })
  },
  setDensity: (density) => {
    localStorage.setItem('orbit:density', density)
    set({ density })
  },
  toggleSidebar: () => set((s) => {
    localStorage.setItem('orbit:sidebar', s.sidebarOpen ? 'closed' : 'open')
    return { sidebarOpen: !s.sidebarOpen }
  }),
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
}))

/* ── Toasts ─────────────────────────────────────────────────── */

export interface Toast {
  id: string
  message: string
  tone: 'default' | 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void
  dismiss: (id: string) => void
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'default', action) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, message, tone, action }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (m: string, action?: Toast['action']) => useToasts.getState().push(m, 'success', action),
  error: (m: string) => useToasts.getState().push(m, 'error'),
  info: (m: string, action?: Toast['action']) => useToasts.getState().push(m, 'info', action),
  show: (m: string) => useToasts.getState().push(m, 'default'),
}

/* ── Per-view working state (layout, filters, grouping) ─────── */

export interface ViewState {
  layout: ViewLayout
  groupBy: GroupBy
  sortBy: SortBy
  filter: IssueFilter
  showSubIssues: boolean
}

interface ViewStore {
  views: Record<string, ViewState>
  get: (key: string, fallback?: Partial<ViewState>) => ViewState
  set: (key: string, patch: Partial<ViewState>) => void
  reset: (key: string) => void
}

const DEFAULT_VIEW: ViewState = {
  layout: 'board',
  groupBy: 'state',
  sortBy: 'manual',
  filter: {},
  showSubIssues: true,
}

export const useViews = create<ViewStore>((set, get) => ({
  views: {},
  get: (key, fallback) => get().views[key] ?? { ...DEFAULT_VIEW, ...fallback },
  set: (key, patch) => set((s) => ({
    views: { ...s.views, [key]: { ...(s.views[key] ?? DEFAULT_VIEW), ...patch } },
  })),
  reset: (key) => set((s) => ({ views: { ...s.views, [key]: { ...DEFAULT_VIEW } } })),
}))

/* ── Recently visited (for the command palette) ─────────────── */

export interface RecentItem { id: string; label: string; sublabel: string; link: string; icon?: string }

interface RecentStore {
  items: RecentItem[]
  visit: (item: RecentItem) => void
}

export const useRecents = create<RecentStore>((set) => ({
  items: JSON.parse(localStorage.getItem('orbit:recents') ?? '[]'),
  visit: (item) => set((s) => {
    const items = [item, ...s.items.filter((i) => i.id !== item.id)].slice(0, 8)
    localStorage.setItem('orbit:recents', JSON.stringify(items))
    return { items }
  }),
}))
