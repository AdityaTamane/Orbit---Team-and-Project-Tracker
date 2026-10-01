import { db, now, uid } from './db'
import { logActivity, notifyMany } from './activity'
import { stripMarkdown } from './markdown'
import type { Doc, Space } from './types'

export async function createDoc(input: {
  title: string
  icon: string
  kind: Doc['kind']
  body?: string
  spaceId?: string
  projectId?: string
  parentId?: string
  authorId: string
  tags?: string[]
  status?: Doc['status']
}): Promise<Doc> {
  const doc: Doc = {
    id: uid('dc'),
    title: input.title.trim() || 'Untitled',
    icon: input.icon,
    kind: input.kind,
    body: input.body ?? '',
    spaceId: input.spaceId,
    projectId: input.projectId,
    parentId: input.parentId,
    status: input.status ?? 'draft',
    authorId: input.authorId,
    collaboratorIds: [],
    tags: input.tags ?? [],
    pinned: false,
    createdAt: now(),
    updatedAt: now(),
    versions: [],
  }
  await db.docs.add(doc)
  await logActivity({
    actorId: input.authorId, verb: 'created', entityType: 'doc', entityId: doc.id,
    entityLabel: doc.title, projectId: doc.projectId, meta: { icon: doc.icon },
  })
  return doc
}

/** Saves a doc, keeping the previous body as a version (last 20 kept). */
export async function saveDoc(id: string, patch: Partial<Doc>, actorId: string): Promise<void> {
  const doc = await db.docs.get(id)
  if (!doc) return

  const bodyChanged = patch.body !== undefined && patch.body !== doc.body
  const versions = bodyChanged
    ? [{ at: doc.updatedAt, byId: doc.authorId, body: doc.body }, ...doc.versions].slice(0, 20)
    : doc.versions

  const collaboratorIds = [...new Set([...doc.collaboratorIds, actorId])].filter((u) => u !== doc.authorId)

  await db.docs.update(id, { ...patch, versions, collaboratorIds, updatedAt: now() })

  if (bodyChanged || patch.title) {
    await logActivity({
      actorId, verb: 'edited', entityType: 'doc', entityId: id,
      entityLabel: patch.title ?? doc.title, projectId: doc.projectId,
      meta: { preview: stripMarkdown(patch.body ?? doc.body, 90) },
    })
  }
}

export async function publishDoc(id: string, actorId: string, memberIds: string[]): Promise<void> {
  const doc = await db.docs.get(id)
  if (!doc) return
  await db.docs.update(id, { status: 'published', updatedAt: now() })
  await logActivity({
    actorId, verb: 'published', entityType: 'doc', entityId: id,
    entityLabel: doc.title, projectId: doc.projectId, meta: { icon: doc.icon },
  })
  await notifyMany(memberIds.filter((m) => m !== actorId), {
    actorId, kind: 'system', title: `New doc: ${doc.title}`,
    body: stripMarkdown(doc.body, 110), link: `/app/docs/${id}`,
    entityType: 'doc', entityId: id,
  })
}

export async function restoreDocVersion(id: string, index: number, actorId: string): Promise<void> {
  const doc = await db.docs.get(id)
  if (!doc || !doc.versions[index]) return
  await saveDoc(id, { body: doc.versions[index].body }, actorId)
}

export async function deleteDoc(id: string): Promise<void> {
  const children = await db.docs.where('parentId').equals(id).toArray()
  await Promise.all(children.map((c) => db.docs.update(c.id, { parentId: undefined })))
  const comments = await db.comments.where('[entityType+entityId]').equals(['doc', id]).toArray()
  await db.comments.bulkDelete(comments.map((c) => c.id))
  await db.docs.delete(id)
}

export async function toggleDocPin(id: string): Promise<void> {
  const doc = await db.docs.get(id)
  if (doc) await db.docs.update(id, { pinned: !doc.pinned })
}

/* ── Spaces ─────────────────────────────────────────────────── */

export async function createSpace(input: {
  name: string
  description: string
  icon: string
  color: string
  kind: Space['kind']
  teamId?: string
  visibility: Space['visibility']
  memberIds: string[]
  actorId: string
}): Promise<Space> {
  const space: Space = {
    id: uid('sp'), name: input.name.trim(), description: input.description,
    icon: input.icon, color: input.color, kind: input.kind, teamId: input.teamId,
    visibility: input.visibility,
    memberIds: [...new Set([input.actorId, ...input.memberIds])],
    createdBy: input.actorId, createdAt: now(),
  }
  await db.spaces.add(space)
  await logActivity({
    actorId: input.actorId, verb: 'created', entityType: 'space', entityId: space.id,
    entityLabel: space.name, teamId: input.teamId, meta: { icon: space.icon },
  })
  await notifyMany(space.memberIds, {
    actorId: input.actorId, kind: 'invite', title: `New space: ${space.name}`,
    body: space.description || 'You have been added to a shared space.',
    link: `/app/spaces/${space.id}`, entityType: 'space', entityId: space.id,
  })
  return space
}

export async function updateSpace(id: string, patch: Partial<Space>): Promise<void> {
  await db.spaces.update(id, patch)
}

export async function joinSpace(id: string, userId: string): Promise<void> {
  const space = await db.spaces.get(id)
  if (!space || space.memberIds.includes(userId)) return
  await db.spaces.update(id, { memberIds: [...space.memberIds, userId] })
}

export async function leaveSpace(id: string, userId: string): Promise<void> {
  const space = await db.spaces.get(id)
  if (!space) return
  await db.spaces.update(id, { memberIds: space.memberIds.filter((m) => m !== userId) })
}

export async function deleteSpace(id: string): Promise<void> {
  const docs = await db.docs.where('spaceId').equals(id).toArray()
  await Promise.all(docs.map((d) => db.docs.update(d.id, { spaceId: undefined })))
  await db.spaces.delete(id)
}
