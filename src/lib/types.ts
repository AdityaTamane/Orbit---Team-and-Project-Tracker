/* ─────────────────────────────────────────────────────────────
   Orbit — domain model
   String-literal unions everywhere (tsconfig: erasableSyntaxOnly)
   ───────────────────────────────────────────────────────────── */

export type ID = string
export type ISODate = string

/* ── Identity & org ─────────────────────────────────────────── */

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest'
export type UserStatus = 'active' | 'invited' | 'deactivated'

export interface User {
  id: ID
  name: string
  email: string
  password: string
  avatarColor: string
  avatarUrl?: string
  title: string
  role: WorkspaceRole
  status: UserStatus
  timezone: string
  /** Weekly capacity in hours — drives workload heatmaps */
  capacityHours: number
  skills: string[]
  bio?: string
  createdAt: ISODate
  lastSeenAt?: ISODate
}

export interface Workspace {
  id: ID
  name: string
  slug: string
  logoEmoji: string
  plan: 'free' | 'startup' | 'business' | 'enterprise'
  createdAt: ISODate
  settings: {
    weekStart: 0 | 1
    workingDays: number[]
    estimateScale: 'fibonacci' | 'linear' | 'tshirt' | 'hours'
    defaultCycleDays: number
    autoArchiveDays: number
    allowGuestComments: boolean
  }
}

/* ── Teams ──────────────────────────────────────────────────── */

export type TeamMemberRole = 'lead' | 'member'

export interface Team {
  id: ID
  key: string // ENG, DES — prefixes issue keys
  name: string
  description: string
  icon: string
  color: string
  leadId: ID
  visibility: 'public' | 'private'
  cycleDays: number
  cycleEnabled: boolean
  createdAt: ISODate
  archivedAt?: ISODate
}

export interface TeamMember {
  id: ID
  teamId: ID
  userId: ID
  role: TeamMemberRole
  allocationPct: number
  joinedAt: ISODate
}

/* ── Workflow ───────────────────────────────────────────────── */

export type StateCategory = 'backlog' | 'unstarted' | 'started' | 'paused' | 'completed' | 'canceled'

export interface WorkflowState {
  id: ID
  teamId: ID
  name: string
  category: StateCategory
  color: string
  order: number
  description?: string
}

/* ── Projects ───────────────────────────────────────────────── */

export type ProjectStatus = 'backlog' | 'planned' | 'in_progress' | 'paused' | 'completed' | 'canceled'
export type Health = 'on_track' | 'at_risk' | 'off_track' | 'unknown'
export type Priority = 0 | 1 | 2 | 3 | 4 // none, low, medium, high, urgent

export interface Project {
  id: ID
  key: string
  name: string
  summary: string
  description: string
  icon: string
  color: string
  status: ProjectStatus
  health: Health
  healthNote?: string
  priority: Priority
  leadId: ID
  memberIds: ID[]
  teamIds: ID[]
  startDate?: ISODate
  targetDate?: ISODate
  completedAt?: ISODate
  tags: string[]
  budgetHours?: number
  spaceId?: ID
  templateId?: string
  /** Onboarding wizard progress — a project is "onboarded" at 100 */
  onboarding: { step: number; completedSteps: string[]; done: boolean }
  createdAt: ISODate
  updatedAt: ISODate
  archivedAt?: ISODate
}

export interface Milestone {
  id: ID
  projectId: ID
  name: string
  description: string
  targetDate: ISODate
  status: 'upcoming' | 'in_progress' | 'done' | 'missed'
  order: number
}

/* ── Work items ─────────────────────────────────────────────── */

export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'spike' | 'chore'
export type LinkType = 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates'

export interface ChecklistItem {
  id: ID
  text: string
  done: boolean
}

export interface Issue {
  id: ID
  key: string // ENG-142
  seq: number
  teamId: ID
  projectId?: ID
  parentId?: ID
  type: IssueType
  title: string
  description: string
  stateId: ID
  priority: Priority
  assigneeId?: ID
  reporterId: ID
  labelIds: ID[]
  estimate?: number
  cycleId?: ID
  milestoneId?: ID
  startDate?: ISODate
  dueDate?: ISODate
  order: number
  checklist: ChecklistItem[]
  subscriberIds: ID[]
  customFields: Record<string, string | number | boolean>
  createdAt: ISODate
  updatedAt: ISODate
  startedAt?: ISODate
  completedAt?: ISODate
  canceledAt?: ISODate
  archivedAt?: ISODate
}

export interface IssueLink {
  id: ID
  fromId: ID
  toId: ID
  type: LinkType
  createdAt: ISODate
}

export interface Label {
  id: ID
  name: string
  color: string
  description?: string
  group?: string
}

/* ── Cycles / sprints ───────────────────────────────────────── */

export interface Cycle {
  id: ID
  teamId: ID
  number: number
  name: string
  goal: string
  startDate: ISODate
  endDate: ISODate
  status: 'upcoming' | 'active' | 'completed'
  /** Daily snapshot of remaining points — powers the burndown */
  snapshots: { date: ISODate; remaining: number; completed: number; scope: number }[]
}

/* ── Shared spaces & docs ───────────────────────────────────── */

export interface Space {
  id: ID
  name: string
  description: string
  icon: string
  color: string
  kind: 'team' | 'project' | 'company' | 'personal'
  teamId?: ID
  visibility: 'open' | 'closed' | 'secret'
  memberIds: ID[]
  createdBy: ID
  createdAt: ISODate
}

export interface Doc {
  id: ID
  spaceId?: ID
  projectId?: ID
  parentId?: ID
  title: string
  icon: string
  body: string
  kind: 'doc' | 'spec' | 'meeting' | 'decision' | 'runbook' | 'retro'
  status: 'draft' | 'published' | 'archived'
  authorId: ID
  collaboratorIds: ID[]
  tags: string[]
  pinned: boolean
  createdAt: ISODate
  updatedAt: ISODate
  versions: { at: ISODate; byId: ID; body: string }[]
}

