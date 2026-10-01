import { differenceInCalendarDays, eachWeekOfInterval, endOfWeek, format, isWithinInterval, startOfDay, subDays } from 'date-fns'
import type { Cycle, Issue, Project, TimeLog, User, WorkflowState } from './types'

const cat = (issue: Issue, states: Map<string, WorkflowState>) => states.get(issue.stateId)?.category

export const isClosed = (issue: Issue, states: Map<string, WorkflowState>): boolean =>
  ['completed', 'canceled'].includes(cat(issue, states) ?? '')

/* ── Flow: created vs completed per week ────────────────────── */

export interface FlowPoint { week: string; created: number; completed: number; net: number }

export function weeklyFlow(issues: Issue[], states: Map<string, WorkflowState>, weeks = 10): FlowPoint[] {
  const end = new Date()
  const start = subDays(end, weeks * 7)
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const range = { start: weekStart, end: weekEnd }
    const created = issues.filter((i) => isWithinInterval(new Date(i.createdAt), range)).length
    const completed = issues.filter(
      (i) => i.completedAt && cat(i, states) === 'completed' && isWithinInterval(new Date(i.completedAt), range),
    ).length
    return { week: format(weekStart, 'MMM d'), created, completed, net: created - completed }
  })
}

/* ── Cycle time ─────────────────────────────────────────────── */

export interface CycleTimeStats {
  median: number
  p85: number
  average: number
  sample: number
  buckets: { range: string; count: number }[]
  trend: { week: string; median: number }[]
}

export function cycleTime(issues: Issue[], states: Map<string, WorkflowState>): CycleTimeStats {
  const completed = issues.filter((i) => cat(i, states) === 'completed' && i.completedAt)
  const durations = completed
    .map((i) => differenceInCalendarDays(new Date(i.completedAt!), new Date(i.startedAt ?? i.createdAt)))
    .map((d) => Math.max(0, d))
    .sort((a, b) => a - b)

  const at = (p: number) => (durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] : 0)
  const bucketDefs: [string, (d: number) => boolean][] = [
    ['0–1d', (d) => d <= 1],
    ['2–3d', (d) => d >= 2 && d <= 3],
    ['4–7d', (d) => d >= 4 && d <= 7],
    ['1–2w', (d) => d >= 8 && d <= 14],
    ['2w+', (d) => d > 14],
  ]

  const weeks = eachWeekOfInterval({ start: subDays(new Date(), 8 * 7), end: new Date() }, { weekStartsOn: 1 })
  const trend = weeks.map((weekStart) => {
    const range = { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }
    const inWeek = completed
      .filter((i) => isWithinInterval(new Date(i.completedAt!), range))
      .map((i) => Math.max(0, differenceInCalendarDays(new Date(i.completedAt!), new Date(i.startedAt ?? i.createdAt))))
      .sort((a, b) => a - b)
    return { week: format(weekStart, 'MMM d'), median: inWeek.length ? inWeek[Math.floor(inWeek.length / 2)] : 0 }
  })

  return {
    median: at(0.5),
    p85: at(0.85),
    average: durations.length ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10 : 0,
    sample: durations.length,
    buckets: bucketDefs.map(([range, test]) => ({ range, count: durations.filter(test).length })),
    trend,
  }
}

/* ── Workload ───────────────────────────────────────────────── */

export interface WorkloadRow {
  user: User
  open: number
  inProgress: number
  points: number
  overdue: number
  loggedMinutes: number
  /** points vs a nominal capacity of 1 point per 4 capacity-hours */
  loadPct: number
  status: 'light' | 'balanced' | 'heavy' | 'overloaded'
}

export function workload(users: User[], issues: Issue[], states: Map<string, WorkflowState>, logs: TimeLog[] = []): WorkloadRow[] {
  return users
    .map((user) => {
      const mine = issues.filter((i) => i.assigneeId === user.id && !i.archivedAt && !isClosed(i, states))
      const points = mine.reduce((s, i) => s + (i.estimate ?? 0), 0)
      const capacityPoints = Math.max(1, Math.round(user.capacityHours / 4))
      const loadPct = Math.round((points / capacityPoints) * 100)
      const status: WorkloadRow['status'] =
        loadPct > 130 ? 'overloaded' : loadPct > 95 ? 'heavy' : loadPct < 45 ? 'light' : 'balanced'
      return {
        user,
        open: mine.length,
        inProgress: mine.filter((i) => cat(i, states) === 'started').length,
        points,
        overdue: mine.filter((i) => i.dueDate && +new Date(i.dueDate) < Date.now()).length,
        loggedMinutes: logs.filter((l) => l.userId === user.id).reduce((s, l) => s + l.minutes, 0),
        loadPct,
        status,
      }
    })
    .sort((a, b) => b.loadPct - a.loadPct)
}

/* ── Aging work in progress ─────────────────────────────────── */

export interface AgingItem { issue: Issue; days: number }

export function agingWip(issues: Issue[], states: Map<string, WorkflowState>, minDays = 5): AgingItem[] {
  return issues
    .filter((i) => cat(i, states) === 'started' && !i.archivedAt)
    .map((issue) => ({ issue, days: differenceInCalendarDays(new Date(), new Date(issue.startedAt ?? issue.updatedAt)) }))
    .filter((a) => a.days >= minDays)
    .sort((a, b) => b.days - a.days)
}

