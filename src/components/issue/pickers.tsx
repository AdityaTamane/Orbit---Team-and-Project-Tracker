import clsx from 'clsx'
import { useState } from 'react'
import { ESTIMATE_SCALE, ISSUE_TYPES, PRIORITIES } from '@/lib/constants'
import type { Cycle, Issue, IssueType, Label, Milestone, Priority, Project, User, WorkflowState } from '@/lib/types'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { MenuDivider, MenuItem, MenuLabel, Popover } from '@/components/ui/Popover'
import { Input } from '@/components/ui/form'
import { PriorityIcon, StateIcon, TypeBadge } from './atoms'

const triggerClass = 'btn h-7 gap-1.5 rounded-md border border-line bg-surface px-2 text-xs font-medium text-muted hover:bg-sunken hover:text-ink'

export function StatePicker({ states, value, onChange, compact }: {
  states: WorkflowState[]
  value?: string
  onChange: (id: string) => void
  compact?: boolean
}) {
  const current = states.find((s) => s.id === value)
  return (
    <Popover
      width={220}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Change status">
          <StateIcon state={current} />
          {!compact && <span className="max-w-[110px] truncate">{current?.name ?? 'Status'}</span>}
        </button>
      )}
    >
      {(close) => (
        <div className="py-1">
          <MenuLabel>Status</MenuLabel>
          {states.map((s) => (
            <MenuItem key={s.id} icon={<StateIcon state={s} />} active={s.id === value} onClick={() => { onChange(s.id); close() }}>
              {s.name}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

export function PriorityPicker({ value, onChange, compact }: { value: Priority; onChange: (p: Priority) => void; compact?: boolean }) {
  return (
    <Popover
      width={200}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Change priority">
          <PriorityIcon priority={value} />
          {!compact && <span>{PRIORITIES[value].short}</span>}
        </button>
      )}
    >
      {(close) => (
        <div className="py-1">
          <MenuLabel>Priority</MenuLabel>
          {[...PRIORITIES].reverse().map((p) => (
            <MenuItem key={p.value} icon={<PriorityIcon priority={p.value} />} active={p.value === value} onClick={() => { onChange(p.value); close() }}>
              {p.label}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

export function AssigneePicker({ users, value, onChange, compact }: {
  users: User[]
  value?: string
  onChange: (id?: string) => void
  compact?: boolean
}) {
  const [q, setQ] = useState('')
  const current = users.find((u) => u.id === value)
  const filtered = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Popover
      width={252}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Assign">
          {current ? <Avatar user={current} size="xs" /> : <Icon name="user" size={13} />}
          {!compact && <span className="max-w-[110px] truncate">{current?.name ?? 'Unassigned'}</span>}
        </button>
      )}
    >
      {(close) => (
        <div className="py-1">
          <div className="p-2 pb-1">
            <Input autoFocus icon="search" placeholder="Assign to…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 !text-[13px]" />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <MenuItem icon={<Icon name="circle-slash" size={14} />} active={!value} onClick={() => { onChange(undefined); close() }}>
              Unassigned
            </MenuItem>
            {filtered.map((u) => (
              <MenuItem key={u.id} icon={<Avatar user={u} size="xs" />} active={u.id === value} onClick={() => { onChange(u.id); close() }}>
                {u.name}
              </MenuItem>
            ))}
          </div>
        </div>
      )}
    </Popover>
  )
}

export function TypePicker({ value, onChange }: { value: IssueType; onChange: (t: IssueType) => void }) {
  return (
    <Popover
      width={190}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className="inline-flex" title="Change type">
          <TypeBadge type={value} withLabel />
        </button>
      )}
    >
      {(close) => (
        <div className="py-1">
          <MenuLabel>Type</MenuLabel>
          {ISSUE_TYPES.map((t) => (
            <MenuItem key={t.value} active={t.value === value} onClick={() => { onChange(t.value); close() }}>
              <span className="flex items-center gap-2"><TypeBadge type={t.value} />{t.label}</span>
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

export function LabelPicker({ labels, value, onChange }: { labels: Label[]; value: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('')
  const groups = [...new Set(labels.map((l) => l.group ?? 'Other'))]
  return (
    <Popover
      width={240}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Labels">
          <Icon name="tag" size={13} />
          <span>{value.length ? `${value.length} label${value.length > 1 ? 's' : ''}` : 'Labels'}</span>
        </button>
      )}
    >
      {() => (
        <div className="py-1">
          <div className="p-2 pb-1">
            <Input autoFocus icon="search" placeholder="Filter labels…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 !text-[13px]" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {groups.map((group) => {
              const rows = labels.filter((l) => (l.group ?? 'Other') === group && l.name.toLowerCase().includes(q.toLowerCase()))
              if (!rows.length) return null
              return (
                <div key={group}>
                  <MenuLabel>{group}</MenuLabel>
                  {rows.map((l) => (
                    <MenuItem
                      key={l.id}
                      icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />}
                      active={value.includes(l.id)}
                      onClick={() => onChange(value.includes(l.id) ? value.filter((v) => v !== l.id) : [...value, l.id])}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {l.name}
                        {value.includes(l.id) && <Icon name="check" size={13} />}
                      </span>
                    </MenuItem>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Popover>
  )
}

export function ProjectPicker({ projects, value, onChange }: { projects: Project[]; value?: string; onChange: (id?: string) => void }) {
  const current = projects.find((p) => p.id === value)
  return (
    <Popover
      width={250}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Project">
          {current ? <span>{current.icon}</span> : <Icon name="folder-kanban" size={13} />}
          <span className="max-w-[130px] truncate">{current?.name ?? 'No project'}</span>
        </button>
      )}
    >
      {(close) => (
        <div className="max-h-72 overflow-y-auto py-1">
          <MenuLabel>Project</MenuLabel>
          <MenuItem icon={<Icon name="circle-slash" size={14} />} active={!value} onClick={() => { onChange(undefined); close() }}>No project</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} icon={<span>{p.icon}</span>} active={p.id === value} onClick={() => { onChange(p.id); close() }}>
              {p.name}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

export function CyclePicker({ cycles, value, onChange }: { cycles: Cycle[]; value?: string; onChange: (id?: string) => void }) {
  const current = cycles.find((c) => c.id === value)
  return (
    <Popover
      width={220}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Cycle">
          <Icon name="repeat" size={13} />
          <span className="max-w-[110px] truncate">{current?.name ?? 'No cycle'}</span>
        </button>
      )}
    >
      {(close) => (
        <div className="max-h-72 overflow-y-auto py-1">
          <MenuLabel>Cycle</MenuLabel>
          <MenuItem icon={<Icon name="circle-slash" size={14} />} active={!value} onClick={() => { onChange(undefined); close() }}>No cycle</MenuItem>
          {cycles.map((c) => (
            <MenuItem key={c.id} icon={<Icon name={c.status === 'active' ? 'play' : c.status === 'completed' ? 'check' : 'clock'} size={13} />} active={c.id === value} onClick={() => { onChange(c.id); close() }}>
              {c.name}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

export function MilestonePicker({ milestones, value, onChange }: { milestones: Milestone[]; value?: string; onChange: (id?: string) => void }) {
  const current = milestones.find((m) => m.id === value)
  return (
    <Popover
      width={240}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Milestone">
          <Icon name="flag" size={13} />
          <span className="max-w-[130px] truncate">{current?.name ?? 'No milestone'}</span>
        </button>
      )}
    >
      {(close) => (
        <div className="max-h-72 overflow-y-auto py-1">
          <MenuLabel>Milestone</MenuLabel>
          <MenuItem icon={<Icon name="circle-slash" size={14} />} active={!value} onClick={() => { onChange(undefined); close() }}>No milestone</MenuItem>
          {milestones.map((m) => (
            <MenuItem key={m.id} icon={<Icon name="flag" size={13} />} active={m.id === value} onClick={() => { onChange(m.id); close() }}>
              {m.name}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  )
}

export function EstimatePicker({ value, onChange }: { value?: number; onChange: (v?: number) => void }) {
  return (
    <Popover
      width={180}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title="Estimate">
          <Icon name="gauge" size={13} />
          <span>{value ?? '—'} pts</span>
        </button>
      )}
    >
      {(close) => (
        <div className="py-1">
          <MenuLabel>Estimate (points)</MenuLabel>
          <div className="grid grid-cols-4 gap-1 p-2">
            {ESTIMATE_SCALE.map((n) => (
              <button
                key={n}
                onClick={() => { onChange(n); close() }}
                className={clsx('btn h-8 rounded-md border text-xs', value === n ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-line hover:bg-sunken')}
              >
                {n}
              </button>
            ))}
          </div>
          <MenuDivider />
          <MenuItem onClick={() => { onChange(undefined); close() }}>Clear estimate</MenuItem>
        </div>
      )}
    </Popover>
  )
}

export function DateField({ value, onChange, label = 'Due date', icon = 'calendar' }: {
  value?: string
  onChange: (v?: string) => void
  label?: string
  icon?: 'calendar' | 'play'
}) {
  return (
    <Popover
      width={230}
      trigger={({ toggle, ref }) => (
        <button ref={ref as any} onClick={toggle} className={triggerClass} title={label}>
          <Icon name={icon === 'play' ? 'play' : 'calendar'} size={13} />
          <span>{value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : label}</span>
        </button>
      )}
    >
      {(close) => (
        <div className="p-2">
          <MenuLabel>{label}</MenuLabel>
          <input
            type="date"
            className="input h-9"
            value={value ? value.slice(0, 10) : ''}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          />
          <div className="mt-2 flex gap-1">
            {[['Today', 0], ['Tomorrow', 1], ['+1 week', 7]].map(([label2, days]) => (
              <button
                key={label2 as string}
                className="btn h-7 flex-1 rounded-md bg-sunken px-2 text-xs hover:bg-line"
                onClick={() => { onChange(new Date(Date.now() + (days as number) * 86400000).toISOString()); close() }}
              >
                {label2}
              </button>
            ))}
          </div>
          {value && (
            <button className="btn mt-2 h-7 w-full rounded-md text-xs text-rose-500 hover:bg-rose-500/10" onClick={() => { onChange(undefined); close() }}>
              Clear
            </button>
          )}
        </div>
      )}
    </Popover>
  )
}

export type { Issue }
