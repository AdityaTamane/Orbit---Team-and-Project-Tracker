import type { Health, IssueType, Priority, ProjectStatus, StateCategory } from './types'

export const PRIORITIES: { value: Priority; label: string; short: string; color: string; icon: string }[] = [
  { value: 0, label: 'No priority', short: 'None', color: 'text-faint', icon: 'minus' },
  { value: 1, label: 'Low', short: 'Low', color: 'text-sky-500', icon: 'signal-low' },
  { value: 2, label: 'Medium', short: 'Med', color: 'text-amber-500', icon: 'signal-medium' },
  { value: 3, label: 'High', short: 'High', color: 'text-orange-500', icon: 'signal-high' },
  { value: 4, label: 'Urgent', short: 'Urgent', color: 'text-rose-500', icon: 'flame' },
]

export const priorityMeta = (p: Priority) => PRIORITIES[p] ?? PRIORITIES[0]

export const ISSUE_TYPES: { value: IssueType; label: string; color: string; ring: string }[] = [
  { value: 'epic', label: 'Epic', color: 'text-violet-500', ring: 'bg-violet-500/12 text-violet-600 dark:text-violet-300' },
  { value: 'story', label: 'Story', color: 'text-emerald-500', ring: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' },
  { value: 'task', label: 'Task', color: 'text-sky-500', ring: 'bg-sky-500/12 text-sky-600 dark:text-sky-300' },
  { value: 'bug', label: 'Bug', color: 'text-rose-500', ring: 'bg-rose-500/12 text-rose-600 dark:text-rose-300' },
  { value: 'spike', label: 'Spike', color: 'text-amber-500', ring: 'bg-amber-500/12 text-amber-600 dark:text-amber-300' },
  { value: 'chore', label: 'Chore', color: 'text-slate-500', ring: 'bg-slate-500/12 text-slate-600 dark:text-slate-300' },
]

export const typeMeta = (t: IssueType) => ISSUE_TYPES.find((x) => x.value === t) ?? ISSUE_TYPES[2]

export const STATE_CATEGORIES: { value: StateCategory; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: '#8e96ad' },
  { value: 'unstarted', label: 'Todo', color: '#6366f1' },
  { value: 'started', label: 'In progress', color: '#f59e0b' },
  { value: 'paused', label: 'Blocked', color: '#f43f5e' },
  { value: 'completed', label: 'Done', color: '#10b981' },
  { value: 'canceled', label: 'Canceled', color: '#94a3b8' },
]

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string; dot: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-slate-500/12 text-slate-600 dark:text-slate-300', dot: '#94a3b8' },
  { value: 'planned', label: 'Planned', color: 'bg-sky-500/12 text-sky-600 dark:text-sky-300', dot: '#0ea5e9' },
  { value: 'in_progress', label: 'In progress', color: 'bg-amber-500/12 text-amber-600 dark:text-amber-300', dot: '#f59e0b' },
  { value: 'paused', label: 'Paused', color: 'bg-orange-500/12 text-orange-600 dark:text-orange-300', dot: '#fb923c' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300', dot: '#10b981' },
  { value: 'canceled', label: 'Canceled', color: 'bg-rose-500/12 text-rose-600 dark:text-rose-300', dot: '#f43f5e' },
]

export const projectStatusMeta = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.value === s) ?? PROJECT_STATUSES[0]

export const HEALTH: { value: Health; label: string; color: string; dot: string }[] = [
  { value: 'on_track', label: 'On track', color: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300', dot: '#10b981' },
  { value: 'at_risk', label: 'At risk', color: 'bg-amber-500/12 text-amber-600 dark:text-amber-300', dot: '#f59e0b' },
  { value: 'off_track', label: 'Off track', color: 'bg-rose-500/12 text-rose-600 dark:text-rose-300', dot: '#f43f5e' },
  { value: 'unknown', label: 'No update', color: 'bg-slate-500/12 text-slate-600 dark:text-slate-300', dot: '#94a3b8' },
]

export const healthMeta = (h: Health) => HEALTH.find((x) => x.value === h) ?? HEALTH[3]

export const ESTIMATE_SCALE = [0, 1, 2, 3, 5, 8, 13, 21]

export const AVATAR_COLORS = [
  '#6c62f2', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#14b8a6', '#ec4899', '#f97316', '#22c55e', '#3b82f6', '#a855f7',
]

export const SPACE_COLORS = AVATAR_COLORS

export const EMOJI_REACTIONS = ['👍', '🎉', '👀', '🚀', '❤️', '😄', '🤔', '✅']

export const TEAM_ICONS = ['🛠️', '🎨', '📈', '🧪', '🤝', '⚙️', '🔬', '📣', '🛡️', '💡']
export const PROJECT_ICONS = ['🚀', '📦', '🧭', '🔐', '📊', '🌍', '⚡', '🧩', '🎯', '🏗️', '🔔', '💳']
export const DOC_ICONS = ['📄', '📐', '🗒️', '⚖️', '📕', '🔁', '🧾', '📌']
