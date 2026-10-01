import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { ColorPicker, Field, Input, Select, Switch } from '@/components/ui/form'
import { PageHeader, SectionTitle, Tabs } from '@/components/ui/misc'
import { ActivityFeed } from '@/components/common/ActivityFeed'
import { WorkView } from '@/components/board/WorkView'
import {
  useActivities, useCycles, useIssues, useLookups, useSpaces, useStates, useTeamMembers,
} from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { uid } from '@/lib/db'
import { AVATAR_COLORS, STATE_CATEGORIES } from '@/lib/constants'
import { computeCycleStats, computeVelocity } from '@/lib/cycles'
import { fmtDate } from '@/lib/format'
import { addTeamMember, deleteState, removeTeamMember, saveState, updateTeam } from '@/lib/teams'
import { toast } from '@/lib/store'
import type { StateCategory, TeamMember, WorkflowState } from '@/lib/types'

type Tab = 'work' | 'cycles' | 'members' | 'workflow' | 'activity'

export function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actorId = useActorId()

  const { teams, users, userMap, stateMap, projects } = useLookups()
  const team = teams.find((t) => t.id === id)
  const states = useStates(id)
  const members = useTeamMembers(id)
  const cycles = useCycles(id)
  const issues = useIssues()
  const activities = useActivities(40, { teamId: id })
  const spaces = useSpaces()

  const [tab, setTab] = useState<Tab>('work')
  const [stateModal, setStateModal] = useState<WorkflowState | 'new' | null>(null)
  const [memberModal, setMemberModal] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const teamIssues = useMemo(() => issues.filter((i) => i.teamId === id), [issues, id])
  const live = teamIssues.filter((i) => !i.archivedAt)
  const done = live.filter((i) => stateMap.get(i.stateId)?.category === 'completed').length
  const blocked = live.filter((i) => stateMap.get(i.stateId)?.category === 'paused').length
  const teamProjects = projects.filter((p) => p.teamIds.includes(id ?? ''))
  const space = spaces.find((s) => s.teamId === id)
  const velocity = useMemo(() => computeVelocity(cycles, live, stateMap), [cycles, live, stateMap])
  const avgVelocity = velocity.length ? Math.round(velocity.reduce((s, v) => s + v.completed, 0) / velocity.length) : 0

  if (!team) {
    return (
      <div className="p-6">
        <EmptyState icon={<Icon name="users" size={20} />} title="Team not found" action={<Button variant="primary" onClick={() => navigate('/app/teams')}>All teams</Button>} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-10">
      <PageHeader
        icon={<span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${team.color}1f` }}>{team.icon}</span>}
        title={team.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xs text-faint">{team.key}</span>
            <span className="text-xs text-muted">{team.description}</span>
          </span>
        }
        actions={
          <>
            {space && <Button variant="secondary" icon="boxes" onClick={() => navigate(`/app/spaces/${space.id}`)}>Space</Button>}
            <Button variant="secondary" icon="settings" onClick={() => setSettingsOpen(true)}>Settings</Button>
            <Button variant="primary" icon="user-plus" onClick={() => setMemberModal(true)}>Add member</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'work', label: 'Work', icon: 'kanban', count: live.length },
              { value: 'cycles', label: 'Cycles', icon: 'repeat', count: cycles.length },
              { value: 'members', label: 'Members', icon: 'users', count: members.length },
              { value: 'workflow', label: 'Workflow', icon: 'workflow', count: states.length },
              { value: 'activity', label: 'Activity', icon: 'activity' },
            ]}
          />
        }
      />

      {tab === 'work' && (
        <>
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
            <Stat label="Open work" value={live.length - done} hint={`${done} completed`} icon={<Icon name="list-todo" size={15} className="text-faint" />} />
            <Stat label="Blocked" value={blocked} tone={blocked ? 'bad' : 'good'} hint={blocked ? 'Needs unblocking' : 'Nothing stuck'} icon={<Icon name="ban" size={15} className="text-faint" />} />
            <Stat label="Avg velocity" value={avgVelocity} hint="points per completed cycle" icon={<Icon name="gauge" size={15} className="text-faint" />} />
            <Stat label="Projects" value={teamProjects.length} hint={teamProjects.map((p) => p.icon).join(' ')} icon={<Icon name="folder-kanban" size={15} className="text-faint" />} />
          </div>
          <WorkView
            viewKey={`team-${team.id}`}
            issues={teamIssues}
            states={states}
            seed={{ teamId: team.id }}
            defaults={{ layout: 'board', groupBy: 'state', sortBy: 'manual' }}
            emptyTitle="No work for this team yet"
            emptyDescription="Create the first issue and it will show up on the board."
          />
        </>
      )}

      {tab === 'cycles' && (
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <SectionTitle action={<Button size="sm" variant="secondary" icon="plus" onClick={() => navigate('/app/cycles')}>Manage cycles</Button>}>
            Cycles
          </SectionTitle>
          {cycles.length ? (
            <div className="grid gap-3 grid-dense-cols">
              {[...cycles].reverse().map((cycle) => {
                const cycleIssues = live.filter((i) => i.cycleId === cycle.id)
                const stats = computeCycleStats(cycle, cycleIssues, stateMap)
                return (
                  <Link key={cycle.id} to={`/app/cycles/${cycle.id}`} className="card card-hover p-4">
                    <div className="flex items-center gap-2">
                      <Icon name={cycle.status === 'active' ? 'play' : cycle.status === 'completed' ? 'check-circle' : 'clock'} size={15} className={cycle.status === 'active' ? 'text-emerald-500' : 'text-faint'} />
                      <h3 className="text-sm font-semibold text-ink">{cycle.name}</h3>
                      <Badge className={clsx('ml-auto capitalize', cycle.status === 'active' ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' : 'bg-sunken text-muted')}>{cycle.status}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{cycle.goal || 'No goal set.'}</p>
                    <p className="mt-1.5 text-2xs text-faint">{fmtDate(cycle.startDate)} → {fmtDate(cycle.endDate)}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Progress value={stats.completionPct} height={5} color={stats.onPace ? '#10b981' : '#f59e0b'} />
                      <span className="text-2xs tabular-nums text-muted">{stats.completionPct}%</span>
                    </div>
                    <p className="mt-1 text-2xs text-faint">{stats.doneCount}/{stats.issueCount} issues · {stats.completed}/{stats.scope} points</p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<Icon name="repeat" size={20} />} title="Cycles are off for this team" description="Turn cycles on in team settings to plan in fixed iterations." action={<Button variant="secondary" icon="settings" onClick={() => setSettingsOpen(true)}>Team settings</Button>} />
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="px-4 py-5 sm:px-6">
          <SectionTitle action={<Button size="sm" variant="primary" icon="user-plus" onClick={() => setMemberModal(true)}>Add member</Button>}>
            {members.length} members
          </SectionTitle>
          <div className="card divide-y divide-line">
            {members.map((m) => {
              const u = userMap.get(m.userId)
              if (!u) return null
              const assigned = live.filter((i) => i.assigneeId === m.userId && stateMap.get(i.stateId)?.category !== 'completed')
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar user={u} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/app/people/${u.id}`} className="truncate text-sm font-semibold text-ink hover:text-brand-600 dark:hover:text-brand-300">{u.name}</Link>
                      {m.role === 'lead' && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">Lead</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted">{u.title} · joined {fmtDate(m.joinedAt, 'MMM yyyy')}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold tabular-nums text-ink">{assigned.length}</p>
                    <p className="text-2xs text-faint">open items</p>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <Progress value={m.allocationPct} height={5} color={team.color} />
                    <p className="mt-1 text-right text-2xs text-faint">{m.allocationPct}% allocated</p>
                  </div>
                  <Popover
                    width={200}
                    trigger={({ toggle, ref }) => (
                      <button ref={ref as any} onClick={toggle} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-sunken hover:text-ink" aria-label="Member actions">
                        <Icon name="more-horizontal" size={16} />
                      </button>
                    )}
                  >
                    {(close) => (
                      <div className="py-1">
                        <MenuItem icon={<Icon name="star" size={14} />} onClick={async () => {
                          await addTeamMember(team.id, m.userId, m.role === 'lead' ? 'member' : 'lead', m.allocationPct, actorId)
                          if (m.role !== 'lead') await updateTeam(team.id, { leadId: m.userId }, actorId)
                          close()
                        }}>
                          {m.role === 'lead' ? 'Remove lead role' : 'Make team lead'}
                        </MenuItem>
                        <MenuItem icon={<Icon name="gauge" size={14} />} onClick={async () => {
                          const next = m.allocationPct >= 100 ? 50 : m.allocationPct + 25
                          await addTeamMember(team.id, m.userId, m.role, next, actorId)
                          close()
                        }}>
                          Cycle allocation
                        </MenuItem>
                        <MenuItem danger icon={<Icon name="trash" size={14} />} onClick={() => { setConfirmRemove(m); close() }}>Remove from team</MenuItem>
                      </div>
                    )}
                  </Popover>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'workflow' && (
        <div className="px-4 py-5 sm:px-6">
          <SectionTitle action={<Button size="sm" variant="primary" icon="plus" onClick={() => setStateModal('new')}>Add state</Button>}>
            Workflow states
          </SectionTitle>
          <p className="mb-3 max-w-2xl text-sm text-muted">
            States are the columns on this team's board. Their category drives everything downstream —
            what counts as started, what counts as done, and what shows up as blocked.
          </p>
          <div className="card divide-y divide-line">
            {states.map((s, i) => {
              const count = live.filter((x) => x.stateId === s.id).length
              return (
                <div key={s.id} className="group flex items-center gap-3 px-4 py-2.5">
                  <span className="flex shrink-0 flex-col gap-0.5">
                    <button
                      disabled={i === 0}
                      onClick={async () => {
                        const prev = states[i - 1]
                        await saveState({ ...s, order: prev.order })
                        await saveState({ ...prev, order: s.order })
                      }}
                      className="text-faint hover:text-ink disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <Icon name="chevron-up" size={12} />
                    </button>
                    <button
                      disabled={i === states.length - 1}
                      onClick={async () => {
                        const next = states[i + 1]
                        await saveState({ ...s, order: next.order })
                        await saveState({ ...next, order: s.order })
                      }}
                      className="text-faint hover:text-ink disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <Icon name="chevron-down" size={12} />
                    </button>
                  </span>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink">{s.name}</p>
                    <p className="text-2xs capitalize text-faint">{s.category.replace('_', ' ')}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{count} issues</span>
                  <button onClick={() => setStateModal(s)} className="shrink-0 text-faint opacity-0 transition hover:text-ink group-hover:opacity-100" aria-label="Edit state">
                    <Icon name="pen" size={14} />
                  </button>
                  <button
                    onClick={async () => { await deleteState(s.id); toast.success(`${s.name} removed — issues moved to the next state`) }}
                    disabled={states.length <= 2}
                    className="shrink-0 text-faint opacity-0 transition hover:text-rose-500 disabled:opacity-20 group-hover:opacity-100"
                    aria-label="Delete state"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="px-4 py-5 sm:px-6">
          <div className="card p-4">
            <ActivityFeed activities={activities} userMap={userMap} />
          </div>
        </div>
      )}

      {/* Modals */}
      <StateModal
        open={!!stateModal}
        state={stateModal === 'new' ? null : stateModal}
        teamId={team.id}
        nextOrder={states.length}
        onClose={() => setStateModal(null)}
        onSave={async (s) => { await saveState(s); toast.success('Workflow updated') }}
      />

      <AddMemberModal
        open={memberModal}
        onClose={() => setMemberModal(false)}
        users={users.filter((u) => !members.some((m) => m.userId === u.id))}
        onAdd={async (userId, role, allocation) => {
          await addTeamMember(team.id, userId, role, allocation, actorId)
          toast.success('Member added and notified')
        }}
      />

      <TeamSettingsModal
        open={settingsOpen}
        team={team}
        onClose={() => setSettingsOpen(false)}
        onSave={async (patch) => { await updateTeam(team.id, patch, actorId); toast.success('Team settings saved') }}
      />

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={async () => {
          if (confirmRemove) await removeTeamMember(team.id, confirmRemove.userId)
          toast.success('Member removed')
        }}
        title="Remove from team?"
        message="They keep their assigned issues but lose access to this team's private work and space."
        confirmLabel="Remove"
        danger
      />
    </div>
  )
}

function StateModal({ open, state, teamId, nextOrder, onClose, onSave }: {
  open: boolean
  state: WorkflowState | null
  teamId: string
  nextOrder: number
  onClose: () => void
  onSave: (s: WorkflowState) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<StateCategory>('unstarted')
  const [color, setColor] = useState('#6366f1')
  const [seeded, setSeeded] = useState<string | null>(null)

  const seedKey = state?.id ?? (open ? 'new' : null)
  if (open && seeded !== seedKey) {
    setSeeded(seedKey)
    setName(state?.name ?? '')
    setCategory(state?.category ?? 'unstarted')
    setColor(state?.color ?? '#6366f1')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={state ? 'Edit state' : 'New workflow state'}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={async () => {
              await onSave({
                id: state?.id ?? uid('st'), teamId, name: name.trim(), category, color,
                order: state?.order ?? nextOrder,
              })
              onClose()
            }}
          >
            Save state
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ready for QA" /></Field>
        <Field label="Category" hint="Determines whether work here counts as started, done or blocked.">
          <Select value={category} onChange={(e) => setCategory(e.target.value as StateCategory)}>
            {STATE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={[...AVATAR_COLORS, '#8e96ad']} /></Field>
      </div>
    </Modal>
  )
}

function AddMemberModal({ open, onClose, users, onAdd }: {
  open: boolean
  onClose: () => void
  users: { id: string; name: string; title: string; avatarColor: string }[]
  onAdd: (userId: string, role: 'lead' | 'member', allocation: number) => Promise<void>
}) {
  const [userId, setUserId] = useState('')
  const [allocation, setAllocation] = useState(100)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a team member"
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="user-plus" disabled={!userId} onClick={async () => { await onAdd(userId, 'member', allocation); setUserId(''); onClose() }}>Add member</Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        {users.length ? (
          <>
            <Field label="Who?">
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Choose someone…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
              </Select>
            </Field>
            <Field label={`Allocation — ${allocation}%`} hint="How much of their week this team gets.">
              <input type="range" min={10} max={100} step={10} value={allocation} onChange={(e) => setAllocation(Number(e.target.value))} className="w-full accent-brand-500" />
            </Field>
          </>
        ) : (
          <p className="text-sm text-muted">Everyone in the workspace is already on this team.</p>
        )}
      </div>
    </Modal>
  )
}

function TeamSettingsModal({ open, team, onClose, onSave }: {
  open: boolean
  team: { name: string; description: string; visibility: 'public' | 'private'; cycleEnabled: boolean; cycleDays: number; color: string }
  onClose: () => void
  onSave: (patch: any) => Promise<void>
}) {
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description)
  const [visibility, setVisibility] = useState(team.visibility)
  const [cycleEnabled, setCycleEnabled] = useState(team.cycleEnabled)
  const [cycleDays, setCycleDays] = useState(team.cycleDays)
  const [color, setColor] = useState(team.color)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Team settings"
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="save" onClick={async () => { await onSave({ name, description, visibility, cycleEnabled, cycleDays, color }); onClose() }}>Save</Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={AVATAR_COLORS} /></Field>
        <Switch checked={cycleEnabled} onChange={setCycleEnabled} label="Run cycles" description="Fixed iterations with burndown and velocity." />
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
        <Switch
          checked={visibility === 'private'}
          onChange={(v) => setVisibility(v ? 'private' : 'public')}
          label="Private team"
          description="Hidden from people who are not members."
        />
      </div>
    </Modal>
  )
}
