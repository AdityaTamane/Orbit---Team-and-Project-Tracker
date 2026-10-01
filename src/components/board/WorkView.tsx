import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/db'
import { useActorId } from '@/lib/auth'
import { toast, useViews } from '@/lib/store'
import type { ViewState } from '@/lib/store'
import { archiveIssue, bulkUpdate, deleteIssue, groupIssues, matchesFilter, moveIssue, sortIssues } from '@/lib/issues'
import type { Issue, Priority, WorkflowState } from '@/lib/types'
import { useAllIssueLinks, useCommentCounts, useLookups, useMilestones } from '@/hooks/useData'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { CreateIssueModal } from '@/components/issue/CreateIssueModal'
import type { CreateIssueSeed } from '@/components/issue/CreateIssueModal'
import { BoardView } from './BoardView'
import { BulkBar } from './BulkBar'
import { CalendarView } from './CalendarView'
import { FilterBar } from './FilterBar'
import { ListView } from './ListView'
import { TableView } from './TableView'
import { TimelineChart } from './TimelineView'
import type { TimelineBar } from './TimelineView'

export interface WorkViewProps {
  viewKey: string
  issues: Issue[]
  /** Restrict the workflow columns; defaults to every state in scope of the issues */
  states?: WorkflowState[]
  defaults?: Partial<ViewState>
  showProject?: boolean
  seed?: CreateIssueSeed
  toolbarExtra?: React.ReactNode
  onSaveView?: () => void
  emptyTitle?: string
  emptyDescription?: string
}

