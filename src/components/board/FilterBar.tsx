import clsx from 'clsx'
import { ISSUE_TYPES, PRIORITIES, STATE_CATEGORIES } from '@/lib/constants'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { MenuDivider, MenuItem, MenuLabel, Popover } from '@/components/ui/Popover'
import { Input, Segmented } from '@/components/ui/form'
import type { GroupBy, IssueFilter, IssueType, Label, Priority, SortBy, StateCategory, User, ViewLayout } from '@/lib/types'

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'state', label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
  { value: 'project', label: 'Project' },
  { value: 'type', label: 'Type' },
  { value: 'label', label: 'Label' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'team', label: 'Team' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'none', label: 'No grouping' },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'priority', label: 'Priority' },
  { value: 'due', label: 'Due date' },
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Created' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'title', label: 'Title' },
]

export interface FilterBarProps {
  filter: IssueFilter
  onFilter: (patch: Partial<IssueFilter>) => void
  layout: ViewLayout
  onLayout: (l: ViewLayout) => void
  groupBy: GroupBy
  onGroupBy: (g: GroupBy) => void
  sortBy: SortBy
  onSortBy: (s: SortBy) => void
  users: User[]
  labels: Label[]
  count: number
  extra?: React.ReactNode
  onSaveView?: () => void
}

