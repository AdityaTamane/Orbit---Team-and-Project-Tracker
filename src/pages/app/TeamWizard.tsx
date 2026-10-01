import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ColorPicker, EmojiPicker, Field, Input, Select, Switch, Textarea } from '@/components/ui/form'
import { InlineAlert } from '@/components/ui/misc'
import { useLookups } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { AVATAR_COLORS, TEAM_ICONS } from '@/lib/constants'
import { createTeam } from '@/lib/teams'
import { toast } from '@/lib/store'

const WORKFLOW = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Blocked', 'Done', 'Canceled']

export function TeamWizard() {
  const navigate = useNavigate()
  const actorId = useActorId()
  const { users, teams } = useLookups()

  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(TEAM_ICONS[0])
  const [color, setColor] = useState(AVATAR_COLORS[1])
  const [leadId, setLeadId] = useState(actorId)
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [cycleEnabled, setCycleEnabled] = useState(true)
  const [cycleDays, setCycleDays] = useState(14)
  const [createSpace, setCreateSpace] = useState(true)
  const [saving, setSaving] = useState(false)

  const autoKey = useMemo(
    () => key || name.trim().slice(0, 3).toUpperCase() || 'TEAM',
    [key, name],
  )
  const keyTaken = teams.some((t) => t.key === autoKey)

  const submit = async () => {
    setSaving(true)
    try {
      const team = await createTeam({
        name, key: autoKey, description, icon, color, leadId, memberIds,
        visibility, cycleEnabled, cycleDays, createSpace, actorId,
      })
      toast.success(`${team.name} created`)
      navigate(`/app/teams/${team.id}`)
    } catch (e) {
      toast.error(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Create a team</h1>
          <p className="mt-1 text-sm text-muted">
            A team brings its own issue prefix, workflow states, cycles and shared space.
          </p>
        </div>
        <Button variant="ghost" icon="x" onClick={() => navigate('/app/teams')}>Cancel</Button>
      </div>

      <div className="card space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Team name" required>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Platform & Security" />
          </Field>
          <Field label="Key" hint="Prefix for issue keys" error={keyTaken ? 'Already in use' : undefined}>
            <Input value={key || autoKey} onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 5))} className="w-24 font-mono uppercase" />
          </Field>
        </div>

        <Field label="What does this team do?">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[70px]" placeholder="Infrastructure, reliability and the compliance programme." />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Icon"><EmojiPicker value={icon} onChange={setIcon} options={TEAM_ICONS} /></Field>
          <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={AVATAR_COLORS} /></Field>
        </div>

        <Field label="Team lead" hint="Gets the lead role and shows on the team card.">
          <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
          </Select>
        </Field>

        <Field label="Members">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {users.map((u) => {
              const on = memberIds.includes(u.id) || u.id === leadId
              return (
                <button
                  key={u.id}
                  disabled={u.id === leadId}
                  onClick={() => setMemberIds((prev) => (prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]))}
                  className={clsx('flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition disabled:opacity-70',
                    on ? 'border-brand-500 bg-brand-500/8' : 'border-line hover:bg-sunken')}
                >
                  <Avatar user={u} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink">{u.name}</span>
                    <span className="block truncate text-2xs text-faint">{u.title}</span>
                  </span>
                  {u.id === leadId ? <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">Lead</Badge> : on ? <Icon name="check" size={14} className="text-brand-500" /> : null}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="rounded-lg border border-line bg-sunken/50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">Default workflow</p>
          <div className="flex flex-wrap gap-1.5">
            {WORKFLOW.map((s) => <Badge key={s} className="bg-surface text-muted">{s}</Badge>)}
          </div>
          <p className="mt-2 text-xs text-muted">You can rename, reorder or remove these states from the team page afterwards.</p>
        </div>

        <div className="space-y-3">
          <Switch checked={cycleEnabled} onChange={setCycleEnabled} label="Run cycles" description="Fixed-length iterations with burndown, velocity and rollover." />
          {cycleEnabled && (
            <Field label="Cycle length">
              <Select value={cycleDays} onChange={(e) => setCycleDays(Number(e.target.value))} className="w-40">
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={21}>3 weeks</option>
                <option value={28}>4 weeks</option>
              </Select>
            </Field>
          )}
          <Switch checked={createSpace} onChange={setCreateSpace} label="Create a shared space" description="Somewhere for runbooks, decisions and retros." />
          <Switch
            checked={visibility === 'private'}
            onChange={(v) => setVisibility(v ? 'private' : 'public')}
            label="Private team"
            description="Only members can see this team's work and space."
          />
        </div>

        <InlineAlert tone="info">
          Creating a team notifies everyone you added and opens their access immediately.
        </InlineAlert>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => navigate('/app/teams')}>Cancel</Button>
          <Button variant="primary" icon="users" loading={saving} disabled={!name.trim() || keyTaken} onClick={submit}>Create team</Button>
        </div>
      </div>
    </div>
  )
}
