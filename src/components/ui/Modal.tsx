import clsx from 'clsx'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { Icon } from './Icon'

const WIDTHS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' }

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: keyof typeof WIDTHS
  /** Hides the chrome so callers can render an entirely custom surface */
  bare?: boolean
  className?: string
}

/**
 * Always portals to <body>: the app header uses backdrop-blur, which creates a
 * containing block for fixed descendants — a modal rendered inside it would be
 * positioned against the header rather than the viewport.
 */
export function Modal({ open, onClose, title, subtitle, children, footer, width = 'md', bare, className }: ModalProps) {
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-lift animate-slide-up',
          'rounded-t-2xl sm:rounded-2xl',
          WIDTHS[width], className,
        )}
      >
        {!bare && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="truncate text-base font-semibold text-ink">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="btn -mr-1 -mt-1 h-8 w-8 shrink-0 text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-sunken/50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="sm"
      footer={
        <>
          <button className="btn h-9 px-3.5 text-muted hover:bg-sunken hover:text-ink" onClick={onClose}>Cancel</button>
          <button
            className={clsx('btn h-9 px-3.5 text-white', danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-600 hover:bg-brand-700')}
            onClick={() => { onConfirm(); onClose() }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="px-5 py-4 text-sm leading-6 text-muted">{message}</p>
    </Modal>
  )
}
