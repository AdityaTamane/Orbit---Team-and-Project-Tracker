import { db, now, uid } from './db'
import { logActivity, notify, notifyMany } from './activity'
import { runAutomations } from './automations'
import type {
  GroupBy, Issue, IssueFilter, IssueLink, IssueType, Priority, SortBy, StateCategory,
  Team, TimeLog, User, WorkflowState,
} from './types'

/* ── Keys & creation ────────────────────────────────────────── */

export async function nextIssueKey(teamId: string): Promise<{ key: string; seq: number }> {
  const team = await db.teams.get(teamId)
  const teamIssues = await db.issues.where('teamId').equals(teamId).toArray()
  const seq = teamIssues.reduce((max, i) => Math.max(max, i.seq), 0) + 1
  return { key: `${team?.key ?? 'ISS'}-${seq}`, seq }
}

export async function defaultStateId(teamId: string, category: StateCategory = 'backlog'): Promise<string> {
  const states = await db.states.where('teamId').equals(teamId).sortBy('order')
  return (states.find((s) => s.category === category) ?? states[0])?.id ?? ''
}

export interface NewIssueInput {
  teamId: string
  title: string
  description?: string
  type?: IssueType
  priority?: Priority
  stateId?: string
  assigneeId?: string
  projectId?: string
  parentId?: string
  cycleId?: string
  milestoneId?: string
  labelIds?: string[]
  estimate?: number
  dueDate?: string
  actorId: string
}

export async function createIssue(input: NewIssueInput): Promise<Issue> {
  const { key, seq } = await nextIssueKey(input.teamId)
  const stateId = input.stateId ?? (await defaultStateId(input.teamId, 'backlog'))
  const siblings = await db.issues.where('teamId').equals(input.teamId).toArray()
  const order = siblings.reduce((max, i) => Math.max(max, i.order), 0) + 100

  const issue: Issue = {
    id: uid('is'), key, seq,
    teamId: input.teamId,
    projectId: input.projectId,
    parentId: input.parentId,
    type: input.type ?? 'task',
    title: input.title.trim(),
    description: input.description ?? '',
    stateId,
    priority: input.priority ?? 0,
    assigneeId: input.assigneeId,
    reporterId: input.actorId,
    labelIds: input.labelIds ?? [],
    estimate: input.estimate,
    cycleId: input.cycleId,
    milestoneId: input.milestoneId,
    dueDate: input.dueDate,
    order,
    checklist: [],
    subscriberIds: [input.actorId, input.assigneeId].filter(Boolean) as string[],
    customFields: {},
    createdAt: now(),
    updatedAt: now(),
  }

  await db.issues.add(issue)
  await logActivity({
    actorId: input.actorId, verb: 'created', entityType: 'issue', entityId: issue.id,
    entityLabel: issue.key, projectId: issue.projectId, teamId: issue.teamId, meta: { title: issue.title },
  })
  if (issue.assigneeId) {
    await notify({
      userId: issue.assigneeId, actorId: input.actorId, kind: 'assign',
      title: 'Assigned to you', body: `${issue.key} · ${issue.title}`,
      link: `/app/issues/${issue.id}`, entityType: 'issue', entityId: issue.id,
    })
  }
  await runAutomations({ type: 'issue.created', issue, actorId: input.actorId })
  return issue
}

/* ── Updates ────────────────────────────────────────────────── */

