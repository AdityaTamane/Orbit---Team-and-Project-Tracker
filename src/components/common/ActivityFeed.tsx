import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { fmtRelative } from '@/lib/format'
import type { Activity, User } from '@/lib/types'

const VERB_ICON: Record<string, IconName> = {
  created: 'plus',
  completed: 'check-circle',
  started: 'play',
  moved: 'arrow-right',
  assigned: 'user-plus',
  'commented on': 'message',
  published: 'file-text',
  edited: 'pen',
  archived: 'archive',
  updated: 'pen',
  'updated health on': 'gauge',
  'raised a risk on': 'alert-triangle',
  'changed priority on': 'flag',
  automated: 'bot',
  invited: 'user-plus',
  'added a member to': 'users',
}

const linkFor = (a: Activity): string => {
  switch (a.entityType) {
    case 'issue': return `/app/issues/${a.entityId}`
    case 'project': return `/app/projects/${a.entityId}`
    case 'doc': return `/app/docs/${a.entityId}`
    case 'space': return `/app/spaces/${a.entityId}`
    case 'team': return `/app/teams/${a.entityId}`
    case 'goal': return '/app/goals'
    default: return '/app'
  }
}

export function ActivityFeed({ activities, userMap, compact, emptyMessage = 'No activity yet.' }: {
  activities: Activity[]
  userMap: Map<string, User>
  compact?: boolean
  emptyMessage?: string
}) {
  if (!activities.length) return <p className="py-6 text-center text-sm text-faint">{emptyMessage}</p>

  return (
    <ol className="relative space-y-0">
      {activities.map((a, i) => {
        const actor = a.actorId === 'automation'
          ? ({ id: 'automation', name: 'Automation', avatarColor: '#6c62f2' } as User)
          : userMap.get(a.actorId)
        const isLast = i === activities.length - 1
        return (
          <li key={a.id} className="relative flex gap-3 pb-3">
            {!isLast && <span className="absolute left-[15px] top-8 h-full w-px bg-line" />}
            <div className="relative z-10 shrink-0">
              {a.actorId === 'automation'
                ? <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/15 text-brand-600 ring-2 ring-surface dark:text-brand-300"><Icon name="bot" size={14} /></span>
                : <Avatar user={actor} size="md" ring />}
              <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-surface text-faint ring-1 ring-line">
                <Icon name={VERB_ICON[a.verb] ?? 'activity'} size={9} />
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] leading-5 text-muted">
                <span className="font-semibold text-ink">{actor?.name ?? 'Someone'}</span>{' '}
                {a.verb}{' '}
                <Link to={linkFor(a)} className="font-medium text-brand-600 hover:underline dark:text-brand-300">
                  {a.entityLabel}
                </Link>
                {a.meta?.title && !compact && <span className="text-muted"> — {a.meta.title}</span>}
                {a.meta?.from && a.meta?.to && <span className="text-faint"> · {a.meta.from} → {a.meta.to}</span>}
                {a.meta?.rule && <span className="text-faint"> · {a.meta.rule}: {a.meta.summary}</span>}
              </p>
              {a.meta?.note && !compact && <p className="mt-0.5 line-clamp-2 text-xs text-faint">{a.meta.note}</p>}
              {a.meta?.preview && !compact && <p className="mt-0.5 line-clamp-2 text-xs text-faint">“{a.meta.preview}”</p>}
              <p className="mt-0.5 text-2xs text-faint">{fmtRelative(a.createdAt)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
