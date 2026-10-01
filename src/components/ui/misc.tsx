import clsx from 'clsx'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export function Tabs<T extends string>({ tabs, value, onChange, className }: {
  tabs: { value: T; label: string; icon?: IconName; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={clsx('scroll-x no-scrollbar flex items-center gap-1 border-b border-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition',
            value === t.value ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {t.icon && <Icon name={t.icon} size={14} />}
          {t.label}
          {t.count !== undefined && (
            <span className={clsx('rounded px-1 text-2xs font-bold tabular-nums', value === t.value ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300' : 'bg-sunken text-faint')}>
              {t.count}
            </span>
          )}
          {value === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
        </button>
      ))}
    </div>
  )
}

export function Tooltip({ label, children, side = 'top' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={clsx(
          'pointer-events-none absolute left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-2xs font-medium text-white shadow-lg group-hover/tt:block dark:bg-slate-700',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  )
}

export function Collapsible({ title, children, defaultOpen = true, count, action }: {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  count?: number
  action?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left">
          <Icon name="chevron-right" size={14} className={clsx('shrink-0 text-faint transition-transform', open && 'rotate-90')} />
          <span className="truncate text-sm font-semibold text-ink">{title}</span>
          {count !== undefined && <span className="text-xs font-medium text-faint">{count}</span>}
        </button>
        {action}
      </div>
      {open && <div className="animate-fade-in">{children}</div>}
    </div>
  )
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, icon, actions, tabs, breadcrumbs }: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  tabs?: ReactNode
  breadcrumbs?: ReactNode
}) {
  return (
    <div className="border-b border-line bg-surface/60">
      <div className="px-4 pt-4 sm:px-6">
        {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-ink">{title}</h1>
              {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
            </div>
          </div>
          {/* No shrink-0 here: with several actions the row's max-content can exceed a
              phone viewport, and a non-shrinking flex item would push the page sideways. */}
          {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {tabs && <div className="mt-3">{tabs}</div>}
      </div>
    </div>
  )
}

export function InlineAlert({ tone = 'info', title, children, action }: {
  tone?: 'info' | 'warn' | 'danger' | 'success'
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  const tones = {
    info: 'border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-300',
    warn: 'border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300',
    danger: 'border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300',
    success: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300',
  }
  const icons: Record<string, IconName> = { info: 'info', warn: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' }
  return (
    <div className={clsx('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm', tones[tone])}>
      <Icon name={icons[tone]} size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx('leading-6', title && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
      {action}
    </div>
  )
}
