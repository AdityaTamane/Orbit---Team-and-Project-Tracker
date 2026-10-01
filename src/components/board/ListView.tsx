import clsx from 'clsx'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { IssueRow } from '@/components/issue/IssueRow'
import type { IssueGroup } from '@/lib/issues'
import type { Issue, Label, Project, User, WorkflowState } from '@/lib/types'

export interface ListViewProps {
  groups: IssueGroup[]
  users: Map<string, User>
  labels: Map<string, Label>
  projects: Map<string, Project>
  stateMap: Map<string, WorkflowState>
  blockedBy?: Map<string, number>
  childrenOf?: Map<string, Issue[]>
  showProject?: boolean
  selected?: Set<string>
  onToggleSelect?: (id: string) => void
  selectable?: boolean
  onCreate?: (groupId: string) => void
}

export function ListView({
  groups, users, labels, projects, stateMap, blockedBy, childrenOf,
  showProject = true, selected, onToggleSelect, selectable, onCreate,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  return (
    <div className="pb-8">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.id)
        const points = group.issues.reduce((s, i) => s + (i.estimate ?? 0), 0)
        return (
          <section key={group.id}>
            <header className="sticky top-0 z-10 flex items-center gap-2 border-y border-line bg-sunken/95 px-3 py-1.5 backdrop-blur">
              <button onClick={() => toggle(group.id)} className="flex min-w-0 items-center gap-1.5 text-left">
                <Icon name="chevron-right" size={13} className={clsx('shrink-0 text-faint transition-transform', !isCollapsed && 'rotate-90')} />
                {group.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: group.color }} />}
                <span className="truncate text-[13px] font-semibold text-ink">{group.label}</span>
                <span className="rounded bg-surface px-1.5 text-2xs font-bold tabular-nums text-muted">{group.issues.length}</span>
                {points > 0 && <span className="text-2xs tabular-nums text-faint">{points}p</span>}
              </button>
              {onCreate && (
                <button onClick={() => onCreate(group.id)} className="ml-auto grid h-6 w-6 place-items-center rounded text-faint hover:bg-surface hover:text-ink" aria-label="New issue">
                  <Icon name="plus" size={14} />
                </button>
              )}
            </header>
            {!isCollapsed && (
              <div>
                {group.issues.map((issue) => (
                  <div key={issue.id}>
                    <IssueRow
                      issue={issue}
                      users={users}
                      labels={labels}
                      projects={projects}
                      states={stateMap}
                      blockedCount={blockedBy?.get(issue.id) ?? 0}
                      showProject={showProject}
                      selectable={selectable}
                      selected={selected?.has(issue.id)}
                      onToggleSelect={onToggleSelect}
                    />
                    {childrenOf?.get(issue.id)?.map((child) => (
                      <IssueRow
                        key={child.id}
                        issue={child}
                        users={users}
                        labels={labels}
                        projects={projects}
                        states={stateMap}
                        blockedCount={blockedBy?.get(child.id) ?? 0}
                        showProject={false}
                        depth={1}
                        dense
                      />
                    ))}
                  </div>
                ))}
                {!group.issues.length && <p className="px-4 py-3 text-xs text-faint">No issues</p>}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
