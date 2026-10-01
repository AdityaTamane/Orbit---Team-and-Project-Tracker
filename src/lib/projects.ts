import { addDays } from 'date-fns'
import { db, now, uid } from './db'
import { logActivity, notifyMany } from './activity'
import { defaultStateId, nextIssueKey } from './issues'
import { templateById } from './templates'
import type {
  Doc, Health, Issue, Milestone, Priority, Project, ProjectStatus, Space, WorkflowState,
} from './types'

/* ── Onboarding wizard ──────────────────────────────────────── */

export interface ProjectWizardInput {
  name: string
  key: string
  summary: string
  description: string
  icon: string
  color: string
  status: ProjectStatus
  priority: Priority
  leadId: string
  teamIds: string[]
  memberIds: string[]
  startDate?: string
  targetDate?: string
  tags: string[]
  budgetHours?: number
  templateId: string
  createSpace: boolean
  actorId: string
}

export const WIZARD_STEPS = ['basics', 'team', 'template', 'milestones', 'review'] as const

/** Creates the project plus everything a project needs on day one:
 *  a shared space, milestones, a starter backlog and its docs. */
export async function createProjectFromWizard(input: ProjectWizardInput): Promise<Project> {
  const projectId = uid('p')
  const template = templateById(input.templateId)
  const start = input.startDate ? new Date(input.startDate) : new Date()

  let spaceId: string | undefined
  if (input.createSpace) {
    const space: Space = {
      id: uid('sp'), name: input.name,
      description: input.summary || `Shared space for ${input.name}.`,
      icon: input.icon, color: input.color, kind: 'project',
      visibility: 'open', memberIds: [...new Set([input.leadId, ...input.memberIds])],
      createdBy: input.actorId, createdAt: now(),
    }
    await db.spaces.add(space)
    spaceId = space.id
  }

  const project: Project = {
    id: projectId,
    key: input.key.toUpperCase(),
    name: input.name.trim(),
    summary: input.summary,
    description: input.description,
    icon: input.icon,
    color: input.color,
    status: input.status,
    health: input.status === 'in_progress' ? 'on_track' : 'unknown',
    priority: input.priority,
    leadId: input.leadId,
    memberIds: [...new Set([input.leadId, ...input.memberIds])],
    teamIds: input.teamIds,
    startDate: input.startDate,
    targetDate: input.targetDate,
    tags: input.tags,
    budgetHours: input.budgetHours,
    spaceId,
    templateId: input.templateId,
    onboarding: { step: WIZARD_STEPS.length, completedSteps: [...WIZARD_STEPS], done: true },
    createdAt: now(),
    updatedAt: now(),
  }
  await db.projects.add(project)

  const milestones: Milestone[] = (template?.milestones ?? []).map((m, i) => ({
    id: uid('ms'), projectId, name: m.name, description: m.description,
    targetDate: addDays(start, m.offsetDays).toISOString(),
    status: 'upcoming', order: i,
  }))
  if (milestones.length) await db.milestones.bulkAdd(milestones)

  const primaryTeam = input.teamIds[0]
  if (primaryTeam && template?.issues.length) {
    const stateId = await defaultStateId(primaryTeam, 'backlog')
    let { seq } = await nextIssueKey(primaryTeam)
    const team = await db.teams.get(primaryTeam)
    const newIssues: Issue[] = template.issues.map((t, i) => {
      const key = `${team?.key ?? 'ISS'}-${seq + i}`
      return {
        id: uid('is'), key, seq: seq + i, teamId: primaryTeam, projectId,
        milestoneId: milestones[Math.min(i, Math.max(0, milestones.length - 1))]?.id,
        type: t.type, title: t.title, description: t.description ?? '',
        stateId, priority: t.priority, reporterId: input.actorId,
        labelIds: [], estimate: t.estimate, order: (i + 1) * 100,
        checklist: [], subscriberIds: [input.actorId], customFields: {},
        createdAt: now(), updatedAt: now(),
      }
    })
    await db.issues.bulkAdd(newIssues)
    seq += template.issues.length
  }

  if (template?.docs.length) {
    const docs: Doc[] = template.docs.map((d) => ({
      id: uid('dc'), spaceId, projectId, title: d.title, icon: d.icon, body: d.body,
      kind: d.kind, status: 'draft', authorId: input.actorId, collaboratorIds: [],
      tags: ['template'], pinned: false, createdAt: now(), updatedAt: now(), versions: [],
    }))
    await db.docs.bulkAdd(docs)
  }

  await logActivity({
    actorId: input.actorId, verb: 'created', entityType: 'project', entityId: projectId,
    entityLabel: project.name, projectId, meta: { icon: project.icon, template: template?.name },
  })
  await notifyMany(project.memberIds, {
    actorId: input.actorId, kind: 'invite',
    title: `Added to ${project.name}`,
    body: project.summary || 'You were added to a new project.',
    link: `/app/projects/${projectId}`, entityType: 'project', entityId: projectId,
  })

  return project
}

