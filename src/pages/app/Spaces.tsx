import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ColorPicker, EmojiPicker, Field, Input, Select, Textarea } from '@/components/ui/form'
import { PageHeader, SectionTitle } from '@/components/ui/misc'
import { useDocs, useLookups, useSpaces } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { AVATAR_COLORS, DOC_ICONS } from '@/lib/constants'
import { createSpace, joinSpace, leaveSpace } from '@/lib/docs'
import { fmtRelative, plural } from '@/lib/format'
import { toast } from '@/lib/store'
import type { Space } from '@/lib/types'

const KIND_LABEL: Record<Space['kind'], string> = {
  company: 'Company-wide',
  team: 'Team space',
  project: 'Project space',
  personal: 'Personal',
}

export function Spaces() {
  const actorId = useActorId()
  const spaces = useSpaces()
  const docs = useDocs()
  const { userMap, teams } = useLookups()
  const [creating, setCreating] = useState(false)

  const rows = useMemo(() => spaces.map((space) => ({
    space,
    docs: docs.filter((d) => d.spaceId === space.id),
    isMember: space.memberIds.includes(actorId),
  })), [spaces, docs, actorId])

  const mine = rows.filter((r) => r.isMember)
  const others = rows.filter((r) => !r.isMember && r.space.visibility === 'open')
  const closed = rows.filter((r) => !r.isMember && r.space.visibility !== 'open')

  const Card = ({ row }: { row: typeof rows[number] }) => {
    const { space, docs: spaceDocs, isMember } = row
    const team = space.teamId ? teams.find((t) => t.id === space.teamId) : undefined
    const lastUpdate = spaceDocs.map((d) => d.updatedAt).sort().reverse()[0]
    return (
      <div className="card card-hover flex flex-col p-4">
        <Link to={`/app/spaces/${space.id}`} className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${space.color}1f` }}>{space.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-ink">{space.name}</h3>
              {space.visibility !== 'open' && <Icon name="lock" size={11} className="shrink-0 text-faint" />}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{space.description}</p>
          </div>
        </Link>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge className="bg-sunken text-muted">{KIND_LABEL[space.kind]}</Badge>
          <Badge className="bg-sunken text-muted">{plural(spaceDocs.length, 'doc')}</Badge>
          {team && <Badge className="bg-sunken text-muted">{team.icon} {team.name}</Badge>}
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3">
          <div className="min-w-0">
            <AvatarStack users={space.memberIds.map((m) => userMap.get(m))} max={4} />
            <p className="mt-1 truncate text-2xs text-faint">
              {lastUpdate ? `Updated ${fmtRelative(lastUpdate)}` : `Created ${fmtRelative(space.createdAt)}`}
            </p>
          </div>
          <Button
            size="xs"
            variant={isMember ? 'ghost' : 'outline'}
            icon={isMember ? 'check' : 'plus'}
            onClick={() => {
              if (isMember) { leaveSpace(space.id, actorId); toast.info(`Left ${space.name}`) }
              else { joinSpace(space.id, actorId); toast.success(`Joined ${space.name}`) }
            }}
          >
            {isMember ? 'Joined' : 'Join'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Shared spaces"
        subtitle="Where a team's thinking lives — specs, decisions, runbooks and retros, all in one place."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="boxes" size={19} /></span>}
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New space</Button>}
      />

      <div className="space-y-6 px-4 py-5 sm:px-6">
        <section>
          <SectionTitle>Your spaces</SectionTitle>
          {mine.length ? (
            <div className="grid gap-3 grid-dense-cols">{mine.map((row) => <Card key={row.space.id} row={row} />)}</div>
          ) : (
            <EmptyState icon={<Icon name="boxes" size={20} />} title="You're not in any space yet" description="Join an open space below, or create one for your team." />
          )}
        </section>

        {others.length > 0 && (
          <section>
            <SectionTitle>Open to join</SectionTitle>
            <div className="grid gap-3 grid-dense-cols">{others.map((row) => <Card key={row.space.id} row={row} />)}</div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <SectionTitle>Closed spaces</SectionTitle>
            <div className="card divide-y divide-line">
              {closed.map(({ space }) => (
                <div key={space.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base opacity-60" style={{ background: `${space.color}1f` }}>{space.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{space.name}</p>
                    <p className="truncate text-2xs text-faint">{space.description}</p>
                  </div>
                  <Badge className="shrink-0 bg-sunken text-muted"><Icon name="lock" size={10} />Request access</Badge>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <NewSpaceModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function NewSpaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actorId = useActorId()
  const { users, teams } = useLookups()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(DOC_ICONS[0])
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [kind, setKind] = useState<Space['kind']>('team')
  const [teamId, setTeamId] = useState('')
  const [visibility, setVisibility] = useState<Space['visibility']>('open')
  const [memberIds, setMemberIds] = useState<string[]>([])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New shared space"
      subtitle="A space is a home for docs and decisions — not another folder."
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="boxes"
            disabled={!name.trim()}
            onClick={async () => {
              await createSpace({ name, description, icon, color, kind, teamId: teamId || undefined, visibility, memberIds, actorId })
              toast.success('Space created')
              onClose()
              setName(''); setDescription(''); setMemberIds([])
            }}
          >
            Create space
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Name" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering Space" /></Field>
        <Field label="What is it for?"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Icon"><EmojiPicker value={icon} onChange={setIcon} options={[...DOC_ICONS, '🏛️', '🛠️', '🎨', '🛡️', '💳']} /></Field>
          <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={AVATAR_COLORS} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value as Space['kind'])}>
              <option value="team">Team space</option>
              <option value="project">Project space</option>
              <option value="company">Company-wide</option>
              <option value="personal">Personal</option>
            </Select>
          </Field>
          <Field label="Visibility">
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value as Space['visibility'])}>
              <option value="open">Open — anyone can join</option>
              <option value="closed">Closed — members only</option>
              <option value="secret">Secret — hidden</option>
            </Select>
          </Field>
        </div>
        {kind === 'team' && (
          <Field label="Linked team">
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">None</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Members">
          <div className="flex flex-wrap gap-1.5">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setMemberIds((prev) => (prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]))}
                className={`chip border transition ${memberIds.includes(u.id) ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-line text-muted'}`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}
