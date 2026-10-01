import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/lib/db'
import type {
  Activity, Automation, AutomationRun, Comment, Cycle, Doc, EntityType, Goal, Issue, IssueLink,
  Label, Milestone, Notification, Project, Risk, SavedView, Space, Team, TeamMember, TimeLog,
  User, WorkflowState, Workspace,
} from '@/lib/types'

const EMPTY: never[] = []

/* ── Core collections ───────────────────────────────────────── */

export const useWorkspace = (): Workspace | undefined =>
  useLiveQuery(() => db.workspaces.toCollection().first(), [])

export const useUsers = (): User[] =>
  useLiveQuery(() => db.users.toArray(), [], EMPTY as User[])

export const useTeams = (): Team[] =>
  useLiveQuery(async () => (await db.teams.toArray()).filter((t) => !t.archivedAt), [], EMPTY as Team[])

export const useTeamMembers = (teamId?: string): TeamMember[] =>
  useLiveQuery(
    () => (teamId ? db.teamMembers.where('teamId').equals(teamId).toArray() : db.teamMembers.toArray()),
    [teamId],
    EMPTY as TeamMember[],
  )

export const useStates = (teamId?: string): WorkflowState[] =>
  useLiveQuery(
    async () => {
      const rows = teamId ? await db.states.where('teamId').equals(teamId).toArray() : await db.states.toArray()
      return rows.sort((a, b) => a.order - b.order)
    },
    [teamId],
    EMPTY as WorkflowState[],
  )

export const useProjects = (includeArchived = false): Project[] =>
  useLiveQuery(
    async () => {
      const rows = await db.projects.toArray()
      return (includeArchived ? rows : rows.filter((p) => !p.archivedAt)).sort(
        (a, b) => b.priority - a.priority || a.name.localeCompare(b.name),
      )
    },
    [includeArchived],
    EMPTY as Project[],
  )

export const useProject = (id?: string): Project | undefined =>
  useLiveQuery(() => (id ? db.projects.get(id) : undefined), [id])

export const useIssues = (): Issue[] =>
  useLiveQuery(() => db.issues.toArray(), [], EMPTY as Issue[])

export const useIssue = (id?: string): Issue | undefined =>
  useLiveQuery(() => (id ? db.issues.get(id) : undefined), [id])

export const useIssuesByProject = (projectId?: string): Issue[] =>
  useLiveQuery(
    async (): Promise<Issue[]> => (projectId ? db.issues.where('projectId').equals(projectId).toArray() : []),
    [projectId],
    EMPTY as Issue[],
  )

export const useIssuesByTeam = (teamId?: string): Issue[] =>
  useLiveQuery(
    async (): Promise<Issue[]> => (teamId ? db.issues.where('teamId').equals(teamId).toArray() : []),
    [teamId],
    EMPTY as Issue[],
  )

export const useSubIssues = (parentId?: string): Issue[] =>
  useLiveQuery(
    async (): Promise<Issue[]> => (parentId ? db.issues.where('parentId').equals(parentId).toArray() : []),
    [parentId],
    EMPTY as Issue[],
  )

export const useIssueLinks = (issueId?: string): IssueLink[] =>
  useLiveQuery(
    async () => {
      if (!issueId) return []
      const all = await db.issueLinks.toArray()
      return all.filter((l) => l.fromId === issueId || l.toId === issueId)
    },
    [issueId],
    EMPTY as IssueLink[],
  )

export const useAllIssueLinks = (): IssueLink[] =>
  useLiveQuery(() => db.issueLinks.toArray(), [], EMPTY as IssueLink[])

export const useLabels = (): Label[] =>
  useLiveQuery(() => db.labels.toArray(), [], EMPTY as Label[])

export const useCycles = (teamId?: string): Cycle[] =>
  useLiveQuery(
    async () => {
      const rows = teamId ? await db.cycles.where('teamId').equals(teamId).toArray() : await db.cycles.toArray()
      return rows.sort((a, b) => a.number - b.number)
    },
    [teamId],
    EMPTY as Cycle[],
  )

export const useMilestones = (projectId?: string): Milestone[] =>
  useLiveQuery(
    async () => {
      const rows = projectId ? await db.milestones.where('projectId').equals(projectId).toArray() : await db.milestones.toArray()
      return rows.sort((a, b) => a.order - b.order)
    },
    [projectId],
    EMPTY as Milestone[],
  )