/* ── Mutations ──────────────────────────────────────────────── */

export async function updateProject(id: string, patch: Partial<Project>, actorId: string): Promise<void> {
  await db.projects.update(id, { ...patch, updatedAt: now() })
  const project = await db.projects.get(id)
  if (!project) return
  await logActivity({
    actorId, verb: 'updated', entityType: 'project', entityId: id,
    entityLabel: project.name, projectId: id, meta: { fields: Object.keys(patch) },
  })
}

export async function setProjectHealth(id: string, health: Health, note: string, actorId: string): Promise<void> {
  const project = await db.projects.get(id)
  if (!project) return
  await db.projects.update(id, { health, healthNote: note, updatedAt: now() })
  await logActivity({
    actorId, verb: 'updated health on', entityType: 'project', entityId: id,
    entityLabel: project.name, projectId: id, meta: { health, note },
  })
  await notifyMany(project.memberIds.filter((m) => m !== actorId), {
    actorId, kind: 'risk',
    title: `${project.name} is ${health.replace('_', ' ')}`,
    body: note || 'Project health was updated.',
    link: `/app/projects/${id}`, entityType: 'project', entityId: id,
  })
}

export async function archiveProject(id: string, actorId: string): Promise<void> {
  const project = await db.projects.get(id)
  if (!project) return
  await db.projects.update(id, { archivedAt: now(), status: 'canceled', updatedAt: now() })
  await logActivity({
    actorId, verb: 'archived', entityType: 'project', entityId: id, entityLabel: project.name, projectId: id,
  })
}

export async function deleteProject(id: string): Promise<void> {
  const issues = await db.issues.where('projectId').equals(id).toArray()
  await db.issues.bulkDelete(issues.map((i) => i.id))
  const ms = await db.milestones.where('projectId').equals(id).toArray()
  await db.milestones.bulkDelete(ms.map((m) => m.id))
  const risks = await db.risks.where('projectId').equals(id).toArray()
  await db.risks.bulkDelete(risks.map((r) => r.id))
  await db.projects.delete(id)
}

/* ── Milestones ─────────────────────────────────────────────── */

export async function saveMilestone(m: Milestone): Promise<void> {
  await db.milestones.put(m)
}

export async function deleteMilestone(id: string): Promise<void> {
  const issues = (await db.issues.where('milestoneId').equals(id).toArray())
  await Promise.all(issues.map((i) => db.issues.update(i.id, { milestoneId: undefined })))
  await db.milestones.delete(id)
}

/* ── Derived project intelligence ───────────────────────────── */

export interface ProjectStats {
  total: number
  done: number
  inProgress: number
  blocked: number
  backlog: number
  progress: number
  scopePoints: number
  donePoints: number
  pointProgress: number
  overdue: number
  unassigned: number
  dueSoon: number
  openRisks: number
  daysRemaining: number | null
  elapsedPct: number | null
  /** progress minus schedule elapsed — negative means behind plan */
  scheduleDelta: number | null
}

