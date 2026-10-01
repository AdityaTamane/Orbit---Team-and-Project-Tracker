import {
  differenceInCalendarDays, differenceInMinutes, format, formatDistanceToNowStrict,
  isAfter, isBefore, isSameDay, parseISO, startOfDay,
} from 'date-fns'

export const parse = (d: string | Date): Date => (typeof d === 'string' ? parseISO(d) : d)

export const fmtDate = (d?: string | Date | null, f = 'MMM d'): string => (d ? format(parse(d), f) : '—')
export const fmtDateTime = (d?: string | Date | null): string => (d ? format(parse(d), 'MMM d, yyyy · h:mm a') : '—')
export const fmtDay = (d?: string | Date | null): string => (d ? format(parse(d), 'EEE, MMM d') : '—')
export const fmtFull = (d?: string | Date | null): string => (d ? format(parse(d), 'MMM d, yyyy') : '—')

export function fmtRelative(d?: string | Date | null): string {
  if (!d) return '—'
  const date = parse(d)
  const mins = Math.abs(differenceInMinutes(new Date(), date))
  if (mins < 1) return 'just now'
  return `${formatDistanceToNowStrict(date, { roundingMethod: 'floor' })} ago`
}

export function dueMeta(due?: string | null): { label: string; tone: 'overdue' | 'today' | 'soon' | 'later' | 'none' } {
  if (!due) return { label: '', tone: 'none' }
  const d = startOfDay(parse(due))
  const today = startOfDay(new Date())
  const diff = differenceInCalendarDays(d, today)
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, tone: 'overdue' }
  if (diff === 0) return { label: 'Today', tone: 'today' }
  if (diff === 1) return { label: 'Tomorrow', tone: 'soon' }
  if (diff <= 7) return { label: format(d, 'EEE'), tone: 'soon' }
  return { label: format(d, 'MMM d'), tone: 'later' }
}

export const initials = (name: string): string =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase()

export const pct = (n: number, d: number): number => (d <= 0 ? 0 : Math.round((n / d) * 100))

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

export function fmtHours(minutes: number): string {
  if (!minutes) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)
}

export { differenceInCalendarDays, isAfter, isBefore, isSameDay, startOfDay, format }
