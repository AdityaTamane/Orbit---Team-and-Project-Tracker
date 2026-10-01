import type { ReactNode } from 'react'

/** Shared palette — sequential-safe and legible in both themes. */
export const CHART_COLORS = ['#6c62f2', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899']

export const AXIS_PROPS = {
  stroke: 'rgb(var(--faint))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

export const GRID_PROPS = {
  stroke: 'rgb(var(--line))',
  strokeDasharray: '3 3',
  vertical: false,
} as const

export function ChartTooltip({ active, payload, label, unit, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-raised px-2.5 py-2 shadow-pop">
      {label !== undefined && <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-faint">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color ?? entry.fill }} />
            <span className="text-muted">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">
              {formatter ? formatter(entry.value) : entry.value}{unit ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartCard({ title, subtitle, action, children, height = 220, className }: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  height?: number
  className?: string
}) {
  return (
    <section className={`card p-4 ${className ?? ''}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ height }}>{children}</div>
    </section>
  )
}
