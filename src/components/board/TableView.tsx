import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Checkbox } from '@/components/ui/form'
import { PriorityIcon, StateIcon, TypeBadge } from '@/components/issue/atoms'
import { fmtDate, fmtRelative } from '@/lib/format'
import type { Issue, Label, Project, User, WorkflowState } from '@/lib/types'
import type { SortBy } from '@/lib/types'

export interface TableViewProps {
  issues: Issue[]
  users: Map<string, User>
  labels: Map<string, Label>
  projects: Map<string, Project>
  stateMap: Map<string, WorkflowState>
  cycleMap?: Map<string, { name: string }>
  sortBy: SortBy
  onSort: (s: SortBy) => void
  selected?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
}

const COLUMNS: { key: SortBy | null; label: string; className: string }[] = [
  { key: 'title', label: 'Title', className: 'min-w-[280px]' },
  { key: null, label: 'Status', className: 'w-[130px]' },
  { key: 'priority', label: 'Priority', className: 'w-[110px]' },
  { key: null, label: 'Assignee', className: 'w-[150px]' },
  { key: null, label: 'Project', className: 'w-[150px]' },
  { key: 'estimate', label: 'Est.', className: 'w-[70px]' },
  { key: 'due', label: 'Due', className: 'w-[100px]' },
  { key: 'updated', label: 'Updated', className: 'w-[110px]' },
]

export function TableView({ issues, users, labels, projects, stateMap, sortBy, onSort, selected, onToggleSelect, onToggleAll }: TableViewProps) {
  const navigate = useNavigate()
  const allSelected = !!selected && issues.length > 0 && issues.every((i) => selected.has(i.id))

  return (
    <div className="scroll-x pb-8">
      <table className="w-full min-w-[1020px] border-collapse text-sm">
        <thead>
          <tr className="border-y border-line bg-sunken/70 text-left">
            {onToggleAll && (
              <th className="w-9 px-3 py-2">
                <Checkbox checked={allSelected} onChange={onToggleAll} />
              </th>
            )}
            {COLUMNS.map((c) => (
              <th key={c.label} className={clsx('px-3 py-2 text-2xs font-bold uppercase tracking-wider text-muted', c.className)}>
                {c.key ? (
                  <button onClick={() => onSort(c.key as SortBy)} className="inline-flex items-center gap-1 hover:text-ink">
                    {c.label}
                    {sortBy === c.key && <Icon name="arrow-down" size={11} />}
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => {
            const state = stateMap.get(issue.stateId)
            const assignee = issue.assigneeId ? users.get(issue.assigneeId) : undefined
            const project = issue.projectId ? projects.get(issue.projectId) : undefined
            const done = state?.category === 'completed'
            return (
              <tr
                key={issue.id}
                onClick={() => navigate(`/app/issues/${issue.id}`)}
                className={clsx('cursor-pointer border-b border-line transition hover:bg-sunken/60', selected?.has(issue.id) && 'bg-brand-500/8')}
              >
                {onToggleAll && (
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={!!selected?.has(issue.id)} onChange={() => onToggleSelect?.(issue.id)} />
                  </td>
                )}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={issue.type} />
                    <span className="font-mono text-2xs text-faint">{issue.key}</span>
                    <span className={clsx('truncate font-medium text-ink', done && 'text-muted line-through decoration-1')}>{issue.title}</span>
                  </div>
                  {issue.labelIds.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-[52px]">
                      {issue.labelIds.map((id) => {
                        const l = labels.get(id)
                        return l ? <span key={id} className="chip" style={{ background: `${l.color}18`, color: l.color }}>{l.name}</span> : null
                      })}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <StateIcon state={state} />{state?.name}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <PriorityIcon priority={issue.priority} />
                    {['None', 'Low', 'Medium', 'High', 'Urgent'][issue.priority]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {assignee ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink"><Avatar user={assignee} size="xs" />{assignee.name}</span>
                  ) : <span className="text-xs text-faint">Unassigned</span>}
                </td>
                <td className="px-3 py-2">
                  {project ? (
                    <span className="inline-flex items-center gap-1 truncate text-xs" style={{ color: project.color }}>{project.icon} {project.name}</span>
                  ) : <span className="text-xs text-faint">—</span>}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-muted">{issue.estimate ?? '—'}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-muted">{issue.dueDate ? fmtDate(issue.dueDate) : '—'}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-faint">{fmtRelative(issue.updatedAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!issues.length && <p className="px-4 py-8 text-center text-sm text-faint">No issues match this view.</p>}
    </div>
  )
}
