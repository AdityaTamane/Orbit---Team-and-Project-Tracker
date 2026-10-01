import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import type { Issue, Label, Project, User, WorkflowState } from '@/lib/types'
import { BlockedChip, DueChip, EstimateChip, IssueKey, LabelChip, PriorityIcon, TypeBadge } from './atoms'

export interface IssueCardProps {
  issue: Issue
  users: Map<string, User>
  labels: Map<string, Label>
  projects: Map<string, Project>
  states: Map<string, WorkflowState>
  blockedCount?: number
  subCount?: { done: number; total: number }
  commentCount?: number
  selected?: boolean
  onSelect?: (id: string, additive: boolean) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  dragging?: boolean
  showProject?: boolean
}

export function IssueCard({
  issue, users, labels, projects, states, blockedCount = 0, subCount, commentCount = 0,
  selected, onSelect, draggable, onDragStart, onDragEnd, dragging, showProject = true,
}: IssueCardProps) {
  const navigate = useNavigate()
  const assignee = issue.assigneeId ? users.get(issue.assigneeId) : undefined
  const project = issue.projectId ? projects.get(issue.projectId) : undefined
  const done = states.get(issue.stateId)?.category === 'completed'
  const checked = issue.checklist.filter((c) => c.done).length

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if (onSelect && (e.metaKey || e.ctrlKey || e.shiftKey)) { onSelect(issue.id, true); return }
        navigate(`/app/issues/${issue.id}`)
      }}
      className={clsx(
        'group cursor-pointer rounded-lg border bg-surface p-2.5 shadow-card transition',
        'hover:border-brand-500/40 hover:shadow-pop',
        selected ? 'border-brand-500 ring-1 ring-brand-500/40' : 'border-line',
        dragging && 'drag-ghost',
        draggable && 'active:cursor-grabbing',
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <TypeBadge type={issue.type} />
        <IssueKey issue={issue} />
        <div className="ml-auto flex items-center gap-1">
          <PriorityIcon priority={issue.priority} />
        </div>
      </div>

      <p className={clsx('line-clamp-3 text-[13px] font-medium leading-5 text-ink', done && 'text-muted line-through decoration-1')}>
        {issue.title}
      </p>

      {issue.labelIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labelIds.slice(0, 3).map((id) => {
            const label = labels.get(id)
            return label ? <LabelChip key={id} name={label.name} color={label.color} /> : null
          })}
          {issue.labelIds.length > 3 && <span className="chip bg-sunken text-faint">+{issue.labelIds.length - 3}</span>}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1.5">
        {showProject && project && (
          <span className="chip max-w-[120px] truncate" style={{ background: `${project.color}18`, color: project.color }} title={project.name}>
            <span>{project.icon}</span>
            <span className="truncate">{project.name}</span>
          </span>
        )}
        <DueChip due={issue.dueDate} done={done} />
        <BlockedChip count={blockedCount} />

        <div className="ml-auto flex items-center gap-1.5 text-2xs text-faint">
          {subCount && subCount.total > 0 && (
            <span className="inline-flex items-center gap-0.5" title={`${subCount.done}/${subCount.total} sub-issues done`}>
              <Icon name="git-branch" size={11} />{subCount.done}/{subCount.total}
            </span>
          )}
          {issue.checklist.length > 0 && (
            <span className="inline-flex items-center gap-0.5" title="Checklist">
              <Icon name="list-checks" size={11} />{checked}/{issue.checklist.length}
            </span>
          )}
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5"><Icon name="message" size={11} />{commentCount}</span>
          )}
          <EstimateChip estimate={issue.estimate} />
          {assignee ? <Avatar user={assignee} size="xs" /> : <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-line text-faint"><Icon name="user" size={10} /></span>}
        </div>
      </div>
    </article>
  )
}
