import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { ColorPicker, Field, Input, Segmented, Select, Switch } from '@/components/ui/form'
import { InlineAlert, PageHeader, SectionTitle, Tabs } from '@/components/ui/misc'
import {
  useAutomations, useCycles, useDocs, useIssues, useLabels, useLookups, useSavedViews, useSpaces, useWorkspace,
} from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { clearDatabase, db, uid } from '@/lib/db'
import { AVATAR_COLORS } from '@/lib/constants'
import { seedDatabase } from '@/lib/seed'
import { toast, useUI } from '@/lib/store'
import type { Label } from '@/lib/types'

type Tab = 'workspace' | 'preferences' | 'labels' | 'views' | 'data'

export function Settings() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const workspace = useWorkspace()
  const { users, teams, projects } = useLookups()
  const issues = useIssues()
  const docs = useDocs()
  const spaces = useSpaces()
  const labels = useLabels()
  const cycles = useCycles()
  const automations = useAutomations()
  const savedViews = useSavedViews()
  const { theme, setTheme, density, setDensity } = useUI()

  const [tab, setTab] = useState<Tab>('workspace')
  const [labelModal, setLabelModal] = useState<Label | 'new' | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)

  const [name, setName] = useState(workspace?.name ?? '')
  const [emoji, setEmoji] = useState(workspace?.logoEmoji ?? '🛰️')

  const counts = useMemo(() => ({
    issues: issues.length, projects: projects.length, teams: teams.length, people: users.length,
    docs: docs.length, spaces: spaces.length, cycles: cycles.length, automations: automations.length,
  }), [issues, projects, teams, users, docs, spaces, cycles, automations])

  const exportData = async () => {
    const payload: Record<string, unknown> = {}
    for (const table of db.tables) payload[table.name] = await table.toArray()
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: payload }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Workspace exported')
  }

  const importData = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const data = parsed.data ?? parsed
      await clearDatabase()
      for (const table of db.tables) {
        const rows = data[table.name]
        if (Array.isArray(rows) && rows.length) await table.bulkPut(rows)
      }
      toast.success('Workspace imported')
    } catch (e) {
      toast.error(`Import failed: ${String(e)}`)
    }
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Settings"
        subtitle="Workspace, preferences and your data — all of it local to this browser."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="settings" size={19} /></span>}
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'workspace', label: 'Workspace', icon: 'building' },
              { value: 'preferences', label: 'Preferences', icon: 'sliders' },
              { value: 'labels', label: 'Labels', icon: 'tag', count: labels.length },
              { value: 'views', label: 'Saved views', icon: 'bookmark', count: savedViews.length },
              { value: 'data', label: 'Data', icon: 'database' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-5 sm:px-6">
        {tab === 'workspace' && (
          <>
            <section className="card p-5">
              <SectionTitle>Identity</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                <Field label="Logo">
                  <div className="flex flex-wrap gap-1.5">
                    {['🛰️', '🚀', '🌍', '⚡', '🧭', '🏛️', '🔭', '🛠️'].map((e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`grid h-10 w-10 place-items-center rounded-lg border text-lg transition hover:bg-sunken ${emoji === e ? 'border-brand-500 bg-brand-500/10' : 'border-line'}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Workspace name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="primary"
                  icon="save"
                  onClick={async () => {
                    if (workspace) await db.workspaces.update(workspace.id, { name, logoEmoji: emoji })
                    toast.success('Workspace updated')
                  }}
                >
                  Save
                </Button>
              </div>
            </section>

            <section className="card p-5">
              <SectionTitle>Delivery defaults</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estimate scale" hint="Used by the estimate picker.">
                  <Select
                    value={workspace?.settings.estimateScale ?? 'fibonacci'}
                    onChange={async (e) => {
                      if (workspace) await db.workspaces.update(workspace.id, { settings: { ...workspace.settings, estimateScale: e.target.value as any } })
                    }}
                  >
                    <option value="fibonacci">Fibonacci (1, 2, 3, 5, 8…)</option>
                    <option value="linear">Linear (1–10)</option>
                    <option value="tshirt">T-shirt sizes</option>
                    <option value="hours">Hours</option>
                  </Select>
                </Field>
                <Field label="Default cycle length">
                  <Select
                    value={workspace?.settings.defaultCycleDays ?? 14}
                    onChange={async (e) => {
                      if (workspace) await db.workspaces.update(workspace.id, { settings: { ...workspace.settings, defaultCycleDays: Number(e.target.value) } })
                    }}
                  >
                    <option value={7}>1 week</option>
                    <option value={14}>2 weeks</option>
                    <option value={21}>3 weeks</option>
                    <option value={28}>4 weeks</option>
                  </Select>
                </Field>
              </div>
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <Switch
                  checked={workspace?.settings.allowGuestComments ?? true}
                  onChange={async (v) => {
                    if (workspace) await db.workspaces.update(workspace.id, { settings: { ...workspace.settings, allowGuestComments: v } })
                  }}
                  label="Guests can comment"
                  description="Guest accounts can read and comment but never change status."
                />
              </div>
            </section>

            <section>
              <SectionTitle>Workspace contents</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Issues" value={counts.issues} icon={<Icon name="list-todo" size={15} className="text-faint" />} />
                <Stat label="Projects" value={counts.projects} icon={<Icon name="folder-kanban" size={15} className="text-faint" />} />
                <Stat label="Teams" value={counts.teams} icon={<Icon name="users" size={15} className="text-faint" />} />
                <Stat label="People" value={counts.people} icon={<Icon name="user" size={15} className="text-faint" />} />
                <Stat label="Docs" value={counts.docs} icon={<Icon name="file-text" size={15} className="text-faint" />} />
                <Stat label="Spaces" value={counts.spaces} icon={<Icon name="boxes" size={15} className="text-faint" />} />
                <Stat label="Cycles" value={counts.cycles} icon={<Icon name="repeat" size={15} className="text-faint" />} />
                <Stat label="Automations" value={counts.automations} icon={<Icon name="zap" size={15} className="text-faint" />} />
              </div>
            </section>
          </>
        )}

        {tab === 'preferences' && (
          <>
            <section className="card p-5">
              <SectionTitle>Appearance</SectionTitle>
              <div className="space-y-4">
                <Field label="Theme">
                  <Segmented
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { value: 'light', label: 'Light', icon: 'sun' },
                      { value: 'dark', label: 'Dark', icon: 'moon' },
                      { value: 'system', label: 'System', icon: 'laptop' },
                    ]}
                  />
                </Field>
                <Field label="Density" hint="Compact fits more rows on screen.">
                  <Segmented
                    value={density}
                    onChange={setDensity}
                    options={[
                      { value: 'comfortable', label: 'Comfortable' },
                      { value: 'compact', label: 'Compact' },
                    ]}
                  />
                </Field>
              </div>
            </section>

            <section className="card p-5">
              <SectionTitle>Your account</SectionTitle>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" icon="user" onClick={() => navigate(`/app/people/${user?.id}`)}>Edit your profile</Button>
                <Button variant="secondary" icon="repeat" onClick={() => navigate('/switch')}>Switch user</Button>
                <Button variant="ghost" icon="logout" className="text-rose-500" onClick={() => { logout(); navigate('/login') }}>Sign out</Button>
              </div>
            </section>

            <InlineAlert tone="info" title="Two tabs, two people">
              Open the app in a second tab and switch user there. Presence, mentions and every data change
              flow between tabs live — useful for seeing the collaboration features actually work.
            </InlineAlert>
          </>
        )}

        {tab === 'labels' && (
          <section>
            <SectionTitle action={<Button size="sm" variant="primary" icon="plus" onClick={() => setLabelModal('new')}>New label</Button>}>
              Labels
            </SectionTitle>
            <div className="card divide-y divide-line">
              {labels.map((l) => {
                const usage = issues.filter((i) => i.labelIds.includes(l.id)).length
                return (
                  <div key={l.id} className="group flex items-center gap-3 px-4 py-2.5">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: l.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">{l.name}</p>
                      {l.group && <p className="text-2xs text-faint">{l.group}</p>}
                    </div>
                    <Badge className="shrink-0 bg-sunken text-muted">{usage} issues</Badge>
                    <button onClick={() => setLabelModal(l)} className="shrink-0 text-faint opacity-0 transition hover:text-ink group-hover:opacity-100" aria-label="Edit label">
                      <Icon name="pen" size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        const affected = issues.filter((i) => i.labelIds.includes(l.id))
                        for (const i of affected) await db.issues.update(i.id, { labelIds: i.labelIds.filter((x) => x !== l.id) })
                        await db.labels.delete(l.id)
                        toast.success('Label deleted')
                      }}
                      className="shrink-0 text-faint opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                      aria-label="Delete label"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'views' && (
          <section>
            <SectionTitle>Saved views</SectionTitle>
            <div className="card divide-y divide-line">
              {savedViews.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-base">{v.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{v.name}</p>
                    <p className="text-2xs capitalize text-faint">{v.layout} · grouped by {v.groupBy} · sorted by {v.sortBy}</p>
                  </div>
                  {v.shared && <Badge className="shrink-0 bg-sunken text-muted"><Icon name="users" size={10} />Shared</Badge>}
                  <Button size="xs" variant="ghost" onClick={() => navigate(`/app/views/${v.id}`)}>Open</Button>
                  <button
                    onClick={async () => { await db.savedViews.delete(v.id); toast.success('View deleted') }}
                    className="text-faint hover:text-rose-500"
                    aria-label="Delete view"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
              {!savedViews.length && <p className="px-4 py-6 text-center text-sm text-faint">No saved views yet. Build a filter on All issues and save it.</p>}
            </div>
          </section>
        )}

        {tab === 'data' && (
          <>
            <section className="card p-5">
              <SectionTitle>Backup and restore</SectionTitle>
              <p className="mb-4 text-sm leading-6 text-muted">
                Everything lives in this browser's IndexedDB. Export writes a single JSON file with every table;
                importing replaces the current workspace entirely.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" icon="download" onClick={exportData}>Export workspace</Button>
                <label className="btn h-9 cursor-pointer gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-sunken">
                  <Icon name="paperclip" size={15} />
                  Import from file
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f) }}
                  />
                </label>
              </div>
            </section>

            <section className="card p-5">
              <SectionTitle>Demo data</SectionTitle>
              <p className="mb-4 text-sm leading-6 text-muted">
                Reset restores the seeded Nimbus Labs workspace — five teams, seven projects, cycles with
                burndown history, docs, risks and automations.
              </p>
              <Button variant="secondary" icon="refresh" onClick={() => setConfirmReset(true)}>Reset demo data</Button>
            </section>

            <section className="card border-rose-500/30 p-5">
              <SectionTitle>Danger zone</SectionTitle>
              <p className="mb-4 text-sm leading-6 text-muted">
                Wipe every table. Nothing is kept, and there is no undo — export first if you might want it back.
              </p>
              <Button variant="danger" icon="trash" onClick={() => setConfirmWipe(true)}>Delete all data</Button>
            </section>
          </>
        )}
      </div>

      <LabelModal
        open={!!labelModal}
        label={labelModal === 'new' ? null : labelModal}
        onClose={() => setLabelModal(null)}
        onSave={async (l) => { await db.labels.put(l); toast.success('Label saved') }}
      />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => { await seedDatabase(true); toast.success('Demo data restored'); navigate('/app') }}
        title="Reset demo data?"
        message="The current workspace is replaced with the seeded demo workspace. Anything you created here is lost."
        confirmLabel="Reset"
        danger
      />

      <ConfirmDialog
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        onConfirm={async () => { await clearDatabase(); logout(); window.location.reload() }}
        title="Delete everything?"
        message="Every table is cleared and you are signed out. This cannot be undone."
        confirmLabel="Delete all data"
        danger
      />
    </div>
  )
}

function LabelModal({ open, label, onClose, onSave }: {
  open: boolean
  label: Label | null
  onClose: () => void
  onSave: (l: Label) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [seeded, setSeeded] = useState<string | null>(null)

  const seedKey = label?.id ?? (open ? 'new' : null)
  if (open && seeded !== seedKey) {
    setSeeded(seedKey)
    setName(label?.name ?? '')
    setGroup(label?.group ?? '')
    setColor(label?.color ?? AVATAR_COLORS[0])
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={label ? 'Edit label' : 'New label'}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={async () => {
              await onSave({ id: label?.id ?? uid('lb'), name: name.trim().toLowerCase(), color, group: group || undefined })
              onClose()
            }}
          >
            Save label
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. performance" /></Field>
        <Field label="Group" hint="Groups labels in the picker — Area, Quality, Process…">
          <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Area" />
        </Field>
        <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={AVATAR_COLORS} /></Field>
      </div>
    </Modal>
  )
}
