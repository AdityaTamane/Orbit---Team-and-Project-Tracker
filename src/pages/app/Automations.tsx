import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form'
import { PageHeader, SectionTitle, Tabs } from '@/components/ui/misc'
import { useAutomationRuns, useAutomations, useLookups, useStates } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { now, uid } from '@/lib/db'
import { deleteAutomation, runScheduledAutomations, saveAutomation, toggleAutomation } from '@/lib/automations'
import { fmtRelative } from '@/lib/format'
import { toast } from '@/lib/store'
import type { ActionType, Automation, AutomationAction, AutomationCondition, TriggerType } from '@/lib/types'

const TRIGGER_LABEL: Record<TriggerType, string> = {
  'issue.created': 'An issue is created',
  'issue.state_changed': 'An issue changes status',
  'issue.assigned': 'An issue is assigned',
  'issue.priority_changed': 'Priority changes',
  'issue.commented': 'Someone comments',
  'issue.due_soon': 'A due date is approaching',
  'issue.stale': 'Work goes stale',
}

const ACTION_LABEL: Record<ActionType, string> = {
  set_state: 'Move to status',
  set_assignee: 'Assign to',
  set_priority: 'Set priority',
  add_label: 'Add label',
  add_comment: 'Post a comment',
  notify_user: 'Notify',
  move_to_cycle: 'Move to cycle',
  set_project_health: 'Set project health',
}

