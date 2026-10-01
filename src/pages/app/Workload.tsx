import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Select } from '@/components/ui/form'
import { InlineAlert, PageHeader, SectionTitle } from '@/components/ui/misc'
import { AXIS_PROPS, ChartCard, ChartTooltip, GRID_PROPS } from '@/components/chart/chrome'
import { PriorityIcon, StateIcon } from '@/components/issue/atoms'
import { useIssues, useLookups, useTeamMembers, useTimeLogs } from '@/hooks/useData'
import { workload } from '@/lib/analytics'
import { fmtHours } from '@/lib/format'

const STATUS_STYLE = {
  light: 'bg-sky-500/12 text-sky-600 dark:text-sky-300',
  balanced: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
  heavy: 'bg-amber-500/12 text-amber-600 dark:text-amber-300',
  overloaded: 'bg-rose-500/12 text-rose-600 dark:text-rose-300',
} as const

export function Workload() {
  const { users, teams, stateMap, projectMap } = useLookups()
  const issues = useIssues()
  const logs = useTimeLogs()
  const members = useTeamMembers()
  const [teamId, setTeamId] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const scopedUsers = useMemo(() => {
    if (teamId === 'all') return users
    const ids = new Set(members.filter((m) => m.teamId === teamId).map((m) => m.userId))
    return users.filter((u) => ids.has(u.id))
  }, [users, members, teamId])

  const scopedIssues = useMemo(
    () => (teamId === 'all' ? issues : issues.filter((i) => i.teamId === teamId)),
    [issues, teamId],
  )

  const rows = useMemo(() => workload(scopedUsers, scopedIssues, stateMap, logs), [scopedUsers, scopedIssues, stateMap, logs])

  const chartData = rows.map((r) => ({ name: r.user.name.split(' ')[0], points: r.points, load: r.loadPct, color: r.user.avatarColor }))
  const overloaded = rows.filter((r) => r.status === 'overloaded')
  const idle = rows.filter((r) => r.status === 'light')
  const unassigned = scopedIssues.filter((i) => !i.assigneeId && !i.archivedAt && !['completed', 'canceled'].includes(stateMap.get(i.stateId)?.category ?? ''))

  return (
    <div className="pb-10">
      <PageHeader
        title="Workload"
        subtitle="Who is carrying what — against real capacity, not vibes."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="gauge" size={19} /></span>}
        actions={
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-9 w-auto !text-[13px]">
            <option value="all">Everyone</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </Select>
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="People" value={rows.length} hint={`${rows.reduce((s, r) => s + r.open, 0)} open items assigned`} icon={<Icon name="users" size={15} className="text-faint" />} />
          <Stat label="Overloaded" value={overloaded.length} tone={overloaded.length ? 'bad' : 'good'} hint="above 130% of capacity" icon={<Icon name="alert-circle" size={15} className="text-faint" />} />
          <Stat label="Has room" value={idle.length} tone="good" hint="under 45% of capacity" icon={<Icon name="check-circle" size={15} className="text-faint" />} />
          <Stat label="Unassigned" value={unassigned.length} tone={unassigned.length > 5 ? 'warn' : 'default'} hint="open work with no owner" icon={<Icon name="user" size={15} className="text-faint" />} />
        </div>

        {overloaded.length > 0 && (
          <InlineAlert tone="danger" title={`${overloaded.length} ${overloaded.length === 1 ? 'person is' : 'people are'} over capacity`}>
            {overloaded.map((r) => r.user.name).join(', ')} {overloaded.length === 1 ? 'is' : 'are'} carrying more than their week can hold.
            {idle.length > 0 && ` ${idle.map((r) => r.user.name.split(' ')[0]).join(', ')} ${idle.length === 1 ? 'has' : 'have'} room.`}
          </InlineAlert>
        )}

        <ChartCard title="Points assigned per person" subtitle="Open, unfinished work only." height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} width={36} />
              <Tooltip content={<ChartTooltip unit="p" />} cursor={{ fill: 'rgb(var(--sunken))' }} />
              <Bar dataKey="points" name="Points" radius={[5, 5, 0, 0]}>
                {chartData.map((row) => <Cell key={row.name} fill={row.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <section>
          <SectionTitle>Capacity detail</SectionTitle>
          <div className="card divide-y divide-line">
            {rows.map((row) => {
              const mine = scopedIssues
                .filter((i) => i.assigneeId === row.user.id && !i.archivedAt && !['completed', 'canceled'].includes(stateMap.get(i.stateId)?.category ?? ''))
                .sort((a, b) => b.priority - a.priority)
              const open = expanded === row.user.id
              return (
                <div key={row.user.id}>
                  <button onClick={() => setExpanded(open ? null : row.user.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sunken/60">
                    <Avatar user={row.user} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{row.user.name}</p>
                        <Badge className={STATUS_STYLE[row.status]}>{row.status}</Badge>
                        {row.overdue > 0 && <Badge className="bg-rose-500/12 text-rose-600 dark:text-rose-300">{row.overdue} overdue</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted">{row.user.title} · {row.user.capacityHours}h/week capacity</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress
                          value={Math.min(100, row.loadPct)}
                          height={6}
                          className="max-w-sm"
                          color={row.status === 'overloaded' ? '#f43f5e' : row.status === 'heavy' ? '#f59e0b' : row.status === 'light' ? '#0ea5e9' : '#10b981'}
                        />
                        <span className="shrink-0 text-2xs font-semibold tabular-nums text-muted">{row.loadPct}%</span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 gap-6 text-center sm:flex">
                      <div><p className="text-sm font-bold tabular-nums text-ink">{row.open}</p><p className="text-2xs text-faint">open</p></div>
                      <div><p className="text-sm font-bold tabular-nums text-ink">{row.inProgress}</p><p className="text-2xs text-faint">active</p></div>
                      <div><p className="text-sm font-bold tabular-nums text-ink">{row.points}</p><p className="text-2xs text-faint">points</p></div>
                      <div><p className="text-sm font-bold tabular-nums text-ink">{fmtHours(row.loggedMinutes)}</p><p className="text-2xs text-faint">logged</p></div>
                    </div>
                    <Icon name="chevron-right" size={16} className={clsx('shrink-0 text-faint transition-transform', open && 'rotate-90')} />
                  </button>

                  {open && (
                    <div className="border-t border-line bg-sunken/40 px-4 py-2">
                      {mine.length ? mine.map((issue) => (
                        <Link key={issue.id} to={`/app/issues/${issue.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-surface">
                          <PriorityIcon priority={issue.priority} />
                          <StateIcon state={stateMap.get(issue.stateId)} />
                          <span className="font-mono text-2xs text-faint">{issue.key}</span>
                          <span className="min-w-0 flex-1 truncate text-ink">{issue.title}</span>
                          {issue.projectId && (
                            <span className="hidden text-2xs sm:block" style={{ color: projectMap.get(issue.projectId)?.color }}>
                              {projectMap.get(issue.projectId)?.icon} {projectMap.get(issue.projectId)?.name}
                            </span>
                          )}
                          <span className="shrink-0 text-2xs tabular-nums text-faint">{issue.estimate ?? '—'}p</span>
                        </Link>
                      )) : (
                        <p className="px-2 py-3 text-sm text-faint">Nothing open assigned right now.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {unassigned.length > 0 && (
          <section>
            <SectionTitle>Unassigned open work</SectionTitle>
            <div className="card divide-y divide-line">
              {unassigned.slice(0, 12).map((issue) => (
                <Link key={issue.id} to={`/app/issues/${issue.id}`} className="flex items-center gap-2.5 px-4 py-2.5 transition hover:bg-sunken/60">
                  <PriorityIcon priority={issue.priority} />
                  <StateIcon state={stateMap.get(issue.stateId)} />
                  <span className="font-mono text-2xs text-faint">{issue.key}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{issue.title}</span>
                  <Badge className="shrink-0 bg-sunken text-faint">no owner</Badge>
                </Link>
              ))}
            </div>
            {unassigned.length > 12 && <p className="mt-2 text-xs text-faint">+{unassigned.length - 12} more without an owner.</p>}
          </section>
        )}

        <div className="card p-4 text-sm leading-6 text-muted">
          <strong className="text-ink">How load is computed:</strong> each person's capacity in hours is converted to points at
          four hours per point, then compared with the points of open, unfinished work assigned to them. It is a rough
          instrument — good enough to spot the person carrying twice their share, not precise enough to plan a quarter on.
        </div>
      </div>
    </div>
  )
}
