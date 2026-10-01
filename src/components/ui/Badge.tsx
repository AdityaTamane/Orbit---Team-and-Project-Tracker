import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'

export function Badge({ children, className, dot, color, style }: { children: ReactNode; className?: string; dot?: boolean; color?: string; style?: CSSProperties }) {
  return (
    <span className={clsx('chip', className ?? 'bg-sunken text-muted')} style={style}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color ?? 'currentColor' }} />}
      {children}
    </span>
  )
}

export function Dot({ color, className, pulse }: { color: string; className?: string; pulse?: boolean }) {
  return (
    <span className={clsx('relative inline-flex h-2 w-2 shrink-0 rounded-full', className)} style={{ background: color }}>
      {pulse && <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: color }} />}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-sans text-2xs font-semibold text-muted">
      {children}
    </kbd>
  )
}