export function computeProjectStats(
  project: Project,
  issues: Issue[],
  states: Map<string, WorkflowState>,
  openRisks = 0,
): ProjectStats {
  const live = issues.filter((i) => !i.archivedAt)
  const cat = (i: Issue) => states.get(i.stateId)?.category
  const done = live.filter((i) => cat(i) === 'completed')
  const canceled = live.filter((i) => cat(i) === 'canceled')
  const counted = live.filter((i) => cat(i) !== 'canceled')
  const inProgress = live.filter((i) => cat(i) === 'started')
  const blocked = live.filter((i) => cat(i) === 'paused')
  const backlog = live.filter((i) => cat(i) === 'backlog' || cat(i) === 'unstarted')

  const scopePoints = counted.reduce((s, i) => s + (i.estimate ?? 0), 0)
  const donePoints = done.reduce((s, i) => s + (i.estimate ?? 0), 0)

  const openIssues = counted.filter((i) => cat(i) !== 'completed')
  const overdue = openIssues.filter((i) => i.dueDate && +new Date(i.dueDate) < Date.now()).length
  const dueSoon = openIssues.filter((i) => i.dueDate && +new Date(i.dueDate) >= Date.now() && +new Date(i.dueDate) < Date.now() + 7 * 86400000).length
  const unassigned = openIssues.filter((i) => !i.assigneeId).length

  const progress = counted.length ? Math.round((done.length / counted.length) * 100) : 0

  let daysRemaining: number | null = null
  let elapsedPct: number | null = null
  if (project.targetDate) {
    daysRemaining = Math.ceil((+new Date(project.targetDate) - Date.now()) / 86400000)
    if (project.startDate) {
      const total = +new Date(project.targetDate) - +new Date(project.startDate)
      const elapsed = Date.now() - +new Date(project.startDate)
      elapsedPct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : null
    }
  }

  return {
    total: counted.length + canceled.length,
    done: done.length,
    inProgress: inProgress.length,
    blocked: blocked.length,
    backlog: backlog.length,
    progress,
    scopePoints,
    donePoints,
    pointProgress: scopePoints ? Math.round((donePoints / scopePoints) * 100) : 0,
    overdue,
    unassigned,
    dueSoon,
    openRisks,
    daysRemaining,
    elapsedPct,
    scheduleDelta: elapsedPct === null ? null : progress - elapsedPct,
  }
}

export interface HealthSignal {
  id: string
  label: string
  detail: string
  severity: 'info' | 'warn' | 'danger'
}

/** Automatic risk detection — what a good PM would notice on a Friday. */
export function detectHealthSignals(project: Project, stats: ProjectStats): HealthSignal[] {
  const signals: HealthSignal[] = []

  if (stats.scheduleDelta !== null && stats.scheduleDelta < -15) {
    signals.push({
      id: 'behind', severity: 'danger', label: 'Behind schedule',
      detail: `${stats.elapsedPct}% of the timeline has elapsed but only ${stats.progress}% of scope is done — a ${Math.abs(stats.scheduleDelta)}-point gap.`,
    })
  } else if (stats.scheduleDelta !== null && stats.scheduleDelta < -5) {
    signals.push({
      id: 'slipping', severity: 'warn', label: 'Slipping',
      detail: `Progress trails the calendar by ${Math.abs(stats.scheduleDelta)} points. Worth a look before it compounds.`,
    })
  }
  if (stats.blocked > 0) {
    signals.push({
      id: 'blocked', severity: stats.blocked > 2 ? 'danger' : 'warn', label: `${stats.blocked} blocked`,
      detail: 'Blocked work does not unblock itself. Each item needs an owner and a next step.',
    })
  }
  if (stats.overdue > 0) {
    signals.push({
      id: 'overdue', severity: stats.overdue > 3 ? 'danger' : 'warn', label: `${stats.overdue} overdue`,
      detail: 'Past-due items either need a new date or need to be dropped.',
    })
  }
  if (stats.unassigned > 3) {
    signals.push({
      id: 'unassigned', severity: 'warn', label: `${stats.unassigned} unassigned`,
      detail: 'Open work without an owner tends to sit still.',
    })
  }
  if (stats.openRisks > 0) {
    signals.push({
      id: 'risks', severity: stats.openRisks > 2 ? 'danger' : 'info', label: `${stats.openRisks} open risks`,
      detail: 'Review mitigations in the risk register.',
    })
  }
  if (stats.daysRemaining !== null && stats.daysRemaining < 14 && stats.progress < 80 && project.status === 'in_progress') {
    signals.push({
      id: 'crunch', severity: 'danger', label: 'Target date at risk',
      detail: `${stats.daysRemaining} days left with ${100 - stats.progress}% of scope open.`,
    })
  }
  if (!signals.length) {
    signals.push({ id: 'clear', severity: 'info', label: 'No signals', detail: 'Nothing automatic is flagging this project right now.' })
  }
  return signals
}

/** Suggests a health rating from the signals — the lead still decides. */
export function suggestedHealth(signals: HealthSignal[]): Health {
  if (signals.some((s) => s.severity === 'danger')) return 'off_track'
  if (signals.some((s) => s.severity === 'warn')) return 'at_risk'
  return 'on_track'
}
