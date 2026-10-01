import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/form'
import { PageHeader, SectionTitle, Tabs } from '@/components/ui/misc'
import { ActivityFeed } from '@/components/common/ActivityFeed'
import { CommentThread } from '@/components/common/CommentThread'
import { useActivities, useComments, useDocs, useLookups, useSpace } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { DOC_ICONS } from '@/lib/constants'
import { createDoc, joinSpace, leaveSpace, toggleDocPin, updateSpace } from '@/lib/docs'
import { fmtRelative } from '@/lib/format'
import { stripMarkdown } from '@/lib/markdown'
import { toast } from '@/lib/store'
import type { Doc } from '@/lib/types'

type Tab = 'docs' | 'discussion' | 'members' | 'activity'

export function SpaceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actorId = useActorId()

  const space = useSpace(id)
  const docs = useDocs()
  const { users, userMap, teams } = useLookups()
  const comments = useComments('space', id)
  const activities = useActivities(30, { teamId: space?.teamId })

  const [tab, setTab] = useState<Tab>('docs')
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')

  const spaceDocs = useMemo(
    () => docs.filter((d) => d.spaceId === id).filter((d) => !q.trim() || `${d.title} ${d.body}`.toLowerCase().includes(q.toLowerCase())),
    [docs, id, q],
  )
  const pinned = spaceDocs.filter((d) => d.pinned)
  const rest = spaceDocs.filter((d) => !d.pinned)

  if (!space) {
    return (
      <div className="p-6">
        <EmptyState icon={<Icon name="boxes" size={20} />} title="Space not found" action={<Button variant="primary" onClick={() => navigate('/app/spaces')}>All spaces</Button>} />
      </div>
    )
  }

  const isMember = space.memberIds.includes(actorId)
  const team = space.teamId ? teams.find((t) => t.id === space.teamId) : undefined

  const DocRow = ({ doc }: { doc: Doc }) => (
    <div className="group flex items-start gap-3 px-4 py-3 transition hover:bg-sunken/60">
      <Link to={`/app/docs/${doc.id}`} className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 text-lg">{doc.icon}</span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-ink">{doc.title}</span>
            <Badge className="bg-sunken capitalize text-muted">{doc.kind}</Badge>
            {doc.status === 'draft' && <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300">Draft</Badge>}
          </span>
          <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted">{stripMarkdown(doc.body, 180)}</span>
          <span className="mt-1 flex items-center gap-1.5 text-2xs text-faint">
            <Avatar user={userMap.get(doc.authorId)} size="xs" />
            {userMap.get(doc.authorId)?.name} · updated {fmtRelative(doc.updatedAt)}
            {doc.collaboratorIds.length > 0 && ` · ${doc.collaboratorIds.length} collaborators`}
          </span>
        </span>
      </Link>
      <button
        onClick={() => toggleDocPin(doc.id)}
        className={`shrink-0 transition ${doc.pinned ? 'text-amber-500' : 'text-faint opacity-0 group-hover:opacity-100'}`}
        aria-label={doc.pinned ? 'Unpin' : 'Pin'}
      >
        <Icon name="pin" size={14} />
      </button>
    </div>
  )

  return (
    <div className="pb-10">
      <PageHeader
        icon={<span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${space.color}1f` }}>{space.icon}</span>}
        title={space.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge className="bg-sunken capitalize text-muted">{space.kind} space</Badge>
            {space.visibility !== 'open' && <Badge className="bg-sunken text-muted"><Icon name="lock" size={10} />{space.visibility}</Badge>}
            {team && <Link to={`/app/teams/${team.id}`} className="chip bg-sunken text-muted hover:text-ink">{team.icon} {team.name}</Link>}
            <span className="text-xs text-muted">{space.description}</span>
          </span>
        }
        actions={
          <>
            <AvatarStack users={space.memberIds.map((m) => userMap.get(m))} max={5} size="md" />
            <Button
              variant={isMember ? 'secondary' : 'outline'}
              icon={isMember ? 'check' : 'plus'}
              onClick={() => {
                if (isMember) { leaveSpace(space.id, actorId); toast.info('Left the space') }
                else { joinSpace(space.id, actorId); toast.success('Joined the space') }
              }}
            >
              {isMember ? 'Member' : 'Join'}
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New doc</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'docs', label: 'Docs', icon: 'file-text', count: spaceDocs.length },
              { value: 'discussion', label: 'Discussion', icon: 'message', count: comments.length },
              { value: 'members', label: 'Members', icon: 'users', count: space.memberIds.length },
              { value: 'activity', label: 'Activity', icon: 'activity' },
            ]}
          />
        }
      />

      <div className="px-4 py-5 sm:px-6">
        {tab === 'docs' && (
          <div className="space-y-5">
            <Input icon="search" placeholder="Search this space…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-sm" />

            {pinned.length > 0 && (
              <section>
                <SectionTitle>Pinned</SectionTitle>
                <div className="card divide-y divide-line">{pinned.map((doc) => <DocRow key={doc.id} doc={doc} />)}</div>
              </section>
            )}

            <section>
              <SectionTitle>{pinned.length ? 'Everything else' : 'Documents'}</SectionTitle>
              {rest.length ? (
                <div className="card divide-y divide-line">{rest.map((doc) => <DocRow key={doc.id} doc={doc} />)}</div>
              ) : (
                <EmptyState
                  icon={<Icon name="file-text" size={20} />}
                  title={q ? 'No matches' : 'No docs in this space yet'}
                  description={q ? 'Try a different search.' : 'Write the first spec, decision or runbook.'}
                  action={!q ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New doc</Button> : undefined}
                />
              )}
            </section>
          </div>
        )}

        {tab === 'discussion' && (
          <div className="card p-4">
            <CommentThread
              entityType="space"
              entityId={space.id}
              entityLabel={space.name}
              link={`/app/spaces/${space.id}`}
              comments={comments}
              users={users}
              userMap={userMap}
              currentUserId={actorId}
              subscriberIds={space.memberIds}
            />
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-4">
            <SectionTitle
              action={
                <Select
                  value=""
                  onChange={(e) => { if (e.target.value) { joinSpace(space.id, e.target.value); toast.success('Member added') } }}
                  className="h-8 w-auto !text-[13px]"
                >
                  <option value="">Add someone…</option>
                  {users.filter((u) => !space.memberIds.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              }
            >
              {space.memberIds.length} members
            </SectionTitle>
            <div className="card divide-y divide-line">
              {space.memberIds.map((mid) => {
                const u = userMap.get(mid)
                if (!u) return null
                return (
                  <div key={mid} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar user={u} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/people/${u.id}`} className="truncate text-[13px] font-semibold text-ink hover:text-brand-600 dark:hover:text-brand-300">{u.name}</Link>
                      <p className="truncate text-2xs text-faint">{u.title}</p>
                    </div>
                    {space.createdBy === mid && <Badge className="bg-brand-500/12 text-brand-600 dark:text-brand-300">Creator</Badge>}
                    <button
                      onClick={() => { leaveSpace(space.id, mid); toast.info('Member removed') }}
                      className="shrink-0 text-faint hover:text-rose-500"
                      aria-label="Remove member"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="card p-4">
              <Field label="Visibility" hint="Open spaces can be joined by anyone in the workspace.">
                <Select
                  value={space.visibility}
                  onChange={(e) => { updateSpace(space.id, { visibility: e.target.value as any }); toast.success('Visibility updated') }}
                  className="max-w-xs"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="secret">Secret</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="card p-4">
            <ActivityFeed activities={activities} userMap={userMap} emptyMessage="Nothing has happened in this space yet." />
          </div>
        )}
      </div>

      <NewDocModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (title, icon, kind) => {
          const doc = await createDoc({ title, icon, kind, spaceId: space.id, authorId: actorId })
          toast.success('Doc created')
          navigate(`/app/docs/${doc.id}`)
        }}
      />
    </div>
  )
}

export function NewDocModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (title: string, icon: string, kind: Doc['kind']) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState(DOC_ICONS[0])
  const [kind, setKind] = useState<Doc['kind']>('doc')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New doc"
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="file-text"
            disabled={!title.trim()}
            onClick={async () => { await onCreate(title.trim(), icon, kind); setTitle(''); onClose() }}
          >
            Create doc
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Title" required><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. RFC-021: Event bus" /></Field>
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as Doc['kind'])}>
            <option value="doc">Doc</option>
            <option value="spec">Spec / RFC</option>
            <option value="decision">Decision record</option>
            <option value="runbook">Runbook</option>
            <option value="meeting">Meeting notes</option>
            <option value="retro">Retro</option>
          </Select>
        </Field>
        <Field label="Icon">
          <div className="flex flex-wrap gap-1.5">
            {DOC_ICONS.map((e) => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition hover:bg-sunken ${icon === e ? 'border-brand-500 bg-brand-500/10' : 'border-line'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}