/* ── Collaboration ──────────────────────────────────────────── */

export type EntityType = 'issue' | 'project' | 'doc' | 'space' | 'cycle' | 'team' | 'goal' | 'risk'

export interface Comment {
  id: ID
  entityType: EntityType
  entityId: ID
  parentId?: ID
  authorId: ID
  body: string
  mentionIds: ID[]
  reactions: Record<string, ID[]> // emoji -> userIds
  resolved: boolean
  createdAt: ISODate
  editedAt?: ISODate
}

export interface Attachment {
  id: ID
  entityType: EntityType
  entityId: ID
  name: string
  mime: string
  size: number
  dataUrl: string
  uploadedById: ID
  createdAt: ISODate
}

export interface Activity {
  id: ID
  actorId: ID
  verb: string
  entityType: EntityType
  entityId: ID
  entityLabel: string
  projectId?: ID
  teamId?: ID
  meta: Record<string, any>
  createdAt: ISODate
}

export interface Notification {
  id: ID
  userId: ID
  actorId?: ID
  kind: 'mention' | 'assign' | 'comment' | 'state' | 'due' | 'automation' | 'system' | 'invite' | 'risk'
  title: string
  body: string
  link: string
  entityType?: EntityType
  entityId?: ID
  read: boolean
  createdAt: ISODate
}

/* ── Time & workload ────────────────────────────────────────── */

export interface TimeLog {
  id: ID
  issueId: ID
  userId: ID
  minutes: number
  date: ISODate
  note: string
  createdAt: ISODate
}

/* ── Goals (OKR) & risks ────────────────────────────────────── */

export interface KeyResult {
  id: ID
  name: string
  start: number
  target: number
  current: number
  unit: string
}

export interface Goal {
  id: ID
  name: string
  description: string
  ownerId: ID
  teamIds: ID[]
  projectIds: ID[]
  period: string // 2026-Q3
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved' | 'missed'
  keyResults: KeyResult[]
  createdAt: ISODate
  updatedAt: ISODate
}

export interface Risk {
  id: ID
  projectId: ID
  title: string
  detail: string
  severity: 1 | 2 | 3 | 4
  likelihood: 1 | 2 | 3 | 4
  mitigation: string
  ownerId: ID
  status: 'open' | 'mitigating' | 'closed'
  createdAt: ISODate
}

/* ── Automations ────────────────────────────────────────────── */

export type TriggerType =
  | 'issue.created'
  | 'issue.state_changed'
  | 'issue.assigned'
  | 'issue.priority_changed'
  | 'issue.commented'
  | 'issue.due_soon'
  | 'issue.stale'

export type ActionType =
  | 'set_state'
  | 'set_assignee'
  | 'set_priority'
  | 'add_label'
  | 'add_comment'
  | 'notify_user'
  | 'move_to_cycle'
  | 'set_project_health'

export interface AutomationCondition {
  field: 'type' | 'priority' | 'labelId' | 'projectId' | 'assigneeId' | 'stateCategory' | 'estimate'
  op: 'eq' | 'neq' | 'gte' | 'lte' | 'in' | 'has'
  value: string | number | string[]
}

export interface AutomationAction {
  type: ActionType
  value: string | number
}

export interface Automation {
  id: ID
  name: string
  description: string
  teamId?: ID
  projectId?: ID
  enabled: boolean
  trigger: { type: TriggerType; config: Record<string, any> }
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  runCount: number
  lastRunAt?: ISODate
  createdBy: ID
  createdAt: ISODate
}

export interface AutomationRun {
  id: ID
  automationId: ID
  automationName: string
  issueId?: ID
  issueKey?: string
  summary: string
  status: 'success' | 'skipped' | 'error'
  createdAt: ISODate
}

/* ── Views & filters ────────────────────────────────────────── */

export type ViewLayout = 'board' | 'list' | 'table' | 'timeline' | 'calendar'
export type GroupBy = 'state' | 'assignee' | 'priority' | 'project' | 'type' | 'label' | 'cycle' | 'team' | 'milestone' | 'none'
export type SortBy = 'manual' | 'priority' | 'created' | 'updated' | 'due' | 'estimate' | 'title'

export interface IssueFilter {
  text?: string
  teamIds?: ID[]
  projectIds?: ID[]
  assigneeIds?: ID[]
  stateIds?: ID[]
  stateCategories?: StateCategory[]
  priorities?: Priority[]
  types?: IssueType[]
  labelIds?: ID[]
  cycleIds?: ID[]
  milestoneIds?: ID[]
  dueWithinDays?: number
  overdueOnly?: boolean
  unassignedOnly?: boolean
  includeArchived?: boolean
  hasBlockers?: boolean
  parentId?: ID | null
}

export interface SavedView {
  id: ID
  name: string
  icon: string
  ownerId: ID
  shared: boolean
  layout: ViewLayout
  groupBy: GroupBy
  sortBy: SortBy
  filter: IssueFilter
  createdAt: ISODate
}

/* ── Onboarding templates ───────────────────────────────────── */

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: string
  color: string
  tags: string[]
  milestones: { name: string; offsetDays: number; description: string }[]
  issues: { title: string; type: IssueType; estimate: number; priority: Priority; description?: string }[]
  docs: { title: string; icon: string; kind: Doc['kind']; body: string }[]
  automations?: string[]
}

/* ── Presence (transient, not persisted) ────────────────────── */

export interface Presence {
  userId: ID
  name: string
  color: string
  route: string
  label: string
  at: number
  typingOn?: string
}
