import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Select } from '@/components/ui/form'
import { InlineAlert, PageHeader, SectionTitle } from '@/components/ui/misc'
import { AXIS_PROPS, CHART_COLORS, ChartCard, ChartTooltip, GRID_PROPS } from '@/components/chart/chrome'
import { PriorityIcon, StateIcon } from '@/components/issue/atoms'
import { useCycles, useIssues, useLookups, useRisks, useTimeLogs } from '@/hooks/useData'
import {
  agingWip, countBy, cycleTime, forecast, isClosed, portfolio, timeByDay, weeklyFlow,
} from '@/lib/analytics'
import { computeVelocity } from '@/lib/cycles'
import { ISSUE_TYPES, PRIORITIES, healthMeta } from '@/lib/constants'
import { fmtDate, fmtHours } from '@/lib/format'

export function Insights() {
  const { teams, projects, stateMap, labelMap, userMap } = useLookups()
  const issues = useIssues()
  const cycles = useCycles()
  const logs = useTimeLogs()
  const risks = useRisks()
  const [teamId, setTeamId] = useState('all')

  const scoped = useMemo(() => {
    const live = issues.filter((i) => !i.archivedAt)
    return teamId === 'all' ? live : live.filter((i) => i.teamId === teamId)
  }, [issues, teamId])

  const flow = useMemo(() => weeklyFlow(scoped, stateMap, 12), [scoped, stateMap])
  const ct = useMemo(() => cycleTime(scoped, stateMap), [scoped, stateMap])
  const fc = useMemo(() => forecast(scoped, stateMap), [scoped, stateMap])
  const aging = useMemo(() => agingWip(scoped, stateMap, 5), [scoped, stateMap])
  const timeSeries = useMemo(() => timeByDay(logs, 21), [logs])
  const velocity = useMemo(
    () => computeVelocity(teamId === 'all' ? cycles : cycles.filter((c) => c.teamId === teamId), scoped, stateMap),
    [cycles, teamId, scoped, stateMap],
  )
  const rows = useMemo(() => portfolio(projects, scoped, stateMap), [projects, scoped, stateMap])

  const byType = useMemo(
    () => countBy(scoped, (i) => i.type).map((r) => ({ ...r, label: ISSUE_TYPES.find((t) => t.value === r.name)?.label ?? r.name })),
    [scoped],
  )
  const byPriority = useMemo(
    () => PRIORITIES.map((p) => ({ name: p.short, value: scoped.filter((i) => i.priority === p.value && !isClosed(i, stateMap)).length })),
    [scoped, stateMap],
  )
  const byLabel = useMemo(
    () => countBy(scoped.flatMap((i) => i.labelIds), (id) => labelMap.get(id)?.name ?? 'unknown').slice(0, 8),
    [scoped, labelMap],
  )
  const byState = useMemo(() => {
    const cats: [string, string, string][] = [
      ['backlog', 'Backlog', '#8e96ad'], ['unstarted', 'Todo', '#6366f1'], ['started', 'In progress', '#f59e0b'],
      ['paused', 'Blocked', '#f43f5e'], ['completed', 'Done', '#10b981'], ['canceled', 'Canceled', '#94a3b8'],
    ]
    return cats.map(([cat, label, color]) => ({
      name: label, color,
      value: scoped.filter((i) => stateMap.get(i.stateId)?.category === cat).length,
    })).filter((r) => r.value > 0)
  }, [scoped, stateMap])

  const openIssues = scoped.filter((i) => !isClosed(i, stateMap))
  const overdue = openIssues.filter((i) => i.dueDate && +new Date(i.dueDate) < Date.now())
  const totalMinutes = logs.reduce((s, l) => s + l.minutes, 0)

  return (
    <div className="pb-10">
      <PageHeader
        title="Insights"
        subtitle="Flow, cycle time, velocity and forecast — computed from the work, not from a status update."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="bar-chart" size={19} /></span>}
        actions={
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-9 w-auto !text-[13px]">
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </Select>
        }
      />

      <div className="space-y-6 px-4 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Median cycle time"
            value={`${ct.median}d`}
            tone={ct.median <= 5 ? 'good' : ct.median <= 9 ? 'warn' : 'bad'}
            hint={`p85 is ${ct.p85}d · ${ct.sample} closed items`}
            icon={<Icon name="timer" size={15} className="text-faint" />}
          />
          <Stat
            label="Weekly throughput"
            value={fc.weeklyThroughput}
            hint={`${fc.confidence} confidence`}
            icon={<Icon name="trending-up" size={15} className="text-faint" />}
          />
          <Stat
            label="Open work"
            value={fc.openCount}
            hint={fc.weeksToClear !== null ? `~${fc.weeksToClear} weeks to clear` : 'no throughput yet'}
            icon={<Icon name="list-todo" size={15} className="text-faint" />}
          />
          <Stat
            label="Time logged"
            value={fmtHours(totalMinutes)}
            hint={`${logs.length} entries`}
            icon={<Icon name="clock" size={15} className="text-faint" />}
          />
        </div>

        {fc.weeksToClear !== null && (
          <InlineAlert tone={fc.confidence === 'high' ? 'info' : 'warn'} title="Forecast">
            At {fc.weeklyThroughput} items per week, the {fc.openCount} open items clear in about{' '}
            <strong>{fc.weeksToClear} weeks</strong> — around {fc.projectedDate ? fmtDate(fc.projectedDate, 'MMM d, yyyy') : 'n/a'}.
            Confidence is <strong>{fc.confidence}</strong>{fc.confidence !== 'high' ? ' because weekly throughput has been swinging; treat the date as a range, not a promise.' : ' — throughput has been steady.'}
          </InlineAlert>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Flow" subtitle="Created vs completed each week. A widening gap means scope is winning." height={230}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flow} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="iCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="iDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="week" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={36} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#f59e0b" fill="url(#iCreated)" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="url(#iDone)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cycle time trend" subtitle="Median days from start to done, by week completed." height={230}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ct.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="week" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={36} />
                <Tooltip content={<ChartTooltip unit="d" />} />
                <Line type="monotone" dataKey="median" name="Median days" stroke="#6c62f2" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cycle time distribution" subtitle="Where finished work actually lands." height={230}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ct.buckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="range" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={36} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--sunken))' }} />
                <Bar dataKey="count" name="Issues" radius={[5, 5, 0, 0]}>
                  {ct.buckets.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Work by state" subtitle="The whole pipeline at a glance." height={230}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byState} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                  {byState.map((row) => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {velocity.length > 0 && (
            <ChartCard title="Velocity" subtitle="Committed vs completed points per cycle." height={230}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={36} />
                  <Tooltip content={<ChartTooltip unit="p" />} cursor={{ fill: 'rgb(var(--sunken))' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="committed" name="Committed" fill="#c6cfff" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#6c62f2" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <ChartCard title="Time logged" subtitle="Hours recorded per day over three weeks." height={230}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="day" {...AXIS_PROPS} interval={2} />
                <YAxis {...AXIS_PROPS} width={36} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => fmtHours(v)} />} cursor={{ fill: 'rgb(var(--sunken))' }} />
                <Bar dataKey="minutes" name="Logged" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Open work by priority</h3>
            <div className="space-y-2.5">
              {byPriority.reverse().map((row, i) => {
                const total = byPriority.reduce((s, r) => s + r.value, 0) || 1
                return (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted">
                        <PriorityIcon priority={(4 - i) as any} />{row.name}
                      </span>
                      <span className="font-semibold tabular-nums text-ink">{row.value}</span>
                    </div>
                    <Progress value={(row.value / total) * 100} height={4} color={CHART_COLORS[i % CHART_COLORS.length]} />
                  </div>
                )
              })}
            </div>
          </section>

          <section className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">By type</h3>
            <div className="space-y-2.5">
              {byType.map((row, i) => {
                const total = byType.reduce((s, r) => s + r.value, 0) || 1
                return (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">{row.label}</span>
                      <span className="font-semibold tabular-nums text-ink">{row.value}</span>
                    </div>
                    <Progress value={(row.value / total) * 100} height={4} color={CHART_COLORS[i % CHART_COLORS.length]} />
                  </div>
                )
              })}
            </div>
          </section>

          <section className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Top labels</h3>
            <div className="space-y-2.5">
              {byLabel.map((row, i) => {
                const total = byLabel[0]?.value || 1
                return (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="truncate text-muted">{row.name}</span>
                      <span className="font-semibold tabular-nums text-ink">{row.value}</span>
                    </div>
                    <Progress value={(row.value / total) * 100} height={4} color={CHART_COLORS[i % CHART_COLORS.length]} />
                  </div>
                )
              })}
              {!byLabel.length && <p className="text-sm text-faint">No labels in use.</p>}
            </div>
          </section>
        </div>

        <section>
          <SectionTitle>Aging work in progress</SectionTitle>
          {aging.length ? (
            <div className="card divide-y divide-line">
              {aging.slice(0, 10).map(({ issue, days }) => (
                <Link key={issue.id} to={`/app/issues/${issue.id}`} className="flex items-center gap-2.5 px-4 py-2.5 transition hover:bg-sunken/60">
                  <StateIcon state={stateMap.get(issue.stateId)} />
                  <PriorityIcon priority={issue.priority} />
                  <span className="font-mono text-2xs text-faint">{issue.key}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{issue.title}</span>
                  {issue.assigneeId && <span className="hidden text-2xs text-muted sm:block">{userMap.get(issue.assigneeId)?.name}</span>}
                  <Badge className={days > 14 ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300' : 'bg-amber-500/12 text-amber-600 dark:text-amber-300'}>
                    {days}d in progress
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Icon name="check-circle" size={20} />} title="Nothing is stalling" description="No in-progress work has been sitting for five days or more." />
          )}
        </section>

        <section>
          <SectionTitle>Portfolio</SectionTitle>
          <div className="scroll-x card">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-2xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-4 py-2.5 w-[170px]">Progress</th>
                  <th className="px-4 py-2.5">Open</th>
                  <th className="px-4 py-2.5">Blocked</th>
                  <th className="px-4 py-2.5">Overdue</th>
                  <th className="px-4 py-2.5">Schedule</th>
                  <th className="px-4 py-2.5">Risks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const openRisks = risks.filter((r) => r.projectId === row.project.id && r.status !== 'closed').length
                  return (
                    <tr key={row.project.id} className="transition hover:bg-sunken/60">
                      <td className="px-4 py-2.5">
                        <Link to={`/app/projects/${row.project.id}`} className="flex items-center gap-2 font-medium text-ink hover:text-brand-600 dark:hover:text-brand-300">
                          <span>{row.project.icon}</span>
                          <span className="truncate">{row.project.name}</span>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: healthMeta(row.project.health).dot }} />
                        </Link>
                      </td>
                      <td className="px-4 py-2.5"><Progress value={row.progress} color={row.project.color} height={5} showLabel /></td>
                      <td className="px-4 py-2.5 tabular-nums text-muted">{row.open}</td>
                      <td className="px-4 py-2.5 tabular-nums text-muted">{row.blocked || '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums text-muted">{row.overdue || '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {row.scheduleDelta === null ? <span className="text-faint">—</span> : (
                          <span className={row.scheduleDelta < -10 ? 'text-rose-500' : row.scheduleDelta < 0 ? 'text-amber-500' : 'text-emerald-500'}>
                            {row.scheduleDelta >= 0 ? `+${row.scheduleDelta}` : row.scheduleDelta} pts
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted">{openRisks || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {overdue.length > 0 && (
          <InlineAlert tone="warn" title={`${overdue.length} open items are past their due date`}>
            Overdue work distorts every forecast on this page. Give each one a new date or drop it.
          </InlineAlert>
        )}
      </div>
    </div>
  )
}
