import { db, now, uid } from './db'
import type { Activity, EntityType, Notification } from './types'

export async function logActivity(input: {
  actorId: string
  verb: string
  entityType: EntityType
  entityId: string
  entityLabel: string
  projectId?: string
  teamId?: string
  meta?: Record<string, any>
}): Promise<void> {
  const activity: Activity = {
    id: uid('ac'),
    actorId: input.actorId,
    verb: input.verb,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    projectId: input.projectId,
    teamId: input.teamId,
    meta: input.meta ?? {},
    createdAt: now(),
  }
  await db.activities.add(activity)
}

export async function notify(input: {
  userId: string
  actorId?: string
  kind: Notification['kind']
  title: string
  body: string
  link: string
  entityType?: EntityType
  entityId?: string
}): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return // never notify yourself
  await db.notifications.add({
    id: uid('nt'),
    userId: input.userId,
    actorId: input.actorId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    link: input.link,
    entityType: input.entityType,
    entityId: input.entityId,
    read: false,
    createdAt: now(),
  })
}

export async function notifyMany(userIds: string[], input: Omit<Parameters<typeof notify>[0], 'userId'>): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean)
  await Promise.all(unique.map((userId) => notify({ ...input, userId })))
}

export async function markNotificationRead(id: string, read = true): Promise<void> {
  await db.notifications.update(id, { read })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const rows = await db.notifications.where({ userId, read: 0 as any }).toArray().catch(() => [])
  const unread = rows.length ? rows : (await db.notifications.where('userId').equals(userId).toArray()).filter((n) => !n.read)
  await db.notifications.bulkPut(unread.map((n) => ({ ...n, read: true })))
}

export async function clearNotifications(userId: string): Promise<void> {
  const ids = (await db.notifications.where('userId').equals(userId).toArray()).map((n) => n.id)
  await db.notifications.bulkDelete(ids)
}
