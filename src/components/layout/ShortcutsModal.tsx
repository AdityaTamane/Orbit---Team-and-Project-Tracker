import { Kbd } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Global',
    rows: [
      ['⌘ K', 'Open the command palette'],
      ['C', 'Create a new issue'],
      ['/', 'Focus search'],
      ['?', 'Show this help'],
      ['⌘ \\', 'Toggle the sidebar'],
    ],
  },
  {
    title: 'Navigate (press G, then…)',
    rows: [
      ['G H', 'Home'],
      ['G M', 'My work'],
      ['G I', 'Inbox'],
      ['G P', 'Projects'],
      ['G S', 'Shared spaces'],
      ['G C', 'Cycles'],
      ['G A', 'Activity'],
    ],
  },
  {
    title: 'Issues',
    rows: [
      ['⌘ ↵', 'Save and create'],
      ['Shift click', 'Multi-select on a board'],
      ['Esc', 'Close overlay or clear selection'],
    ],
  },
]

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" subtitle="Everything here works from anywhere in the app." width="lg">
      <div className="grid gap-6 px-5 py-4 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{g.title}</h3>
            <dl className="space-y-1.5">
              {g.rows.map(([keys, label]) => (
                <div key={keys} className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="flex shrink-0 gap-1">
                    {keys.split(' ').map((k) => <Kbd key={k}>{k}</Kbd>)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Modal>
  )
}
