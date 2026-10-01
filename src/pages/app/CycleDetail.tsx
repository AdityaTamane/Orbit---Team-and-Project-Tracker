import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { InlineAlert, PageHeader, SectionTitle } from '@/components/ui/misc'
import { AXIS_PROPS, ChartCard, ChartTooltip, GRID_PROPS } from '@/components/chart/chrome'
import { WorkView } from '@/components/board/WorkView'
import { useCycles, useIssues, useLookups, useStates } from '@/hooks/useData'
import { buildBurndown, computeCycleStats, deleteCycle, rolloverCycle, updateCycle } from '@/lib/cycles'
import { fmtDate } from '@/lib/format'
import { toast } from '@/lib/store'

export function CycleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { teams, userMap, stateMap } = useLookups()

  const cycles = useCycles()
  const cycle = cycles.find((c) => c.id === id)
  const issues = useIssues()
  const states = useStates(cycle?.teamId)

  const [editing, setEditing] = useState(false)
  const [rollingOver, setRollingOver] = useState(false)

  const cycleIssues = useMemo(() => issues.filter((i) => i.cycleId === id && !i.archivedAt), [issues, id])
  const stats = useMemo(() => (cycle ? computeCycleStats(cycle, cycleIssues, stateMap) : null), [cycle, cycleIssues, stateMap])
  const burndown = useMemo(() => (cycle ? buildBurndown(cycle, cycleIssues, stateMap) : []), [cycle, cycleIssues, stateMap])

  const byAssignee = useMemo(() => {
    const map = new Map<string, { done: number; total: number; points: number }>()
    for (const issue of cycleIssues) {
      const key = issue.assigneeId ?? 'none'
      const row = map.get(key) ?? { done: 0, total: 0, points: 0 }
      row.total += 1
      row.points += issue.estimate ?? 0
      if (stateMap.get(issue.stateId)?.category === 'completed') row.done += 1
      map.set(key, row)
    }
    return [...map.entries()].sort((a, b) => b[1].points - a[1].points)
  }, [cycleIssues, stateMap])

  if (!cycle || !stats) {
    return (
      <div className="p-6">
        <EmptyState icon={<Icon name="repeat" size={20} />} title="Cycle not found" action={<Button variant="primary" onClick={() => navigate('/app/cycles')}>All cycles</Button>} />
      </div>
    )
  }

  const team = teams.find((t) => t.id === cycle.teamId)
  const nextCycle = cycles.find((c) => c.teamId === cycle.teamId && c.number === cycle.number + 1)
  const carryover = cycleIssues.filter((i) => !['completed', 'canceled'].includes(stateMap.get(i.stateId)?.category ?? ''))

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-10">
      <PageHeader
        icon={<span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${team?.color ?? '#6c62f2'}1f` }}>{team?.icon ?? '🔁'}</span>}
        title={`${team?.name ?? 'Team'} · ${cycle.name}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge className={clsx('capitalize', cycle.status === 'active' ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' : 'bg-sunken text-muted')}>{cycle.status}</Badge>
            <span className="text-xs text-muted">{fmtDate(cycle.startDate, 'MMM d')} → {fmtDate(cycle.endDate, 'MMM d, yyyy')}</span>
            {cycle.status === 'active' && <span className="text-xs text-muted">· day {stats.daysElapsed} of {stats.daysTotal}</span>}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon="pen" onClick={() => setEditing(true)}>Edit</Button>
            {cycle.status === 'active' && nextCycle && (
              <Button variant="primary" icon="arrow-right" onClick={() => setRollingOver(true)}>Close & roll over</Button>
            )}
            <Popover
              width={200}
              trigger={({ toggle, ref }) => (
                <button ref={ref as any} onClick={toggle} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:bg-sunken hover:text-ink" aria-label="Cycle actions">
                  <Icon name="more-horizontal" size={16} />
                </button>
              )}
            >
              {(close) => (
                <div className="py-1">
                  <MenuItem icon={<Icon name="play" size={14} />} onClick={() => { updateCycle(cycle.id, { status: 'active' }); close() }}>Mark active</MenuItem>
                  <MenuItem icon={<Icon name="check" size={14} />} onClick={() => { updateCycle(cycle.id, { status: 'completed' }); close() }}>Mark completed</MenuItem>
                  <MenuItem danger icon={<Icon name="trash" size={14} />} onClick={async () => { await deleteCycle(cycle.id); toast.success('Cycle deleted'); navigate('/app/cycles') }}>Delete cycle</MenuItem>
                </div>
              )}
            </Popover>
          </>
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        {cycle.goal && (
          <div className="card flex items-start gap-3 p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="target" size={16} /></span>
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-faint">Cycle goal</p>
              <p className="mt-0.5 text-sm leading-6 text-ink">{cycle.goal}</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Scope" value={`${stats.scope}p`} hint={`${stats.issueCount} issues`} icon={<Icon name="layers" size={15} className="text-faint" />} />
          <Stat label="Completed" value={`${stats.completed}p`} tone="good" hint={`${stats.doneCount} issues done`} icon={<Icon name="check-circle" size={15} className="text-faint" />} />
          <Stat label="Remaining" value={`${stats.remaining}p`} tone={stats.onPace ? 'default' : 'warn'} hint={`${stats.daysLeft} days left`} icon={<Icon name="hourglass" size={15} className="text-faint" />} />
          <Stat
            label="Projection"
            value={`${stats.projectedCompletion}%`}
            tone={stats.projectedCompletion >= 95 ? 'good' : stats.projectedCompletion >= 75 ? 'warn' : 'bad'}
            hint="at the current rate"
            icon={<Icon name="trending-up" size={15} className="text-faint" />}
          />
        </div>

        {cycle.status === 'active' && !stats.onPace && (
          <InlineAlert tone="warn" title="This cycle is behind pace">
            {stats.completionPct}% of the scope is done with {Math.round((stats.daysElapsed / stats.daysTotal) * 100)}% of the time gone.
            At the current rate the cycle lands at about {stats.projectedCompletion}% — either cut scope now or move the least valuable items to the next cycle.
          </InlineAlert>
        )}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <ChartCard title="Burndown" subtitle="Points remaining against the ideal line — weekends flatten the ideal." height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndown} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="day" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={36} />
                <Tooltip content={<ChartTooltip unit="p" />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#8e96ad" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#6c62f2" strokeWidth={2.5} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Who is carrying what</h3>
            <div className="space-y-3">
              {byAssignee.map(([userId, row]) => {
                const u = userMap.get(userId)
                return (
                  <div key={userId} className="flex items-center gap-2.5">
                    {u ? <Avatar user={u} size="sm" /> : <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-line text-faint"><Icon name="user" size={11} /></span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-ink">{u?.name ?? 'Unassigned'}</span>
                        <span className="shrink-0 text-2xs tabular-nums text-faint">{row.done}/{row.total} · {row.points}p</span>
                      </div>
                      <Progress value={row.total ? (row.done / row.total) * 100 : 0} height={4} className="mt-1" color={u?.avatarColor} />
                    </div>
                  </div>
                )
              })}
              {!byAssignee.length && <p className="text-sm text-faint">No issues in this cycle yet.</p>}
            </div>
          </section>
        </div>

        <SectionTitle>Cycle backlog</SectionTitle>
      </div>

      <WorkView
        viewKey={`cycle-${cycle.id}`}
        issues={cycleIssues}
        states={states}
        seed={{ teamId: cycle.teamId, cycleId: cycle.id }}
        defaults={{ layout: 'board', groupBy: 'state', sortBy: 'manual' }}
        emptyTitle="Nothing planned into this cycle"
        emptyDescription="Add issues from the backlog, or create them straight into the cycle."
      />

      <EditCycleModal
        open={editing}
        cycle={cycle}
        onClose={() => setEditing(false)}
        onSave={async (patch) => { await updateCycle(cycle.id, patch); toast.success('Cycle updated') }}
      />

      <Modal
        open={rollingOver}
        onClose={() => setRollingOver(false)}
        title="Close this cycle"
        subtitle={`${carryover.length} unfinished items will move to ${nextCycle?.name ?? 'the next cycle'}.`}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRollingOver(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon="arrow-right"
              onClick={async () => {
                if (!nextCycle) return
                const moved = await rolloverCycle(cycle.id, nextCycle.id)
                toast.success(`${moved} items rolled into ${nextCycle.name}`)
                setRollingOver(false)
                navigate(`/app/cycles/${nextCycle.id}`)
              }}
            >
              Roll over
            </Button>
          </>
        }
      >
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-muted">
            Completed work stays with this cycle so the velocity history remains honest. Everything still open moves forward.
          </p>
          {carryover.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
              {carryover.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-2xs text-faint">{i.key}</span>
                  <span className="truncate text-ink">{i.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  )
}

function EditCycleModal({ open, cycle, onClose, onSave }: {
  open: boolean
  cycle: { name: string; goal: string; startDate: string; endDate: string; status: string }
  onClose: () => void
  onSave: (patch: any) => Promise<void>
}) {
  const [name, setName] = useState(cycle.name)
  const [goal, setGoal] = useState(cycle.goal)
  const [start, setStart] = useState(cycle.startDate.slice(0, 10))
  const [end, setEnd] = useState(cycle.endDate.slice(0, 10))
  const [status, setStatus] = useState(cycle.status)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit cycle"
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="save"
            onClick={async () => {
              await onSave({ name, goal, status, startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString() })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Goal"><Textarea value={goal} onChange={(e) => setGoal(e.target.value)} className="min-h-[70px]" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Ends"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
