import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { PageHeader, SectionTitle } from '@/components/ui/misc'
import { useGoals, useLookups } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { db, now, uid } from '@/lib/db'
import { fmtRelative } from '@/lib/format'
import { toast } from '@/lib/store'
import type { Goal, KeyResult } from '@/lib/types'

const STATUS_STYLE: Record<Goal['status'], string> = {
  on_track: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
  at_risk: 'bg-amber-500/12 text-amber-600 dark:text-amber-300',
  off_track: 'bg-rose-500/12 text-rose-600 dark:text-rose-300',
  achieved: 'bg-brand-500/12 text-brand-600 dark:text-brand-300',
  missed: 'bg-slate-500/12 text-slate-600 dark:text-slate-300',
}

const krProgress = (kr: KeyResult): number => {
  const span = kr.target - kr.start
  if (span === 0) return kr.current >= kr.target ? 100 : 0
  return Math.max(0, Math.min(100, Math.round(((kr.current - kr.start) / span) * 100)))
}

const goalProgress = (goal: Goal): number =>
  goal.keyResults.length ? Math.round(goal.keyResults.reduce((s, kr) => s + krProgress(kr), 0) / goal.keyResults.length) : 0

export function Goals() {
  const goals = useGoals()
  const { userMap, teams, projects } = useLookups()
  const actorId = useActorId()
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)

  const periods = useMemo(() => [...new Set(goals.map((g) => g.period))].sort().reverse(), [goals])
  const [period, setPeriod] = useState<string>('all')

  const visible = goals.filter((g) => period === 'all' || g.period === period)
  const avg = visible.length ? Math.round(visible.reduce((s, g) => s + goalProgress(g), 0) / visible.length) : 0

  return (
    <div className="pb-10">
      <PageHeader
        title="Goals"
        subtitle="Outcomes, not output. Every key result rolls up from a number someone owns."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="target" size={19} /></span>}
        actions={<Button variant="primary" icon="plus" onClick={() => setEditing('new')}>New goal</Button>}
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Goals tracked" value={visible.length} icon={<Icon name="target" size={15} className="text-faint" />} />
          <Stat label="Average progress" value={`${avg}%`} tone={avg >= 70 ? 'good' : avg >= 40 ? 'warn' : 'bad'} icon={<Icon name="trending-up" size={15} className="text-faint" />} />
          <Stat label="At risk" value={visible.filter((g) => g.status === 'at_risk').length} tone="warn" icon={<Icon name="alert-triangle" size={15} className="text-faint" />} />
          <Stat label="Off track" value={visible.filter((g) => g.status === 'off_track').length} tone="bad" icon={<Icon name="alert-circle" size={15} className="text-faint" />} />
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-8 w-auto !text-[13px]">
            <option value="all">All periods</option>
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>

        {!visible.length ? (
          <EmptyState
            icon={<Icon name="target" size={20} />}
            title="No goals yet"
            description="A goal names the outcome; key results make it measurable."
            action={<Button variant="primary" icon="plus" onClick={() => setEditing('new')}>Set the first goal</Button>}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((goal) => {
              const progress = goalProgress(goal)
              const owner = userMap.get(goal.ownerId)
              return (
                <section key={goal.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink">{goal.name}</h3>
                        <Badge className={STATUS_STYLE[goal.status]}>{goal.status.replace('_', ' ')}</Badge>
                        <Badge className="bg-sunken text-muted">{goal.period}</Badge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted">{goal.description}</p>
                    </div>
                    <button onClick={() => setEditing(goal)} className="shrink-0 text-faint hover:text-ink" aria-label="Edit goal">
                      <Icon name="pen" size={15} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={progress} height={7} color={progress >= 70 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#f43f5e'} />
                    <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{progress}%</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {goal.keyResults.map((kr) => {
                      const p = krProgress(kr)
                      return (
                        <div key={kr.id}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate text-muted">{kr.name}</span>
                            <span className="shrink-0 font-semibold tabular-nums text-ink">
                              {kr.current}<span className="text-faint"> / {kr.target} {kr.unit}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={p} height={4} color={p >= 70 ? '#10b981' : p >= 40 ? '#f59e0b' : '#f43f5e'} />
                            <span className="w-8 shrink-0 text-right text-2xs tabular-nums text-faint">{p}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="flex items-center gap-1.5">
                      <Avatar user={owner} size="xs" />
                      <span className="text-2xs text-muted">{owner?.name}</span>
                    </span>
                    {goal.teamIds.map((tid) => {
                      const team = teams.find((t) => t.id === tid)
                      return team ? <span key={tid} className="chip bg-sunken text-muted">{team.icon} {team.name}</span> : null
                    })}
                    {goal.projectIds.map((pid) => {
                      const project = projects.find((p) => p.id === pid)
                      return project ? (
                        <Link key={pid} to={`/app/projects/${pid}`} className="chip hover:brightness-110" style={{ background: `${project.color}18`, color: project.color }}>
                          {project.icon} {project.name}
                        </Link>
                      ) : null
                    })}
                    <span className="ml-auto text-2xs text-faint">updated {fmtRelative(goal.updatedAt)}</span>
                  </div>
                </section>
              )
            })}
          </div>
        )}

        <SectionTitle>How this rolls up</SectionTitle>
        <div className="card p-4 text-sm leading-6 text-muted">
          Goal progress is the mean of its key results, and each key result is measured against where it started —
          not from zero. That keeps a metric that began at 41% and needs to reach 48% honest: it reads 66% of the way
          there, not 95%.
        </div>
      </div>

      <GoalModal
        open={!!editing}
        goal={editing === 'new' ? null : editing}
        defaultOwner={actorId}
        onClose={() => setEditing(null)}
        onSave={async (g) => { await db.goals.put(g); toast.success('Goal saved') }}
        onDelete={async (gid) => { await db.goals.delete(gid); toast.success('Goal removed') }}
      />
    </div>
  )
}

function GoalModal({ open, goal, defaultOwner, onClose, onSave, onDelete }: {
  open: boolean
  goal: Goal | null
  defaultOwner: string
  onClose: () => void
  onSave: (g: Goal) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { users, teams, projects } = useLookups()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ownerId, setOwnerId] = useState(defaultOwner)
  const [status, setStatus] = useState<Goal['status']>('on_track')
  const [period, setPeriod] = useState(`${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`)
  const [keyResults, setKeyResults] = useState<KeyResult[]>([])
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [seeded, setSeeded] = useState<string | null>(null)

  const seedKey = goal?.id ?? (open ? 'new' : null)
  if (open && seeded !== seedKey) {
    setSeeded(seedKey)
    setName(goal?.name ?? '')
    setDescription(goal?.description ?? '')
    setOwnerId(goal?.ownerId ?? defaultOwner)
    setStatus(goal?.status ?? 'on_track')
    setPeriod(goal?.period ?? `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`)
    setKeyResults(goal?.keyResults ?? [{ id: uid('kr'), name: '', start: 0, target: 100, current: 0, unit: '%' }])
    setTeamIds(goal?.teamIds ?? [])
    setProjectIds(goal?.projectIds ?? [])
  }

  const updateKr = (id: string, patch: Partial<KeyResult>) =>
    setKeyResults((prev) => prev.map((kr) => (kr.id === id ? { ...kr, ...patch } : kr)))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      width="lg"
      footer={
        <>
          {goal && <Button variant="ghost" className="mr-auto text-rose-500" icon="trash" onClick={async () => { await onDelete(goal.id); onClose() }}>Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="target"
            disabled={!name.trim()}
            onClick={async () => {
              await onSave({
                id: goal?.id ?? uid('g'),
                name: name.trim(), description, ownerId, status, period,
                keyResults: keyResults.filter((kr) => kr.name.trim()),
                teamIds, projectIds,
                createdAt: goal?.createdAt ?? now(),
                updatedAt: now(),
              })
              onClose()
            }}
          >
            Save goal
          </Button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <Field label="Goal" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Land Atlas with tier-1 merchants" /></Field>
        <Field label="Why it matters"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" /></Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Owner">
            <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Goal['status'])}>
              <option value="on_track">On track</option>
              <option value="at_risk">At risk</option>
              <option value="off_track">Off track</option>
              <option value="achieved">Achieved</option>
              <option value="missed">Missed</option>
            </Select>
          </Field>
          <Field label="Period"><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-Q3" /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Key results</span>
            <Button size="xs" variant="ghost" icon="plus" onClick={() => setKeyResults((prev) => [...prev, { id: uid('kr'), name: '', start: 0, target: 100, current: 0, unit: '' }])}>
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {keyResults.map((kr) => (
              <div key={kr.id} className="grid gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[1fr_70px_70px_70px_60px_auto]">
                <Input value={kr.name} onChange={(e) => updateKr(kr.id, { name: e.target.value })} placeholder="Metric name" className="h-8 !text-[13px]" />
                <Input type="number" value={kr.start} onChange={(e) => updateKr(kr.id, { start: Number(e.target.value) })} className="h-8 !text-[13px]" title="Start" />
                <Input type="number" value={kr.current} onChange={(e) => updateKr(kr.id, { current: Number(e.target.value) })} className="h-8 !text-[13px]" title="Current" />
                <Input type="number" value={kr.target} onChange={(e) => updateKr(kr.id, { target: Number(e.target.value) })} className="h-8 !text-[13px]" title="Target" />
                <Input value={kr.unit} onChange={(e) => updateKr(kr.id, { unit: e.target.value })} placeholder="unit" className="h-8 !text-[13px]" />
                <button onClick={() => setKeyResults((prev) => prev.filter((x) => x.id !== kr.id))} className="grid h-8 w-8 place-items-center rounded text-faint hover:text-rose-500" aria-label="Remove key result">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-2xs text-faint">Columns: metric · start · current · target · unit</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Teams">
            <div className="flex flex-wrap gap-1.5">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTeamIds((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                  className={clsx('chip border transition', teamIds.includes(t.id) ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-line text-muted')}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Projects">
            <div className="flex flex-wrap gap-1.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProjectIds((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))}
                  className={clsx('chip border transition', projectIds.includes(p.id) ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-line text-muted')}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
