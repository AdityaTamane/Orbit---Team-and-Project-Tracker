import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, Dot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Input, Segmented, Select } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/misc'
import { ProjectCard } from '@/components/project/ProjectCard'
import { useIssues, useLookups, useRisks } from '@/hooks/useData'
import { HEALTH, PROJECT_STATUSES, healthMeta, projectStatusMeta } from '@/lib/constants'
import { fmtDate } from '@/lib/format'
import { computeProjectStats } from '@/lib/projects'
import type { Health, ProjectStatus } from '@/lib/types'

export function Projects() {
  const navigate = useNavigate()
  const { projects, stateMap, userMap } = useLookups()
  const issues = useIssues()
  const risks = useRisks()

  const [layout, setLayout] = useState<'grid' | 'table'>('grid')
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [health, setHealth] = useState<Health | 'all'>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const live = issues.filter((i) => !i.archivedAt)
    return projects
      .filter((p) => (status === 'all' ? true : p.status === status))
      .filter((p) => (health === 'all' ? true : p.health === health))
      .filter((p) => !q.trim() || `${p.name} ${p.summary} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
      .map((project) => {
        const projectIssues = live.filter((i) => i.projectId === project.id)
        const openRisks = risks.filter((r) => r.projectId === project.id && r.status !== 'closed').length
        return { project, stats: computeProjectStats(project, projectIssues, stateMap, openRisks) }
      })
  }, [projects, issues, stateMap, risks, status, health, q])

  const totals = useMemo(() => ({
    active: projects.filter((p) => p.status === 'in_progress').length,
    atRisk: projects.filter((p) => p.health === 'at_risk').length,
    offTrack: projects.filter((p) => p.health === 'off_track').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }), [projects])

  return (
    <div className="pb-10">
      <PageHeader
        title="Projects"
        subtitle="Every initiative in the workspace, with the health signals that matter."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="folder-kanban" size={19} /></span>}
        actions={
          <>
            <Button variant="secondary" icon="gantt" onClick={() => navigate('/app/roadmap')}>Roadmap</Button>
            <Button variant="primary" icon="wand" onClick={() => navigate('/app/projects/new')}>Onboard project</Button>
          </>
        }
      />

      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
        <Stat label="In progress" value={totals.active} icon={<Icon name="play" size={15} className="text-faint" />} />
        <Stat label="At risk" value={totals.atRisk} tone={totals.atRisk ? 'warn' : 'good'} icon={<Icon name="alert-triangle" size={15} className="text-faint" />} />
        <Stat label="Off track" value={totals.offTrack} tone={totals.offTrack ? 'bad' : 'good'} icon={<Icon name="alert-circle" size={15} className="text-faint" />} />
        <Stat label="Shipped" value={totals.completed} tone="good" icon={<Icon name="check-circle" size={15} className="text-faint" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-line px-4 py-2 sm:px-6">
        <Input icon="search" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-full !text-[13px] sm:w-56" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-8 w-auto !text-[13px]">
          <option value="all">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select value={health} onChange={(e) => setHealth(e.target.value as any)} className="h-8 w-auto !text-[13px]">
          <option value="all">Any health</option>
          {HEALTH.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs tabular-nums text-faint">{rows.length} projects</span>
          <Segmented
            size="sm"
            value={layout}
            onChange={setLayout}
            options={[{ value: 'grid', icon: 'layout-grid', title: 'Cards' }, { value: 'table', icon: 'table', title: 'Table' }]}
          />
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {!rows.length ? (
          <EmptyState
            icon={<Icon name="folder-kanban" size={20} />}
            title="No projects match"
            description="Adjust the filters, or onboard a new project with the guided wizard."
            action={<Button variant="primary" icon="wand" onClick={() => navigate('/app/projects/new')}>Onboard project</Button>}
          />
        ) : layout === 'grid' ? (
          <div className="grid gap-3 grid-dense-cols">
            {rows.map(({ project, stats }) => (
              <ProjectCard
                key={project.id}
                project={project}
                stats={stats}
                lead={userMap.get(project.leadId)}
                members={project.memberIds.map((m) => userMap.get(m))}
              />
            ))}
          </div>
        ) : (
          <div className="scroll-x card">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-2xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Health</th>
                  <th className="px-4 py-2.5 w-[190px]">Progress</th>
                  <th className="px-4 py-2.5">Lead</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ project, stats }) => (
                  <tr key={project.id} className="cursor-pointer transition hover:bg-sunken/60" onClick={() => navigate(`/app/projects/${project.id}`)}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span>{project.icon}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{project.name}</p>
                          <p className="truncate text-2xs text-faint">{project.key} · {stats.total} issues</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><Badge className={projectStatusMeta(project.status).color}>{projectStatusMeta(project.status).label}</Badge></td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <Dot color={healthMeta(project.health).dot} />{healthMeta(project.health).label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Progress value={stats.progress} color={project.color} showLabel height={5} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <Avatar user={userMap.get(project.leadId)} size="xs" />
                        {userMap.get(project.leadId)?.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs tabular-nums text-muted">
                      {project.targetDate ? fmtDate(project.targetDate, 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {stats.blocked > 0 && <Badge className="bg-rose-500/12 text-rose-600 dark:text-rose-300">{stats.blocked} blocked</Badge>}
                        {stats.overdue > 0 && <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300">{stats.overdue} overdue</Badge>}
                        {stats.openRisks > 0 && <Badge className="bg-orange-500/12 text-orange-600 dark:text-orange-300">{stats.openRisks} risks</Badge>}
                        {!stats.blocked && !stats.overdue && !stats.openRisks && <span className="text-2xs text-faint">clear</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <p className="mt-4 text-center text-xs text-faint">
            Looking for finished work? <Link to="/app/insights" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Insights</Link> keeps the delivery history.
          </p>
        )}
      </div>
    </div>
  )
}
