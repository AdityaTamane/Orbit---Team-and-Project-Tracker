import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { PageHeader, SectionTitle } from '@/components/ui/misc'
import { ActivityFeed } from '@/components/common/ActivityFeed'
import { WorkView } from '@/components/board/WorkView'
import { useActivities, useIssues, useLookups, useTeamMembers, useTimeLogs } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { workload } from '@/lib/analytics'
import { cycleTime } from '@/lib/analytics'
import { fmtFull, fmtHours, fmtRelative } from '@/lib/format'
import { updateUser } from '@/lib/teams'
import { toast } from '@/lib/store'
import type { User } from '@/lib/types'

export function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const { users, userMap, teams, stateMap, projects } = useLookups()
  const issues = useIssues()
  const logs = useTimeLogs()
  const members = useTeamMembers()
  const activities = useActivities(200)
  const [editing, setEditing] = useState(false)

  const person = users.find((u) => u.id === id)

  const mine = useMemo(() => issues.filter((i) => i.assigneeId === id && !i.archivedAt), [issues, id])
  const load = useMemo(() => (person ? workload([person], issues, stateMap, logs)[0] : null), [person, issues, stateMap, logs])
  const ct = useMemo(() => cycleTime(mine, stateMap), [mine, stateMap])
  const myActivities = useMemo(() => activities.filter((a) => a.actorId === id).slice(0, 20), [activities, id])
  const myTeams = useMemo(
    () => members.filter((m) => m.userId === id).map((m) => ({ member: m, team: teams.find((t) => t.id === m.teamId) })).filter((x) => x.team),
    [members, id, teams],
  )
  const myProjects = useMemo(() => projects.filter((p) => p.memberIds.includes(id ?? '')), [projects, id])
  const myLogs = useMemo(() => logs.filter((l) => l.userId === id), [logs, id])

  if (!person || !load) {
    return (
      <div className="p-6">
        <EmptyState icon={<Icon name="user" size={20} />} title="Person not found" action={<Button variant="primary" onClick={() => navigate('/app/people')}>All people</Button>} />
      </div>
    )
  }

  const isMe = me?.id === person.id

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-10">
      <PageHeader
        icon={<Avatar user={person} size="xl" />}
        title={person.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">{person.title}</span>
            <Badge className="bg-sunken capitalize text-muted">{person.role}</Badge>
            {isMe && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">This is you</Badge>}
            <span className="text-xs text-faint">{person.email}</span>
            {person.lastSeenAt && <span className="text-xs text-faint">· active {fmtRelative(person.lastSeenAt)}</span>}
          </span>
        }
        actions={(isMe || me?.role === 'owner' || me?.role === 'admin') ? <Button variant="secondary" icon="pen" onClick={() => setEditing(true)}>Edit profile</Button> : undefined}
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        {person.bio && <p className="max-w-2xl text-sm leading-6 text-muted">{person.bio}</p>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Open work" value={load.open} hint={`${load.points} points`} icon={<Icon name="list-todo" size={15} className="text-faint" />} />
          <Stat
            label="Load"
            value={`${load.loadPct}%`}
            tone={load.status === 'overloaded' ? 'bad' : load.status === 'heavy' ? 'warn' : 'good'}
            hint={`${person.capacityHours}h/week capacity`}
            icon={<Icon name="gauge" size={15} className="text-faint" />}
          />
          <Stat label="Median cycle time" value={`${ct.median}d`} hint={`${ct.sample} items closed`} icon={<Icon name="timer" size={15} className="text-faint" />} />
          <Stat label="Time logged" value={fmtHours(load.loggedMinutes)} hint={`${myLogs.length} entries`} icon={<Icon name="clock" size={15} className="text-faint" />} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="card p-4">
            <h3 className="mb-2.5 text-sm font-semibold text-ink">Teams</h3>
            <div className="space-y-2.5">
              {myTeams.map(({ member, team }) => (
                <div key={member.id}>
                  <Link to={`/app/teams/${team!.id}`} className="flex items-center gap-2 text-[13px] text-ink hover:text-brand-600 dark:hover:text-brand-300">
                    <span>{team!.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{team!.name}</span>
                    {member.role === 'lead' && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">Lead</Badge>}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={member.allocationPct} height={4} color={team!.color} />
                    <span className="text-2xs tabular-nums text-faint">{member.allocationPct}%</span>
                  </div>
                </div>
              ))}
              {!myTeams.length && <p className="text-sm text-faint">Not on any team yet.</p>}
            </div>
          </section>

          <section className="card p-4">
            <h3 className="mb-2.5 text-sm font-semibold text-ink">Projects</h3>
            <div className="space-y-1.5">
              {myProjects.map((p) => (
                <Link key={p.id} to={`/app/projects/${p.id}`} className="flex items-center gap-2 text-[13px] text-ink hover:text-brand-600 dark:hover:text-brand-300">
                  <span>{p.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.leadId === person.id && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">Lead</Badge>}
                </Link>
              ))}
              {!myProjects.length && <p className="text-sm text-faint">Not on any project.</p>}
            </div>
          </section>

          <section className="card p-4">
            <h3 className="mb-2.5 text-sm font-semibold text-ink">Details</h3>
            <dl className="space-y-2 text-xs">
              <Row label="Skills" value={person.skills.join(', ') || '—'} />
              <Row label="Timezone" value={person.timezone} />
              <Row label="Capacity" value={`${person.capacityHours}h / week`} />
              <Row label="Joined" value={fmtFull(person.createdAt)} />
              <Row label="Status" value={person.status} />
            </dl>
          </section>
        </div>

        <section>
          <SectionTitle>Recent activity</SectionTitle>
          <div className="card p-4">
            <ActivityFeed activities={myActivities} userMap={userMap} compact emptyMessage="No recorded activity yet." />
          </div>
        </section>

        <SectionTitle>Assigned work</SectionTitle>
      </div>

      <WorkView
        viewKey={`person-${person.id}`}
        issues={mine}
        defaults={{ layout: 'list', groupBy: 'state', sortBy: 'priority' }}
        seed={{ assigneeId: person.id }}
        emptyTitle="Nothing assigned"
        emptyDescription="Work assigned to this person shows up here."
      />

      <EditPersonModal
        open={editing}
        person={person}
        onClose={() => setEditing(false)}
        onSave={async (patch) => { await updateUser(person.id, patch); toast.success('Profile updated') }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right capitalize text-ink">{value}</dd>
    </div>
  )
}

function EditPersonModal({ open, person, onClose, onSave }: {
  open: boolean
  person: User
  onClose: () => void
  onSave: (patch: Partial<User>) => Promise<void>
}) {
  const [name, setName] = useState(person.name)
  const [title, setTitle] = useState(person.title)
  const [bio, setBio] = useState(person.bio ?? '')
  const [capacity, setCapacity] = useState(String(person.capacityHours))
  const [skills, setSkills] = useState(person.skills.join(', '))
  const [role, setRole] = useState(person.role)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="save"
            onClick={async () => {
              await onSave({
                name, title, bio, role,
                capacityHours: Number(capacity) || 40,
                skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
              })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Bio"><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[70px]" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Weekly capacity (hours)"><Input type="number" min="0" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </Select>
          </Field>
        </div>
        <Field label="Skills" hint="Comma separated"><Input value={skills} onChange={(e) => setSkills(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