/* ── Distributions ──────────────────────────────────────────── */

export function countBy<T>(items: T[], key: (t: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

/* ── Throughput & forecast ──────────────────────────────────── */

export interface Forecast {
  weeklyThroughput: number
  openCount: number
  weeksToClear: number | null
  projectedDate: Date | null
  confidence: 'high' | 'medium' | 'low'
}

export function forecast(issues: Issue[], states: Map<string, WorkflowState>, weeks = 6): Forecast {
  const since = subDays(new Date(), weeks * 7)
  const completed = issues.filter((i) => i.completedAt && new Date(i.completedAt) >= since && cat(i, states) === 'completed')
  const weekly = completed.length / weeks
  const open = issues.filter((i) => !i.archivedAt && !isClosed(i, states)).length
  const weeksToClear = weekly > 0 ? Math.ceil(open / weekly) : null

  // Confidence falls when weekly throughput swings wildly
  const perWeek = Array.from({ length: weeks }, (_, w) => {
    const start = subDays(new Date(), (w + 1) * 7)
    const end = subDays(new Date(), w * 7)
    return completed.filter((i) => new Date(i.completedAt!) >= start && new Date(i.completedAt!) < end).length
  })
  const mean = perWeek.reduce((s, n) => s + n, 0) / weeks || 1
  const variance = perWeek.reduce((s, n) => s + (n - mean) ** 2, 0) / weeks
  const cv = Math.sqrt(variance) / mean

  return {
    weeklyThroughput: Math.round(weekly * 10) / 10,
    openCount: open,
    weeksToClear,
    projectedDate: weeksToClear !== null ? new Date(Date.now() + weeksToClear * 7 * 86400000) : null,
    confidence: cv < 0.35 ? 'high' : cv < 0.7 ? 'medium' : 'low',
  }
}

/* ── Portfolio rollup ───────────────────────────────────────── */

export interface PortfolioRow {
  project: Project
  progress: number
  open: number
  done: number
  blocked: number
  overdue: number
  daysLeft: number | null
  scheduleDelta: number | null
}

export function portfolio(projects: Project[], issues: Issue[], states: Map<string, WorkflowState>): PortfolioRow[] {
  return projects.map((project) => {
    const mine = issues.filter((i) => i.projectId === project.id && !i.archivedAt && cat(i, states) !== 'canceled')
    const done = mine.filter((i) => cat(i, states) === 'completed').length
    const progress = mine.length ? Math.round((done / mine.length) * 100) : 0
    let daysLeft: number | null = null
    let scheduleDelta: number | null = null
    if (project.targetDate) {
      daysLeft = differenceInCalendarDays(new Date(project.targetDate), new Date())
      if (project.startDate) {
        const total = differenceInCalendarDays(new Date(project.targetDate), new Date(project.startDate))
        const elapsed = differenceInCalendarDays(new Date(), new Date(project.startDate))
        const elapsedPct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0
        scheduleDelta = progress - elapsedPct
      }
    }
    return {
      project, progress, done,
      open: mine.length - done,
      blocked: mine.filter((i) => cat(i, states) === 'paused').length,
      overdue: mine.filter((i) => i.dueDate && +new Date(i.dueDate) < Date.now() && cat(i, states) !== 'completed').length,
      daysLeft, scheduleDelta,
    }
  })
}

/* ── Time tracking rollup ───────────────────────────────────── */

export function timeByDay(logs: TimeLog[], days = 14): { day: string; minutes: number }[] {
  const out: { day: string; minutes: number }[] = []
  for (let d = days - 1; d >= 0; d--) {
    const date = startOfDay(subDays(new Date(), d))
    const key = format(date, 'yyyy-MM-dd')
    out.push({ day: format(date, 'MMM d'), minutes: logs.filter((l) => l.date === key).reduce((s, l) => s + l.minutes, 0) })
  }
  return out
}

/* ── Cycle health summary across teams ──────────────────────── */

export function cycleHealth(cycles: Cycle[], issues: Issue[], states: Map<string, WorkflowState>) {
  return cycles
    .filter((c) => c.status === 'active')
    .map((cycle) => {
      const mine = issues.filter((i) => i.cycleId === cycle.id)
      const scope = mine.reduce((s, i) => s + (i.estimate ?? 0), 0)
      const done = mine.filter((i) => cat(i, states) === 'completed').reduce((s, i) => s + (i.estimate ?? 0), 0)
      const total = Math.max(1, differenceInCalendarDays(new Date(cycle.endDate), new Date(cycle.startDate)) + 1)
      const elapsed = Math.max(0, differenceInCalendarDays(new Date(), new Date(cycle.startDate)) + 1)
      return {
        cycle,
        scope,
        done,
        pct: scope ? Math.round((done / scope) * 100) : 0,
        elapsedPct: Math.round((Math.min(elapsed, total) / total) * 100),
        daysLeft: Math.max(0, total - elapsed),
      }
    })
}
