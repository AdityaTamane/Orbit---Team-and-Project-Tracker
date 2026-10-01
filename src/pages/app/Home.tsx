import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Dot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PageHeader, SectionTitle } from '@/components/ui/misc'
import { ActivityFeed } from '@/components/common/ActivityFeed'
import { AXIS_PROPS, ChartCard, ChartTooltip, GRID_PROPS } from '@/components/chart/chrome'
import { DueChip, PriorityIcon, StateIcon } from '@/components/issue/atoms'
import {
  useActivities, useCycles, useIssues, useLookups, useMilestones, useNotifications, useRisks,
} from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { cycleHealth, weeklyFlow } from '@/lib/analytics'
import { healthMeta, projectStatusMeta } from '@/lib/constants'
import { fmtDate } from '@/lib/format'
import { computeProjectStats, detectHealthSignals } from '@/lib/projects'

export function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, stateMap, userMap, teams } = useLookups()
  const issues = useIssues()
  const cycles = useCycles()
  const activities = useActivities(18)
  const notifications = useNotifications(user?.id)
  const milestones = useMilestones()
  const risks = useRisks()

  const live = useMemo(() => issues.filter((i) => !i.archivedAt), [issues])
  const open = useMemo(
    () => live.filter((i) => !['completed', 'canceled'].includes(stateMap.get(i.stateId)?.category ?? '')),
    [live, stateMap],
  )

  const mine = useMemo(() => open.filter((i) => i.assigneeId === user?.id), [open, user])
  const myOverdue = mine.filter((i) => i.dueDate && +new Date(i.dueDate) < Date.now())
  const myDueSoon = mine.filter((i) => i.dueDate && +new Date(i.dueDate) >= Date.now() && +new Date(i.dueDate) < Date.now() + 7 * 86400000)
  const blocked = open.filter((i) => stateMap.get(i.stateId)?.category === 'paused')

  const flow = useMemo(() => weeklyFlow(live, stateMap, 9), [live, stateMap])
  const activeCycles = useMemo(() => cycleHealth(cycles, live, stateMap), [cycles, live, stateMap])

  const portfolio = useMemo(
    () => projects
      .filter((p) => p.status === 'in_progress' || p.status === 'planned')
      .map((project) => {
        const projectIssues = live.filter((i) => i.projectId === project.id)
        const openRisks = risks.filter((r) => r.projectId === project.id && r.status !== 'closed').length
        const stats = computeProjectStats(project, projectIssues, stateMap, openRisks)
        return { project, stats, signals: detectHealthSignals(project, stats) }
      })
      .sort((a, b) => (b.project.health === 'off_track' ? 1 : 0) - (a.project.health === 'off_track' ? 1 : 0)),
    [projects, live, stateMap, risks],
  )

  const upcomingMilestones = useMemo(
    () => milestones
      .filter((m) => m.status !== 'done' && +new Date(m.targetDate) > Date.now() - 7 * 86400000)
      .sort((a, b) => +new Date(a.targetDate) - +new Date(b.targetDate))
      .slice(0, 5),
    [milestones],
  )

  const attention = useMemo(() => {
    const items: { id: string; icon: 'alert-triangle' | 'at-sign' | 'ban' | 'clock'; tone: string; title: string; detail: string; link: string }[] = []
    const unreadMentions = notifications.filter((n) => !n.read && n.kind === 'mention')
    if (unreadMentions.length) {
      items.push({
        id: 'mentions', icon: 'at-sign', tone: 'text-brand-500',
        title: `${unreadMentions.length} unread mention${unreadMentions.length > 1 ? 's' : ''}`,
        detail: unreadMentions[0].body, link: '/app/inbox',
      })
    }
    if (myOverdue.length) {
      items.push({
        id: 'overdue', icon: 'clock', tone: 'text-rose-500',
        title: `${myOverdue.length} of your issues are overdue`,
        detail: myOverdue.map((i) => i.key).slice(0, 4).join(', '), link: '/app/my-work',
      })
    }
    const myBlocked = blocked.filter((i) => i.assigneeId === user?.id)
    if (myBlocked.length) {
      items.push({
        id: 'blocked', icon: 'ban', tone: 'text-orange-500',
        title: `${myBlocked.length} of your issues are blocked`,
        detail: 'Blocked work needs an owner and a next step.', link: '/app/my-work',
      })
    }
    for (const row of portfolio) {
      if (row.project.leadId !== user?.id) continue
      const danger = row.signals.filter((s) => s.severity === 'danger')
      if (danger.length) {
        items.push({
          id: `p-${row.project.id}`, icon: 'alert-triangle', tone: 'text-rose-500',
          title: `${row.project.name}: ${danger[0].label}`,
          detail: danger[0].detail, link: `/app/projects/${row.project.id}`,
        })
      }
    }
    return items.slice(0, 4)
  }, [notifications, myOverdue, blocked, portfolio, user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="pb-10">
      <PageHeader
        title={`${greeting}, ${user?.name.split(' ')[0] ?? 'there'}`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        actions={
          <>
            <Button variant="secondary" icon="gantt" onClick={() => navigate('/app/roadmap')}>Roadmap</Button>
            <Button variant="primary" icon="wand" onClick={() => navigate('/app/projects/new')}>New project</Button>
          </>
        }
      />

      <div className="space-y-6 px-4 py-5 sm:px-6">
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Assigned to you"
            value={mine.length}
            hint={`${myDueSoon.length} due within a week`}
            icon={<Icon name="user" size={15} className="text-faint" />}
          />
          <Stat
            label="Overdue"
            value={myOverdue.length}
            tone={myOverdue.length ? 'bad' : 'good'}
            hint={myOverdue.length ? 'Needs a new date or a decision' : 'Nothing past due'}
            icon={<Icon name="clock" size={15} className="text-faint" />}
          />
          <Stat
            label="Blocked workspace-wide"
            value={blocked.length}
            tone={blocked.length > 4 ? 'warn' : 'default'}
            hint={`across ${new Set(blocked.map((i) => i.projectId).filter(Boolean)).size} projects`}
            icon={<Icon name="ban" size={15} className="text-faint" />}
          />
          <Stat
            label="Open work"
            value={open.length}
            hint={`${live.length - open.length} closed of ${live.length} total`}
            icon={<Icon name="list-todo" size={15} className="text-faint" />}
          />
        </div>

        {/* Attention */}
        {attention.length > 0 && (
          <section>
            <SectionTitle>Needs your attention</SectionTitle>
            <div className="grid gap-2 md:grid-cols-2">
              {attention.map((a) => (
                <Link key={a.id} to={a.link} className="card card-hover flex items-start gap-3 p-3">
                  <span className={`mt-0.5 shrink-0 ${a.tone}`}><Icon name={a.icon} size={17} /></span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">{a.title}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted">{a.detail}</span>
                  </span>
                  <Icon name="chevron-right" size={15} className="ml-auto mt-1 shrink-0 text-faint" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            {/* Portfolio */}
            <section>
              <SectionTitle action={<Link to="/app/projects" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">All projects</Link>}>
                Project health
              </SectionTitle>
              <div className="card divide-y divide-line">
                {portfolio.map(({ project, stats }) => {
                  const health = healthMeta(project.health)
                  const status = projectStatusMeta(project.status)
                  return (
                    <Link key={project.id} to={`/app/projects/${project.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-sunken/60">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base" style={{ background: `${project.color}1f` }}>{project.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-semibold text-ink">{project.name}</p>
                          <Dot color={health.dot} pulse={project.health === 'off_track'} />
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={stats.progress} color={project.color} className="max-w-[220px]" height={5} />
                          <span className="text-2xs tabular-nums text-faint">{stats.progress}%</span>
                        </div>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <Badge className={status.color}>{status.label}</Badge>
                        <p className="mt-1 text-2xs text-faint">
                          {stats.daysRemaining !== null ? (stats.daysRemaining >= 0 ? `${stats.daysRemaining}d left` : `${Math.abs(stats.daysRemaining)}d over`) : 'No target'}
                        </p>
                      </div>
                    </Link>
                  )
                })}
                {!portfolio.length && <EmptyState className="border-0" icon={<Icon name="folder-kanban" size={20} />} title="No active projects" description="Onboard a project to start tracking it here." action={<Button variant="primary" icon="wand" onClick={() => navigate('/app/projects/new')}>New project</Button>} />}
              </div>
            </section>

            {/* Flow */}
            <ChartCard title="Created vs completed" subtitle="Weekly flow across every team — if the gap widens, scope is outpacing delivery." height={210}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flow} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="week" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={38} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="created" name="Created" stroke="#f59e0b" fill="url(#gCreated)" strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="url(#gDone)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* My work preview */}
            <section>
              <SectionTitle action={<Link to="/app/my-work" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Open my work</Link>}>
                Your next few things
              </SectionTitle>
              <div className="card divide-y divide-line">
                {mine
                  .slice()
                  .sort((a, b) => b.priority - a.priority || (+new Date(a.dueDate ?? '2999') - +new Date(b.dueDate ?? '2999')))
                  .slice(0, 6)
                  .map((issue) => (
                    <Link key={issue.id} to={`/app/issues/${issue.id}`} className="flex items-center gap-2.5 px-4 py-2.5 transition hover:bg-sunken/60">
                      <PriorityIcon priority={issue.priority} />
                      <StateIcon state={stateMap.get(issue.stateId)} />
                      <span className="font-mono text-2xs text-faint">{issue.key}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{issue.title}</span>
                      <DueChip due={issue.dueDate} />
                    </Link>
                  ))}
                {!mine.length && <p className="px-4 py-6 text-center text-sm text-faint">Nothing assigned to you. Enjoy it.</p>}
              </div>
            </section>
          </div>

          {/* Right rail */}
          <div className="min-w-0 space-y-5">
            <section>
              <SectionTitle action={<Link to="/app/cycles" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">All cycles</Link>}>
                Active cycles
              </SectionTitle>
              <div className="space-y-2">
                {activeCycles.map(({ cycle, pct: done, elapsedPct, daysLeft, scope }) => {
                  const team = teams.find((t) => t.id === cycle.teamId)
                  const behind = done < elapsedPct - 10
                  return (
                    <Link key={cycle.id} to={`/app/cycles/${cycle.id}`} className="card card-hover block p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{team?.icon}</span>
                        <p className="truncate text-[13px] font-semibold text-ink">{team?.name} · {cycle.name}</p>
                        <span className="ml-auto shrink-0 text-2xs text-faint">{daysLeft}d left</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted">{cycle.goal}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={done} color={behind ? '#f43f5e' : '#10b981'} height={5} />
                        <span className="shrink-0 text-2xs font-semibold tabular-nums text-muted">{done}%</span>
                      </div>
                      <p className={`mt-1 text-2xs ${behind ? 'text-rose-500' : 'text-muted'}`}>
                        {scope} points in scope · {elapsedPct}% of the cycle elapsed
                      </p>
                    </Link>
                  )
                })}
                {!activeCycles.length && <p className="card px-4 py-6 text-center text-sm text-faint">No active cycles.</p>}
              </div>
            </section>

            <section>
              <SectionTitle>Upcoming milestones</SectionTitle>
              <div className="card divide-y divide-line">
                {upcomingMilestones.map((m) => {
                  const project = projects.find((p) => p.id === m.projectId)
                  const days = Math.ceil((+new Date(m.targetDate) - Date.now()) / 86400000)
                  return (
                    <Link key={m.id} to={`/app/projects/${m.projectId}`} className="flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-sunken/60">
                      <Icon name="flag" size={14} className={days < 0 ? 'text-rose-500' : days < 14 ? 'text-amber-500' : 'text-faint'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{m.name}</span>
                        <span className="block truncate text-2xs text-faint">{project?.icon} {project?.name}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-2xs font-semibold text-muted">{fmtDate(m.targetDate)}</span>
                        <span className={`block text-2xs ${days < 0 ? 'text-rose-500' : 'text-faint'}`}>
                          {days < 0 ? `${Math.abs(days)}d late` : `in ${days}d`}
                        </span>
                      </span>
                    </Link>
                  )
                })}
                {!upcomingMilestones.length && <p className="px-4 py-6 text-center text-sm text-faint">No milestones scheduled.</p>}
              </div>
            </section>

            <section>
              <SectionTitle action={<Link to="/app/activity" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">All activity</Link>}>
                Recent activity
              </SectionTitle>
              <div className="card p-4">
                <ActivityFeed activities={activities} userMap={userMap} compact />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
