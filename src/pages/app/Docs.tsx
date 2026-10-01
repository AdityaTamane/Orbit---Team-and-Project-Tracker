import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Input, Segmented, Select } from '@/components/ui/form'
import { PageHeader, SectionTitle } from '@/components/ui/misc'
import { NewDocModal } from './SpaceDetail'
import { useDocs, useLookups, useSpaces } from '@/hooks/useData'
import { useActorId } from '@/lib/auth'
import { createDoc } from '@/lib/docs'
import { fmtRelative } from '@/lib/format'
import { stripMarkdown } from '@/lib/markdown'
import { toast } from '@/lib/store'
import type { Doc } from '@/lib/types'

export function Docs() {
  const navigate = useNavigate()
  const actorId = useActorId()
  const docs = useDocs()
  const spaces = useSpaces()
  const { userMap, projects } = useLookups()
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState('')
  const [kind, setKind] = useState<string>('all')
  const [spaceId, setSpaceId] = useState<string>('all')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (params.get('new') === '1') {
      setCreating(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const seedProjectId = params.get('project') ?? undefined
  const seedSpaceId = params.get('space') ?? undefined

  const visible = useMemo(() => docs
    .filter((d) => (kind === 'all' ? true : d.kind === kind))
    .filter((d) => (spaceId === 'all' ? true : d.spaceId === spaceId))
    .filter((d) => !q.trim() || `${d.title} ${d.body} ${d.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  [docs, kind, spaceId, q])

  const pinned = visible.filter((d) => d.pinned)

  const DocCard = ({ doc }: { doc: Doc }) => {
    const space = spaces.find((s) => s.id === doc.spaceId)
    const project = projects.find((p) => p.id === doc.projectId)
    return (
      <Link to={`/app/docs/${doc.id}`} className="card card-hover flex flex-col p-4">
        <div className="flex items-start gap-2.5">
          <span className="text-xl">{doc.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold text-ink">{doc.title}</h3>
              {doc.pinned && <Icon name="pin" size={11} className="shrink-0 text-amber-500" />}
            </div>
            <p className="text-2xs capitalize text-faint">{doc.kind}{doc.status === 'draft' ? ' · draft' : ''}</p>
          </div>
        </div>
        <p className="mt-2 line-clamp-3 flex-1 text-xs leading-5 text-muted">{stripMarkdown(doc.body, 200)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {space && <Badge className="bg-sunken text-muted">{space.icon} {space.name}</Badge>}
          {project && <Badge style={{ background: `${project.color}18`, color: project.color }}>{project.icon} {project.name}</Badge>}
          {doc.tags.slice(0, 2).map((t) => <Badge key={t} className="bg-sunken text-faint">#{t}</Badge>)}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
          <Avatar user={userMap.get(doc.authorId)} size="xs" />
          <span className="truncate text-2xs text-faint">{userMap.get(doc.authorId)?.name} · {fmtRelative(doc.updatedAt)}</span>
        </div>
      </Link>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Docs"
        subtitle="Specs, decisions, runbooks and retros — the written record that outlives the meeting."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="file-text" size={19} /></span>}
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New doc</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 sm:px-6">
        <Input icon="search" placeholder="Search docs…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-full !text-[13px] sm:w-64" />
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="h-8 w-auto !text-[13px]">
          <option value="all">All types</option>
          <option value="doc">Doc</option>
          <option value="spec">Spec / RFC</option>
          <option value="decision">Decision</option>
          <option value="runbook">Runbook</option>
          <option value="meeting">Meeting</option>
          <option value="retro">Retro</option>
        </Select>
        <Select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className="h-8 w-auto !text-[13px]">
          <option value="all">All spaces</option>
          {spaces.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs tabular-nums text-faint">{visible.length} docs</span>
          <Segmented size="sm" value={layout} onChange={setLayout} options={[{ value: 'grid', icon: 'layout-grid', title: 'Cards' }, { value: 'list', icon: 'layout-list', title: 'List' }]} />
        </div>
      </div>

      <div className="space-y-6 px-4 py-5 sm:px-6">
        {!visible.length ? (
          <EmptyState
            icon={<Icon name="file-text" size={20} />}
            title="Nothing here"
            description={q ? 'No docs match that search.' : 'Write the first doc — a decision worth keeping outlives the thread it came from.'}
            action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New doc</Button>}
          />
        ) : layout === 'grid' ? (
          <>
            {pinned.length > 0 && (
              <section>
                <SectionTitle>Pinned</SectionTitle>
                <div className="grid gap-3 grid-dense-cols">{pinned.map((d) => <DocCard key={d.id} doc={d} />)}</div>
              </section>
            )}
            <section>
              {pinned.length > 0 && <SectionTitle>All docs</SectionTitle>}
              <div className="grid gap-3 grid-dense-cols">{visible.filter((d) => !d.pinned).map((d) => <DocCard key={d.id} doc={d} />)}</div>
            </section>
          </>
        ) : (
          <div className="card divide-y divide-line">
            {visible.map((doc) => {
              const space = spaces.find((s) => s.id === doc.spaceId)
              return (
                <Link key={doc.id} to={`/app/docs/${doc.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-sunken/60">
                  <span className="text-base">{doc.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{doc.title}</span>
                      {doc.pinned && <Icon name="pin" size={11} className="text-amber-500" />}
                      {doc.status === 'draft' && <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300">Draft</Badge>}
                    </span>
                    <span className="block truncate text-2xs text-faint">{stripMarkdown(doc.body, 110)}</span>
                  </span>
                  {space && <Badge className="hidden shrink-0 bg-sunken text-muted sm:inline-flex">{space.icon} {space.name}</Badge>}
                  <span className="hidden w-24 shrink-0 text-right text-2xs text-faint lg:block">{fmtRelative(doc.updatedAt)}</span>
                  <Avatar user={userMap.get(doc.authorId)} size="xs" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <NewDocModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (title, icon, docKind) => {
          const doc = await createDoc({
            title, icon, kind: docKind, authorId: actorId,
            spaceId: seedSpaceId, projectId: seedProjectId,
          })
          toast.success('Doc created')
          navigate(`/app/docs/${doc.id}`)
        }}
      />
    </div>
  )
}
