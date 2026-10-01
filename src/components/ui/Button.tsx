import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'outline'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600',
  secondary: 'border border-line bg-surface text-ink hover:bg-sunken',
  outline: 'border border-brand-500/40 text-brand-600 hover:bg-brand-500/10 dark:text-brand-300',
  ghost: 'text-muted hover:bg-sunken hover:text-ink',
  subtle: 'bg-sunken text-ink hover:bg-line/70',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
}

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs gap-1',
  sm: 'h-8 px-2.5 text-[13px]',
  md: 'h-9 px-3.5',
  lg: 'h-11 px-5 text-[15px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  iconRight?: IconName
  loading?: boolean
  block?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'secondary', size = 'md', icon, iconRight, loading, block, className, children, disabled, ...rest
}: ButtonProps) {
  const iconOnly = !children
  return (
    <button
      className={clsx('btn', VARIANTS[variant], SIZES[size], block && 'w-full', iconOnly && '!px-0 aspect-square', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Icon name="loader" size={size === 'lg' ? 18 : 15} className="animate-spin" /> : icon ? <Icon name={icon} size={size === 'lg' ? 18 : 15} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={15} /> : null}
    </button>
  )
}

export function IconButton({ label, ...props }: ButtonProps & { label: string }) {
  return <Button aria-label={label} title={label} {...props} />
}
