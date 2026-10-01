import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover'
import { Input, Select } from '@/components/ui/form'
import { SectionTitle } from '@/components/ui/misc'
import { CommentThread } from '@/components/common/CommentThread'
import { MarkdownEditor, MarkdownView } from '@/components/common/Markdown'
import { useComments, useDoc, useDocs, useLookups, useSpaces } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { deleteDoc, publishDoc, restoreDocVersion, saveDoc, toggleDocPin } from '@/lib/docs'
import { fmtDateTime, fmtRelative } from '@/lib/format'
import { toast, useRecents } from '@/lib/store'

export function DocDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actorId = useActorId()

  const doc = useDoc(id)
  const docs = useDocs()
  const spaces = useSpaces()
  const { users, userMap, projects } = useLookups()
  const comments = useComments('doc', id)
  const visit = useRecents((s) => s.visit)

  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [history, setHistory] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagDraft, setTagDraft] = useState('')

  useEffect(() => {
    if (doc) {
      setBody(doc.body)
      setTitle(doc.title)
      visit({ id: doc.id, label: doc.title, sublabel: 'Doc', link: `/app/docs/${doc.id}`, icon: doc.icon })
    }
  }, [doc?.id, doc?.body, doc?.title, visit])

  const related = useMemo(
    () => docs.filter((d) => d.id !== id && (d.spaceId === doc?.spaceId || d.projectId === doc?.projectId)).slice(0, 5),
    [docs, doc, id],
  )

  const outline = useMemo(() => {
    const rows: { level: number; text: string }[] = []
    for (const line of (doc?.body ?? '').split('\n')) {
      const m = /^(#{1,3})\s+(.*)$/.exec(line)
      if (m) rows.push({ level: m[1].length, text: m[2] })
    }
    return rows
  }, [doc?.body])

  if (!doc) {
    return (
      <div className="p-6">
        <EmptyState icon={<Icon name="file-text" size={20} />} title="Doc not found" action={<Button variant="primary" onClick={() => navigate('/app/docs')}>All docs</Button>} />
      </div>
    )
  }

  const space = spaces.find((s) => s.id === doc.spaceId)
  const project = projects.find((p) => p.id === doc.projectId)
  const author = userMap.get(doc.authorId)

  return (
    <div className="pb-10">
      {/* Toolbar */}
      <div className="sticky top-14 z-30 flex flex-wrap items-center gap-2 border-b border-line glass px-4 py-2 sm:px-6">
        <button onClick={() => navigate(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink" aria-label="Back">
          <Icon name="arrow-left" size={16} />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <Link to="/app/docs" className="hover:text-ink">Docs</Link>
          {space && (
            <>
              <Icon name="chevron-right" size={12} className="text-faint" />
              <Link to={`/app/spaces/${space.id}`} className="flex min-w-0 items-center gap-1 hover:text-ink">
                {space.icon} <span className="truncate">{space.name}</span>
              </Link>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {doc.status === 'draft' && (
            <Button
              size="sm"
              variant="outline"
              icon="send"
              onClick={async () => {
                await publishDoc(doc.id, actorId, space?.memberIds ?? [])
                toast.success('Published — space members notified')
              }}
            >
              Publish
            </Button>
          )}
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setBody(doc.body); setTitle(doc.title); setEditing(false) }}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                icon="save"
                onClick={async () => { await saveDoc(doc.id, { title, body }, actorId); setEditing(false); toast.success('Saved') }}
              >
                Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" icon="pen" onClick={() => setEditing(true)}>Edit</Button>
          )}
          <Popover
            width={220}
            trigger={({ toggle, ref }) => (
              <button ref={ref as any} onClick={toggle} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink" aria-label="Doc actions">
                <Icon name="more-horizontal" size={16} />
              </button>
            )}
          >
            {(close) => (
              <div className="py-1">
                <MenuItem icon={<Icon name="pin" size={14} />} onClick={() => { toggleDocPin(doc.id); close() }}>{doc.pinned ? 'Unpin' : 'Pin to space'}</MenuItem>
                <MenuItem icon={<Icon name="history" size={14} />} onClick={() => { setHistory(true); close() }}>Version history ({doc.versions.length})</MenuItem>
                <MenuItem icon={<Icon name="copy" size={14} />} onClick={() => { navigator.clipboard?.writeText(doc.body); toast.success('Markdown copied'); close() }}>Copy as Markdown</MenuItem>
                <MenuItem icon={<Icon name="download" size={14} />} onClick={() => { window.print(); close() }}>Print / save as PDF</MenuItem>
                <MenuDivider />
                <MenuItem danger icon={<Icon name="trash" size={14} />} onClick={() => { setConfirmDelete(true); close() }}>Delete doc</MenuItem>
              </div>
            )}
          </Popover>
        </div>
      </div>

      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="min-w-0 print-area">
          <div className="mb-4 flex items-start gap-3">
            <span className="text-3xl">{doc.icon}</span>
            <div className="min-w-0 flex-1">
              {editing ? (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="!text-2xl font-bold" />
              ) : (
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{doc.title}</h1>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-sunken capitalize text-muted">{doc.kind}</Badge>
                {doc.status === 'draft' && <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300">Draft</Badge>}
                {project && (
                  <Link to={`/app/projects/${project.id}`} className="chip" style={{ background: `${project.color}18`, color: project.color }}>
                    {project.icon} {project.name}
                  </Link>
                )}
                {doc.tags.map((t) => <Badge key={t} className="bg-sunken text-faint">#{t}</Badge>)}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-faint">
                <Avatar user={author} size="xs" />
                {author?.name}
                <span>· created {fmtDateTime(doc.createdAt)}</span>
                <span>· updated {fmtRelative(doc.updatedAt)}</span>
              </p>
            </div>
          </div>

          {editing ? (
            <MarkdownEditor value={body} onChange={setBody} minHeight={480} onSubmit={async () => { await saveDoc(doc.id, { title, body }, actorId); setEditing(false); toast.success('Saved') }} />
          ) : doc.body.trim() ? (
            <div className="card px-5 py-4 sm:px-7 sm:py-6">
              <MarkdownView body={doc.body} />
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="w-full rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-faint transition hover:border-brand-500/40 hover:text-muted">
              This doc is empty. Click to start writing.
            </button>
          )}

          <div className="mt-8 no-print">
            <SectionTitle>Discussion</SectionTitle>
            <div className="card p-4">
              <CommentThread
                entityType="doc"
                entityId={doc.id}
                entityLabel={doc.title}
                link={`/app/docs/${doc.id}`}
                comments={comments}
                users={users}
                userMap={userMap}
                currentUserId={actorId}
                subscriberIds={[doc.authorId, ...doc.collaboratorIds]}
                projectId={doc.projectId}
              />
            </div>
          </div>
        </article>

        <aside className="space-y-4 no-print lg:sticky lg:top-[104px] lg:self-start">
          {outline.length > 0 && (
            <div className="card p-3.5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">On this page</h3>
              <ul className="space-y-1">
                {outline.map((h, i) => (
                  <li key={`${h.text}-${i}`} className={clsx('truncate text-xs text-muted', h.level === 2 && 'pl-2', h.level === 3 && 'pl-4')}>
                    {h.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-3.5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">Details</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Space</dt>
                <dd>
                  <Select
                    value={doc.spaceId ?? ''}
                    onChange={(e) => saveDoc(doc.id, { spaceId: e.target.value || undefined }, actorId)}
                    className="h-7 w-auto !text-xs"
                  >
                    <option value="">None</option>
                    {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Status</dt>
                <dd>
                  <Select
                    value={doc.status}
                    onChange={(e) => saveDoc(doc.id, { status: e.target.value as any }, actorId)}
                    className="h-7 w-auto !text-xs"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </Select>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Versions</dt>
                <dd><button onClick={() => setHistory(true)} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">{doc.versions.length} saved</button></dd>
              </div>
            </dl>

            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-1.5 text-xs text-muted">Contributors</p>
              <AvatarStack users={[doc.authorId, ...doc.collaboratorIds].map((cid) => userMap.get(cid))} max={6} size="sm" />
            </div>

            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-1.5 text-xs text-muted">Tags</p>
              <div className="flex flex-wrap gap-1">
                {doc.tags.map((t) => (
                  <span key={t} className="chip bg-sunken text-muted">
                    #{t}
                    <button onClick={() => saveDoc(doc.id, { tags: doc.tags.filter((x) => x !== t) }, actorId)} aria-label={`Remove ${t}`}>
                      <Icon name="x" size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagDraft.trim()) {
                    saveDoc(doc.id, { tags: [...new Set([...doc.tags, tagDraft.trim()])] }, actorId)
                    setTagDraft('')
                  }
                }}
                placeholder="Add a tag…"
                className="mt-2 h-7 !text-xs"
              />
            </div>
          </div>

          {related.length > 0 && (
            <div className="card p-3.5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">Related</h3>
              <ul className="space-y-1.5">
                {related.map((d) => (
                  <li key={d.id}>
                    <Link to={`/app/docs/${d.id}`} className="flex items-center gap-2 text-xs text-muted hover:text-ink">
                      <span>{d.icon}</span>
                      <span className="truncate">{d.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <Modal open={history} onClose={() => setHistory(false)} title="Version history" subtitle="The last 20 saves are kept." width="lg">
        <div className="divide-y divide-line">
          {doc.versions.length ? doc.versions.map((v, i) => (
            <div key={`${v.at}-${i}`} className="flex items-start gap-3 px-5 py-3">
              <Avatar user={userMap.get(v.byId)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{userMap.get(v.byId)?.name ?? 'Someone'}</p>
                <p className="text-2xs text-faint">{fmtDateTime(v.at)}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{v.body.slice(0, 200)}</p>
              </div>
              <Button
                size="xs"
                variant="secondary"
                icon="rotate-ccw"
                onClick={async () => { await restoreDocVersion(doc.id, i, actorId); setHistory(false); toast.success('Version restored') }}
              >
                Restore
              </Button>
            </div>
          )) : (
            <p className="px-5 py-8 text-center text-sm text-faint">No previous versions yet — they appear once the body changes.</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => { await deleteDoc(doc.id); toast.success('Doc deleted'); navigate('/app/docs') }}
        title={`Delete "${doc.title}"?`}
        message="The doc, its versions and its comments are removed. This cannot be undone."
        confirmLabel="Delete doc"
        danger
      />
    </div>
  )
}