export function WorkView({
  viewKey, issues, states: scopeStates, defaults, showProject = true, seed = {},
  toolbarExtra, onSaveView, emptyTitle = 'No issues yet', emptyDescription = 'Create the first issue to get this view moving.',
}: WorkViewProps) {
  const navigate = useNavigate()
  const actorId = useActorId()
  const { users, labels, teams, projects, cycles, states: allStates, userMap, labelMap, projectMap, stateMap } = useLookups()
  const links = useAllIssueLinks()
  const commentCounts = useCommentCounts()
  const milestones = useMilestones(seed.projectId)

  const viewStore = useViews()
  const view = viewStore.get(viewKey, defaults)
  const set = (patch: Partial<ViewState>) => viewStore.set(viewKey, patch)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [createSeed, setCreateSeed] = useState<CreateIssueSeed | null>(null)

  /** States relevant to this scope — a project spanning teams shows all of theirs. */
  const states = useMemo(() => {
    if (scopeStates) return scopeStates
    const teamIds = new Set(issues.map((i) => i.teamId))
    const scoped = allStates.filter((s) => teamIds.has(s.teamId))
    return scoped.length ? scoped : allStates
  }, [scopeStates, allStates, issues])

  /** Open blockers per issue — a blocker that is already done no longer blocks. */
  const blockedBy = useMemo(() => {
    const map = new Map<string, number>()
    const byId = new Map(issues.map((i) => [i.id, i]))
    for (const link of links) {
      if (link.type !== 'blocks') continue
      const blocker = byId.get(link.fromId)
      const category = blocker ? stateMap.get(blocker.stateId)?.category : undefined
      if (category && ['completed', 'canceled'].includes(category)) continue
      map.set(link.toId, (map.get(link.toId) ?? 0) + 1)
    }
    return map
  }, [links, issues, stateMap])

  const childrenOf = useMemo(() => {
    const map = new Map<string, Issue[]>()
    for (const issue of issues) {
      if (!issue.parentId) continue
      const list = map.get(issue.parentId) ?? []
      list.push(issue)
      map.set(issue.parentId, list)
    }
    return map
  }, [issues])

  const subCounts = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>()
    for (const [parentId, kids] of childrenOf) {
      map.set(parentId, {
        total: kids.length,
        done: kids.filter((k) => stateMap.get(k.stateId)?.category === 'completed').length,
      })
    }
    return map
  }, [childrenOf, stateMap])

  const visible = useMemo(() => {
    const ctx = { states: stateMap, blockedIds: new Set(blockedBy.keys()) }
    let rows = issues.filter((i) => matchesFilter(i, view.filter, ctx))
    if (!view.showSubIssues) rows = rows.filter((i) => !i.parentId)
    return sortIssues(rows, view.sortBy, stateMap)
  }, [issues, view.filter, view.sortBy, view.showSubIssues, stateMap, blockedBy])

  const groups = useMemo(
    () => groupIssues(visible, view.groupBy, {
      states, users, teams, labels, cycles, milestones,
      projects: projects.map((p) => ({ id: p.id, name: p.name, color: p.color, icon: p.icon })),
    }),
    [visible, view.groupBy, states, users, teams, labels, cycles, projects, milestones],
  )

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const timelineBars = useMemo<TimelineBar[]>(
    () => visible
      .filter((i) => i.dueDate || i.startDate)
      .map((issue) => {
        const end = new Date(issue.dueDate ?? issue.startDate!)
        const start = issue.startDate ? new Date(issue.startDate) : new Date(+end - 4 * 86400000)
        const state = stateMap.get(issue.stateId)
        return {
          id: issue.id,
          label: issue.title,
          color: state?.color ?? '#6c62f2',
          start: start < end ? start : end,
          end,
          muted: state?.category === 'completed' || state?.category === 'canceled',
          onClick: () => navigate(`/app/issues/${issue.id}`),
        }
      }),
    [visible, stateMap, navigate],
  )

  const bulk = async (patch: Partial<Issue>) => {
    await bulkUpdate([...selected], patch, actorId)
    toast.success(`${selected.size} issues updated`)
    setSelected(new Set())
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilterBar
        filter={view.filter}
        onFilter={(patch) => set({ filter: { ...view.filter, ...patch } })}
        layout={view.layout}
        onLayout={(layout) => set({ layout })}
        groupBy={view.groupBy}
        onGroupBy={(groupBy) => set({ groupBy })}
        sortBy={view.sortBy}
        onSortBy={(sortBy) => set({ sortBy })}
        users={users}
        labels={labels}
        count={visible.length}
        extra={toolbarExtra}
        onSaveView={onSaveView}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!visible.length ? (
          <EmptyState
            className="m-6"
            icon={<Icon name="inbox" size={20} />}
            title={issues.length ? 'Nothing matches these filters' : emptyTitle}
            description={issues.length ? 'Try clearing a filter or widening the search.' : emptyDescription}
            action={
              issues.length
                ? <Button variant="secondary" icon="x" onClick={() => set({ filter: {} })}>Clear filters</Button>
                : <Button variant="primary" icon="plus" onClick={() => setCreateSeed(seed)}>New issue</Button>
            }
          />
        ) : view.layout === 'board' ? (
          <div className="h-full pt-3">
            <BoardView
              issues={visible}
              states={states}
              users={userMap}
              labels={labelMap}
              projects={projectMap}
              stateMap={stateMap}
              blockedBy={blockedBy}
              subCounts={subCounts}
              commentCounts={commentCounts}
              showProject={showProject}
              selected={selected}
              onSelect={(id) => toggleSelect(id)}
              onMove={(id, stateId, before, after) => moveIssue(id, stateId, before, after, actorId)}
              onCreate={(stateId) => setCreateSeed({ ...seed, stateId, teamId: states.find((s) => s.id === stateId)?.teamId ?? seed.teamId })}
            />
          </div>
        ) : view.layout === 'list' ? (
          <ListView
            groups={groups}
            users={userMap}
            labels={labelMap}
            projects={projectMap}
            stateMap={stateMap}
            blockedBy={blockedBy}
            childrenOf={view.showSubIssues ? undefined : childrenOf}
            showProject={showProject}
            selectable
            selected={selected}
            onToggleSelect={toggleSelect}
          />
        ) : view.layout === 'table' ? (
          <TableView
            issues={visible}
            users={userMap}
            labels={labelMap}
            projects={projectMap}
            stateMap={stateMap}
            sortBy={view.sortBy}
            onSort={(sortBy) => set({ sortBy })}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={() => setSelected((prev) => (prev.size === visible.length ? new Set() : new Set(visible.map((i) => i.id))))}
          />
        ) : view.layout === 'timeline' ? (
          <TimelineChart bars={timelineBars} emptyMessage="Give issues start or due dates to see them here." />
        ) : (
          <CalendarView issues={visible} users={userMap} stateMap={stateMap} />
        )}
      </div>

      <BulkBar
        count={selected.size}
        states={states}
        users={users}
        labels={labels}
        onClear={() => setSelected(new Set())}
        onState={(stateId) => bulk({ stateId })}
        onAssignee={(assigneeId) => bulk({ assigneeId })}
        onPriority={(priority: Priority) => bulk({ priority })}
        onLabel={async (labelId) => {
          for (const id of selected) {
            const issue = await db.issues.get(id)
            if (issue && !issue.labelIds.includes(labelId)) {
              await db.issues.update(id, { labelIds: [...issue.labelIds, labelId] })
            }
          }
          toast.success('Label applied')
          setSelected(new Set())
        }}
        onArchive={async () => {
          for (const id of selected) await archiveIssue(id, actorId)
          toast.success(`${selected.size} issues archived`)
          setSelected(new Set())
        }}
        onDelete={async () => {
          const n = selected.size
          for (const id of selected) await deleteIssue(id)
          toast.success(`${n} issues deleted`)
          setSelected(new Set())
        }}
      />

      <CreateIssueModal
        open={!!createSeed}
        onClose={() => setCreateSeed(null)}
        seed={createSeed ?? {}}
        onCreated={(id) => navigate(`/app/issues/${id}`)}
      />
    </div>
  )
}
