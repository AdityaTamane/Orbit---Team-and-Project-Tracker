import type { Issue, WorkflowState } from '@/lib/types'

export interface BoardColumn {
  key: string
  name: string
  color: string
  category: WorkflowState['category']
  order: number
  /** Every team-specific state that maps to this column */
  stateIds: Set<string>
}

/**
 * A project can span several teams, and each team owns its own workflow states.
 * Columns therefore key on state *name*, aggregating the per-team states behind it,
 * so a board can show one "In Progress" column for work from three teams.
 */
export function buildColumns(states: WorkflowState[]): BoardColumn[] {
  const map = new Map<string, BoardColumn>()
  for (const s of states) {
    const existing = map.get(s.name)
    if (existing) {
      existing.stateIds.add(s.id)
      existing.order = Math.min(existing.order, s.order)
    } else {
      map.set(s.name, { key: s.name, name: s.name, color: s.color, category: s.category, order: s.order, stateIds: new Set([s.id]) })
    }
  }
  return [...map.values()].sort((a, b) => a.order - b.order)
}

/** Which concrete state an issue should take when dropped into a column. */
export function targetStateFor(column: BoardColumn, issue: Issue, states: WorkflowState[]): string | undefined {
  const sameTeam = states.find((s) => column.stateIds.has(s.id) && s.teamId === issue.teamId)
  if (sameTeam) return sameTeam.id
  const byCategory = states.find((s) => s.teamId === issue.teamId && s.category === column.category)
  return byCategory?.id ?? [...column.stateIds][0]
}
