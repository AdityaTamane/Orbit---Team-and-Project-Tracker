import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover'
import { Field, Input, Select } from '@/components/ui/form'
import { Collapsible, Tabs } from '@/components/ui/misc'
import { ActivityFeed } from '@/components/common/ActivityFeed'
import { CommentThread } from '@/components/common/CommentThread'
import { MarkdownEditor, MarkdownView } from '@/components/common/Markdown'
import { CreateIssueModal } from '@/components/issue/CreateIssueModal'
import { DueChip, IssueKey, PriorityIcon, StateIcon, TypeBadge } from '@/components/issue/atoms'
import {
  AssigneePicker, CyclePicker, DateField, EstimatePicker, LabelPicker, MilestonePicker,
  PriorityPicker, ProjectPicker, StatePicker, TypePicker,
} from '@/components/issue/pickers'
import {
  useActivities, useComments, useCycles, useIssue, useIssueLinks, useIssues, useLookups,
  useMilestones, useStates, useSubIssues, useTimeLogs,
} from '@/hooks/useData'
import { useActorId, useAuth } from '@/lib/auth'
import { fmtDateTime, fmtHours, fmtRelative } from '@/lib/format'
import {
  addChecklistItem, archiveIssue, deleteIssue, deleteTimeLog, linkIssues, logTime,
  removeChecklistItem, toggleChecklistItem, unlinkIssues, updateIssue,
} from '@/lib/issues'
import { toast } from '@/lib/store'
import { useRecents } from '@/lib/store'
import type { LinkType } from '@/lib/types'

const LINK_LABEL: Record<LinkType, string> = {
  blocks: 'Blocks',
  blocked_by: 'Blocked by',
  relates_to: 'Related to',
  duplicates: 'Duplicates',
}

