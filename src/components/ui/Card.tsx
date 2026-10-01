import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({ children, className, hover, as: As = 'div' }: { children: ReactNode; className?: string; hover?: boolean; as?: any }) {
  return <As className={clsx('card', hover && 'card-hover', className)}>{children}</As>
}

export function CardHeader({ title, subtitle, action, icon, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 border-b border-line px-4 py-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, delta, tone = 'default', icon, hint }: {
  label: string
  value: ReactNode
  delta?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
  icon?: ReactNode
  hint?: string
}) {
  const tones = {
    default: 'text-ink',
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-rose-600 dark:text-rose-400',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon}
      </div>
      <p className={clsx('mt-2 text-2xl font-bold tabular-nums tracking-tight', tones[tone])}>{value}</p>
      {(delta || hint) && <p className="mt-1 text-xs text-muted">{delta ?? hint}</p>}
    </div>
  )
}

export function Progress({ value, className, color, height = 6, showLabel }: { value: number; className?: string; color?: string; height?: number; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="relative w-full overflow-hidden rounded-full bg-sunken" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${v}%`, background: color ?? 'linear-gradient(90deg,#6c62f2,#8b5cf6)' }}
        />
      </div>
      {showLabel && <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">{v}%</span>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, className }: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-6 py-12 text-center', className)}>
      {icon && <div className="grid h-12 w-12 place-items-center rounded-full bg-sunken text-muted">{icon}</div>}
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}
