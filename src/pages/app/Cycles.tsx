import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { PageHeader, SectionTitle } from '@/components/ui/misc'
import { AXIS_PROPS, ChartCard, ChartTooltip, GRID_PROPS } from '@/components/chart/chrome'
import { useCycles, useIssues, useLookups } from '@/hooks/useData'
import { computeCycleStats, computeVelocity, createCycle, suggestNextCycleDates } from '@/lib/cycles'
import { fmtDate } from '@/lib/format'
import { toast } from '@/lib/store'

export function Cycles() {
  const navigate = useNavigate()
  const { teams, stateMap } = useLookups()
  const cycles = useCycles()
  const issues = useIssues()
  const [creating, setCreating] = useState(false)

  const live = useMemo(() => issues.filter((i) => !i.archivedAt), [issues])

  const rows = useMemo(() => cycles.map((cycle) => {
    const cycleIssues = live.filter((i) => i.cycleId === cycle.id)
    return { cycle, stats: computeCycleStats(cycle, cycleIssues, stateMap), team: teams.find((t) => t.id === cycle.teamId) }
  }), [cycles, live, stateMap, teams])

  const active = rows.filter((r) => r.cycle.status === 'active')
  const upcoming = rows.filter((r) => r.cycle.status === 'upcoming')
  const completed = rows.filter((r) => r.cycle.status === 'completed').reverse()

  const velocityByTeam = useMemo(
    () => teams
      .map((team) => ({ team, data: computeVelocity(cycles.filter((c) => c.teamId === team.id), live, stateMap) }))
      .filter((t) => t.data.length > 0),
    [teams, cycles, live, stateMap],
  )

  return (
    <div className="pb-10">
      <PageHeader
        title="Cycles"
        subtitle="Fixed iterations with real burndown, velocity and rollover — the honest input to any forecast."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="repeat" size={19} /></span>}
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New cycle</Button>}
      />

      <div className="space-y-6 px-4 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active cycles" value={active.length} icon={<Icon name="play" size={15} className="text-faint" />} />
          <Stat label="Points in flight" value={active.reduce((s, r) => s + r.stats.remaining, 0)} hint="remaining across active cycles" icon={<Icon name="gauge" size={15} className="text-faint" />} />
          <Stat
            label="On pace"
            value={`${active.filter((r) => r.stats.onPace).length}/${active.length || 0}`}
            tone={active.every((r) => r.stats.onPace) ? 'good' : 'warn'}
            hint="cycles tracking to finish"
            icon={<Icon name="trending-up" size={15} className="text-faint" />}
          />
          <Stat label="Completed" value={completed.length} hint="historic cycles" icon={<Icon name="check-circle" size={15} className="text-faint" />} />
        </div>

        {active.length > 0 && (
          <section>
            <SectionTitle>Active now</SectionTitle>
            <div className="grid gap-3 lg:grid-cols-2">
              {active.map(({ cycle, stats, team }) => (
                <Link key={cycle.id} to={`/app/cycles/${cycle.id}`} className="card card-hover p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-base">{team?.icon}</span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink">{team?.name} · {cycle.name}</h3>
                        <p className="text-2xs text-faint">{fmtDate(cycle.startDate)} → {fmtDate(cycle.endDate)}</p>
                      </div>
                    </div>
                    <Badge className={clsx(stats.onPace ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/12 text-amber-600 dark:text-amber-300')}>
                      {stats.onPace ? 'On pace' : 'Behind pace'}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{cycle.goal}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={stats.completionPct} color={stats.onPace ? '#10b981' : '#f59e0b'} />
                    <span className="text-xs font-semibold tabular-nums text-muted">{stats.completionPct}%</span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-2.5 text-center">
                    <Mini label="Scope" value={`${stats.scope}p`} />
                    <Mini label="Done" value={`${stats.completed}p`} />
                    <Mini label="Issues" value={`${stats.doneCount}/${stats.issueCount}`} />
                    <Mini label="Days left" value={String(stats.daysLeft)} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {velocityByTeam.length > 0 && (
          <section>
            <SectionTitle>Velocity</SectionTitle>
            <div className="grid gap-3 lg:grid-cols-2">
              {velocityByTeam.map(({ team, data }) => (
                <ChartCard key={team.id} title={`${team.icon} ${team.name}`} subtitle="Committed vs completed points per cycle" height={190}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis dataKey="name" {...AXIS_PROPS} />
                      <YAxis {...AXIS_PROPS} width={36} />
                      <Tooltip content={<ChartTooltip unit="p" />} cursor={{ fill: 'rgb(var(--sunken))' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="committed" name="Committed" fill="#c6cfff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#6c62f2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              ))}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section>
            <SectionTitle>Upcoming</SectionTitle>
            <div className="card divide-y divide-line">
              {upcoming.map(({ cycle, stats, team }) => (
                <Link key={cycle.id} to={`/app/cycles/${cycle.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-sunken/60">
                  <span>{team?.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{team?.name} · {cycle.name}</p>
                    <p className="truncate text-2xs text-faint">{cycle.goal || 'No goal yet'}</p>
                  </div>
                  <span className="shrink-0 text-2xs text-muted">{fmtDate(cycle.startDate)} → {fmtDate(cycle.endDate)}</span>
                  <Badge className="shrink-0 bg-sunken text-muted">{stats.issueCount} planned</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <SectionTitle>Completed</SectionTitle>
            <div className="card divide-y divide-line">
              {completed.map(({ cycle, stats, team }) => (
                <Link key={cycle.id} to={`/app/cycles/${cycle.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-sunken/60">
                  <span>{team?.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{team?.name} · {cycle.name}</span>
                  <span className="hidden shrink-0 text-2xs text-faint sm:block">{fmtDate(cycle.endDate, 'MMM d, yyyy')}</span>
                  <div className="w-24 shrink-0"><Progress value={stats.completionPct} height={4} color={stats.completionPct >= 85 ? '#10b981' : '#f59e0b'} /></div>
                  <span className="w-10 shrink-0 text-right text-2xs tabular-nums text-muted">{stats.completionPct}%</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!cycles.length && (
          <EmptyState
            icon={<Icon name="repeat" size={20} />}
            title="No cycles yet"
            description="Cycles give a team a rhythm: a fixed window, a goal, and a burndown that tells the truth."
            action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Create the first cycle</Button>}
          />
        )}
      </div>

      <NewCycleModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/app/cycles/${id}`)} />
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums text-ink">{value}</p>
      <p className="text-2xs text-faint">{label}</p>
    </div>
  )
}

function NewCycleModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { teams } = useLookups()
  const cycles = useCycles()
  const [teamId, setTeamId] = useState('')
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const applyTeam = (id: string) => {
    setTeamId(id)
    const team = teams.find((t) => t.id === id)
    const teamCycles = cycles.filter((c) => c.teamId === id).sort((a, b) => a.number - b.number)
    const dates = suggestNextCycleDates(teamCycles[teamCycles.length - 1], team?.cycleDays ?? 14)
    setStart(dates.startDate.slice(0, 10))
    setEnd(dates.endDate.slice(0, 10))
    setName(`Cycle ${(teamCycles[teamCycles.length - 1]?.number ?? 0) + 1}`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New cycle"
      subtitle="Dates are suggested from the team's last cycle."
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="repeat"
            disabled={!teamId || !start || !end}
            onClick={async () => {
              const cycle = await createCycle({
                teamId, name, goal,
                startDate: new Date(start).toISOString(),
                endDate: new Date(end).toISOString(),
              })
              toast.success(`${cycle.name} created`)
              onClose()
              onCreated(cycle.id)
            }}
          >
            Create cycle
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Team" required>
          <Select value={teamId} onChange={(e) => applyTeam(e.target.value)}>
            <option value="">Choose a team…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </Select>
        </Field>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cycle 44" /></Field>
        <Field label="Goal" hint="One sentence the team can hold itself to.">
          <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} className="min-h-[70px]" placeholder="Reconciliation running end-to-end in production." />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Ends"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  )
}
