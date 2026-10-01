import Dexie from 'dexie'
import type { Table } from 'dexie'
import type {
  Activity, Attachment, Automation, AutomationRun, Comment, Cycle, Doc, Goal, Issue, IssueLink,
  Label, Milestone, Notification, Project, Risk, SavedView, Space, Team, TeamMember, TimeLog,
  User, WorkflowState, Workspace,
} from './types'

class OrbitDB extends Dexie {
  workspaces!: Table<Workspace, string>
  users!: Table<User, string>
  teams!: Table<Team, string>
  teamMembers!: Table<TeamMember, string>
  states!: Table<WorkflowState, string>
  projects!: Table<Project, string>
  milestones!: Table<Milestone, string>
  issues!: Table<Issue, string>
  issueLinks!: Table<IssueLink, string>
  labels!: Table<Label, string>
  cycles!: Table<Cycle, string>
  spaces!: Table<Space, string>
  docs!: Table<Doc, string>
  comments!: Table<Comment, string>
  attachments!: Table<Attachment, string>
  activities!: Table<Activity, string>
  notifications!: Table<Notification, string>
  timeLogs!: Table<TimeLog, string>
  goals!: Table<Goal, string>
  risks!: Table<Risk, string>
  automations!: Table<Automation, string>
  automationRuns!: Table<AutomationRun, string>
  savedViews!: Table<SavedView, string>

  constructor() {
    super('orbit-tracker')
    this.version(1).stores({
      workspaces: 'id',
      users: 'id, email, role, status',
      teams: 'id, key, leadId, archivedAt',
      teamMembers: 'id, teamId, userId, [teamId+userId]',
      states: 'id, teamId, category, order',
      projects: 'id, key, status, leadId, health, archivedAt',
      milestones: 'id, projectId, targetDate, status',
      issues: 'id, key, seq, teamId, projectId, parentId, stateId, assigneeId, reporterId, cycleId, milestoneId, type, priority, dueDate, updatedAt, createdAt, completedAt, archivedAt',
      issueLinks: 'id, fromId, toId, type',
      labels: 'id, name, group',
      cycles: 'id, teamId, status, number, startDate',
      spaces: 'id, kind, teamId, visibility',
      docs: 'id, spaceId, projectId, parentId, authorId, status, updatedAt, pinned',
      comments: 'id, entityId, [entityType+entityId], authorId, createdAt, parentId',
      attachments: 'id, entityId, [entityType+entityId], uploadedById',
      activities: 'id, actorId, entityId, [entityType+entityId], projectId, teamId, createdAt',
      notifications: 'id, userId, read, createdAt, [userId+read]',
      timeLogs: 'id, issueId, userId, date',
      goals: 'id, ownerId, period, status',
      risks: 'id, projectId, status, severity',
      automations: 'id, teamId, projectId, enabled',
      automationRuns: 'id, automationId, createdAt',
      savedViews: 'id, ownerId, shared',
    })
  }
}

export const db = new OrbitDB()

/* ── id / time helpers ──────────────────────────────────────── */

let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rnd}`
}

export const now = (): string => new Date().toISOString()

/** Wipe every table — used by "Reset demo data". */
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}
