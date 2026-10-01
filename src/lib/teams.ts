import { addDays } from 'date-fns'
import { db, now, uid } from './db'
import { logActivity, notifyMany } from './activity'
import type { Cycle, Team, TeamMember, User, WorkflowState } from './types'

const STATE_TEMPLATE: { slug: string; name: string; category: WorkflowState['category']; color: string }[] = [
  { slug: 'backlog', name: 'Backlog', category: 'backlog', color: '#8e96ad' },
  { slug: 'todo', name: 'Todo', category: 'unstarted', color: '#6366f1' },
  { slug: 'progress', name: 'In Progress', category: 'started', color: '#f59e0b' },
  { slug: 'review', name: 'In Review', category: 'started', color: '#0ea5e9' },
  { slug: 'blocked', name: 'Blocked', category: 'paused', color: '#f43f5e' },
  { slug: 'done', name: 'Done', category: 'completed', color: '#10b981' },
  { slug: 'canceled', name: 'Canceled', category: 'canceled', color: '#94a3b8' },
]

export interface NewTeamInput {
  name: string
  key: string
  description: string
  icon: string
  color: string
  leadId: string
  memberIds: string[]
  visibility: Team['visibility']
  cycleEnabled: boolean
  cycleDays: number
  createSpace: boolean
  actorId: string
}

export async function createTeam(input: NewTeamInput): Promise<Team> {
  const teamId = uid('t')
  const team: Team = {
    id: teamId,
    key: input.key.toUpperCase().slice(0, 5),
    name: input.name.trim(),
    description: input.description,
    icon: input.icon,
    color: input.color,
    leadId: input.leadId,
    visibility: input.visibility,
    cycleDays: input.cycleDays,
    cycleEnabled: input.cycleEnabled,
    createdAt: now(),
  }
  await db.teams.add(team)

  await db.states.bulkAdd(
    STATE_TEMPLATE.map((s, i) => ({
      id: `st_${teamId}_${s.slug}`, teamId, name: s.name, category: s.category, color: s.color, order: i,
    })),
  )

  const memberIds = [...new Set([input.leadId, ...input.memberIds])]
  await db.teamMembers.bulkAdd(
    memberIds.map((userId) => ({
      id: uid('tm'), teamId, userId,
      role: userId === input.leadId ? ('lead' as const) : ('member' as const),
      allocationPct: 100, joinedAt: now(),
    })),
  )

  if (input.cycleEnabled) {
    const start = new Date()
    const cycles: Cycle[] = [0, 1].map((i) => ({
      id: uid('cy'), teamId, number: i + 1, name: `Cycle ${i + 1}`,
      goal: i === 0 ? 'Get the team moving — first cycle.' : '',
      startDate: addDays(start, i * input.cycleDays).toISOString(),
      endDate: addDays(start, (i + 1) * input.cycleDays - 1).toISOString(),
      status: i === 0 ? 'active' : 'upcoming',
      snapshots: [],
    }))
    await db.cycles.bulkAdd(cycles)
  }

  if (input.createSpace) {
    await db.spaces.add({
      id: uid('sp'), name: `${input.name} Space`,
      description: input.description || `Shared space for the ${input.name} team.`,
      icon: input.icon, color: input.color, kind: 'team', teamId,
      visibility: input.visibility === 'private' ? 'closed' : 'open',
      memberIds, createdBy: input.actorId, createdAt: now(),
    })
  }

  await logActivity({
    actorId: input.actorId, verb: 'created', entityType: 'team', entityId: teamId,
    entityLabel: team.name, teamId, meta: { icon: team.icon },
  })
  await notifyMany(memberIds, {
    actorId: input.actorId, kind: 'invite',
    title: `You joined ${team.name}`,
    body: team.description || 'A new team was created and you are on it.',
    link: `/app/teams/${teamId}`, entityType: 'team', entityId: teamId,
  })

  return team
}

export async function updateTeam(id: string, patch: Partial<Team>, actorId: string): Promise<void> {
  await db.teams.update(id, patch)
  const team = await db.teams.get(id)
  if (team) {
    await logActivity({
      actorId, verb: 'updated', entityType: 'team', entityId: id, entityLabel: team.name, teamId: id, meta: {},
    })
  }
}

export async function addTeamMember(teamId: string, userId: string, role: TeamMember['role'], allocationPct: number, actorId: string): Promise<void> {
  const existing = await db.teamMembers.where('[teamId+userId]').equals([teamId, userId]).first()
  if (existing) {
    await db.teamMembers.update(existing.id, { role, allocationPct })
    return
  }
  await db.teamMembers.add({ id: uid('tm'), teamId, userId, role, allocationPct, joinedAt: now() })
  const team = await db.teams.get(teamId)
  await notifyMany([userId], {
    actorId, kind: 'invite', title: `Added to ${team?.name ?? 'a team'}`,
    body: 'You now have access to this team’s work and space.',
    link: `/app/teams/${teamId}`, entityType: 'team', entityId: teamId,
  })
  if (team) {
    await logActivity({
      actorId, verb: 'added a member to', entityType: 'team', entityId: teamId,
      entityLabel: team.name, teamId, meta: { userId },
    })
  }
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const row = await db.teamMembers.where('[teamId+userId]').equals([teamId, userId]).first()
  if (row) await db.teamMembers.delete(row.id)
}

export async function archiveTeam(id: string): Promise<void> {
  await db.teams.update(id, { archivedAt: now() })
}

/* ── Workflow states ────────────────────────────────────────── */

export async function saveState(state: WorkflowState): Promise<void> {
  await db.states.put(state)
}

export async function deleteState(id: string): Promise<void> {
  const state = await db.states.get(id)
  if (!state) return
  const siblings = await db.states.where('teamId').equals(state.teamId).sortBy('order')
  const fallback = siblings.find((s) => s.id !== id && s.category === state.category) ?? siblings.find((s) => s.id !== id)
  if (!fallback) return
  const affected = await db.issues.where('stateId').equals(id).toArray()
  await Promise.all(affected.map((i) => db.issues.update(i.id, { stateId: fallback.id })))
  await db.states.delete(id)
}

/* ── People ─────────────────────────────────────────────────── */

export async function inviteUser(input: { name: string; email: string; title: string; role: User['role']; color: string; actorId: string }): Promise<User> {
  const user: User = {
    id: uid('u'), name: input.name.trim(), email: input.email.trim().toLowerCase(),
    password: 'demo123', avatarColor: input.color, title: input.title, role: input.role,
    status: 'invited', timezone: 'Asia/Kolkata', capacityHours: 40, skills: [],
    createdAt: now(),
  }
  await db.users.add(user)
  await logActivity({
    actorId: input.actorId, verb: 'invited', entityType: 'team', entityId: user.id,
    entityLabel: user.name, meta: { email: user.email },
  })
  return user
}

export async function updateUser(id: string, patch: Partial<User>): Promise<void> {
  await db.users.update(id, patch)
}