export async function updateIssue(id: string, patch: Partial<Issue>, actorId: string): Promise<void> {
  const before = await db.issues.get(id)
  if (!before) return

  const changes: Partial<Issue> = { ...patch, updatedAt: now() }

  // State transitions carry timestamps and fire automations
  let toCategory: StateCategory | undefined
  if (patch.stateId && patch.stateId !== before.stateId) {
    const state = await db.states.get(patch.stateId)
    toCategory = state?.category
    if (state?.category === 'completed') {
      changes.completedAt = now()
      changes.canceledAt = undefined
    } else if (state?.category === 'canceled') {
      changes.canceledAt = now()
      changes.completedAt = undefined
    } else {
      changes.completedAt = undefined
      changes.canceledAt = undefined
      if (state?.category === 'started' && !before.startedAt) changes.startedAt = now()
    }
  }

  await db.issues.update(id, changes)
  const after = { ...before, ...changes }

  if (patch.stateId && patch.stateId !== before.stateId) {
    const [from, to] = await Promise.all([db.states.get(before.stateId), db.states.get(patch.stateId)])
    await logActivity({
      actorId, verb: 'moved', entityType: 'issue', entityId: id, entityLabel: before.key,
      projectId: after.projectId, teamId: after.teamId,
      meta: { from: from?.name, to: to?.name, title: after.title },
    })
    await notifyMany(after.subscriberIds.filter((u) => u !== actorId), {
      actorId, kind: 'state', title: `${before.key} moved to ${to?.name}`,
      body: after.title, link: `/app/issues/${id}`, entityType: 'issue', entityId: id,
    })
    await runAutomations({ type: 'issue.state_changed', issue: after, actorId, toCategory })
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== before.assigneeId) {
    if (patch.assigneeId) {
      await db.issues.update(id, { subscriberIds: [...new Set([...after.subscriberIds, patch.assigneeId])] })
      await notify({
        userId: patch.assigneeId, actorId, kind: 'assign', title: 'Assigned to you',
        body: `${before.key} · ${after.title}`, link: `/app/issues/${id}`, entityType: 'issue', entityId: id,
      })
    }
    await logActivity({
      actorId, verb: 'assigned', entityType: 'issue', entityId: id, entityLabel: before.key,
      projectId: after.projectId, teamId: after.teamId, meta: { to: patch.assigneeId, title: after.title },
    })
    await runAutomations({ type: 'issue.assigned', issue: after, actorId })
  }

  if (patch.priority !== undefined && patch.priority !== before.priority) {
    await logActivity({
      actorId, verb: 'changed priority on', entityType: 'issue', entityId: id, entityLabel: before.key,
      projectId: after.projectId, teamId: after.teamId, meta: { from: before.priority, to: patch.priority, title: after.title },
    })
    await runAutomations({ type: 'issue.priority_changed', issue: after, actorId })
  }
}

/** Kanban drop: place an issue in a column between two neighbours. */
export async function moveIssue(id: string, stateId: string, beforeOrder: number | null, afterOrder: number | null, actorId: string): Promise<void> {
  let order: number
  if (beforeOrder === null && afterOrder === null) order = 100
  else if (beforeOrder === null) order = (afterOrder as number) - 100
  else if (afterOrder === null) order = beforeOrder + 100
  else order = (beforeOrder + afterOrder) / 2
  await updateIssue(id, { stateId, order }, actorId)
}

export async function archiveIssue(id: string, actorId: string): Promise<void> {
  const issue = await db.issues.get(id)
  if (!issue) return
  await db.issues.update(id, { archivedAt: now(), updatedAt: now() })
  await logActivity({
    actorId, verb: 'archived', entityType: 'issue', entityId: id, entityLabel: issue.key,
    projectId: issue.projectId, teamId: issue.teamId, meta: { title: issue.title },
  })
}

export async function unarchiveIssue(id: string): Promise<void> {
  await db.issues.update(id, { archivedAt: undefined, updatedAt: now() })
}

export async function deleteIssue(id: string): Promise<void> {
  const children = await db.issues.where('parentId').equals(id).toArray()
  await Promise.all(children.map((c) => db.issues.update(c.id, { parentId: undefined })))
  const links = (await db.issueLinks.toArray()).filter((l) => l.fromId === id || l.toId === id)
  await db.issueLinks.bulkDelete(links.map((l) => l.id))
  const comments = await db.comments.where('[entityType+entityId]').equals(['issue', id]).toArray()
  await db.comments.bulkDelete(comments.map((c) => c.id))
  await db.issues.delete(id)
}

export async function bulkUpdate(ids: string[], patch: Partial<Issue>, actorId: string): Promise<void> {
  for (const id of ids) await updateIssue(id, patch, actorId)
}

/* ── Checklists ─────────────────────────────────────────────── */

export async function toggleChecklistItem(issueId: string, itemId: string): Promise<void> {
  const issue = await db.issues.get(issueId)
  if (!issue) return
  const checklist = issue.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c))
  await db.issues.update(issueId, { checklist, updatedAt: now() })
}

