import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { PageHeader, Tabs } from '@/components/ui/misc'
import { useLookups, useNotifications } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { clearNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/activity'
import { fmtRelative } from '@/lib/format'
import { toast } from '@/lib/store'
import type { Notification } from '@/lib/types'

const KIND_ICON: Record<Notification['kind'], IconName> = {
  mention: 'at-sign', assign: 'user-plus', comment: 'message', state: 'arrow-right',
  due: 'clock', automation: 'zap', system: 'info', invite: 'users', risk: 'alert-triangle',
}

type Tab = 'all' | 'unread' | 'mention' | 'assign' | 'automation'

export function Inbox() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { userMap } = useLookups()
  const notifications = useNotifications(user?.id)
  const [tab, setTab] = useState<Tab>('all')

  const filtered = useMemo(() => {
    switch (tab) {
      case 'unread': return notifications.filter((n) => !n.read)
      case 'mention': return notifications.filter((n) => n.kind === 'mention' || n.kind === 'comment')
      case 'assign': return notifications.filter((n) => n.kind === 'assign' || n.kind === 'state' || n.kind === 'due')
      case 'automation': return notifications.filter((n) => n.kind === 'automation' || n.kind === 'system' || n.kind === 'risk')
      default: return notifications
    }
  }, [notifications, tab])

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="pb-10">
      <PageHeader
        title="Inbox"
        subtitle={unread ? `${unread} unread` : 'You are all caught up'}
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="inbox" size={19} /></span>}
        actions={
          <>
            <Button variant="secondary" icon="check" disabled={!unread} onClick={() => user && markAllNotificationsRead(user.id)}>Mark all read</Button>
            <Button variant="ghost" icon="trash" onClick={() => { if (user) { clearNotifications(user.id); toast.success('Inbox cleared') } }}>Clear</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'All', count: notifications.length },
              { value: 'unread', label: 'Unread', count: unread },
              { value: 'mention', label: 'Mentions & replies' },
              { value: 'assign', label: 'Assigned to me' },
              { value: 'automation', label: 'System' },
            ]}
          />
        }
      />

      <div className="px-4 py-4 sm:px-6">
        {!filtered.length ? (
          <EmptyState
            icon={<Icon name="bell-off" size={20} />}
            title="Nothing in this view"
            description="Mentions, assignments and automation results land here as they happen."
          />
        ) : (
          <div className="card divide-y divide-line">
            {filtered.map((n) => {
              const actor = n.actorId ? userMap.get(n.actorId) : undefined
              return (
                <button
                  key={n.id}
                  onClick={() => { markNotificationRead(n.id); navigate(n.link) }}
                  className={clsx('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-sunken/60', !n.read && 'bg-brand-500/[0.05]')}
                >
                  <span className="relative shrink-0">
                    {actor ? <Avatar user={actor} size="md" /> : (
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-sunken text-muted"><Icon name={KIND_ICON[n.kind]} size={14} /></span>
                    )}
                    {actor && (
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-surface text-muted ring-1 ring-line">
                        <Icon name={KIND_ICON[n.kind]} size={9} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{n.title}</span>
                      <span className="chip shrink-0 bg-sunken capitalize text-faint">{n.kind}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-6 text-muted">{n.body}</span>
                    <span className="mt-1 block text-2xs text-faint">{fmtRelative(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  <Icon name="chevron-right" size={15} className="mt-1.5 shrink-0 text-faint" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
