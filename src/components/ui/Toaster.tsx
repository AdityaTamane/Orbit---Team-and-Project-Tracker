import clsx from 'clsx'
import { createPortal } from 'react-dom'
import { useToasts } from '@/lib/store'
import { Icon } from './Icon'
import type { IconName } from './Icon'

const TONES: Record<string, { class: string; icon: IconName }> = {
  default: { class: 'border-line bg-raised text-ink', icon: 'info' },
  success: { class: 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', icon: 'check-circle' },
  error: { class: 'border-rose-500/40 bg-rose-500/12 text-rose-700 dark:text-rose-300', icon: 'alert-circle' },
  info: { class: 'border-sky-500/40 bg-sky-500/12 text-sky-700 dark:text-sky-300', icon: 'info' },
}

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  if (!toasts.length) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[130] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end">
      {toasts.map((t) => {
        const tone = TONES[t.tone] ?? TONES.default
        return (
          <div
            key={t.id}
            className={clsx('pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-pop backdrop-blur-xl animate-slide-up', tone.class)}
          >
            <Icon name={tone.icon} size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1 font-medium leading-5">{t.message}</span>
            {t.action && (
              <button onClick={() => { t.action!.onClick(); dismiss(t.id) }} className="shrink-0 text-xs font-bold underline underline-offset-2">
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 transition hover:opacity-100" aria-label="Dismiss">
              <Icon name="x" size={14} />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
