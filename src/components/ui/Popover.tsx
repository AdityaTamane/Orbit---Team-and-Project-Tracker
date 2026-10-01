import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type Align = 'start' | 'center' | 'end'
type Side = 'bottom' | 'top'

export interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void; ref: (el: HTMLElement | null) => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: Align
  side?: Side
  width?: number
  className?: string
  /** Renders as a centred sheet on small screens */
  sheetOnMobile?: boolean
}

/**
 * Anchored floating panel, portaled to body so blurred/transformed ancestors
 * cannot capture its fixed positioning.
 */
export function Popover({ trigger, children, align = 'end', side = 'bottom', width = 240, className, sheetOnMobile }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const place = () => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const panelH = panelRef.current?.offsetHeight ?? 280
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = side === 'top' || (spaceBelow < panelH + 16 && r.top > panelH + 16)

    let left = align === 'start' ? r.left : align === 'center' ? r.left + r.width / 2 - width / 2 : r.right - width
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
    const top = openUp ? Math.max(8, r.top - panelH - 6) : r.bottom + 6
    setPos({ top, left })
  }

  useLayoutEffect(() => { if (open) place() }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => place()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      {trigger({ open, toggle: () => setOpen((o) => !o), ref: (el) => { anchorRef.current = el } })}
      {open && createPortal(
        <>
          {sheetOnMobile && <div className="fixed inset-0 z-[110] bg-slate-950/40 sm:hidden" onClick={close} />}
          <div
            ref={panelRef}
            style={pos ? { top: pos.top, left: pos.left, width } : { visibility: 'hidden' }}
            className={clsx(
              'fixed z-[111] overflow-hidden rounded-xl border border-line bg-raised shadow-pop animate-scale-in',
              sheetOnMobile && 'max-sm:!left-1/2 max-sm:!top-auto max-sm:bottom-4 max-sm:!w-[calc(100vw-2rem)] max-sm:-translate-x-1/2',
              className,
            )}
          >
            {children(close)}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

/* ── Menu building blocks ───────────────────────────────────── */

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pb-1 pt-2.5 text-2xs font-bold uppercase tracking-wider text-faint">{children}</div>
}

export function MenuItem({ children, onClick, icon, active, danger, shortcut, disabled }: {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  active?: boolean
  danger?: boolean
  shortcut?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition disabled:opacity-40',
        danger ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400' : 'text-ink hover:bg-sunken',
        active && 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
      )}
    >
      {icon && <span className="grid w-4 shrink-0 place-items-center text-muted">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut}
    </button>
  )
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-line" />
}
