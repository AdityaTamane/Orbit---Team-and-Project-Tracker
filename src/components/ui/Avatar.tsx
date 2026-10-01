import clsx from 'clsx'
import { initials } from '@/lib/format'
import type { User } from '@/lib/types'

const SIZES = { xs: 'h-5 w-5 text-[9px]', sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-11 w-11 text-sm', xl: 'h-16 w-16 text-lg' }

export interface AvatarProps {
  user?: Pick<User, 'name' | 'avatarColor' | 'avatarUrl'> | null
  name?: string
  color?: string
  size?: keyof typeof SIZES
  className?: string
  ring?: boolean
  title?: string
}

export function Avatar({ user, name, color, size = 'md', className, ring, title }: AvatarProps) {
  const label = user?.name ?? name ?? '?'
  const bg = user?.avatarColor ?? color ?? '#8e96ad'
  return (
    <span
      title={title ?? label}
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white',
        SIZES[size], ring && 'ring-2 ring-surface', className,
      )}
      style={{ background: `linear-gradient(140deg, ${bg}, ${bg}bb)` }}
    >
      {initials(label)}
    </span>
  )
}

export function AvatarStack({ users, max = 4, size = 'sm' }: { users: (User | undefined)[]; max?: number; size?: keyof typeof SIZES }) {
  const list = users.filter(Boolean) as User[]
  const shown = list.slice(0, max)
  const rest = list.length - shown.length
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((u) => <Avatar key={u.id} user={u} size={size} ring />)}
      {rest > 0 && (
        <span className={clsx('inline-flex items-center justify-center rounded-full bg-sunken font-semibold text-muted ring-2 ring-surface', SIZES[size])}>
          +{rest}
        </span>
      )}
    </div>
  )
}