export async function addChecklistItem(issueId: string, text: string): Promise<void> {
  const issue = await db.issues.get(issueId)
  if (!issue) return
  await db.issues.update(issueId, {
    checklist: [...issue.checklist, { id: uid('ck'), text, done: false }],
    updatedAt: now(),
  })
}

export async function removeChecklistItem(issueId: string, itemId: string): Promise<void> {
  const issue = await db.issues.get(issueId)
  if (!issue) return
  await db.issues.update(issueId, { checklist: issue.checklist.filter((c) => c.id !== itemId), updatedAt: now() })
}

/* ── Links ──────────────────────────────────────────────────── */

export async function linkIssues(fromId: string, toId: string, type: IssueLink['type']): Promise<void> {
  if (fromId === toId) return
  const existing = (await db.issueLinks.where('fromId').equals(fromId).toArray()).find((l) => l.toId === toId && l.type === type)
  if (existing) return
  await db.issueLinks.add({ id: uid('lk'), fromId, toId, type, createdAt: now() })
}

export async function unlinkIssues(linkId: string): Promise<void> {
  await db.issueLinks.delete(linkId)
}

/* ── Time tracking ──────────────────────────────────────────── */

export async function logTime(input: { issueId: string; userId: string; minutes: number; date: string; note: string }): Promise<void> {
  const log: TimeLog = { id: uid('tl'), ...input, createdAt: now() }
  await db.timeLogs.add(log)
}

export async function deleteTimeLog(id: string): Promise<void> {
  await db.timeLogs.delete(id)
}

/* ── Query engine ───────────────────────────────────────────── */

export interface IssueContext {
  states: Map<string, WorkflowState>
  blockedIds?: Set<string>
}

