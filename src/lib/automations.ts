/**
 * Rules engine. Issue mutations emit events here; matching rules apply their
 * actions and record a run so the Automations page can show real history.
 */
import { db, now, uid } from './db'
import { logActivity, notify } from './activity'
import type { Automation, AutomationCondition, Issue, TriggerType, WorkflowState } from './types'

export interface AutomationEvent {
  type: TriggerType
  issue: Issue
  actorId: string
  toCategory?: WorkflowState['category']
}

function conditionMet(cond: AutomationCondition, issue: Issue, state?: WorkflowState): boolean {
  const val = (() => {
    switch (cond.field) {
      case 'type': return issue.type
      case 'priority': return issue.priority
      case 'projectId': return issue.projectId ?? ''
      case 'assigneeId': return issue.assigneeId ?? ''
      case 'estimate': return issue.estimate ?? 0
      case 'stateCategory': return state?.category ?? ''
      case 'labelId': return issue.labelIds
      default: return ''
    }
  })()

  switch (cond.op) {
    case 'eq': return val === cond.value
    case 'neq': return val !== cond.value
    case 'gte': return Number(val) >= Number(cond.value)
    case 'lte': return Number(val) <= Number(cond.value)
    case 'in': return Array.isArray(cond.value) && cond.value.includes(String(val))
    case 'has': return Array.isArray(val) && val.includes(String(cond.value))
    default: return false
  }
}

async function recordRun(automation: Automation, issue: Issue | undefined, status: 'success' | 'skipped' | 'error', summary: string) {
  await db.automationRuns.add({
    id: uid('ar'),
    automationId: automation.id,
    automationName: automation.name,
    issueId: issue?.id,
    issueKey: issue?.key,
    summary,
    status,
    createdAt: now(),
  })
  await db.automations.update(automation.id, {
    runCount: automation.runCount + (status === 'success' ? 1 : 0),
    lastRunAt: now(),
  })
}

/** Runs every enabled rule that matches the event. Returns the applied summaries. */
export async function runAutomations(event: AutomationEvent): Promise<string[]> {
  const all = await db.automations.toArray()
  const state = await db.states.get(event.issue.stateId)
  const applied: string[] = []

  for (const rule of all) {
    if (!rule.enabled) continue
    if (rule.trigger.type !== event.type) continue
    if (rule.teamId && rule.teamId !== event.issue.teamId) continue
    if (rule.projectId && rule.projectId !== event.issue.projectId) continue
    if (rule.trigger.config?.toCategory && rule.trigger.config.toCategory !== event.toCategory) continue

    const matches = rule.conditions.every((c) => conditionMet(c, event.issue, state))
    if (!matches) {
      await recordRun(rule, event.issue, 'skipped', 'Conditions not met')
      continue
    }

    const changes: Partial<Issue> = {}
    const summaries: string[] = []

    for (const action of rule.actions) {
      switch (action.type) {
        case 'set_state': {
          const target = await db.states.get(String(action.value))
          if (target && target.teamId === event.issue.teamId) {
            changes.stateId = target.id
            summaries.push(`moved to ${target.name}`)
          }
          break
        }
        case 'set_assignee': {
          const user = await db.users.get(String(action.value))
          if (user) {
            changes.assigneeId = user.id
            summaries.push(`assigned to ${user.name}`)
          }
          break
        }
        case 'set_priority':
          changes.priority = Number(action.value) as Issue['priority']
          summaries.push('priority updated')
          break
        case 'add_label': {
          const labelId = String(action.value)
          if (!event.issue.labelIds.includes(labelId)) {
            changes.labelIds = [...event.issue.labelIds, labelId]
            const label = await db.labels.get(labelId)
            summaries.push(`labelled ${label?.name ?? 'label'}`)
          }
          break
        }
        case 'add_comment':
          await db.comments.add({
            id: uid('cm'), entityType: 'issue', entityId: event.issue.id,
            authorId: 'automation', body: String(action.value), mentionIds: [],
            reactions: {}, resolved: false, createdAt: now(),
          })
          summaries.push('comment posted')
          break
        case 'notify_user': {
          const target = action.value === 'assignee' ? event.issue.assigneeId : String(action.value)
          if (target) {
            await notify({
              userId: target, kind: 'automation',
              title: `Automation: ${rule.name}`,
              body: `${event.issue.key} · ${event.issue.title}`,
              link: `/app/issues/${event.issue.id}`,
              entityType: 'issue', entityId: event.issue.id,
            })
            summaries.push('notification sent')
          }
          break
        }
        case 'move_to_cycle':
          changes.cycleId = String(action.value)
          summaries.push('moved to cycle')
          break
        case 'set_project_health':
          if (event.issue.projectId) {
            await db.projects.update(event.issue.projectId, { health: String(action.value) as any })
            summaries.push('project health updated')
          }
          break
      }
    }

    if (Object.keys(changes).length) {
      await db.issues.update(event.issue.id, { ...changes, updatedAt: now() })
      Object.assign(event.issue, changes)
    }

    const summary = summaries.length ? summaries.join(', ') : 'no changes needed'
    await recordRun(rule, event.issue, 'success', summary)
    await logActivity({
      actorId: 'automation', verb: 'automated', entityType: 'issue',
      entityId: event.issue.id, entityLabel: event.issue.key,
      projectId: event.issue.projectId, teamId: event.issue.teamId,
      meta: { rule: rule.name, summary },
    })
    applied.push(`${rule.name}: ${summary}`)
  }

  return applied
}

/** Sweep for time-based triggers (stale work, due soon). Called on app boot. */
export async function runScheduledAutomations(): Promise<number> {
  const rules = (await db.automations.toArray()).filter((r) => r.enabled && ['issue.stale', 'issue.due_soon'].includes(r.trigger.type))
  if (!rules.length) return 0
  const issues = await db.issues.toArray()
  const states = await db.states.toArray()
  const stateMap = new Map(states.map((s) => [s.id, s]))
  const today = Date.now()
  let fired = 0

  for (const rule of rules) {
    const days = Number(rule.trigger.config?.days ?? 14)
    const candidates = issues.filter((issue) => {
      const state = stateMap.get(issue.stateId)
      if (!state || ['completed', 'canceled'].includes(state.category)) return false
      if (rule.teamId && rule.teamId !== issue.teamId) return false
      if (rule.projectId && rule.projectId !== issue.projectId) return false
      if (rule.trigger.type === 'issue.stale') {
        return today - +new Date(issue.updatedAt) > days * 86400000
      }
      if (!issue.dueDate) return false
      const delta = +new Date(issue.dueDate) - today
      return delta > 0 && delta < days * 86400000
    })

    // Only surface a bounded number per boot so the demo never floods.
    for (const issue of candidates.slice(0, 3)) {
      await runAutomations({ type: rule.trigger.type, issue, actorId: 'automation' })
      fired += 1
    }
  }
  return fired
}

export async function toggleAutomation(id: string, enabled: boolean): Promise<void> {
  await db.automations.update(id, { enabled })
}

export async function saveAutomation(automation: Automation): Promise<void> {
  await db.automations.put(automation)
}

export async function deleteAutomation(id: string): Promise<void> {
  await db.automations.delete(id)
  const runs = await db.automationRuns.where('automationId').equals(id).toArray()
  await db.automationRuns.bulkDelete(runs.map((r) => r.id))
}
