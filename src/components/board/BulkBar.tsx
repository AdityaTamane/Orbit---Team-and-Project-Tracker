import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { MenuItem, MenuLabel, Popover } from '@/components/ui/Popover'
import { PRIORITIES } from '@/lib/constants'
import { StateIcon } from '@/components/issue/atoms'
import type { Label, Priority, User, WorkflowState } from '@/lib/types'

export interface BulkBarProps {
  count: number
  states: WorkflowState[]
  users: User[]
  labels: Label[]
  onClear: () => void
  onState: (stateId: string) => void
  onAssignee: (userId?: string) => void
  onPriority: (p: Priority) => void
  onLabel: (labelId: string) => void
  onArchive: () => void
  onDelete: () => void
}

const btn = 'btn h-8 gap-1.5 rounded-lg px-2.5 text-[13px] text-white/90 hover:bg-white/15'

export function BulkBar({ count, states, users, labels, onClear, onState, onAssignee, onPriority, onLabel, onArchive, onDelete }: BulkBarProps) {
  if (!count) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl bg-slate-900 px-2 py-1.5 shadow-lift dark:bg-slate-800">
        <span className="px-2 text-[13px] font-semibold text-white">{count} selected</span>
        <span className="mx-1 h-5 w-px bg-white/15" />

        <Popover width={220} side="top" trigger={({ toggle, ref }) => (
          <button ref={ref as any} onClick={toggle} className={btn}><Icon name="circle-dot" size={14} />Status</button>
        )}>
          {(close) => (
            <div className="py-1">
              <MenuLabel>Move to</MenuLabel>
              {states.map((s) => (
                <MenuItem key={s.id} icon={<StateIcon state={s} />} onClick={() => { onState(s.id); close() }}>{s.name}</MenuItem>
              ))}
            </div>
          )}
        </Popover>

        <Popover width={240} side="top" trigger={({ toggle, ref }) => (
          <button ref={ref as any} onClick={toggle} className={btn}><Icon name="user" size={14} />Assignee</button>
        )}>
          {(close) => (
            <div className="max-h-72 overflow-y-auto py-1">
              <MenuItem icon={<Icon name="circle-slash" size={14} />} onClick={() => { onAssignee(undefined); close() }}>Unassigned</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} icon={<Avatar user={u} size="xs" />} onClick={() => { onAssignee(u.id); close() }}>{u.name}</MenuItem>
              ))}
            </div>
          )}
        </Popover>

        <Popover width={200} side="top" trigger={({ toggle, ref }) => (
          <button ref={ref as any} onClick={toggle} className={btn}><Icon name="flag" size={14} />Priority</button>
        )}>
          {(close) => (
            <div className="py-1">
              {[...PRIORITIES].reverse().map((p) => (
                <MenuItem key={p.value} icon={<Icon name={p.icon as any} size={14} className={p.color} />} onClick={() => { onPriority(p.value); close() }}>{p.label}</MenuItem>
              ))}
            </div>
          )}
        </Popover>

        <Popover width={220} side="top" trigger={({ toggle, ref }) => (
          <button ref={ref as any} onClick={toggle} className={btn}><Icon name="tag" size={14} />Label</button>
        )}>
          {(close) => (
            <div className="max-h-72 overflow-y-auto py-1">
              {labels.map((l) => (
                <MenuItem key={l.id} icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />} onClick={() => { onLabel(l.id); close() }}>{l.name}</MenuItem>
              ))}
            </div>
          )}
        </Popover>

        <button onClick={onArchive} className={btn}><Icon name="archive" size={14} /><span className="hidden sm:inline">Archive</span></button>
        <button onClick={onDelete} className="btn h-8 gap-1.5 rounded-lg px-2.5 text-[13px] text-rose-300 hover:bg-rose-500/20">
          <Icon name="trash" size={14} /><span className="hidden sm:inline">Delete</span>
        </button>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <button onClick={onClear} className="btn h-8 w-8 text-white/70 hover:bg-white/15" aria-label="Clear selection">
          <Icon name="x" size={15} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