export const useSpaces = (): Space[] =>
  useLiveQuery(() => db.spaces.toArray(), [], EMPTY as Space[])

export const useSpace = (id?: string): Space | undefined =>
  useLiveQuery(() => (id ? db.spaces.get(id) : undefined), [id])

export const useDocs = (): Doc[] =>
  useLiveQuery(
    async () => (await db.docs.toArray()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [],
    EMPTY as Doc[],
  )

export const useDoc = (id?: string): Doc | undefined =>
  useLiveQuery(() => (id ? db.docs.get(id) : undefined), [id])

export const useComments = (entityType?: EntityType, entityId?: string): Comment[] =>
  useLiveQuery(
    async () => {
      if (!entityType || !entityId) return []
      const rows = await db.comments.where('[entityType+entityId]').equals([entityType, entityId]).toArray()
      return rows.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    },
    [entityType, entityId],
    EMPTY as Comment[],
  )

export const useActivities = (limit = 60, filter?: { projectId?: string; teamId?: string; entityId?: string }): Activity[] =>
  useLiveQuery(
    async () => {
      let rows = await db.activities.toArray()
      if (filter?.projectId) rows = rows.filter((a) => a.projectId === filter.projectId)
      if (filter?.teamId) rows = rows.filter((a) => a.teamId === filter.teamId)
      if (filter?.entityId) rows = rows.filter((a) => a.entityId === filter.entityId)
      return rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit)
    },
    [limit, filter?.projectId, filter?.teamId, filter?.entityId],
    EMPTY as Activity[],
  )

export const useNotifications = (userId?: string | null): Notification[] =>
  useLiveQuery(
    async () => {
      if (!userId) return []
      const rows = await db.notifications.where('userId').equals(userId).toArray()
      return rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    },
    [userId],
    EMPTY as Notification[],
  )

export const useGoals = (): Goal[] =>
  useLiveQuery(() => db.goals.toArray(), [], EMPTY as Goal[])

export const useRisks = (projectId?: string): Risk[] =>
  useLiveQuery(
    async () => {
      const rows = projectId ? await db.risks.where('projectId').equals(projectId).toArray() : await db.risks.toArray()
      return rows.sort((a, b) => b.severity * b.likelihood - a.severity * a.likelihood)
    },
    [projectId],
    EMPTY as Risk[],
  )

export const useAutomations = (): Automation[] =>
  useLiveQuery(() => db.automations.toArray(), [], EMPTY as Automation[])

export const useAutomationRuns = (limit = 40): AutomationRun[] =>
  useLiveQuery(
    async () => (await db.automationRuns.toArray()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit),
    [limit],
    EMPTY as AutomationRun[],
  )

export const useSavedViews = (): SavedView[] =>
  useLiveQuery(() => db.savedViews.toArray(), [], EMPTY as SavedView[])

export const useTimeLogs = (issueId?: string): TimeLog[] =>
  useLiveQuery(
    () => (issueId ? db.timeLogs.where('issueId').equals(issueId).toArray() : db.timeLogs.toArray()),
    [issueId],
    EMPTY as TimeLog[],
  )

/* ── Derived maps ───────────────────────────────────────────── */

export function useMap<T extends { id: string }>(rows: T[]): Map<string, T> {
  return useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows])
}

/** One call for the lookups nearly every screen needs. */
export function useLookups() {
  const users = useUsers()
  const teams = useTeams()
  const states = useStates()
  const projects = useProjects()
  const labels = useLabels()
  const cycles = useCycles()

  const userMap = useMap(users)
  const teamMap = useMap(teams)
  const stateMap = useMap(states)
  const projectMap = useMap(projects)
  const labelMap = useMap(labels)
  const cycleMap = useMap(cycles)

  return { users, teams, states, projects, labels, cycles, userMap, teamMap, stateMap, projectMap, labelMap, cycleMap }
}

/** Comment counts keyed by entity id — cheap enough for a local dataset. */
export function useCommentCounts(): Map<string, number> {
  const rows = useLiveQuery(() => db.comments.toArray(), [], EMPTY as Comment[])
  return useMemo(() => {
    const map = new Map<string, number>()
    for (const c of rows) map.set(c.entityId, (map.get(c.entityId) ?? 0) + 1)
    return map
  }, [rows])
}
