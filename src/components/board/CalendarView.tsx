import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { addMonths, format, isSameDay, isToday, startOfMonth } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { PriorityIcon, StateIcon } from '@/components/issue/atoms'
import type { Issue, User, WorkflowState } from '@/lib/types'
import { inMonth, monthMatrix } from './TimelineView'

export interface CalendarViewProps {
  issues: Issue[]
  users: Map<string, User>
  stateMap: Map<string, WorkflowState>
}

export function CalendarView({ issues, users, stateMap }: CalendarViewProps) {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const weeks = useMemo(() => monthMatrix(month), [month])

  const dated = useMemo(() => issues.filter((i) => i.dueDate), [issues])
  const forDay = (day: Date) => dated.filter((i) => isSameDay(new Date(i.dueDate!), day))
  const undated = issues.length - dated.length

  return (
    <div className="px-4 pb-8 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth((m) => addMonths(m, -1))} className="btn h-8 w-8 text-muted hover:bg-sunken hover:text-ink" aria-label="Previous month">
            <Icon name="chevron-left" size={16} />
          </button>
          <h3 className="min-w-[150px] text-center text-sm font-semibold text-ink">{format(month, 'MMMM yyyy')}</h3>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="btn h-8 w-8 text-muted hover:bg-sunken hover:text-ink" aria-label="Next month">
            <Icon name="chevron-right" size={16} />
          </button>
          <button onClick={() => setMonth(startOfMonth(new Date()))} className="btn ml-1 h-8 px-2.5 text-xs text-muted hover:bg-sunken hover:text-ink">Today</button>
        </div>
        {undated > 0 && <p className="text-xs text-faint">{undated} without a due date are not shown</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-sunken/70">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-2xs font-bold uppercase tracking-wider text-muted">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day) => {
            const items = forDay(day)
            const isCurrent = inMonth(day, month)
            return (
              <div
                key={+day}
                className={clsx(
                  'min-h-[104px] border-b border-r border-line p-1.5 last:border-r-0',
                  !isCurrent && 'bg-sunken/40',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={clsx(
                    'grid h-5 min-w-5 place-items-center rounded-full px-1 text-2xs font-bold tabular-nums',
                    isToday(day) ? 'bg-brand-600 text-white' : isCurrent ? 'text-muted' : 'text-faint',
                  )}>
                    {format(day, 'd')}
                  </span>
                  {items.length > 2 && <span className="text-2xs font-semibold text-faint">{items.length}</span>}
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((issue) => {
                    const assignee = issue.assigneeId ? users.get(issue.assigneeId) : undefined
                    return (
                      <button
                        key={issue.id}
                        onClick={() => navigate(`/app/issues/${issue.id}`)}
                        className="flex w-full items-center gap-1 rounded bg-surface px-1 py-0.5 text-left text-2xs shadow-sm transition hover:bg-sunken"
                        title={`${issue.key} · ${issue.title}${assignee ? ` · ${assignee.name}` : ''}`}
                      >
                        <StateIcon state={stateMap.get(issue.stateId)} size={10} />
                        <PriorityIcon priority={issue.priority} size={10} />
                        <span className="truncate font-medium text-ink">{issue.title}</span>
                      </button>
                    )
                  })}
                  {items.length > 3 && <p className="px-1 text-2xs text-faint">+{items.length - 3} more</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
