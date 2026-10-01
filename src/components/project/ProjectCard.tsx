import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { healthMeta, projectStatusMeta } from '@/lib/constants'
import { fmtDate } from '@/lib/format'
import type { ProjectStats } from '@/lib/projects'
import type { Project, User } from '@/lib/types'

export function ProjectCard({ project, stats, lead, members }: {
  project: Project
  stats: ProjectStats
  lead?: User
  members: (User | undefined)[]
}) {
  const status = projectStatusMeta(project.status)
  const health = healthMeta(project.health)

  return (
    <Link to={`/app/projects/${project.id}`} className="card card-hover flex flex-col p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
          style={{ background: `${project.color}1f` }}
        >
          {project.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">{project.name}</h3>
            <span className="shrink-0 font-mono text-2xs text-faint">{project.key}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{project.summary}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge className={status.color} dot color={status.dot}>{status.label}</Badge>
        <Badge className={health.color} dot color={health.dot}>{health.label}</Badge>
        {stats.blocked > 0 && (
          <Badge className="bg-rose-500/12 text-rose-600 dark:text-rose-300"><Icon name="ban" size={10} />{stats.blocked} blocked</Badge>
        )}
        {stats.overdue > 0 && (
          <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300"><Icon name="clock" size={10} />{stats.overdue} overdue</Badge>
        )}
      </div>

      <div className="mt-3.5">
        <div className="mb-1.5 flex items-center justify-between text-2xs font-medium text-muted">
          <span>{stats.done} of {stats.total} done</span>
          <span className="tabular-nums">{stats.progress}%</span>
        </div>
        <Progress value={stats.progress} color={project.color} />
        {stats.scheduleDelta !== null && (
          <p className={`mt-1.5 text-2xs font-medium ${stats.scheduleDelta < -10 ? 'text-rose-500' : stats.scheduleDelta < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {stats.scheduleDelta >= 0 ? `${stats.scheduleDelta} points ahead of schedule` : `${Math.abs(stats.scheduleDelta)} points behind schedule`}
          </p>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex items-center gap-2">
          {lead && <Avatar user={lead} size="sm" />}
          <div className="min-w-0">
            <p className="truncate text-2xs font-medium text-ink">{lead?.name ?? 'No lead'}</p>
            <p className="text-2xs text-faint">
              {project.targetDate ? `Target ${fmtDate(project.targetDate)}` : 'No target date'}
            </p>
          </div>
        </div>
        <AvatarStack users={members} max={3} />
      </div>
    </Link>
  )
}
