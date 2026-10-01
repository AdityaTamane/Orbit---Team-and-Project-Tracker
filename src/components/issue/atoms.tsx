import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { priorityMeta, typeMeta } from '@/lib/constants'
import { dueMeta } from '@/lib/format'
import type { Issue, IssueType, Priority, StateCategory, WorkflowState } from '@/lib/types'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'

const CATEGORY_ICON: Record<StateCategory, IconName> = {
  backlog: 'circle-dashed',
  unstarted: 'circle',
  started: 'circle-dot',
  paused: 'pause',
  completed: 'check-circle',
  canceled: 'circle-slash',
}

export function StateIcon({ state, size = 14, className }: { state?: WorkflowState; size?: number; className?: string }) {
  if (!state) return <Icon name="circle" size={size} className={clsx('text-faint', className)} />
  return (
    <span className={clsx('inline-flex shrink-0', className)} style={{ color: state.color }} title={state.name}>
      <Icon name={CATEGORY_ICON[state.category]} size={size} />
    </span>
  )
}

export function PriorityIcon({ priority, size = 14, className }: { priority: Priority; size?: number; className?: string }) {
  const meta = priorityMeta(priority)
  return (
    <span title={meta.label} className={clsx('inline-flex shrink-0', meta.color, className)}>
      <Icon name={meta.icon as IconName} size={size} />
    </span>
  )
}

export function TypeBadge({ type, withLabel }: { type: IssueType; withLabel?: boolean }) {
  const meta = typeMeta(type)
  const icons: Record<IssueType, IconName> = {
    epic: 'layers', story: 'bookmark', task: 'check-square', bug: 'alert-circle', spike: 'lightbulb', chore: 'wrench',
  }
  return (
    <span className={clsx('chip', meta.ring)} title={meta.label}>
      <Icon name={icons[type]} size={11} />
      {withLabel && meta.label}
    </span>
  )
}

export function IssueKey({ issue, className }: { issue: Issue; className?: string }) {
  return <span className={clsx('shrink-0 font-mono text-2xs font-semibold tabular-nums text-faint', className)}>{issue.key}</span>
}

export function DueChip({ due, done }: { due?: string; done?: boolean }) {
  if (!due) return null
  const meta = dueMeta(due)
  if (done) return null
  const tones = {
    overdue: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
    today: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    soon: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
    later: 'bg-sunken text-muted',
    none: 'hidden',
  }
  return (
    <span className={clsx('chip', tones[meta.tone])}>
      <Icon name="calendar" size={10} />
      {meta.label}
    </span>
  )
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="chip border" style={{ borderColor: `${color}55`, background: `${color}18`, color }}>
      {name}
    </span>
  )
}

export function EstimateChip({ estimate }: { estimate?: number }) {
  if (estimate === undefined || estimate === null) return null
  return (
    <span className="chip bg-sunken font-mono text-muted" title={`${estimate} points`}>
      {estimate}
    </span>
  )
}

export function BlockedChip({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="chip bg-rose-500/12 text-rose-600 dark:text-rose-400" title={`${count} blocking dependencies`}>
      <Icon name="ban" size={10} />
      {count}
    </span>
  )
}

export function IssueLinkTitle({ issue, className }: { issue: Issue; className?: string }) {
  return (
    <Link to={`/app/issues/${issue.id}`} className={clsx('truncate hover:text-brand-600 dark:hover:text-brand-300', className)}>
      {issue.title}
    </Link>
  )
}
