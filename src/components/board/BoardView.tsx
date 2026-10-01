import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { IssueCard } from '@/components/issue/IssueCard'
import type { Issue, Label, Project, User, WorkflowState } from '@/lib/types'
import { buildColumns, targetStateFor } from './columns'
import type { BoardColumn } from './columns'

export interface BoardViewProps {
  issues: Issue[]
  states: WorkflowState[]
  users: Map<string, User>
  labels: Map<string, Label>
  projects: Map<string, Project>
  stateMap: Map<string, WorkflowState>
  blockedBy?: Map<string, number>
  subCounts?: Map<string, { done: number; total: number }>
  commentCounts?: Map<string, number>
  showProject?: boolean
  onMove: (issueId: string, stateId: string, beforeOrder: number | null, afterOrder: number | null) => void
  onCreate?: (stateId: string) => void
  selected?: Set<string>
  onSelect?: (id: string, additive: boolean) => void
}

export function BoardView({
  issues, states, users, labels, projects, stateMap, blockedBy, subCounts, commentCounts,
  showProject = true, onMove, onCreate, selected, onSelect,
}: BoardViewProps) {
  const columns = useMemo(() => buildColumns(states), [states])
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ column: string; index: number } | null>(null)

  const byColumn = useMemo(() => {
    const map = new Map<string, Issue[]>()
    for (const col of columns) map.set(col.key, [])
    for (const issue of issues) {
      const col = columns.find((c) => c.stateIds.has(issue.stateId))
      if (col) map.get(col.key)!.push(issue)
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return map
  }, [columns, issues])

  const handleDrop = (col: BoardColumn, index: number) => {
    if (!dragId) return
    const issue = issues.find((i) => i.id === dragId)
    if (!issue) return
    const list = (byColumn.get(col.key) ?? []).filter((i) => i.id !== dragId)
    const before = index > 0 ? list[index - 1]?.order ?? null : null
    const after = list[index]?.order ?? null
    const stateId = targetStateFor(col, issue, states)
    if (stateId) onMove(issue.id, stateId, before, after)
    setDragId(null)
    setDropTarget(null)
  }

  return (
    <div className="scroll-x flex h-full gap-3 px-4 pb-4 sm:px-6">
      {columns.map((col) => {
        const list = byColumn.get(col.key) ?? []
        const points = list.reduce((s, i) => s + (i.estimate ?? 0), 0)
        const isOver = dropTarget?.column === col.key

        return (
          <section
            key={col.key}
            className={clsx('flex w-[290px] shrink-0 flex-col rounded-xl bg-sunken/60 transition', isOver && 'bg-brand-500/8 ring-1 ring-brand-500/30')}
            onDragOver={(e) => { e.preventDefault(); if (!isOver) setDropTarget({ column: col.key, index: list.length }) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null) }}
            onDrop={(e) => { e.preventDefault(); handleDrop(col, dropTarget?.index ?? list.length) }}
          >
            <header className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.color }} />
              <h3 className="truncate text-[13px] font-semibold text-ink">{col.name}</h3>
              <span className="rounded bg-surface px-1.5 text-2xs font-bold tabular-nums text-muted">{list.length}</span>
              {points > 0 && <span className="text-2xs font-medium tabular-nums text-faint">{points}p</span>}
              {onCreate && (
                <button
                  onClick={() => onCreate([...col.stateIds][0])}
                  className="ml-auto grid h-6 w-6 place-items-center rounded-md text-faint transition hover:bg-surface hover:text-ink"
                  aria-label={`New issue in ${col.name}`}
                >
                  <Icon name="plus" size={14} />
                </button>
              )}
            </header>

            <div className="flex min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {list.map((issue, index) => (
                <div
                  key={issue.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const after = e.clientY > rect.top + rect.height / 2
                    setDropTarget({ column: col.key, index: after ? index + 1 : index })
                  }}
                >
                  {isOver && dropTarget?.index === index && <div className="mb-2 h-0.5 rounded-full bg-brand-500" />}
                  <IssueCard
                    issue={issue}
                    users={users}
                    labels={labels}
                    projects={projects}
                    states={stateMap}
                    blockedCount={blockedBy?.get(issue.id) ?? 0}
                    subCount={subCounts?.get(issue.id)}
                    commentCount={commentCounts?.get(issue.id) ?? 0}
                    showProject={showProject}
                    draggable
                    dragging={dragId === issue.id}
                    selected={selected?.has(issue.id)}
                    onSelect={onSelect}
                    onDragStart={(e) => { setDragId(issue.id); e.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => { setDragId(null); setDropTarget(null) }}
                  />
                </div>
              ))}
              {isOver && dropTarget?.index === list.length && <div className="h-0.5 rounded-full bg-brand-500" />}
              {!list.length && (
                <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-line py-6 text-xs text-faint">
                  Nothing here
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
