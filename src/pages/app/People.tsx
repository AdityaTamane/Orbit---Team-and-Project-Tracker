import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress, Stat } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ColorPicker, Field, Input, Select } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/misc'
import { useIssues, useLookups, useTeamMembers } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { AVATAR_COLORS } from '@/lib/constants'
import { inviteUser } from '@/lib/teams'
import { workload } from '@/lib/analytics'
import { toast } from '@/lib/store'
import type { User } from '@/lib/types'

export function People() {
  const actorId = useActorId()
  const { users, teams, stateMap } = useLookups()
  const issues = useIssues()
  const members = useTeamMembers()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('all')
  const [inviting, setInviting] = useState(false)

  const rows = useMemo(() => {
    const load = workload(users, issues, stateMap)
    return load
      .filter((r) => (role === 'all' ? true : r.user.role === role))
      .filter((r) => !q.trim() || `${r.user.name} ${r.user.title} ${r.user.email} ${r.user.skills.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
      .map((r) => ({ ...r, teams: members.filter((m) => m.userId === r.user.id).map((m) => teams.find((t) => t.id === m.teamId)).filter(Boolean) }))
  }, [users, issues, stateMap, role, q, members, teams])

  return (
    <div className="pb-10">
      <PageHeader
        title="People"
        subtitle="Who is in the workspace, what they own, and how loaded they are."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="users" size={19} /></span>}
        actions={<Button variant="primary" icon="user-plus" onClick={() => setInviting(true)}>Invite someone</Button>}
      />

      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
        <Stat label="Members" value={users.length} icon={<Icon name="users" size={15} className="text-faint" />} />
        <Stat label="Admins" value={users.filter((u) => u.role === 'owner' || u.role === 'admin').length} icon={<Icon name="shield" size={15} className="text-faint" />} />
        <Stat label="Guests" value={users.filter((u) => u.role === 'guest').length} icon={<Icon name="user" size={15} className="text-faint" />} />
        <Stat label="Invited" value={users.filter((u) => u.status === 'invited').length} hint="pending acceptance" icon={<Icon name="mail" size={15} className="text-faint" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-line px-4 py-2 sm:px-6">
        <Input icon="search" placeholder="Search people, titles, skills…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-full !text-[13px] sm:w-64" />
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="h-8 w-auto !text-[13px]">
          <option value="all">All roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="guest">Guest</option>
        </Select>
        <span className="ml-auto text-xs tabular-nums text-faint">{rows.length} people</span>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="grid gap-3 grid-dense-cols">
          {rows.map((row) => (
            <Link key={row.user.id} to={`/app/people/${row.user.id}`} className="card card-hover p-4">
              <div className="flex items-start gap-3">
                <Avatar user={row.user} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold text-ink">{row.user.name}</h3>
                    {row.user.id === actorId && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">You</Badge>}
                    {row.user.status === 'invited' && <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300">Invited</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted">{row.user.title}</p>
                  <p className="truncate text-2xs text-faint">{row.user.email}</p>
                </div>
                <Badge className="shrink-0 bg-sunken capitalize text-muted">{row.user.role}</Badge>
              </div>

              {row.user.skills.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {row.user.skills.slice(0, 3).map((s) => <Badge key={s} className="bg-sunken text-faint">{s}</Badge>)}
                </div>
              )}

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-2xs text-muted">
                  <span>{row.open} open · {row.points} pts</span>
                  <span className="tabular-nums">{row.loadPct}% load</span>
                </div>
                <Progress
                  value={Math.min(100, row.loadPct)}
                  height={5}
                  color={row.status === 'overloaded' ? '#f43f5e' : row.status === 'heavy' ? '#f59e0b' : row.status === 'light' ? '#0ea5e9' : '#10b981'}
                />
              </div>

              {row.teams.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-2.5">
                  {row.teams.map((t) => <Badge key={t!.id} className="bg-sunken text-muted">{t!.icon} {t!.name}</Badge>)}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      <InviteModal open={inviting} onClose={() => setInviting(false)} actorId={actorId} />
    </div>
  )
}

function InviteModal({ open, onClose, actorId }: { open: boolean; onClose: () => void; actorId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [role, setRole] = useState<User['role']>('member')
  const [color, setColor] = useState(AVATAR_COLORS[3])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite someone"
      subtitle="They can sign in immediately with the password demo123."
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="user-plus"
            disabled={!name.trim() || !email.trim()}
            onClick={async () => {
              await inviteUser({ name, email, title: title || 'Team member', role, color, actorId })
              toast.success(`${name} invited`)
              setName(''); setEmail(''); setTitle('')
              onClose()
            }}
          >
            Send invite
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Full name" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nimbus.io" /></Field>
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Backend Engineer" /></Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
            <option value="admin">Admin — manage everything</option>
            <option value="member">Member — full access to work</option>
            <option value="guest">Guest — limited access</option>
          </Select>
        </Field>
        <Field label="Avatar colour"><ColorPicker value={color} onChange={setColor} colors={AVATAR_COLORS} /></Field>
      </div>
    </Modal>
  )
}
