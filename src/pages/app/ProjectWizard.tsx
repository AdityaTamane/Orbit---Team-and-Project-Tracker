import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ColorPicker, EmojiPicker, Field, Input, Select, Switch, Textarea } from '@/components/ui/form'
import { InlineAlert } from '@/components/ui/misc'
import { useLookups } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { AVATAR_COLORS, PRIORITIES, PROJECT_ICONS, PROJECT_STATUSES } from '@/lib/constants'
import { createProjectFromWizard } from '@/lib/projects'
import { PROJECT_TEMPLATES, templateById } from '@/lib/templates'
import { toast } from '@/lib/store'
import type { Priority, ProjectStatus } from '@/lib/types'

const STEPS = [
  { key: 'basics', title: 'Basics', hint: 'Name it and give it an identity', icon: 'pen' },
  { key: 'team', title: 'People', hint: 'Who owns it, who works on it', icon: 'users' },
  { key: 'template', title: 'Template', hint: 'Scaffold the work in one click', icon: 'wand' },
  { key: 'plan', title: 'Plan', hint: 'Dates, status and priority', icon: 'calendar' },
  { key: 'review', title: 'Review', hint: 'Confirm what gets created', icon: 'check-circle' },
] as const

export function ProjectWizard() {
  const navigate = useNavigate()
  const actorId = useActorId()
  const { teams, users, userMap } = useLookups()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(PROJECT_ICONS[0])
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [leadId, setLeadId] = useState(actorId)
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [templateId, setTemplateId] = useState('tpl_product')
  const [status, setStatus] = useState<ProjectStatus>('planned')
  const [priority, setPriority] = useState<Priority>(2)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [targetDate, setTargetDate] = useState(format(addDays(new Date(), 90), 'yyyy-MM-dd'))
  const [tags, setTags] = useState('')
  const [budgetHours, setBudgetHours] = useState('')
  const [createSpace, setCreateSpace] = useState(true)

  const template = templateById(templateId)

  const autoKey = useMemo(() => {
    if (key) return key
    return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 4).toUpperCase() || 'PRJ'
  }, [name, key])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (step >= 0 && !name.trim()) e.name = 'Give the project a name.'
    if (step >= 1 && !teamIds.length) e.teams = 'Pick at least one team — issues need a workflow to live in.'
    if (step >= 3 && startDate && targetDate && new Date(targetDate) < new Date(startDate)) e.dates = 'The target date is before the start date.'
    return e
  }, [step, name, teamIds, startDate, targetDate])

  const canAdvance =
    (step === 0 && !!name.trim()) ||
    (step === 1 && teamIds.length > 0) ||
    step === 2 ||
    (step === 3 && !errors.dates) ||
    step === 4

  const suggestedMembers = useMemo(() => {
    if (!teamIds.length) return users
    return users
  }, [teamIds, users])

  const submit = async () => {
    setSaving(true)
    try {
      const project = await createProjectFromWizard({
        name, key: autoKey, summary, description, icon, color, status, priority, leadId,
        teamIds, memberIds, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        startDate: new Date(startDate).toISOString(),
        targetDate: new Date(targetDate).toISOString(),
        budgetHours: budgetHours ? Number(budgetHours) : undefined,
        templateId, createSpace, actorId,
      })
      toast.success(`${project.name} is ready`)
      navigate(`/app/projects/${project.id}`)
    } catch (e) {
      toast.error(`Could not create the project: ${String(e)}`)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Onboard a project</h1>
          <p className="mt-1 text-sm text-muted">
            Five steps. At the end you get a project, a shared space, milestones, a starter backlog and its docs.
          </p>
        </div>
        <Button variant="ghost" icon="x" onClick={() => navigate('/app/projects')}>Cancel</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Steps rail */}
        <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 no-scrollbar">
          {STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <li key={s.key} className="shrink-0 lg:shrink">
                <button
                  onClick={() => i <= step && setStep(i)}
                  disabled={i > step}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                    active ? 'bg-brand-500/10' : 'hover:bg-sunken',
                  )}
                >
                  <span className={clsx(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-sunken text-faint',
                  )}>
                    {done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={clsx('block text-[13px] font-semibold', active ? 'text-brand-600 dark:text-brand-300' : 'text-ink')}>{s.title}</span>
                    <span className="hidden truncate text-2xs text-faint lg:block">{s.hint}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        {/* Panel */}
        <div className="card p-5">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-ink">What are we building?</h2>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <Field label="Project name" required error={errors.name}>
                  <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Atlas — Payments 2.0" />
                </Field>
                <Field label="Key" hint="Used in issue keys">
                  <Input value={key || autoKey} onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 5))} className="w-24 font-mono uppercase" />
                </Field>
              </div>
              <Field label="One-line summary" hint="What someone should understand in five seconds.">
                <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Re-platform payments onto the new ledger with multi-currency settlement." />
              </Field>
              <Field label="Description" hint="Markdown supported. Scope, approach, anything the team needs.">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why now, what is in scope, what is explicitly not." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Icon"><EmojiPicker value={icon} onChange={setIcon} options={PROJECT_ICONS} /></Field>
                <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={AVATAR_COLORS} /></Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-ink">Who is behind it?</h2>
              <Field label="Teams" required error={errors.teams} hint="The first team owns the issue keys and workflow.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {teams.map((t) => {
                    const on = teamIds.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTeamIds((prev) => (on ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                        className={clsx('flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition', on ? 'border-brand-500 bg-brand-500/8' : 'border-line hover:bg-sunken')}
                      >
                        <span className="text-base">{t.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-ink">{t.name}</span>
                          <span className="block truncate text-2xs text-faint">{t.key} · {t.description}</span>
                        </span>
                        {on && <Icon name="check-circle" size={16} className="shrink-0 text-brand-500" />}
                      </button>
                    )
                  })}
                </div>
                {teamIds.length > 1 && (
                  <p className="mt-2 text-xs text-muted">
                    <Icon name="info" size={12} className="mr-1 inline" />
                    Issues will be keyed to <strong>{teams.find((t) => t.id === teamIds[0])?.key}</strong>; the board merges the workflows.
                  </p>
                )}
              </Field>

              <Field label="Project lead" hint="One accountable owner — always.">
                <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
                </Select>
              </Field>

              <Field label="Members" hint="They get access, notifications and the shared space.">
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {suggestedMembers.map((u) => {
                    const on = memberIds.includes(u.id) || u.id === leadId
                    return (
                      <button
                        key={u.id}
                        disabled={u.id === leadId}
                        onClick={() => setMemberIds((prev) => (prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]))}
                        className={clsx('flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition disabled:opacity-70',
                          on ? 'border-brand-500 bg-brand-500/8' : 'border-line hover:bg-sunken')}
                      >
                        <Avatar user={u} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-ink">{u.name}</span>
                          <span className="block truncate text-2xs text-faint">{u.title}</span>
                        </span>
                        {u.id === leadId && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">Lead</Badge>}
                        {on && u.id !== leadId && <Icon name="check" size={14} className="shrink-0 text-brand-500" />}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Switch
                checked={createSpace}
                onChange={setCreateSpace}
                label="Create a shared space for this project"
                description="A place for specs, decisions and runbooks that everyone on the project can reach."
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-ink">Start from a template</h2>
              <p className="text-sm text-muted">Templates scaffold milestones, a starter backlog and the docs a project of this shape needs. You can change everything afterwards.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROJECT_TEMPLATES.map((t) => {
                  const on = t.id === templateId
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={clsx('rounded-xl border p-3 text-left transition', on ? 'border-brand-500 bg-brand-500/8 shadow-glow' : 'border-line hover:bg-sunken')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg text-base" style={{ background: `${t.color}1f` }}>{t.icon}</span>
                        <span className="text-[13px] font-semibold text-ink">{t.name}</span>
                        {on && <Icon name="check-circle" size={16} className="ml-auto text-brand-500" />}
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-muted">{t.description}</p>
                      {(t.milestones.length > 0 || t.issues.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge className="bg-sunken text-muted">{t.milestones.length} milestones</Badge>
                          <Badge className="bg-sunken text-muted">{t.issues.length} issues</Badge>
                          <Badge className="bg-sunken text-muted">{t.docs.length} docs</Badge>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {template && template.issues.length > 0 && (
                <div className="rounded-lg border border-line bg-sunken/50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">What gets created</p>
                  <ul className="space-y-1 text-xs text-muted">
                    {template.milestones.map((m) => (
                      <li key={m.name} className="flex items-center gap-1.5"><Icon name="flag" size={12} className="text-faint" />{m.name} <span className="text-faint">· day {m.offsetDays}</span></li>
                    ))}
                    {template.issues.slice(0, 4).map((i) => (
                      <li key={i.title} className="flex items-center gap-1.5"><Icon name="check-square" size={12} className="text-faint" />{i.title}</li>
                    ))}
                    {template.issues.length > 4 && <li className="pl-5 text-faint">+{template.issues.length - 4} more issues</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-ink">When and how urgent?</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
                <Field label="Target date" error={errors.dates}><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                    {PROJECT_STATUSES.filter((s) => s.value !== 'canceled').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={priority} onChange={(e) => setPriority(Number(e.target.value) as Priority)}>
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tags" hint="Comma separated">
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="revenue, platform" />
                </Field>
                <Field label="Budget (hours)" hint="Optional — used in the workload view">
                  <Input type="number" min="0" value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)} placeholder="800" />
                </Field>
              </div>
              <InlineAlert tone="info" title="Dates are commitments, not decoration">
                Orbit compares progress against elapsed time and flags the project when the two diverge.
              </InlineAlert>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-ink">Ready to create</h2>
              <div className="rounded-xl border border-line p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `${color}1f` }}>{icon}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-ink">{name || 'Untitled project'}</h3>
                      <span className="font-mono text-2xs text-faint">{autoKey}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{summary || 'No summary yet.'}</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                  <Summary label="Teams" value={teamIds.map((id) => teams.find((t) => t.id === id)?.name).filter(Boolean).join(', ') || '—'} />
                  <Summary label="Lead" value={userMap.get(leadId)?.name ?? '—'} />
                  <Summary label="Members" value={`${new Set([leadId, ...memberIds]).size} people`} />
                  <Summary label="Template" value={template?.name ?? 'Blank'} />
                  <Summary label="Dates" value={`${format(new Date(startDate), 'MMM d')} → ${format(new Date(targetDate), 'MMM d, yyyy')}`} />
                  <Summary label="Shared space" value={createSpace ? 'Yes — created with the project' : 'No'} />
                </dl>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-3">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">On creation</p>
                <ul className="space-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                  <li className="flex items-center gap-2"><Icon name="check" size={14} />Project created and added to the roadmap</li>
                  {template && template.milestones.length > 0 && <li className="flex items-center gap-2"><Icon name="check" size={14} />{template.milestones.length} milestones scheduled from the start date</li>}
                  {template && template.issues.length > 0 && <li className="flex items-center gap-2"><Icon name="check" size={14} />{template.issues.length} issues added to the backlog</li>}
                  {template && template.docs.length > 0 && <li className="flex items-center gap-2"><Icon name="check" size={14} />{template.docs.length} starter docs drafted</li>}
                  {createSpace && <li className="flex items-center gap-2"><Icon name="check" size={14} />Shared space opened for the members</li>}
                  <li className="flex items-center gap-2"><Icon name="check" size={14} />Everyone on the project notified</li>
                </ul>
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
            <Button variant="ghost" icon="arrow-left" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            <span className="text-xs text-faint">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" iconRight="arrow-right" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button variant="primary" icon="rocket" loading={saving} onClick={submit}>Create project</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs font-bold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  )
}
