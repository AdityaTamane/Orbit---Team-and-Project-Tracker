import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Badge, Dot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { InlineAlert, PageHeader, SectionTitle, Tabs } from '@/components/ui/misc'
import { ActivityFeed } from '@/components/common/ActivityFeed'
import { CommentThread } from '@/components/common/CommentThread'
import { MarkdownView } from '@/components/common/Markdown'
import { TimelineChart } from '@/components/board/TimelineView'
import type { TimelineBar, TimelineMarker } from '@/components/board/TimelineView'
import { WorkView } from '@/components/board/WorkView'
import {
  useActivities, useComments, useDocs, useIssues, useLookups, useMilestones, useProject, useRisks, useStates,
} from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { db, now, uid } from '@/lib/db'
import { HEALTH, PROJECT_STATUSES, healthMeta, projectStatusMeta } from '@/lib/constants'
import { fmtDate, fmtFull, fmtRelative } from '@/lib/format'
import {
  archiveProject, computeProjectStats, deleteMilestone, deleteProject, detectHealthSignals,
  saveMilestone, setProjectHealth, suggestedHealth, updateProject,
} from '@/lib/projects'
import { toast, useRecents } from '@/lib/store'
import type { Health, Milestone, Risk } from '@/lib/types'

type Tab = 'overview' | 'issues' | 'timeline' | 'docs' | 'risks' | 'members'

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actorId = useActorId()

  const project = useProject(id)
  const allIssues = useIssues()
  const { users, userMap, stateMap, teams } = useLookups()
  const milestones = useMilestones(id)
  const risks = useRisks(id)
  const docs = useDocs()
  const activities = useActivities(40, { projectId: id })
  const comments = useComments('project', id)
  const teamStates = useStates()
  const visit = useRecents((s) => s.visit)

  const [tab, setTab] = useState<Tab>('overview')
  const [healthModal, setHealthModal] = useState(false)
  const [milestoneModal, setMilestoneModal] = useState<Milestone | 'new' | null>(null)
  const [riskModal, setRiskModal] = useState<Risk | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)

  const projectIssues = useMemo(() => allIssues.filter((i) => i.projectId === id), [allIssues, id])
  const projectDocs = useMemo(() => docs.filter((d) => d.projectId === id || (project?.spaceId && d.spaceId === project.spaceId)), [docs, id, project])
  const openRisks = risks.filter((r) => r.status !== 'closed')

  const stats = useMemo(
    () => (project ? computeProjectStats(project, projectIssues.filter((i) => !i.archivedAt), stateMap, openRisks.length) : null),
    [project, projectIssues, stateMap, openRisks.length],
  )
  const signals = useMemo(() => (project && stats ? detectHealthSignals(project, stats) : []), [project, stats])

  const scopedStates = useMemo(
    () => teamStates.filter((s) => project?.teamIds.includes(s.teamId)),
    [teamStates, project],
  )

  useEffect(() => {
    if (project) {
      visit({ id: project.id, label: project.name, sublabel: 'Project', link: `/app/projects/${project.id}`, icon: project.icon })
    }
  }, [project?.id, project?.name, project?.icon, visit])

  const timeline = useMemo(() => {
    if (!project) return { bars: [] as TimelineBar[], markers: [] as TimelineMarker[] }
    const bars: TimelineBar[] = []
    if (project.startDate && project.targetDate) {
      bars.push({
        id: project.id, label: project.name, icon: project.icon, color: project.color,
        start: new Date(project.startDate), end: new Date(project.targetDate),
        progress: stats?.progress ?? 0,
      })
    }
    for (const m of milestones) {
      const start = project.startDate ? new Date(project.startDate) : new Date()
      const prev = milestones[milestones.indexOf(m) - 1]
      bars.push({
        id: m.id, label: m.name,
        color: m.status === 'done' ? '#10b981' : m.status === 'missed' ? '#f43f5e' : m.status === 'in_progress' ? '#f59e0b' : '#8e96ad',
        start: prev ? new Date(prev.targetDate) : start,
        end: new Date(m.targetDate),
        muted: m.status === 'done',
      })
    }
    const markers: TimelineMarker[] = milestones.map((m) => ({
      id: m.id, label: m.name, date: new Date(m.targetDate),
      color: m.status === 'done' ? '#10b981' : m.status === 'missed' ? '#f43f5e' : '#6c62f2',
    }))
    const dated = projectIssues.filter((i) => i.dueDate && stateMap.get(i.stateId)?.category !== 'completed')
    for (const issue of dated.slice(0, 25)) {
      const end = new Date(issue.dueDate!)
      bars.push({
        id: issue.id, label: issue.title,
        color: stateMap.get(issue.stateId)?.color ?? '#6c62f2',
        start: issue.startDate ? new Date(issue.startDate) : new Date(+end - 5 * 86400000),
        end,
        onClick: () => navigate(`/app/issues/${issue.id}`),
      })
    }
    return { bars, markers }
  }, [project, milestones, projectIssues, stateMap, stats, navigate])

  if (!project || !stats) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Icon name="folder-kanban" size={20} />}
          title="Project not found"
          description="It may have been deleted."
          action={<Button variant="primary" onClick={() => navigate('/app/projects')}>All projects</Button>}
        />
      </div>
    )
  }

  const health = healthMeta(project.health)
  const status = projectStatusMeta(project.status)
  const suggested = suggestedHealth(signals)

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-10">
      <PageHeader
        icon={<span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${project.color}1f` }}>{project.icon}</span>}
        title={project.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xs text-faint">{project.key}</span>
            <Badge className={status.color} dot color={status.dot}>{status.label}</Badge>
            <button onClick={() => setHealthModal(true)} className="inline-flex">
              <Badge className={clsx(health.color, 'cursor-pointer hover:brightness-95')} dot color={health.dot}>{health.label}</Badge>
            </button>
            {project.teamIds.map((tid) => {
              const team = teams.find((t) => t.id === tid)
              return team ? <Link key={tid} to={`/app/teams/${tid}`} className="chip bg-sunken text-muted hover:text-ink">{team.icon} {team.name}</Link> : null
            })}
            {project.targetDate && (
              <span className="chip bg-sunken text-muted"><Icon name="calendar" size={10} />Target {fmtDate(project.targetDate, 'MMM d, yyyy')}</span>
            )}
          </span>
        }
        actions={
          <>
            <AvatarStack users={project.memberIds.map((m) => userMap.get(m))} max={4} size="md" />
            <Button variant="secondary" icon="gauge" onClick={() => setHealthModal(true)}>Update health</Button>
            <Popover
              width={220}
              trigger={({ toggle, ref }) => (
                <button ref={ref as any} onClick={toggle} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:bg-sunken hover:text-ink" aria-label="Project actions">
                  <Icon name="more-horizontal" size={16} />
                </button>
              )}
            >
              {(close) => (
                <div className="py-1">
                  <MenuItem icon={<Icon name="pen" size={14} />} onClick={() => { setEditing(true); close() }}>Edit details</MenuItem>
                  <MenuItem icon={<Icon name="flag" size={14} />} onClick={() => { setMilestoneModal('new'); close() }}>Add milestone</MenuItem>
                  <MenuItem icon={<Icon name="alert-triangle" size={14} />} onClick={() => { setRiskModal('new'); close() }}>Raise a risk</MenuItem>
                  {project.spaceId && <MenuItem icon={<Icon name="boxes" size={14} />} onClick={() => { navigate(`/app/spaces/${project.spaceId}`); close() }}>Open shared space</MenuItem>}
                  <MenuDivider />
                  <MenuItem icon={<Icon name="archive" size={14} />} onClick={() => { archiveProject(project.id, actorId); toast.success('Project archived'); close() }}>Archive project</MenuItem>
                  <MenuItem danger icon={<Icon name="trash" size={14} />} onClick={() => { setConfirmDelete(true); close() }}>Delete project</MenuItem>
                </div>
              )}
            </Popover>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'overview', label: 'Overview', icon: 'dashboard' },
              { value: 'issues', label: 'Issues', icon: 'list-todo', count: projectIssues.length },
              { value: 'timeline', label: 'Timeline', icon: 'gantt' },
              { value: 'docs', label: 'Docs', icon: 'file-text', count: projectDocs.length },
              { value: 'risks', label: 'Risks', icon: 'alert-triangle', count: openRisks.length },
              { value: 'members', label: 'Team', icon: 'users', count: project.memberIds.length },
            ]}
          />
        }
      />

      {tab === 'overview' && (
        <div className="space-y-6 px-4 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Progress" value={`${stats.progress}%`} hint={`${stats.done} of ${stats.total} issues done`} icon={<Icon name="check-circle" size={15} className="text-faint" />} />
            <Stat label="In flight" value={stats.inProgress} hint={`${stats.blocked} blocked · ${stats.backlog} in backlog`} tone={stats.blocked ? 'warn' : 'default'} icon={<Icon name="play" size={15} className="text-faint" />} />
            <Stat
              label="Schedule"
              value={stats.daysRemaining === null ? '—' : stats.daysRemaining >= 0 ? `${stats.daysRemaining}d left` : `${Math.abs(stats.daysRemaining)}d over`}
              tone={stats.daysRemaining !== null && stats.daysRemaining < 0 ? 'bad' : stats.scheduleDelta !== null && stats.scheduleDelta < -10 ? 'warn' : 'default'}
              hint={stats.scheduleDelta === null ? 'No dates set' : stats.scheduleDelta >= 0 ? `${stats.scheduleDelta} points ahead` : `${Math.abs(stats.scheduleDelta)} points behind`}
              icon={<Icon name="calendar" size={15} className="text-faint" />}
            />
            <Stat label="Open risks" value={openRisks.length} tone={openRisks.length > 1 ? 'bad' : openRisks.length ? 'warn' : 'good'} hint={`${stats.overdue} overdue issues`} icon={<Icon name="alert-triangle" size={15} className="text-faint" />} />
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-5">
              {/* Health */}
              <section className="card p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Health signals</h3>
                    <p className="mt-0.5 text-xs text-muted">Computed from the work itself — no status meeting required.</p>
                  </div>
                  {suggested !== project.health && (
                    <button onClick={() => setHealthModal(true)} className="chip bg-amber-500/12 text-amber-600 dark:text-amber-300">
                      <Icon name="lightbulb" size={11} />Suggests {healthMeta(suggested).label}
                    </button>
                  )}
                </div>
                {project.healthNote && (
                  <div className="mb-3 rounded-lg border border-line bg-sunken/50 px-3 py-2">
                    <p className="text-2xs font-bold uppercase tracking-wider text-faint">Latest update</p>
                    <p className="mt-1 text-sm leading-6 text-ink">{project.healthNote}</p>
                    <p className="mt-1 text-2xs text-faint">by {userMap.get(project.leadId)?.name} · {fmtRelative(project.updatedAt)}</p>
                  </div>
                )}
                <div className="space-y-2">
                  {signals.map((s) => (
                    <div
                      key={s.id}
                      className={clsx('flex items-start gap-2.5 rounded-lg border px-3 py-2',
                        s.severity === 'danger' ? 'border-rose-500/30 bg-rose-500/8' : s.severity === 'warn' ? 'border-amber-500/30 bg-amber-500/8' : 'border-line')}
                    >
                      <Icon
                        name={s.severity === 'danger' ? 'alert-circle' : s.severity === 'warn' ? 'alert-triangle' : 'check-circle'}
                        size={15}
                        className={clsx('mt-0.5 shrink-0', s.severity === 'danger' ? 'text-rose-500' : s.severity === 'warn' ? 'text-amber-500' : 'text-emerald-500')}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink">{s.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-muted">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* About */}
              {project.description && (
                <section className="card p-4">
                  <h3 className="mb-2 text-sm font-semibold text-ink">About this project</h3>
                  <MarkdownView body={project.description} />
                </section>
              )}

              {/* Milestones */}
              <section>
                <SectionTitle action={<Button size="xs" variant="ghost" icon="plus" onClick={() => setMilestoneModal('new')}>Add</Button>}>
                  Milestones
                </SectionTitle>
                <div className="card divide-y divide-line">
                  {milestones.map((m) => {
                    const items = projectIssues.filter((i) => i.milestoneId === m.id && !i.archivedAt)
                    const done = items.filter((i) => stateMap.get(i.stateId)?.category === 'completed').length
                    const progress = items.length ? Math.round((done / items.length) * 100) : m.status === 'done' ? 100 : 0
                    const late = m.status !== 'done' && +new Date(m.targetDate) < Date.now()
                    return (
                      <div key={m.id} className="group flex items-start gap-3 px-4 py-3">
                        <span className={clsx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                          m.status === 'done' ? 'bg-emerald-500/15 text-emerald-500' : late ? 'bg-rose-500/15 text-rose-500' : 'bg-sunken text-faint')}>
                          <Icon name={m.status === 'done' ? 'check' : 'flag'} size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-semibold text-ink">{m.name}</p>
                            <Badge className={clsx(
                              m.status === 'done' ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
                                : m.status === 'missed' ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
                                : m.status === 'in_progress' ? 'bg-amber-500/12 text-amber-600 dark:text-amber-300'
                                : 'bg-sunken text-muted',
                            )}>
                              {m.status.replace('_', ' ')}
                            </Badge>
                            <span className={clsx('text-2xs', late ? 'text-rose-500' : 'text-faint')}>{fmtFull(m.targetDate)}</span>
                          </div>
                          {m.description && <p className="mt-0.5 text-xs leading-5 text-muted">{m.description}</p>}
                          {items.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <Progress value={progress} height={5} className="max-w-[220px]" color={m.status === 'done' ? '#10b981' : project.color} />
                              <span className="text-2xs tabular-nums text-faint">{done}/{items.length}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => setMilestoneModal(m)} className="shrink-0 text-faint opacity-0 transition hover:text-ink group-hover:opacity-100" aria-label="Edit milestone">
                          <Icon name="pen" size={14} />
                        </button>
                      </div>
                    )
                  })}
                  {!milestones.length && (
                    <EmptyState className="border-0" icon={<Icon name="flag" size={18} />} title="No milestones" description="Milestones turn a long project into checkpoints you can actually miss or hit." action={<Button size="sm" variant="secondary" icon="plus" onClick={() => setMilestoneModal('new')}>Add milestone</Button>} />
                  )}
                </div>
              </section>

              {/* Discussion */}
              <section>
                <SectionTitle>Project discussion</SectionTitle>
                <div className="card p-4">
                  <CommentThread
                    entityType="project"
                    entityId={project.id}
                    entityLabel={project.name}
                    link={`/app/projects/${project.id}`}
                    comments={comments}
                    users={users}
                    userMap={userMap}
                    currentUserId={actorId}
                    subscriberIds={project.memberIds}
                    projectId={project.id}
                  />
                </div>
              </section>
            </div>

            <div className="min-w-0 space-y-5">
              <section className="card p-4">
                <h3 className="mb-3 text-sm font-semibold text-ink">Breakdown</h3>
                <div className="space-y-2.5">
                  {['completed', 'started', 'paused', 'unstarted', 'backlog'].map((cat) => {
                    const count = projectIssues.filter((i) => !i.archivedAt && stateMap.get(i.stateId)?.category === cat).length
                    const label = { completed: 'Done', started: 'In progress', paused: 'Blocked', unstarted: 'Todo', backlog: 'Backlog' }[cat]!
                    const color = { completed: '#10b981', started: '#f59e0b', paused: '#f43f5e', unstarted: '#6366f1', backlog: '#8e96ad' }[cat]!
                    const total = projectIssues.filter((i) => !i.archivedAt).length || 1
                    return (
                      <div key={cat}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-muted"><Dot color={color} />{label}</span>
                          <span className="font-semibold tabular-nums text-ink">{count}</span>
                        </div>
                        <Progress value={(count / total) * 100} color={color} height={4} />
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-center">
                  <div>
                    <p className="text-lg font-bold tabular-nums text-ink">{stats.scopePoints}</p>
                    <p className="text-2xs text-faint">points in scope</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold tabular-nums text-ink">{stats.pointProgress}%</p>
                    <p className="text-2xs text-faint">of points done</p>
                  </div>
                </div>
              </section>

              {openRisks.length > 0 && (
                <section>
                  <SectionTitle action={<button onClick={() => setTab('risks')} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">All risks</button>}>
                    Top risks
                  </SectionTitle>
                  <div className="space-y-2">
                    {openRisks.slice(0, 3).map((r) => (
                      <button key={r.id} onClick={() => setRiskModal(r)} className="card card-hover w-full p-3 text-left">
                        <div className="flex items-start gap-2">
                          <span className={clsx('mt-0.5 shrink-0', r.severity >= 4 ? 'text-rose-500' : r.severity >= 3 ? 'text-amber-500' : 'text-faint')}>
                            <Icon name="alert-triangle" size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-ink">{r.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{r.detail}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Badge className="bg-sunken text-muted">Severity {r.severity}/4</Badge>
                              <Badge className="bg-sunken text-muted capitalize">{r.status}</Badge>
                              <Avatar user={userMap.get(r.ownerId)} size="xs" />
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {projectDocs.length > 0 && (
                <section>
                  <SectionTitle action={<button onClick={() => setTab('docs')} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">All docs</button>}>
                    Docs
                  </SectionTitle>
                  <div className="card divide-y divide-line">
                    {projectDocs.slice(0, 5).map((d) => (
                      <Link key={d.id} to={`/app/docs/${d.id}`} className="flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-sunken/60">
                        <span className="text-base">{d.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">{d.title}</span>
                          <span className="block text-2xs text-faint">{d.kind} · updated {fmtRelative(d.updatedAt)}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <SectionTitle>Recent activity</SectionTitle>
                <div className="card p-4">
                  <ActivityFeed activities={activities.slice(0, 12)} userMap={userMap} compact />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {tab === 'issues' && (
        <WorkView
          viewKey={`project-${project.id}`}
          issues={projectIssues}
          states={scopedStates}
          showProject={false}
          seed={{ projectId: project.id, teamId: project.teamIds[0] }}
          defaults={{ layout: 'board', groupBy: 'state', sortBy: 'manual' }}
          emptyTitle="No issues in this project"
          emptyDescription="Add the first piece of work, or run a template from the wizard."
        />
      )}

      {tab === 'timeline' && (
        <div className="px-4 py-5 sm:px-6">
          <div className="card overflow-hidden">
            <TimelineChart bars={timeline.bars} markers={timeline.markers} dayWidth={11} />
          </div>
          <p className="mt-3 text-xs text-faint">
            Bars show the project, its milestones and any dated open issues. Diamonds mark milestone dates.
          </p>
        </div>
      )}

      {tab === 'docs' && (
        <div className="px-4 py-5 sm:px-6">
          <SectionTitle
            action={
              <Button size="sm" variant="primary" icon="plus" onClick={() => navigate(`/app/docs?new=1&project=${project.id}${project.spaceId ? `&space=${project.spaceId}` : ''}`)}>
                New doc
              </Button>
            }
          >
            Project documentation
          </SectionTitle>
          {projectDocs.length ? (
            <div className="grid gap-3 grid-dense-cols">
              {projectDocs.map((d) => (
                <Link key={d.id} to={`/app/docs/${d.id}`} className="card card-hover p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{d.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{d.title}</p>
                      <p className="text-2xs capitalize text-faint">{d.kind} · {d.status}</p>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{d.body.replace(/[#*`|>-]/g, '').slice(0, 160)}</p>
                  <p className="mt-2 text-2xs text-faint">Updated {fmtRelative(d.updatedAt)} by {userMap.get(d.authorId)?.name}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Icon name="file-text" size={20} />} title="No docs yet" description="Specs, decisions and runbooks live here alongside the work." />
          )}
        </div>
      )}

      {tab === 'risks' && (
        <div className="px-4 py-5 sm:px-6">
          <SectionTitle action={<Button size="sm" variant="primary" icon="plus" onClick={() => setRiskModal('new')}>Raise a risk</Button>}>
            Risk register
          </SectionTitle>
          {risks.length ? (
            <div className="space-y-2">
              {risks.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className={clsx('mt-0.5 shrink-0', r.severity >= 4 ? 'text-rose-500' : r.severity >= 3 ? 'text-amber-500' : 'text-faint')}>
                        <Icon name="alert-triangle" size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{r.title}</p>
                        <p className="mt-1 text-[13px] leading-6 text-muted">{r.detail}</p>
                        <div className="mt-2 rounded-lg border border-line bg-sunken/50 px-3 py-2">
                          <p className="text-2xs font-bold uppercase tracking-wider text-faint">Mitigation</p>
                          <p className="mt-0.5 text-[13px] leading-6 text-ink">{r.mitigation || 'None recorded yet.'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge className={r.status === 'closed' ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' : r.status === 'mitigating' ? 'bg-sky-500/12 text-sky-600 dark:text-sky-300' : 'bg-amber-500/12 text-amber-600 dark:text-amber-300'}>
                        {r.status}
                      </Badge>
                      <span className="text-2xs text-faint">Exposure {r.severity * r.likelihood}/16</span>
                      <div className="flex items-center gap-1.5">
                        <Avatar user={userMap.get(r.ownerId)} size="xs" />
                        <span className="text-2xs text-muted">{userMap.get(r.ownerId)?.name}</span>
                      </div>
                      <button onClick={() => setRiskModal(r)} className="text-2xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Icon name="shield" size={20} />} title="No risks logged" description="A project with no recorded risks usually means nobody has looked, not that there are none." action={<Button variant="secondary" icon="plus" onClick={() => setRiskModal('new')}>Raise the first risk</Button>} />
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="px-4 py-5 sm:px-6">
          <SectionTitle>People on this project</SectionTitle>
          <div className="grid gap-3 grid-dense-cols">
            {project.memberIds.map((mid) => {
              const u = userMap.get(mid)
              if (!u) return null
              const assigned = projectIssues.filter((i) => i.assigneeId === mid && !i.archivedAt)
              const doneCount = assigned.filter((i) => stateMap.get(i.stateId)?.category === 'completed').length
              return (
                <Link key={mid} to={`/app/people/${mid}`} className="card card-hover p-4">
                  <div className="flex items-center gap-3">
                    <Avatar user={u} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                        {mid === project.leadId && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">Lead</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted">{u.title}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-2xs text-muted">
                    <span>{assigned.length - doneCount} open</span>
                    <span>{doneCount} completed</span>
                    <span>{assigned.reduce((s, i) => s + (i.estimate ?? 0), 0)} pts</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      <HealthModal
        open={healthModal}
        onClose={() => setHealthModal(false)}
        current={project.health}
        note={project.healthNote ?? ''}
        suggested={suggested}
        signals={signals.map((s) => s.detail)}
        onSave={async (h, note) => { await setProjectHealth(project.id, h, note, actorId); toast.success('Health updated — members notified') }}
      />

      <MilestoneModal
        open={!!milestoneModal}
        milestone={milestoneModal === 'new' ? null : milestoneModal}
        onClose={() => setMilestoneModal(null)}
        onSave={async (m) => {
          await saveMilestone({ ...m, projectId: project.id })
          toast.success('Milestone saved')
        }}
        onDelete={async (mid) => { await deleteMilestone(mid); toast.success('Milestone deleted') }}
        nextOrder={milestones.length}
      />

      <RiskModal
        open={!!riskModal}
        risk={riskModal === 'new' ? null : riskModal}
        users={users}
        defaultOwner={actorId}
        onClose={() => setRiskModal(null)}
        onSave={async (r) => { await db.risks.put({ ...r, projectId: project.id }); toast.success('Risk saved') }}
        onDelete={async (rid) => { await db.risks.delete(rid); toast.success('Risk removed') }}
      />

      <EditProjectModal
        open={editing}
        project={project}
        users={users}
        onClose={() => setEditing(false)}
        onSave={async (patch) => { await updateProject(project.id, patch, actorId); toast.success('Project updated') }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => { await deleteProject(project.id); toast.success('Project deleted'); navigate('/app/projects') }}
        title={`Delete ${project.name}?`}
        message="This permanently removes the project, its issues, milestones and risks. Docs and the shared space are kept."
        confirmLabel="Delete project"
        danger
      />
    </div>
  )
}

/* ── Modals ─────────────────────────────────────────────────── */

function HealthModal({ open, onClose, current, note, suggested, signals, onSave }: {
  open: boolean
  onClose: () => void
  current: Health
  note: string
  suggested: Health
  signals: string[]
  onSave: (h: Health, note: string) => Promise<void>
}) {
  const [health, setHealth] = useState<Health>(current)
  const [text, setText] = useState(note)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update project health"
      subtitle="Members get notified — say what changed and what you are doing about it."
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="send" onClick={async () => { await onSave(health, text); onClose() }}>Post update</Button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        {suggested !== health && (
          <InlineAlert tone="info" title={`Signals suggest ${healthMeta(suggested).label}`} action={<Button size="xs" variant="secondary" onClick={() => setHealth(suggested)}>Use it</Button>}>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
              {signals.slice(0, 3).map((s) => <li key={s}>{s}</li>)}
            </ul>
          </InlineAlert>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {HEALTH.filter((h) => h.value !== 'unknown').map((h) => (
            <button
              key={h.value}
              onClick={() => setHealth(h.value)}
              className={clsx('flex items-center gap-2.5 rounded-lg border p-3 text-left transition',
                health === h.value ? 'border-brand-500 bg-brand-500/8' : 'border-line hover:bg-sunken')}
            >
              <Dot color={h.dot} />
              <span className="text-sm font-semibold text-ink">{h.label}</span>
              {health === h.value && <Icon name="check" size={15} className="ml-auto text-brand-500" />}
            </button>
          ))}
        </div>
        <Field label="What's going on?" hint="Two sentences beat a status meeting.">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Reconciliation is two weeks behind because the vendor sandbox keeps failing. Mitigation agreed, tracking weekly." />
        </Field>
      </div>
    </Modal>
  )
}

function MilestoneModal({ open, milestone, onClose, onSave, onDelete, nextOrder }: {
  open: boolean
  milestone: Milestone | null
  onClose: () => void
  onSave: (m: Milestone) => Promise<void>
  onDelete: (id: string) => Promise<void>
  nextOrder: number
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<Milestone['status']>('upcoming')
  const [seeded, setSeeded] = useState<string | null>(null)

  const seedKey = milestone?.id ?? (open ? 'new' : null)
  if (open && seeded !== seedKey) {
    setSeeded(seedKey)
    setName(milestone?.name ?? '')
    setDescription(milestone?.description ?? '')
    setDate(milestone ? milestone.targetDate.slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
    setStatus(milestone?.status ?? 'upcoming')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={milestone ? 'Edit milestone' : 'New milestone'}
      width="md"
      footer={
        <>
          {milestone && (
            <Button variant="ghost" className="mr-auto text-rose-500" icon="trash" onClick={async () => { await onDelete(milestone.id); onClose() }}>Delete</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="flag"
            disabled={!name.trim()}
            onClick={async () => {
              await onSave({
                id: milestone?.id ?? uid('ms'),
                projectId: milestone?.projectId ?? '',
                name: name.trim(), description,
                targetDate: new Date(date).toISOString(),
                status,
                order: milestone?.order ?? nextOrder,
              })
              onClose()
            }}
          >
            Save milestone
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beta with design partners" /></Field>
        <Field label="What does done look like?"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[70px]" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Milestone['status'])}>
              <option value="upcoming">Upcoming</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="missed">Missed</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}

function RiskModal({ open, risk, users, defaultOwner, onClose, onSave, onDelete }: {
  open: boolean
  risk: Risk | null
  users: { id: string; name: string }[]
  defaultOwner: string
  onClose: () => void
  onSave: (r: Risk) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [mitigation, setMitigation] = useState('')
  const [severity, setSeverity] = useState<Risk['severity']>(3)
  const [likelihood, setLikelihood] = useState<Risk['likelihood']>(2)
  const [ownerId, setOwnerId] = useState(defaultOwner)
  const [status, setStatus] = useState<Risk['status']>('open')
  const [seeded, setSeeded] = useState<string | null>(null)

  const seedKey = risk?.id ?? (open ? 'new' : null)
  if (open && seeded !== seedKey) {
    setSeeded(seedKey)
    setTitle(risk?.title ?? '')
    setDetail(risk?.detail ?? '')
    setMitigation(risk?.mitigation ?? '')
    setSeverity(risk?.severity ?? 3)
    setLikelihood(risk?.likelihood ?? 2)
    setOwnerId(risk?.ownerId ?? defaultOwner)
    setStatus(risk?.status ?? 'open')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={risk ? 'Edit risk' : 'Raise a risk'}
      subtitle="Severity × likelihood gives the exposure score used to rank the register."
      width="md"
      footer={
        <>
          {risk && <Button variant="ghost" className="mr-auto text-rose-500" icon="trash" onClick={async () => { await onDelete(risk.id); onClose() }}>Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="shield"
            disabled={!title.trim()}
            onClick={async () => {
              await onSave({
                id: risk?.id ?? uid('rk'), projectId: risk?.projectId ?? '',
                title: title.trim(), detail, mitigation, severity, likelihood, ownerId, status,
                createdAt: risk?.createdAt ?? now(),
              })
              onClose()
            }}
          >
            Save risk
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Risk" required><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What could go wrong?" /></Field>
        <Field label="Why it matters"><Textarea value={detail} onChange={(e) => setDetail(e.target.value)} className="min-h-[70px]" /></Field>
        <Field label="Mitigation" hint="What are we actually doing about it?"><Textarea value={mitigation} onChange={(e) => setMitigation(e.target.value)} className="min-h-[70px]" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Severity — ${severity}/4`}>
            <input type="range" min={1} max={4} value={severity} onChange={(e) => setSeverity(Number(e.target.value) as Risk['severity'])} className="w-full accent-brand-500" />
          </Field>
          <Field label={`Likelihood — ${likelihood}/4`}>
            <input type="range" min={1} max={4} value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value) as Risk['likelihood'])} className="w-full accent-brand-500" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Owner">
            <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Risk['status'])}>
              <option value="open">Open</option>
              <option value="mitigating">Mitigating</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}

function EditProjectModal({ open, project, users, onClose, onSave }: {
  open: boolean
  project: { name: string; summary: string; description: string; status: string; leadId: string; targetDate?: string; tags: string[] }
  users: { id: string; name: string; title: string }[]
  onClose: () => void
  onSave: (patch: any) => Promise<void>
}) {
  const [name, setName] = useState(project.name)
  const [summary, setSummary] = useState(project.summary)
  const [description, setDescription] = useState(project.description)
  const [status, setStatus] = useState(project.status)
  const [leadId, setLeadId] = useState(project.leadId)
  const [target, setTarget] = useState(project.targetDate?.slice(0, 10) ?? '')
  const [tags, setTags] = useState(project.tags.join(', '))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit project"
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="save"
            onClick={async () => {
              await onSave({
                name, summary, description, status, leadId,
                targetDate: target ? new Date(target).toISOString() : undefined,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
              })
              onClose()
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Summary"><Input value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px]" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Lead">
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target date"><Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label="Tags"><Input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  )
}