export function IssueDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actorId = useActorId()
  const { user } = useAuth()

  const issue = useIssue(id)
  const allIssues = useIssues()
  const { users, userMap, projects, labels, labelMap, teams, projectMap } = useLookups()
  const states = useStates(issue?.teamId)
  const cycles = useCycles(issue?.teamId)
  const milestones = useMilestones(issue?.projectId)
  const subIssues = useSubIssues(id)
  const links = useIssueLinks(id)
  const comments = useComments('issue', id)
  const activities = useActivities(40, { entityId: id })
  const timeLogs = useTimeLogs(id)
  const visit = useRecents((s) => s.visit)

  const [tab, setTab] = useState<'comments' | 'activity'>('comments')
  const [editingDescription, setEditingDescription] = useState(false)
  const [draft, setDraft] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [creatingSub, setCreatingSub] = useState(false)
  const [linking, setLinking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loggingTime, setLoggingTime] = useState(false)

  useEffect(() => {
    if (issue) {
      setDraft(issue.description)
      setTitleDraft(issue.title)
      visit({ id: issue.id, label: issue.title, sublabel: issue.key, link: `/app/issues/${issue.id}` })
    }
  }, [issue?.id, issue?.description, issue?.title, visit])

  const linkedIssues = useMemo(() => {
    const byId = new Map(allIssues.map((i) => [i.id, i]))
    return links.map((link) => {
      const isOutgoing = link.fromId === id
      const other = byId.get(isOutgoing ? link.toId : link.fromId)
      const type: LinkType = link.type === 'blocks' ? (isOutgoing ? 'blocks' : 'blocked_by') : link.type
      return { link, other, type }
    }).filter((x) => x.other)
  }, [links, allIssues, id])

  const totalMinutes = timeLogs.reduce((s, l) => s + l.minutes, 0)

  if (!issue) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Icon name="search" size={20} />}
          title="Issue not found"
          description="It may have been deleted, or the link is stale."
          action={<Button variant="primary" onClick={() => navigate('/app/issues')}>Back to issues</Button>}
        />
      </div>
    )
  }

  const state = states.find((s) => s.id === issue.stateId)
  const project = issue.projectId ? projectMap.get(issue.projectId) : undefined
  const team = teams.find((t) => t.id === issue.teamId)
  const parent = issue.parentId ? allIssues.find((i) => i.id === issue.parentId) : undefined
  const patch = (p: Parameters<typeof updateIssue>[1]) => updateIssue(issue.id, p, actorId)
  const isSubscribed = !!user && issue.subscriberIds.includes(user.id)
  const doneSubs = subIssues.filter((s) => states.find((st) => st.id === s.stateId)?.category === 'completed').length

  return (
    <div className="pb-10">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 sm:px-6">
        <button onClick={() => navigate(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink" aria-label="Back">
          <Icon name="arrow-left" size={16} />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          {team && <Link to={`/app/teams/${team.id}`} className="flex items-center gap-1 hover:text-ink">{team.icon} {team.name}</Link>}
          {project && (
            <>
              <Icon name="chevron-right" size={12} className="text-faint" />
              <Link to={`/app/projects/${project.id}`} className="flex min-w-0 items-center gap-1 hover:text-ink">
                <span>{project.icon}</span><span className="truncate">{project.name}</span>
              </Link>
            </>
          )}
          {parent && (
            <>
              <Icon name="chevron-right" size={12} className="text-faint" />
              <Link to={`/app/issues/${parent.id}`} className="truncate hover:text-ink">{parent.key}</Link>
            </>
          )}
          <Icon name="chevron-right" size={12} className="text-faint" />
          <IssueKey issue={issue} className="!text-xs" />
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant={isSubscribed ? 'subtle' : 'ghost'}
            icon={isSubscribed ? 'eye' : 'bell'}
            onClick={() => {
              if (!user) return
              const next = isSubscribed ? issue.subscriberIds.filter((s) => s !== user.id) : [...issue.subscriberIds, user.id]
              patch({ subscriberIds: next })
              toast.success(isSubscribed ? 'Unsubscribed' : 'Subscribed to updates')
            }}
          >
            {isSubscribed ? 'Following' : 'Follow'}
          </Button>
          <Popover
            width={220}
            trigger={({ toggle, ref }) => (
              <button ref={ref as any} onClick={toggle} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink" aria-label="More actions">
                <Icon name="more-horizontal" size={16} />
              </button>
            )}
          >
            {(close) => (
              <div className="py-1">
                <MenuItem icon={<Icon name="copy" size={14} />} onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#/app/issues/${issue.id}`); toast.success('Link copied'); close() }}>Copy link</MenuItem>
                <MenuItem icon={<Icon name="git-branch" size={14} />} onClick={() => { setCreatingSub(true); close() }}>Add sub-issue</MenuItem>
                <MenuItem icon={<Icon name="link" size={14} />} onClick={() => { setLinking(true); close() }}>Link an issue</MenuItem>
                <MenuItem icon={<Icon name="timer" size={14} />} onClick={() => { setLoggingTime(true); close() }}>Log time</MenuItem>
                <MenuDivider />
                <MenuItem icon={<Icon name="archive" size={14} />} onClick={() => { archiveIssue(issue.id, actorId); toast.success('Issue archived'); close() }}>Archive</MenuItem>
                <MenuItem danger icon={<Icon name="trash" size={14} />} onClick={() => { setConfirmDelete(true); close() }}>Delete</MenuItem>
              </div>
            )}
          </Popover>
        </div>
      </div>

      <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main */}
        <div className="min-w-0">
          {issue.archivedAt && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              <Icon name="archive" size={15} />
              Archived {fmtRelative(issue.archivedAt)}.
              <button className="ml-auto font-semibold underline" onClick={() => patch({ archivedAt: undefined })}>Restore</button>
            </div>
          )}

          <div className="mb-1 flex flex-wrap items-center gap-2">
            <TypePicker value={issue.type} onChange={(type) => patch({ type })} />
            <span className="text-xs text-faint">opened {fmtRelative(issue.createdAt)} by {userMap.get(issue.reporterId)?.name ?? 'someone'}</span>
          </div>

          {editingTitle ? (
            <div className="flex items-start gap-2">
              <textarea
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => { if (titleDraft.trim() && titleDraft !== issue.title) patch({ title: titleDraft.trim() }); setEditingTitle(false) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() }
                  if (e.key === 'Escape') { setTitleDraft(issue.title); setEditingTitle(false) }
                }}
                rows={2}
                className="input !text-xl font-bold leading-tight"
              />
            </div>
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              className="-mx-1 cursor-text rounded px-1 text-xl font-bold leading-snug tracking-tight text-ink transition hover:bg-sunken/60 sm:text-2xl"
              title="Click to edit"
            >
              {issue.title}
            </h1>
          )}

          {/* Description */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-faint">Description</h2>
              {!editingDescription && (
                <button onClick={() => setEditingDescription(true)} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
                  <Icon name="pen" size={12} /> Edit
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className="space-y-2">
                <MarkdownEditor value={draft} onChange={setDraft} minHeight={180} autoFocus onSubmit={() => { patch({ description: draft }); setEditingDescription(false) }} />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => { patch({ description: draft }); setEditingDescription(false); toast.success('Description saved') }}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDraft(issue.description); setEditingDescription(false) }}>Cancel</Button>
                </div>
              </div>
            ) : issue.description.trim() ? (
              <div className="card px-4 py-3"><MarkdownView body={issue.description} /></div>
            ) : (
              <button onClick={() => setEditingDescription(true)} className="w-full rounded-lg border border-dashed border-line px-4 py-6 text-sm text-faint transition hover:border-brand-500/40 hover:text-muted">
                Add a description — context now saves an hour later.
              </button>
            )}
          </div>

          {/* Checklist */}
          <div className="mt-6">
            <Collapsible
              title="Checklist"
              count={issue.checklist.length}
              defaultOpen={issue.checklist.length > 0}
            >
              <div className="space-y-1 pt-1">
                {issue.checklist.map((item) => (
                  <div key={item.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-sunken/60">
                    <button
                      onClick={() => toggleChecklistItem(issue.id, item.id)}
                      className={clsx('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition',
                        item.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line hover:border-faint')}
                    >
                      {item.done && <Icon name="check" size={12} strokeWidth={3} />}
                    </button>
                    <span className={clsx('min-w-0 flex-1 text-sm', item.done ? 'text-faint line-through' : 'text-ink')}>{item.text}</span>
                    <button onClick={() => removeChecklistItem(issue.id, item.id)} className="shrink-0 text-faint opacity-0 transition hover:text-rose-500 group-hover:opacity-100" aria-label="Remove">
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-2 pt-1">
                  <Icon name="plus" size={14} className="text-faint" />
                  <input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newChecklistItem.trim()) {
                        addChecklistItem(issue.id, newChecklistItem.trim())
                        setNewChecklistItem('')
                      }
                    }}
                    placeholder="Add a checklist item and press Enter"
                    className="w-full border-0 bg-transparent py-1 text-base text-ink placeholder:text-faint focus:outline-none sm:text-sm"
                  />
                </div>
              </div>
            </Collapsible>
          </div>

          {/* Sub-issues */}
          <div className="mt-4">
            <Collapsible
              title="Sub-issues"
              count={subIssues.length}
              defaultOpen={subIssues.length > 0}
              action={
                <button onClick={() => setCreatingSub(true)} className="grid h-6 w-6 place-items-center rounded text-faint hover:bg-sunken hover:text-ink" aria-label="Add sub-issue">
                  <Icon name="plus" size={14} />
                </button>
              }
            >
              {subIssues.length > 0 && (
                <>
                  <div className="mb-2 flex items-center gap-2 pt-1">
                    <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(doneSubs / subIssues.length) * 100}%` }} />
                    </div>
                    <span className="text-2xs font-semibold text-muted">{doneSubs}/{subIssues.length} done</span>
                  </div>
                  <div className="divide-y divide-line rounded-lg border border-line">
                    {subIssues.map((sub) => (
                      <Link key={sub.id} to={`/app/issues/${sub.id}`} className="flex items-center gap-2 px-3 py-2 transition hover:bg-sunken/60">
                        <StateIcon state={states.find((s) => s.id === sub.stateId)} />
                        <PriorityIcon priority={sub.priority} />
                        <span className="font-mono text-2xs text-faint">{sub.key}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{sub.title}</span>
                        {sub.assigneeId && <Avatar user={userMap.get(sub.assigneeId)} size="xs" />}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </Collapsible>
          </div>

          {/* Dependencies */}
          <div className="mt-4">
            <Collapsible
              title="Dependencies"
              count={linkedIssues.length}
              defaultOpen={linkedIssues.length > 0}
              action={
                <button onClick={() => setLinking(true)} className="grid h-6 w-6 place-items-center rounded text-faint hover:bg-sunken hover:text-ink" aria-label="Link an issue">
                  <Icon name="plus" size={14} />
                </button>
              }
            >
              {linkedIssues.length > 0 ? (
                <div className="space-y-1 pt-1">
                  {linkedIssues.map(({ link, other, type }) => (
                    <div key={link.id} className="group flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                      <Badge className={clsx('shrink-0', type === 'blocked_by' ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300' : type === 'blocks' ? 'bg-amber-500/12 text-amber-600 dark:text-amber-300' : 'bg-sunken text-muted')}>
                        {LINK_LABEL[type]}
                      </Badge>
                      <StateIcon state={states.find((s) => s.id === other!.stateId)} />
                      <Link to={`/app/issues/${other!.id}`} className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-brand-600 dark:hover:text-brand-300">
                        <span className="font-mono text-2xs text-faint">{other!.key}</span> {other!.title}
                      </Link>
                      <button onClick={() => unlinkIssues(link.id)} className="shrink-0 text-faint opacity-0 transition hover:text-rose-500 group-hover:opacity-100" aria-label="Remove link">
                        <Icon name="unlink" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pt-1 text-xs text-faint">Nothing linked. Dependencies surface on the board as blockers.</p>
              )}
            </Collapsible>
          </div>

          {/* Discussion */}
          <div className="mt-7">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'comments', label: 'Comments', icon: 'message', count: comments.length },
                { value: 'activity', label: 'Activity', icon: 'activity', count: activities.length },
              ]}
            />
            <div className="pt-4">
              {tab === 'comments' ? (
                <CommentThread
                  entityType="issue"
                  entityId={issue.id}
                  entityLabel={issue.key}
                  link={`/app/issues/${issue.id}`}
                  comments={comments}
                  users={users}
                  userMap={userMap}
                  currentUserId={actorId}
                  subscriberIds={issue.subscriberIds}
                  projectId={issue.projectId}
                  teamId={issue.teamId}
                />
              ) : (
                <ActivityFeed activities={activities} userMap={userMap} />
              )}
            </div>
          </div>
        </div>

        {/* Properties */}
        <aside className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">
          <div className="card divide-y divide-line">
            <Row label="Status"><StatePicker states={states} value={issue.stateId} onChange={(stateId) => patch({ stateId })} /></Row>
            <Row label="Priority"><PriorityPicker value={issue.priority} onChange={(priority) => patch({ priority })} /></Row>
            <Row label="Assignee"><AssigneePicker users={users} value={issue.assigneeId} onChange={(assigneeId) => patch({ assigneeId })} /></Row>
            <Row label="Project"><ProjectPicker projects={projects} value={issue.projectId} onChange={(projectId) => patch({ projectId, milestoneId: undefined })} /></Row>
            {milestones.length > 0 && <Row label="Milestone"><MilestonePicker milestones={milestones} value={issue.milestoneId} onChange={(milestoneId) => patch({ milestoneId })} /></Row>}
            {cycles.length > 0 && <Row label="Cycle"><CyclePicker cycles={cycles} value={issue.cycleId} onChange={(cycleId) => patch({ cycleId })} /></Row>}
            <Row label="Estimate"><EstimatePicker value={issue.estimate} onChange={(estimate) => patch({ estimate })} /></Row>
            <Row label="Start"><DateField value={issue.startDate} onChange={(startDate) => patch({ startDate })} label="Start date" icon="play" /></Row>
            <Row label="Due"><DateField value={issue.dueDate} onChange={(dueDate) => patch({ dueDate })} /></Row>
            <Row label="Labels" stack>
              <LabelPicker labels={labels} value={issue.labelIds} onChange={(labelIds) => patch({ labelIds })} />
              {issue.labelIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {issue.labelIds.map((lid) => {
                    const l = labelMap.get(lid)
                    return l ? (
                      <span key={lid} className="chip border" style={{ borderColor: `${l.color}55`, background: `${l.color}18`, color: l.color }}>
                        {l.name}
                        <button onClick={() => patch({ labelIds: issue.labelIds.filter((x) => x !== lid) })} aria-label={`Remove ${l.name}`}>
                          <Icon name="x" size={10} />
                        </button>
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </Row>
          </div>

          {/* Time */}
          <div className="card p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-faint">Time tracked</h3>
              <button onClick={() => setLoggingTime(true)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Log</button>
            </div>
            <p className="text-lg font-bold tabular-nums text-ink">{fmtHours(totalMinutes)}</p>
            {issue.estimate ? (
              <p className="mt-0.5 text-2xs text-faint">Estimated at {issue.estimate} points</p>
            ) : null}
            {timeLogs.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-line pt-2">
                {timeLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="group flex items-center gap-2 text-2xs">
                    <Avatar user={userMap.get(log.userId)} size="xs" />
                    <span className="text-muted">{fmtHours(log.minutes)}</span>
                    <span className="min-w-0 flex-1 truncate text-faint">{log.note}</span>
                    <button onClick={() => deleteTimeLog(log.id)} className="opacity-0 transition hover:text-rose-500 group-hover:opacity-100" aria-label="Delete entry">
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Watchers */}
          <div className="card p-3.5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">Followers</h3>
            {issue.subscriberIds.length ? (
              <AvatarStack users={issue.subscriberIds.map((sid) => userMap.get(sid))} max={6} size="sm" />
            ) : (
              <p className="text-xs text-faint">Nobody is following this yet.</p>
            )}
            <div className="mt-3 space-y-1 border-t border-line pt-2 text-2xs text-faint">
              <p>Created {fmtDateTime(issue.createdAt)}</p>
              <p>Updated {fmtRelative(issue.updatedAt)}</p>
              {issue.completedAt && <p className="text-emerald-500">Completed {fmtRelative(issue.completedAt)}</p>}
              {issue.dueDate && <p className="pt-1"><DueChip due={issue.dueDate} done={state?.category === 'completed'} /></p>}
            </div>
          </div>
        </aside>
      </div>

      <CreateIssueModal
        open={creatingSub}
        onClose={() => setCreatingSub(false)}
        seed={{ teamId: issue.teamId, projectId: issue.projectId, parentId: issue.id, cycleId: issue.cycleId }}
      />

      <LinkIssueModal
        open={linking}
        onClose={() => setLinking(false)}
        currentId={issue.id}
        onLink={async (targetId, type) => {
          if (type === 'blocked_by') await linkIssues(targetId, issue.id, 'blocks')
          else await linkIssues(issue.id, targetId, type === 'blocks' ? 'blocks' : type)
          toast.success('Issues linked')
        }}
      />

      <LogTimeModal
        open={loggingTime}
        onClose={() => setLoggingTime(false)}
        onSave={async (minutes, note, date) => {
          await logTime({ issueId: issue.id, userId: actorId, minutes, note, date })
          toast.success(`${fmtHours(minutes)} logged`)
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => { await deleteIssue(issue.id); toast.success('Issue deleted'); navigate('/app/issues') }}
        title={`Delete ${issue.key}?`}
        message="This removes the issue, its comments and its links. Sub-issues are kept but lose their parent. This cannot be undone."
        confirmLabel="Delete issue"
        danger
      />
    </div>
  )
}

function Row({ label, children, stack }: { label: string; children: React.ReactNode; stack?: boolean }) {
  return (
    <div className={clsx('flex gap-2 px-3.5 py-2.5', stack ? 'flex-col items-start' : 'items-center justify-between')}>
      <span className="shrink-0 text-xs font-medium text-muted">{label}</span>
      <div className={stack ? 'w-full' : ''}>{children}</div>
    </div>
  )
}

function LinkIssueModal({ open, onClose, currentId, onLink }: {
  open: boolean
  onClose: () => void
  currentId: string
  onLink: (targetId: string, type: LinkType) => Promise<void>
}) {
  const issues = useIssues()
  const [q, setQ] = useState('')
  const [type, setType] = useState<LinkType>('blocks')

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    return issues
      .filter((i) => i.id !== currentId && (i.title.toLowerCase().includes(query) || i.key.toLowerCase().includes(query)))
      .slice(0, 8)
  }, [q, issues, currentId])

  return (
    <Modal open={open} onClose={onClose} title="Link an issue" width="md">
      <div className="space-y-3 px-5 py-4">
        <Field label="Relationship">
          <Select value={type} onChange={(e) => setType(e.target.value as LinkType)}>
            <option value="blocks">This blocks…</option>
            <option value="blocked_by">This is blocked by…</option>
            <option value="relates_to">Relates to…</option>
            <option value="duplicates">Duplicates…</option>
          </Select>
        </Field>
        <Field label="Find an issue">
          <Input autoFocus icon="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by key or title…" />
        </Field>
        <div className="divide-y divide-line rounded-lg border border-line">
          {results.map((i) => (
            <button
              key={i.id}
              onClick={async () => { await onLink(i.id, type); onClose(); setQ('') }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-sunken"
            >
              <TypeBadge type={i.type} />
              <span className="font-mono text-2xs text-faint">{i.key}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{i.title}</span>
            </button>
          ))}
          {!results.length && <p className="px-3 py-4 text-center text-xs text-faint">{q ? 'No matches' : 'Start typing to search'}</p>}
        </div>
      </div>
    </Modal>
  )
}

function LogTimeModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (minutes: number, note: string, date: string) => Promise<void>
}) {
  const [hours, setHours] = useState('1')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log time"
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon="timer"
            onClick={async () => {
              const minutes = Math.round(parseFloat(hours || '0') * 60)
              if (minutes > 0) await onSave(minutes, note || 'Work', date)
              setHours('1'); setNote('')
              onClose()
            }}
          >
            Log time
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <Field label="Hours">
          <Input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} autoFocus />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="What did you work on?">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Implementation, review, debugging…" />
        </Field>
      </div>
    </Modal>
  )
}