export function matchesFilter(issue: Issue, filter: IssueFilter, ctx: IssueContext): boolean {
  if (!filter.includeArchived && issue.archivedAt) return false
  const state = ctx.states.get(issue.stateId)

  if (filter.text) {
    const q = filter.text.toLowerCase()
    const hay = `${issue.key} ${issue.title} ${issue.description}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (filter.teamIds?.length && !filter.teamIds.includes(issue.teamId)) return false
  if (filter.projectIds?.length && !(issue.projectId && filter.projectIds.includes(issue.projectId))) return false
  if (filter.assigneeIds?.length && !(issue.assigneeId && filter.assigneeIds.includes(issue.assigneeId))) return false
  if (filter.stateIds?.length && !filter.stateIds.includes(issue.stateId)) return false
  if (filter.stateCategories?.length && !(state && filter.stateCategories.includes(state.category))) return false
  if (filter.priorities?.length && !filter.priorities.includes(issue.priority)) return false
  if (filter.types?.length && !filter.types.includes(issue.type)) return false
  if (filter.labelIds?.length && !issue.labelIds.some((l) => filter.labelIds!.includes(l))) return false
  if (filter.cycleIds?.length && !(issue.cycleId && filter.cycleIds.includes(issue.cycleId))) return false
  if (filter.milestoneIds?.length && !(issue.milestoneId && filter.milestoneIds.includes(issue.milestoneId))) return false
  if (filter.unassignedOnly && issue.assigneeId) return false
  if (filter.parentId !== undefined) {
    if (filter.parentId === null && issue.parentId) return false
    if (filter.parentId && issue.parentId !== filter.parentId) return false
  }
  if (filter.hasBlockers && !ctx.blockedIds?.has(issue.id)) return false

  if (filter.overdueOnly) {
    const open = state && !['completed', 'canceled'].includes(state.category)
    if (!issue.dueDate || !open || +new Date(issue.dueDate) >= Date.now()) return false
  }
  if (filter.dueWithinDays !== undefined) {
    if (!issue.dueDate) return false
    const delta = +new Date(issue.dueDate) - Date.now()
    if (delta > filter.dueWithinDays * 86400000) return false
  }
  return true
}

export function sortIssues(issues: Issue[], sortBy: SortBy, states: Map<string, WorkflowState>): Issue[] {
  const copy = [...issues]
  switch (sortBy) {
    case 'priority': return copy.sort((a, b) => b.priority - a.priority || a.order - b.order)
    case 'created': return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    case 'updated': return copy.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    case 'due': return copy.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.order - b.order
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return +new Date(a.dueDate) - +new Date(b.dueDate)
    })
    case 'estimate': return copy.sort((a, b) => (b.estimate ?? 0) - (a.estimate ?? 0))
    case 'title': return copy.sort((a, b) => a.title.localeCompare(b.title))
    default: return copy.sort((a, b) => {
      const oa = states.get(a.stateId)?.order ?? 0
      const ob = states.get(b.stateId)?.order ?? 0
      return oa - ob || a.order - b.order
    })
  }
}

export interface IssueGroup {
  id: string
  label: string
  color?: string
  meta?: string
  issues: Issue[]
}

export function groupIssues(
  issues: Issue[],
  groupBy: GroupBy,
  lookups: {
    states: WorkflowState[]
    users: User[]
    teams: Team[]
    projects: { id: string; name: string; color: string; icon: string }[]
    labels: { id: string; name: string; color: string }[]
    cycles: { id: string; name: string }[]
    milestones?: { id: string; name: string }[]
  },
): IssueGroup[] {
  const groups: IssueGroup[] = []
  const push = (id: string, label: string, color: string | undefined, list: Issue[], meta?: string) => {
    groups.push({ id, label, color, issues: list, meta })
  }

  switch (groupBy) {
    case 'state':
      for (const s of [...lookups.states].sort((a, b) => a.order - b.order)) {
        push(s.id, s.name, s.color, issues.filter((i) => i.stateId === s.id))
      }
      break
    case 'assignee': {
      const assigned = new Set(issues.map((i) => i.assigneeId).filter(Boolean) as string[])
      for (const u of lookups.users.filter((u) => assigned.has(u.id))) {
        push(u.id, u.name, u.avatarColor, issues.filter((i) => i.assigneeId === u.id), u.title)
      }
      push('none', 'Unassigned', '#8e96ad', issues.filter((i) => !i.assigneeId))
      break
    }
    case 'priority':
      for (const p of [4, 3, 2, 1, 0]) {
        const label = ['No priority', 'Low', 'Medium', 'High', 'Urgent'][p]
        push(String(p), label, undefined, issues.filter((i) => i.priority === p))
      }
      break
    case 'project': {
      for (const p of lookups.projects) {
        push(p.id, p.name, p.color, issues.filter((i) => i.projectId === p.id), p.icon)
      }
      push('none', 'No project', '#8e96ad', issues.filter((i) => !i.projectId))
      break
    }
    case 'type':
      for (const t of ['epic', 'story', 'task', 'bug', 'spike', 'chore'] as IssueType[]) {
        push(t, t[0].toUpperCase() + t.slice(1), undefined, issues.filter((i) => i.type === t))
      }
      break
    case 'label':
      for (const l of lookups.labels) {
        push(l.id, l.name, l.color, issues.filter((i) => i.labelIds.includes(l.id)))
      }
      push('none', 'No label', '#8e96ad', issues.filter((i) => !i.labelIds.length))
      break
    case 'cycle':
      for (const c of lookups.cycles) push(c.id, c.name, undefined, issues.filter((i) => i.cycleId === c.id))
      push('none', 'No cycle', '#8e96ad', issues.filter((i) => !i.cycleId))
      break
    case 'team':
      for (const t of lookups.teams) push(t.id, t.name, t.color, issues.filter((i) => i.teamId === t.id), t.icon)
      break
    case 'milestone':
      for (const m of lookups.milestones ?? []) push(m.id, m.name, undefined, issues.filter((i) => i.milestoneId === m.id))
      push('none', 'No milestone', '#8e96ad', issues.filter((i) => !i.milestoneId))
      break
    default:
      push('all', 'All issues', undefined, issues)
  }

  return groups.filter((g) => g.issues.length > 0 || groupBy === 'state')
}

export const isOpen = (issue: Issue, states: Map<string, WorkflowState>): boolean => {
  const cat = states.get(issue.stateId)?.category
  return !!cat && !['completed', 'canceled'].includes(cat)
}

export const isDone = (issue: Issue, states: Map<string, WorkflowState>): boolean =>
  states.get(issue.stateId)?.category === 'completed'
