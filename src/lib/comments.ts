import { db, now, uid } from './db'
import { logActivity, notifyMany } from './activity'
import { extractMentions, stripMarkdown } from './markdown'
import type { Comment, EntityType, User } from './types'

export async function addComment(input: {
  entityType: EntityType
  entityId: string
  entityLabel: string
  authorId: string
  body: string
  parentId?: string
  link: string
  users: User[]
  subscriberIds?: string[]
  projectId?: string
  teamId?: string
}): Promise<Comment> {
  const mentionIds = extractMentions(input.body, input.users)
  const comment: Comment = {
    id: uid('cm'),
    entityType: input.entityType,
    entityId: input.entityId,
    parentId: input.parentId,
    authorId: input.authorId,
    body: input.body.trim(),
    mentionIds,
    reactions: {},
    resolved: false,
    createdAt: now(),
  }
  await db.comments.add(comment)

  await logActivity({
    actorId: input.authorId, verb: 'commented on', entityType: input.entityType,
    entityId: input.entityId, entityLabel: input.entityLabel,
    projectId: input.projectId, teamId: input.teamId, meta: { preview: stripMarkdown(comment.body, 90) },
  })

  if (mentionIds.length) {
    await notifyMany(mentionIds, {
      actorId: input.authorId, kind: 'mention',
      title: `You were mentioned on ${input.entityLabel}`,
      body: stripMarkdown(comment.body, 110),
      link: input.link, entityType: input.entityType, entityId: input.entityId,
    })
  }
  const others = (input.subscriberIds ?? []).filter((id) => id !== input.authorId && !mentionIds.includes(id))
  if (others.length) {
    await notifyMany(others, {
      actorId: input.authorId, kind: 'comment',
      title: `New comment on ${input.entityLabel}`,
      body: stripMarkdown(comment.body, 110),
      link: input.link, entityType: input.entityType, entityId: input.entityId,
    })
  }
  return comment
}

export async function editComment(id: string, body: string): Promise<void> {
  await db.comments.update(id, { body, editedAt: now() })
}

export async function deleteComment(id: string): Promise<void> {
  const replies = await db.comments.where('parentId').equals(id).toArray()
  await db.comments.bulkDelete(replies.map((r) => r.id))
  await db.comments.delete(id)
}

export async function toggleReaction(commentId: string, emoji: string, userId: string): Promise<void> {
  const comment = await db.comments.get(commentId)
  if (!comment) return
  const current = comment.reactions[emoji] ?? []
  const next = current.includes(userId) ? current.filter((u) => u !== userId) : [...current, userId]
  const reactions = { ...comment.reactions }
  if (next.length) reactions[emoji] = next
  else delete reactions[emoji]
  await db.comments.update(commentId, { reactions })
}

export async function resolveComment(id: string, resolved: boolean): Promise<void> {
  await db.comments.update(id, { resolved })
}
