import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { Popover } from '@/components/ui/Popover'
import { fmtRelative } from '@/lib/format'
import { clearNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/activity'
import type { Notification, User } from '@/lib/types'

const KIND_ICON: Record<Notification['kind'], IconName> = {
  mention: 'at-sign', assign: 'user-plus', comment: 'message', state: 'arrow-right',
  due: 'clock', automation: 'zap', system: 'info', invite: 'users', risk: 'alert-triangle',
}

const KIND_TONE: Record<Notification['kind'], string> = {
  mention: 'text-brand-500', assign: 'text-sky-500', comment: 'text-emerald-500', state: 'text-amber-500',
  due: 'text-orange-500', automation: 'text-violet-500', system: 'text-slate-400', invite: 'text-teal-500', risk: 'text-rose-500',
}

export function NotificationBell({ notifications, userMap, userId }: {
  notifications: Notification[]
  userMap: Map<string, User>
  userId: string
}) {
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read)

  return (
    <Popover
      width={380}
      sheetOnMobile
      trigger={({ toggle, ref }) => (
        <button
          ref={ref as any}
          onClick={toggle}
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-sunken hover:text-ink"
          aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        >
          <Icon name="bell" size={17} />
          {unread.length > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-surface">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="flex max-h-[70vh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button onClick={() => markAllNotificationsRead(userId)} className="rounded px-1.5 py-1 text-2xs font-semibold text-muted hover:bg-sunken hover:text-ink">
                  Mark all read
                </button>
              )}
              <button onClick={() => clearNotifications(userId)} className="rounded px-1.5 py-1 text-2xs font-semibold text-muted hover:bg-sunken hover:text-ink">
                Clear
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!notifications.length && (
              <div className="px-4 py-10 text-center">
                <Icon name="bell-off" size={22} className="mx-auto mb-2 text-faint" />
                <p className="text-sm text-muted">You’re all caught up.</p>
              </div>
            )}
            {notifications.slice(0, 30).map((n) => {
              const actor = n.actorId ? userMap.get(n.actorId) : undefined
              return (
                <button
                  key={n.id}
                  onClick={() => { markNotificationRead(n.id); navigate(n.link); close() }}
                  className={clsx('flex w-full gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-sunken', !n.read && 'bg-brand-500/[0.06]')}
                >
                  <span className="relative shrink-0">
                    {actor ? <Avatar user={actor} size="md" /> : (
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-sunken">
                        <Icon name={KIND_ICON[n.kind]} size={14} className={KIND_TONE[n.kind]} />
                      </span>
                    )}
                    {actor && (
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-surface ring-1 ring-line">
                        <Icon name={KIND_ICON[n.kind]} size={9} className={KIND_TONE[n.kind]} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{n.title}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted">{n.body}</span>
                    <span className="mt-0.5 block text-2xs text-faint">{fmtRelative(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { navigate('/app/inbox'); close() }}
            className="border-t border-line px-3 py-2 text-center text-xs font-semibold text-brand-600 hover:bg-sunken dark:text-brand-300"
          >
            Open inbox
          </button>
        </div>
      )}
    </Popover>
  )
}
