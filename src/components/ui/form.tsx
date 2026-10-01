import clsx from 'clsx'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export function Field({ label, hint, error, required, children, className }: {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>
        : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName
  suffix?: ReactNode
}

export function Input({ icon, suffix, className, ...rest }: InputProps) {
  if (!icon && !suffix) return <input className={clsx('input', className)} {...rest} />
  return (
    <div className="relative">
      {icon && <Icon name={icon} size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />}
      <input className={clsx('input', icon && 'pl-9', suffix && 'pr-9', className)} {...rest} />
      {suffix && <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint">{suffix}</div>}
    </div>
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx('input min-h-[90px] resize-y leading-6', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={clsx('input cursor-pointer appearance-none pr-9', className)} {...rest}>{children}</select>
      <Icon name="chevron-down" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint" />
    </div>
  )
}

export function Switch({ checked, onChange, label, description, disabled }: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={clsx('flex items-start gap-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-line')}
      >
        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>}
        </span>
      )}
    </label>
  )
}

export function Checkbox({ checked, onChange, label, className, indeterminate }: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  className?: string
  indeterminate?: boolean
}) {
  return (
    <label className={clsx('flex cursor-pointer items-center gap-2', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(!checked) }}
        className={clsx(
          'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition',
          checked || indeterminate ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-surface hover:border-faint',
        )}
      >
        {indeterminate ? <Icon name="minus" size={12} strokeWidth={3} /> : checked ? <Icon name="check" size={12} strokeWidth={3} /> : null}
      </button>
      {label && <span className="select-none text-sm text-ink">{label}</span>}
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md', className }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label?: ReactNode; icon?: IconName; title?: string }[]
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={clsx('inline-flex items-center gap-0.5 rounded-lg bg-sunken p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={clsx(
            'btn rounded-[7px] font-medium transition',
            size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-[13px]',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Colour ${c}`}
          className={clsx('h-7 w-7 rounded-full transition hover:scale-110', value === c && 'ring-2 ring-offset-2 ring-offset-surface')}
          style={{ background: c, boxShadow: value === c ? `0 0 0 2px ${c}` : undefined }}
        />
      ))}
    </div>
  )
}

export function EmojiPicker({ value, onChange, options }: { value: string; onChange: (e: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={clsx(
            'grid h-9 w-9 place-items-center rounded-lg border text-lg transition hover:bg-sunken',
            value === e ? 'border-brand-500 bg-brand-500/10' : 'border-line',
          )}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
