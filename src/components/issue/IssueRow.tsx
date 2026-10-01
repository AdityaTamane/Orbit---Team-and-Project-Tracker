import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Checkbox } from '@/components/ui/form'
import { fmtRelative } from '@/lib/format'
import type { Issue, Label, Project, User, WorkflowState } from '@/lib/types'
import { BlockedChip, DueChip, EstimateChip, IssueKey, LabelChip, PriorityIcon, StateIcon, TypeBadge } from './atoms'

export interface IssueRowProps {
  issue: Issue
  users: Map<string, User>
  labels: Map<string, Label>
  projects: Map<string, Project>
  states: Map<string, WorkflowState>
  blockedCount?: number
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  depth?: number
  showProject?: boolean
  dense?: boolean
}

export function IssueRow({
  issue, users, labels, projects, states, blockedCount = 0,
  selectable, selected, onToggleSelect, depth = 0, showProject = true, dense,
}: IssueRowProps) {
  const navigate = useNavigate()
  const state = states.get(issue.stateId)
  const assignee = issue.assigneeId ? users.get(issue.assigneeId) : undefined
  const project = issue.projectId ? projects.get(issue.projectId) : undefined
  const done = state?.category === 'completed'

  return (
    <div
      onClick={() => navigate(`/app/issues/${issue.id}`)}
      className={clsx(
        'group flex cursor-pointer items-center gap-2 border-b border-line px-3 transition hover:bg-sunken/60',
        dense ? 'py-1.5' : 'py-2',
        selected && 'bg-brand-500/8',
      )}
      style={{ paddingLeft: depth ? 12 + depth * 22 : undefined }}
    >
      {selectable && (
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox checked={!!selected} onChange={() => onToggleSelect?.(issue.id)} />
        </span>
      )}
      {depth > 0 && <Icon name="corner-down-right" size={13} className="shrink-0 text-faint" />}
      <PriorityIcon priority={issue.priority} />
      <IssueKey issue={issue} className="hidden w-16 sm:block" />
      <StateIcon state={state} />
      <TypeBadge type={issue.type} />

      <span className={clsx('min-w-0 flex-1 truncate text-[13px] font-medium text-ink', done && 'text-muted line-through decoration-1')}>
        {issue.title}
      </span>

      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        {issue.labelIds.slice(0, 2).map((id) => {
          const label = labels.get(id)
          return label ? <LabelChip key={id} name={label.name} color={label.color} /> : null
        })}
        <BlockedChip count={blockedCount} />
        {showProject && project && (
          <span className="chip max-w-[130px] truncate" style={{ background: `${project.color}18`, color: project.color }}>
            <span>{project.icon}</span><span className="truncate">{project.name}</span>
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DueChip due={issue.dueDate} done={done} />
        <EstimateChip estimate={issue.estimate} />
        <span className="hidden w-16 text-right text-2xs tabular-nums text-faint lg:block">{fmtRelative(issue.updatedAt)}</span>
        {assignee ? <Avatar user={assignee} size="sm" /> : <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-line text-faint"><Icon name="user" size={11} /></span>}
      </div>
    </div>
  )
}