const toggle = <T,>(list: T[] | undefined, value: T): T[] | undefined => {
  const next = (list ?? []).includes(value) ? (list ?? []).filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

export function FilterBar({
  filter, onFilter, layout, onLayout, groupBy, onGroupBy, sortBy, onSortBy, users, labels, count, extra, onSaveView,
}: FilterBarProps) {
  const activeCount =
    (filter.assigneeIds?.length ?? 0) + (filter.priorities?.length ?? 0) + (filter.types?.length ?? 0) +
    (filter.labelIds?.length ?? 0) + (filter.stateCategories?.length ?? 0) +
    (filter.overdueOnly ? 1 : 0) + (filter.unassignedOnly ? 1 : 0) + (filter.hasBlockers ? 1 : 0)

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 sm:px-6">
      <div className="relative w-full min-w-[180px] sm:w-56">
        <Input
          icon="search"
          placeholder="Search issues…"
          value={filter.text ?? ''}
          onChange={(e) => onFilter({ text: e.target.value || undefined })}
          className="h-8 !text-[13px]"
        />
      </div>

      <Popover
        width={280}
        trigger={({ toggle: t, ref }) => (
          <button ref={ref as any} onClick={t} className={clsx('btn h-8 gap-1.5 rounded-lg border px-2.5 text-[13px]', activeCount ? 'border-brand-500/50 bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-line text-muted hover:bg-sunken hover:text-ink')}>
            <Icon name="filter" size={14} />
            Filter
            {activeCount > 0 && <span className="rounded bg-brand-600 px-1 text-2xs font-bold text-white">{activeCount}</span>}
          </button>
        )}
      >
        {() => (
          <div className="max-h-[70vh] overflow-y-auto py-1">
            <MenuLabel>Quick filters</MenuLabel>
            <MenuItem icon={<Icon name="alert-circle" size={14} />} active={filter.overdueOnly} onClick={() => onFilter({ overdueOnly: !filter.overdueOnly })}>Overdue only</MenuItem>
            <MenuItem icon={<Icon name="user" size={14} />} active={filter.unassignedOnly} onClick={() => onFilter({ unassignedOnly: !filter.unassignedOnly })}>Unassigned only</MenuItem>
            <MenuItem icon={<Icon name="ban" size={14} />} active={filter.hasBlockers} onClick={() => onFilter({ hasBlockers: !filter.hasBlockers })}>Has blockers</MenuItem>
            <MenuItem icon={<Icon name="archive" size={14} />} active={filter.includeArchived} onClick={() => onFilter({ includeArchived: !filter.includeArchived })}>Include archived</MenuItem>

            <MenuDivider />
            <MenuLabel>Status</MenuLabel>
            {STATE_CATEGORIES.map((c) => (
              <MenuItem
                key={c.value}
                icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
                active={filter.stateCategories?.includes(c.value)}
                onClick={() => onFilter({ stateCategories: toggle<StateCategory>(filter.stateCategories, c.value) })}
              >
                {c.label}
              </MenuItem>
            ))}

            <MenuDivider />
            <MenuLabel>Priority</MenuLabel>
            {[...PRIORITIES].reverse().map((p) => (
              <MenuItem
                key={p.value}
                icon={<Icon name={p.icon as any} size={14} className={p.color} />}
                active={filter.priorities?.includes(p.value)}
                onClick={() => onFilter({ priorities: toggle<Priority>(filter.priorities, p.value) })}
              >
                {p.label}
              </MenuItem>
            ))}

            <MenuDivider />
            <MenuLabel>Type</MenuLabel>
            {ISSUE_TYPES.map((t) => (
              <MenuItem key={t.value} active={filter.types?.includes(t.value)} onClick={() => onFilter({ types: toggle<IssueType>(filter.types, t.value) })}>
                {t.label}
              </MenuItem>
            ))}

            <MenuDivider />
            <MenuLabel>Assignee</MenuLabel>
            {users.slice(0, 12).map((u) => (
              <MenuItem key={u.id} icon={<Avatar user={u} size="xs" />} active={filter.assigneeIds?.includes(u.id)} onClick={() => onFilter({ assigneeIds: toggle(filter.assigneeIds, u.id) })}>
                {u.name}
              </MenuItem>
            ))}

            <MenuDivider />
            <MenuLabel>Label</MenuLabel>
            {labels.map((l) => (
              <MenuItem key={l.id} icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />} active={filter.labelIds?.includes(l.id)} onClick={() => onFilter({ labelIds: toggle(filter.labelIds, l.id) })}>
                {l.name}
              </MenuItem>
            ))}

            {activeCount > 0 && (
              <>
                <MenuDivider />
                <MenuItem icon={<Icon name="x" size={14} />} danger onClick={() => onFilter({
                  assigneeIds: undefined, priorities: undefined, types: undefined, labelIds: undefined,
                  stateCategories: undefined, overdueOnly: undefined, unassignedOnly: undefined,
                  hasBlockers: undefined, includeArchived: undefined,
                })}>
                  Clear all filters
                </MenuItem>
              </>
            )}
          </div>
        )}
      </Popover>

      <Popover
        width={220}
        trigger={({ toggle: t, ref }) => (
          <button ref={ref as any} onClick={t} className="btn h-8 gap-1.5 rounded-lg border border-line px-2.5 text-[13px] text-muted hover:bg-sunken hover:text-ink">
            <Icon name="sliders" size={14} />
            <span className="hidden sm:inline">Display</span>
          </button>
        )}
      >
        {() => (
          <div className="py-1">
            <MenuLabel>Group by</MenuLabel>
            {GROUP_OPTIONS.map((g) => (
              <MenuItem key={g.value} active={groupBy === g.value} onClick={() => onGroupBy(g.value)}>{g.label}</MenuItem>
            ))}
            <MenuDivider />
            <MenuLabel>Order by</MenuLabel>
            {SORT_OPTIONS.map((s) => (
              <MenuItem key={s.value} active={sortBy === s.value} onClick={() => onSortBy(s.value)}>{s.label}</MenuItem>
            ))}
          </div>
        )}
      </Popover>

      {extra}

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-xs tabular-nums text-faint sm:inline">{count} issues</span>
        {onSaveView && (
          <button onClick={onSaveView} className="btn h-8 gap-1.5 rounded-lg border border-line px-2.5 text-[13px] text-muted hover:bg-sunken hover:text-ink" title="Save this view">
            <Icon name="bookmark" size={14} />
            <span className="hidden lg:inline">Save view</span>
          </button>
        )}
        <Segmented
          size="sm"
          value={layout}
          onChange={onLayout}
          options={[
            { value: 'board', icon: 'kanban', title: 'Board' },
            { value: 'list', icon: 'layout-list', title: 'List' },
            { value: 'table', icon: 'table', title: 'Table' },
            { value: 'timeline', icon: 'gantt', title: 'Timeline' },
            { value: 'calendar', icon: 'calendar-days', title: 'Calendar' },
          ]}
        />
      </div>
    </div>
  )
}