export function Automations() {
  const actorId = useActorId()
  const automations = useAutomations()
  const runs = useAutomationRuns(60)
  const { teams, projects, userMap } = useLookups()

  const [tab, setTab] = useState<'rules' | 'history'>('rules')
  const [editing, setEditing] = useState<Automation | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Automation | null>(null)

  const stats = useMemo(() => ({
    enabled: automations.filter((a) => a.enabled).length,
    runs: automations.reduce((s, a) => s + a.runCount, 0),
    recent: runs.filter((r) => +new Date(r.createdAt) > Date.now() - 7 * 86400000).length,
    errors: runs.filter((r) => r.status === 'error').length,
  }), [automations, runs])

  return (
    <div className="pb-10">
      <PageHeader
        title="Automations"
        subtitle="Rules that keep the board honest without anyone policing it."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="zap" size={19} /></span>}
        actions={
          <>
            <Button
              variant="secondary"
              icon="play"
              onClick={async () => {
                const fired = await runScheduledAutomations()
                toast.success(fired ? `${fired} time-based rules ran` : 'Nothing matched the time-based rules')
              }}
            >
              Run time-based rules
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>New rule</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'rules', label: 'Rules', icon: 'workflow', count: automations.length },
              { value: 'history', label: 'Run history', icon: 'history', count: runs.length },
            ]}
          />
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active rules" value={stats.enabled} hint={`${automations.length - stats.enabled} paused`} icon={<Icon name="zap" size={15} className="text-faint" />} />
          <Stat label="Total runs" value={stats.runs} icon={<Icon name="repeat" size={15} className="text-faint" />} />
          <Stat label="This week" value={stats.recent} hint="rule executions" icon={<Icon name="calendar" size={15} className="text-faint" />} />
          <Stat label="Errors" value={stats.errors} tone={stats.errors ? 'bad' : 'good'} icon={<Icon name="alert-circle" size={15} className="text-faint" />} />
        </div>

        {tab === 'rules' && (
          !automations.length ? (
            <EmptyState
              icon={<Icon name="zap" size={20} />}
              title="No automations yet"
              description="A rule is a trigger, some conditions and one or more actions. Start with triaging urgent bugs."
              action={<Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Create a rule</Button>}
            />
          ) : (
            <div className="space-y-3">
              {automations.map((rule) => {
                const scope = rule.teamId ? teams.find((t) => t.id === rule.teamId)?.name : rule.projectId ? projects.find((p) => p.id === rule.projectId)?.name : 'Whole workspace'
                return (
                  <section key={rule.id} className={clsx('card p-4 transition', !rule.enabled && 'opacity-70')}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', rule.enabled ? 'bg-brand-500/12 text-brand-600 dark:text-brand-300' : 'bg-sunken text-faint')}>
                          <Icon name="zap" size={17} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-ink">{rule.name}</h3>
                            <Badge className="bg-sunken text-muted">{scope}</Badge>
                            {rule.runCount > 0 && <Badge className="bg-sunken text-faint">{rule.runCount} runs</Badge>}
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-muted">{rule.description}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Switch checked={rule.enabled} onChange={(v) => { toggleAutomation(rule.id, v); toast.success(v ? 'Rule enabled' : 'Rule paused') }} />
                        <button onClick={() => setEditing(rule)} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-sunken hover:text-ink" aria-label="Edit rule">
                          <Icon name="pen" size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(rule)} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-rose-500/10 hover:text-rose-500" aria-label="Delete rule">
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-sunken/50 p-2.5 text-xs">
                      <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">WHEN</Badge>
                      <span className="text-ink">{TRIGGER_LABEL[rule.trigger.type]}</span>
                      {rule.trigger.config?.toCategory && <Badge className="bg-sunken text-muted">to {String(rule.trigger.config.toCategory)}</Badge>}
                      {rule.trigger.config?.days && <Badge className="bg-sunken text-muted">{rule.trigger.config.days} days</Badge>}

                      {rule.conditions.length > 0 && (
                        <>
                          <Icon name="chevron-right" size={13} className="text-faint" />
                          <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300">IF</Badge>
                          {rule.conditions.map((c, i) => (
                            <span key={i} className="chip bg-surface text-muted">{c.field} {c.op} {String(c.value)}</span>
                          ))}
                        </>
                      )}

                      <Icon name="chevron-right" size={13} className="text-faint" />
                      <Badge className="bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">THEN</Badge>
                      {rule.actions.map((a, i) => (
                        <span key={i} className="chip bg-surface text-muted">
                          {ACTION_LABEL[a.type]}{typeof a.value === 'string' && a.value.length < 30 ? `: ${a.value}` : ''}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-2xs text-faint">
                      <Avatar user={userMap.get(rule.createdBy)} size="xs" />
                      <span>created by {userMap.get(rule.createdBy)?.name ?? 'someone'}</span>
                      {rule.lastRunAt && <span>· last ran {fmtRelative(rule.lastRunAt)}</span>}
                    </div>
                  </section>
                )
              })}
            </div>
          )
        )}

        {tab === 'history' && (
          <section>
            <SectionTitle>Recent runs</SectionTitle>
            {runs.length ? (
              <div className="card divide-y divide-line">
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={clsx('grid h-7 w-7 shrink-0 place-items-center rounded-full',
                      run.status === 'success' ? 'bg-emerald-500/12 text-emerald-500' : run.status === 'error' ? 'bg-rose-500/12 text-rose-500' : 'bg-sunken text-faint')}>
                      <Icon name={run.status === 'success' ? 'check' : run.status === 'error' ? 'x' : 'minus'} size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{run.automationName}</p>
                      <p className="truncate text-xs text-muted">{run.summary}</p>
                    </div>
                    {run.issueKey && <span className="hidden shrink-0 font-mono text-2xs text-faint sm:block">{run.issueKey}</span>}
                    <span className="shrink-0 text-2xs text-faint">{fmtRelative(run.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Icon name="history" size={20} />} title="No runs yet" description="Rules record every execution here, including the ones they skip." />
            )}
          </section>
        )}
      </div>

      <RuleModal
        open={!!editing}
        rule={editing === 'new' ? null : editing}
        actorId={actorId}
        onClose={() => setEditing(null)}
        onSave={async (rule) => { await saveAutomation(rule); toast.success('Rule saved') }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => { if (confirmDelete) await deleteAutomation(confirmDelete.id); toast.success('Rule deleted') }}
        title="Delete this rule?"
        message="The rule and its run history are removed. Anything it already did stays as it is."
        confirmLabel="Delete rule"
        danger
      />
    </div>
  )
}

function RuleModal({ open, rule, actorId, onClose, onSave }: {
  open: boolean
  rule: Automation | null
  actorId: string
  onClose: () => void
  onSave: (r: Automation) => Promise<void>
}) {
  const { teams, projects, users, labels } = useLookups()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState<TriggerType>('issue.created')
  const [triggerDays, setTriggerDays] = useState(14)
  const [scope, setScope] = useState('workspace')
  const [conditions, setConditions] = useState<AutomationCondition[]>([])
  const [actions, setActions] = useState<AutomationAction[]>([{ type: 'set_priority', value: 3 }])
  const [enabled, setEnabled] = useState(true)
  const [seeded, setSeeded] = useState<string | null>(null)

  const scopeTeamId = scope.startsWith('team:') ? scope.slice(5) : undefined
  const scopeProjectId = scope.startsWith('project:') ? scope.slice(8) : undefined
  const states = useStates(scopeTeamId)

  const seedKey = rule?.id ?? (open ? 'new' : null)
  if (open && seeded !== seedKey) {
    setSeeded(seedKey)
    setName(rule?.name ?? '')
    setDescription(rule?.description ?? '')
    setTrigger(rule?.trigger.type ?? 'issue.created')
    setTriggerDays(Number(rule?.trigger.config?.days ?? 14))
    setScope(rule?.teamId ? `team:${rule.teamId}` : rule?.projectId ? `project:${rule.projectId}` : 'workspace')
    setConditions(rule?.conditions ?? [])
    setActions(rule?.actions ?? [{ type: 'set_priority', value: 3 }])
    setEnabled(rule?.enabled ?? true)
  }

  const valueInput = (action: AutomationAction, i: number) => {
    const update = (value: string | number) => setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, value } : a)))
    switch (action.type) {
      case 'set_state':
        return (
          <Select value={String(action.value)} onChange={(e) => update(e.target.value)} className="h-8 !text-[13px]">
            <option value="">Choose a status…</option>
            {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )
      case 'set_assignee':
      case 'notify_user':
        return (
          <Select value={String(action.value)} onChange={(e) => update(e.target.value)} className="h-8 !text-[13px]">
            <option value="">Choose someone…</option>
            {action.type === 'notify_user' && <option value="assignee">The assignee</option>}
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )
      case 'set_priority':
        return (
          <Select value={String(action.value)} onChange={(e) => update(Number(e.target.value))} className="h-8 !text-[13px]">
            <option value="0">No priority</option><option value="1">Low</option><option value="2">Medium</option>
            <option value="3">High</option><option value="4">Urgent</option>
          </Select>
        )
      case 'add_label':
        return (
          <Select value={String(action.value)} onChange={(e) => update(e.target.value)} className="h-8 !text-[13px]">
            <option value="">Choose a label…</option>
            {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        )
      case 'set_project_health':
        return (
          <Select value={String(action.value)} onChange={(e) => update(e.target.value)} className="h-8 !text-[13px]">
            <option value="on_track">On track</option><option value="at_risk">At risk</option><option value="off_track">Off track</option>
          </Select>
        )
      default:
        return <Input value={String(action.value)} onChange={(e) => update(e.target.value)} className="h-8 !text-[13px]" placeholder="Comment text…" />
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? 'Edit rule' : 'New automation rule'}
      subtitle="When something happens, if the conditions hold, do these things."
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="zap"
            disabled={!name.trim() || !actions.length}
            onClick={async () => {
              await onSave({
                id: rule?.id ?? uid('au'),
                name: name.trim(), description, enabled,
                teamId: scopeTeamId, projectId: scopeProjectId,
                trigger: {
                  type: trigger,
                  config: trigger === 'issue.stale' || trigger === 'issue.due_soon' ? { days: triggerDays } : {},
                },
                conditions, actions,
                runCount: rule?.runCount ?? 0,
                lastRunAt: rule?.lastRunAt,
                createdBy: rule?.createdBy ?? actorId,
                createdAt: rule?.createdAt ?? now(),
              })
              onClose()
            }}
          >
            Save rule
          </Button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <Field label="Rule name" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Triage urgent bugs" /></Field>
        <Field label="What does it do?"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[56px]" /></Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Scope">
            <Select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="workspace">Whole workspace</option>
              <optgroup label="Team">
                {teams.map((t) => <option key={t.id} value={`team:${t.id}`}>{t.name}</option>)}
              </optgroup>
              <optgroup label="Project">
                {projects.map((p) => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
              </optgroup>
            </Select>
          </Field>
          <Field label="Trigger">
            <Select value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerType)}>
              {Object.entries(TRIGGER_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
        </div>

        {(trigger === 'issue.stale' || trigger === 'issue.due_soon') && (
          <Field label={trigger === 'issue.stale' ? 'Days without activity' : 'Days before the due date'}>
            <Input type="number" min={1} value={triggerDays} onChange={(e) => setTriggerDays(Number(e.target.value))} className="w-32" />
          </Field>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Conditions (all must match)</span>
            <Button size="xs" variant="ghost" icon="plus" onClick={() => setConditions((prev) => [...prev, { field: 'priority', op: 'gte', value: 3 }])}>Add</Button>
          </div>
          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_90px_1fr_auto]">
                <Select value={c.field} onChange={(e) => setConditions((prev) => prev.map((x, idx) => (idx === i ? { ...x, field: e.target.value as any } : x)))} className="h-8 !text-[13px]">
                  <option value="type">Type</option><option value="priority">Priority</option><option value="labelId">Label</option>
                  <option value="projectId">Project</option><option value="assigneeId">Assignee</option>
                  <option value="stateCategory">Status category</option><option value="estimate">Estimate</option>
                </Select>
                <Select value={c.op} onChange={(e) => setConditions((prev) => prev.map((x, idx) => (idx === i ? { ...x, op: e.target.value as any } : x)))} className="h-8 !text-[13px]">
                  <option value="eq">is</option><option value="neq">is not</option><option value="gte">≥</option>
                  <option value="lte">≤</option><option value="has">has</option>
                </Select>
                <Input value={String(c.value)} onChange={(e) => setConditions((prev) => prev.map((x, idx) => (idx === i ? { ...x, value: /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value } : x)))} className="h-8 !text-[13px]" />
                <button onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))} className="grid h-8 w-8 place-items-center rounded text-faint hover:text-rose-500" aria-label="Remove condition">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            {!conditions.length && <p className="text-xs text-faint">No conditions — the rule fires on every matching trigger.</p>}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Actions</span>
            <Button size="xs" variant="ghost" icon="plus" onClick={() => setActions((prev) => [...prev, { type: 'add_comment', value: '' }])}>Add</Button>
          </div>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                <Select
                  value={a.type}
                  onChange={(e) => setActions((prev) => prev.map((x, idx) => (idx === i ? { type: e.target.value as ActionType, value: '' } : x)))}
                  className="h-8 !text-[13px]"
                >
                  {Object.entries(ACTION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
                {valueInput(a, i)}
                <button onClick={() => setActions((prev) => prev.filter((_, idx) => idx !== i))} className="grid h-8 w-8 place-items-center rounded text-faint hover:text-rose-500" aria-label="Remove action">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Switch checked={enabled} onChange={setEnabled} label="Enabled" description="Paused rules keep their history but stop firing." />
      </div>
    </Modal>
  )
}
