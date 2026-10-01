import { addDays, differenceInCalendarDays, eachDayOfInterval, isWeekend, startOfDay } from 'date-fns'
import { db, now, uid } from './db'
import type { Cycle, Issue, WorkflowState } from './types'

export async function createCycle(input: { teamId: string; name: string; goal: string; startDate: string; endDate: string }): Promise<Cycle> {
  const existing = await db.cycles.where('teamId').equals(input.teamId).toArray()
  const number = existing.reduce((m, c) => Math.max(m, c.number), 0) + 1
  const start = new Date(input.startDate)
  const status: Cycle['status'] = new Date(input.endDate) < new Date() ? 'completed' : start <= new Date() ? 'active' : 'upcoming'
  const cycle: Cycle = {
    id: uid('cy'), teamId: input.teamId, number,
    name: input.name || `Cycle ${number}`, goal: input.goal,
    startDate: input.startDate, endDate: input.endDate, status, snapshots: [],
  }
  await db.cycles.add(cycle)
  return cycle
}

export async function updateCycle(id: string, patch: Partial<Cycle>): Promise<void> {
  await db.cycles.update(id, patch)
}

export async function deleteCycle(id: string): Promise<void> {
  const issues = await db.issues.where('cycleId').equals(id).toArray()
  await Promise.all(issues.map((i) => db.issues.update(i.id, { cycleId: undefined })))
  await db.cycles.delete(id)
}

/** Move every unfinished item from a cycle into the next one. */
export async function rolloverCycle(fromId: string, toId: string): Promise<number> {
  const states = await db.states.toArray()
  const closed = new Set(states.filter((s) => ['completed', 'canceled'].includes(s.category)).map((s) => s.id))
  const issues = await db.issues.where('cycleId').equals(fromId).toArray()
  const carry = issues.filter((i) => !closed.has(i.stateId))
  await Promise.all(carry.map((i) => db.issues.update(i.id, { cycleId: toId, updatedAt: now() })))
  await db.cycles.update(fromId, { status: 'completed' })
  await db.cycles.update(toId, { status: 'active' })
  return carry.length
}

/* ── Burndown ───────────────────────────────────────────────── */

export interface BurndownPoint {
  date: string
  day: string
  ideal: number
  remaining: number | null
  scope: number
  completed: number | null
}

/**
 * Reconstructs a burndown from the issues themselves — points remaining at the
 * end of each day, using completedAt. Weekends flatten the ideal line.
 */
export function buildBurndown(cycle: Cycle, issues: Issue[], states: Map<string, WorkflowState>): BurndownPoint[] {
  const start = startOfDay(new Date(cycle.startDate))
  const end = startOfDay(new Date(cycle.endDate))
  const days = eachDayOfInterval({ start, end })
  const workdays = days.filter((d) => !isWeekend(d)).length || 1
  const scope = issues.reduce((s, i) => s + (i.estimate ?? 0), 0)
  const today = startOfDay(new Date())

  let idealRemaining = scope
  const perDay = scope / workdays

  return days.map((day) => {
    if (!isWeekend(day)) idealRemaining = Math.max(0, idealRemaining - perDay)
    const isFuture = day > today
    const completedByDay = issues
      .filter((i) => {
        const cat = states.get(i.stateId)?.category
        return cat === 'completed' && i.completedAt && startOfDay(new Date(i.completedAt)) <= day
      })
      .reduce((s, i) => s + (i.estimate ?? 0), 0)

    return {
      date: day.toISOString(),
      day: `${day.getDate()}`,
      ideal: Math.round(idealRemaining * 10) / 10,
      remaining: isFuture ? null : scope - completedByDay,
      completed: isFuture ? null : completedByDay,
      scope,
    }
  })
}

export interface CycleStats {
  scope: number
  completed: number
  remaining: number
  completionPct: number
  issueCount: number
  doneCount: number
  daysTotal: number
  daysElapsed: number
  daysLeft: number
  onPace: boolean
  projectedCompletion: number
}

export function computeCycleStats(cycle: Cycle, issues: Issue[], states: Map<string, WorkflowState>): CycleStats {
  const scope = issues.reduce((s, i) => s + (i.estimate ?? 0), 0)
  const doneIssues = issues.filter((i) => states.get(i.stateId)?.category === 'completed')
  const completed = doneIssues.reduce((s, i) => s + (i.estimate ?? 0), 0)
  const daysTotal = Math.max(1, differenceInCalendarDays(new Date(cycle.endDate), new Date(cycle.startDate)) + 1)
  const daysElapsed = Math.min(daysTotal, Math.max(0, differenceInCalendarDays(new Date(), new Date(cycle.startDate)) + 1))
  const daysLeft = Math.max(0, daysTotal - daysElapsed)
  const expectedPct = (daysElapsed / daysTotal) * 100
  const completionPct = scope ? Math.round((completed / scope) * 100) : 0
  const rate = daysElapsed > 0 ? completed / daysElapsed : 0

  return {
    scope, completed, remaining: scope - completed, completionPct,
    issueCount: issues.length, doneCount: doneIssues.length,
    daysTotal, daysElapsed, daysLeft,
    onPace: completionPct >= expectedPct - 8,
    projectedCompletion: scope ? Math.min(100, Math.round(((rate * daysTotal) / scope) * 100)) : 0,
  }
}

/** Velocity across completed cycles — the honest input to any forecast. */
export function computeVelocity(cycles: Cycle[], issues: Issue[], states: Map<string, WorkflowState>): { name: string; committed: number; completed: number }[] {
  return cycles
    .filter((c) => c.status !== 'upcoming')
    .sort((a, b) => a.number - b.number)
    .map((cycle) => {
      const cycleIssues = issues.filter((i) => i.cycleId === cycle.id)
      const committed = cycleIssues.reduce((s, i) => s + (i.estimate ?? 0), 0)
      const completed = cycleIssues
        .filter((i) => states.get(i.stateId)?.category === 'completed')
        .reduce((s, i) => s + (i.estimate ?? 0), 0)
      return { name: cycle.name, committed, completed }
    })
}

export const suggestNextCycleDates = (last?: Cycle, days = 14): { startDate: string; endDate: string } => {
  const start = last ? addDays(new Date(last.endDate), 1) : new Date()
  return { startDate: start.toISOString(), endDate: addDays(start, days - 1).toISOString() }
}
