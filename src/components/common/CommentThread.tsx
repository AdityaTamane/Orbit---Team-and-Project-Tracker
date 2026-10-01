import clsx from 'clsx'
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { EMOJI_REACTIONS } from '@/lib/constants'
import { fmtRelative } from '@/lib/format'
import { addComment, deleteComment, editComment, resolveComment, toggleReaction } from '@/lib/comments'
import { toast } from '@/lib/store'
import type { Comment, EntityType, User } from '@/lib/types'
import { MarkdownEditor, MarkdownView } from './Markdown'

export interface CommentThreadProps {
  entityType: EntityType
  entityId: string
  entityLabel: string
  link: string
  comments: Comment[]
  users: User[]
  userMap: Map<string, User>
  currentUserId: string
  subscriberIds?: string[]
  projectId?: string
  teamId?: string
}

export function CommentThread({
  entityType, entityId, entityLabel, link, comments, users, userMap, currentUserId,
  subscriberIds, projectId, teamId,
}: CommentThreadProps) {
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const roots = comments.filter((c) => !c.parentId)
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id)

  const post = async (body: string, parentId?: string) => {
    if (!body.trim()) return
    setBusy(true)
    try {
      await addComment({
        entityType, entityId, entityLabel, link, body, parentId,
        authorId: currentUserId, users, subscriberIds, projectId, teamId,
      })
      if (parentId) { setReplyDraft(''); setReplyTo(null) } else setDraft('')
    } finally {
      setBusy(false)
    }
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const author = comment.authorId === 'automation'
      ? { id: 'automation', name: 'Automation', avatarColor: '#6c62f2', title: 'Rules engine' } as User
      : userMap.get(comment.authorId)
    const isMine = comment.authorId === currentUserId
    const replies = isReply ? [] : repliesOf(comment.id)

    return (
      <div key={comment.id} className={clsx(isReply && 'ml-10 border-l-2 border-line pl-4')}>
        <div className={clsx('group rounded-lg px-1 py-2', comment.resolved && 'opacity-60')}>
          <div className="flex items-start gap-2.5">
            {comment.authorId === 'automation'
              ? <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300"><Icon name="bot" size={15} /></span>
              : <Avatar user={author} size="md" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-semibold text-ink">{author?.name ?? 'Someone'}</span>
                <span className="text-xs text-faint">{fmtRelative(comment.createdAt)}</span>
                {comment.editedAt && <span className="text-xs text-faint">· edited</span>}
                {comment.resolved && <span className="chip bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"><Icon name="check" size={10} />Resolved</span>}

                <div className="ml-auto flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <Popover width={188} align="end" trigger={({ toggle, ref }) => (
                    <button ref={ref as any} onClick={toggle} className="grid h-6 w-6 place-items-center rounded text-faint hover:bg-sunken hover:text-ink" aria-label="React">
                      <Icon name="smile" size={13} />
                    </button>
                  )}>
                    {(close) => (
                      <div className="flex flex-wrap gap-1 p-2">
                        {EMOJI_REACTIONS.map((e) => (
                          <button key={e} onClick={() => { toggleReaction(comment.id, e, currentUserId); close() }} className="grid h-8 w-8 place-items-center rounded-md text-base hover:bg-sunken">{e}</button>
                        ))}
                      </div>
                    )}
                  </Popover>
                  {!isReply && (
                    <button onClick={() => { setReplyTo(comment.id); setReplyDraft('') }} className="grid h-6 w-6 place-items-center rounded text-faint hover:bg-sunken hover:text-ink" aria-label="Reply">
                      <Icon name="reply" size={13} />
                    </button>
                  )}
                  <Popover width={180} align="end" trigger={({ toggle, ref }) => (
                    <button ref={ref as any} onClick={toggle} className="grid h-6 w-6 place-items-center rounded text-faint hover:bg-sunken hover:text-ink" aria-label="More">
                      <Icon name="more-horizontal" size={13} />
                    </button>
                  )}>
                    {(close) => (
                      <div className="py-1">
                        <MenuItem icon={<Icon name="check" size={14} />} onClick={() => { resolveComment(comment.id, !comment.resolved); close() }}>
                          {comment.resolved ? 'Unresolve' : 'Mark resolved'}
                        </MenuItem>
                        {isMine && (
                          <MenuItem icon={<Icon name="pen" size={14} />} onClick={() => { setEditing(comment.id); setEditDraft(comment.body); close() }}>Edit</MenuItem>
                        )}
                        {isMine && (
                          <MenuItem danger icon={<Icon name="trash" size={14} />} onClick={() => { deleteComment(comment.id); toast.success('Comment deleted'); close() }}>Delete</MenuItem>
                        )}
                      </div>
                    )}
                  </Popover>
                </div>
              </div>

              {editing === comment.id ? (
                <div className="mt-2 space-y-2">
                  <MarkdownEditor value={editDraft} onChange={setEditDraft} minHeight={90} compact autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={async () => { await editComment(comment.id, editDraft); setEditing(null) }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-[14px] leading-6 text-ink [&_.mention]:font-semibold [&_.mention]:text-brand-600 dark:[&_.mention]:text-brand-300">
                  <MarkdownView body={comment.body} className="!text-[14px]" />
                </div>
              )}

              {Object.keys(comment.reactions).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(comment.reactions).map(([emoji, userIds]) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(comment.id, emoji, currentUserId)}
                      title={userIds.map((id) => userMap.get(id)?.name ?? 'Someone').join(', ')}
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition',
                        userIds.includes(currentUserId) ? 'border-brand-500/50 bg-brand-500/12 text-brand-600 dark:text-brand-300' : 'border-line hover:bg-sunken',
                      )}
                    >
                      <span>{emoji}</span>
                      <span className="font-semibold tabular-nums">{userIds.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {replies.map((r) => renderComment(r, true))}

        {replyTo === comment.id && (
          <div className="ml-10 space-y-2 pb-3 pl-4">
            <MarkdownEditor value={replyDraft} onChange={setReplyDraft} minHeight={80} compact autoFocus placeholder="Reply…" onSubmit={() => post(replyDraft, comment.id)} />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" loading={busy} onClick={() => post(replyDraft, comment.id)}>Reply</Button>
              <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="divide-y divide-line">
        {roots.map((c) => renderComment(c))}
      </div>
      {!roots.length && <p className="py-4 text-sm text-faint">No comments yet. Start the conversation.</p>}

      <div className="mt-4 space-y-2">
        <MarkdownEditor
          value={draft}
          onChange={setDraft}
          minHeight={92}
          placeholder="Add a comment… use @name to notify someone. ⌘↵ to send."
          onSubmit={() => post(draft)}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-faint">Mentions notify people instantly.</p>
          <Button size="sm" variant="primary" icon="send" loading={busy} disabled={!draft.trim()} onClick={() => post(draft)}>Comment</Button>
        </div>
      </div>
    </div>
  )
}
