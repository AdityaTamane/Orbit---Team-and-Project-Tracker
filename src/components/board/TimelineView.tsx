import clsx from 'clsx'
import { useMemo, useRef } from 'react'
import { addDays, differenceInCalendarDays, eachWeekOfInterval, endOfMonth, format, isSameMonth, startOfDay, startOfMonth } from 'date-fns'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/Card'

export interface TimelineBar {
  id: string
  label: string
  sublabel?: string
  icon?: string
  color: string
  start: Date
  end: Date
  progress?: number
  lane?: string
  onClick?: () => void
  muted?: boolean
}

export interface TimelineMarker {
  id: string
  label: string
  date: Date
  color: string
  lane?: string
}

export interface TimelineProps {
  bars: TimelineBar[]
  markers?: TimelineMarker[]
  dayWidth?: number
  rowHeight?: number
  emptyMessage?: string
}

/** Horizontal Gantt-style timeline. Used for roadmaps, cycles and scheduled work. */
export function TimelineChart({ bars, markers = [], dayWidth = 10, rowHeight = 40, emptyMessage = 'Nothing scheduled yet.' }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const range = useMemo(() => {
    const dates = [
      ...bars.flatMap((b) => [b.start, b.end]),
      ...markers.map((m) => m.date),
      new Date(),
    ]
    if (!dates.length) return null
    const min = startOfMonth(new Date(Math.min(...dates.map((d) => +d))))
    const max = endOfMonth(new Date(Math.max(...dates.map((d) => +d))))
    return { min, max, days: differenceInCalendarDays(max, min) + 1 }
  }, [bars, markers])

  if (!range || !bars.length) {
    return <EmptyState icon={<Icon name="gantt" size={20} />} title="Nothing on the timeline" description={emptyMessage} className="m-6" />
  }

  const width = range.days * dayWidth
  const offset = (d: Date) => differenceInCalendarDays(startOfDay(d), range.min) * dayWidth
  const months: { label: string; left: number; width: number }[] = []
  let cursor = range.min
  while (cursor <= range.max) {
    const end = endOfMonth(cursor)
    const monthEnd = end > range.max ? range.max : end
    months.push({
      label: format(cursor, 'MMMM yyyy'),
      left: offset(cursor),
      width: (differenceInCalendarDays(monthEnd, cursor) + 1) * dayWidth,
    })
    cursor = addDays(endOfMonth(cursor), 1)
  }
  const weeks = eachWeekOfInterval({ start: range.min, end: range.max }, { weekStartsOn: 1 })
  const todayLeft = offset(new Date())

  return (
    <div ref={scrollRef} className="scroll-x">
      <div style={{ width }} className="relative min-w-full">
        {/* month header */}
        <div className="sticky top-0 z-10 flex h-9 items-stretch border-b border-line bg-surface/95 backdrop-blur">
          {months.map((m) => (
            <div key={m.label} className="flex items-center border-r border-line px-2 text-xs font-semibold text-muted" style={{ width: m.width }}>
              <span className="sticky left-2 truncate">{m.label}</span>
            </div>
          ))}
        </div>

        {/* week gridlines */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-9">
          {weeks.map((w) => (
            <div key={+w} className="absolute top-0 h-full border-l border-line/60" style={{ left: offset(w) }} />
          ))}
          {todayLeft >= 0 && todayLeft <= width && (
            <div className="absolute top-0 z-10 h-full border-l-2 border-brand-500" style={{ left: todayLeft }}>
              <span className="absolute -top-0 left-1 rounded bg-brand-600 px-1 py-px text-[9px] font-bold text-white">Today</span>
            </div>
          )}
        </div>

        {/* bars */}
        <div className="relative py-2">
          {bars.map((bar, i) => {
            const left = offset(bar.start)
            const barWidth = Math.max(dayWidth * 1.5, (differenceInCalendarDays(bar.end, bar.start) + 1) * dayWidth)
            return (
              <div key={bar.id} className="relative" style={{ height: rowHeight }}>
                <button
                  onClick={bar.onClick}
                  className={clsx(
                    'group absolute top-1.5 flex h-7 items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-xs font-semibold text-white shadow-sm transition hover:brightness-110',
                    bar.muted && 'opacity-55',
                  )}
                  style={{ left, width: barWidth, background: bar.color, zIndex: bars.length - i }}
                  title={`${bar.label} · ${format(bar.start, 'MMM d')} → ${format(bar.end, 'MMM d')}`}
                >
                  {bar.icon && <span className="shrink-0">{bar.icon}</span>}
                  <span className="truncate">{bar.label}</span>
                  {bar.progress !== undefined && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
                      <span className="block h-full bg-white/85" style={{ width: `${bar.progress}%` }} />
                    </span>
                  )}
                </button>
                {bar.sublabel && (
                  <span className="absolute top-2.5 text-[11px] text-muted" style={{ left: left + barWidth + 8 }}>{bar.sublabel}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Milestone markers. Labels are dealt into stacked lanes — at tight day
            widths, neighbouring milestones are only a few pixels apart and a
            single row of labels collapses into unreadable overlapping text. */}
        {markers.length > 0 && (() => {
          const sorted = [...markers].sort((a, b) => +a.date - +b.date)
          const LANE_HEIGHT = 15
          const MIN_GAP = 74
          const laneEnds: number[] = []
          const placed = sorted.map((m) => {
            const left = offset(m.date)
            let lane = laneEnds.findIndex((end) => left - end > MIN_GAP)
            if (lane === -1) {
              lane = laneEnds.length
              laneEnds.push(left)
            } else {
              laneEnds[lane] = left
            }
            return { marker: m, left, lane }
          })
          const lanes = Math.max(1, laneEnds.length)

          return (
            <div className="relative border-t border-line pt-2.5" style={{ paddingBottom: lanes * LANE_HEIGHT + 10 }}>
              {placed.map(({ marker, left }) => (
                <div
                  key={marker.id}
                  className="absolute top-1.5 -translate-x-1/2"
                  style={{ left }}
                  title={`${marker.label} · ${format(marker.date, 'MMM d, yyyy')}`}
                >
                  <span className="block h-3 w-3 rotate-45 rounded-[2px] ring-2 ring-surface" style={{ background: marker.color }} />
                </div>
              ))}
              {placed.map(({ marker, left, lane }) => (
                <div
                  key={`${marker.id}-label`}
                  className="absolute max-w-[130px] -translate-x-1/2 truncate rounded bg-surface/80 px-1 text-center text-[10px] font-medium leading-[13px] text-muted"
                  style={{ left, top: 22 + lane * LANE_HEIGHT }}
                  title={marker.label}
                >
                  {marker.label}
                </div>
              ))}
            </div>
          )
        })()}
        <div className="h-6" />
      </div>
    </div>
  )
}

/** Month/date helpers reused by the calendar view. */
export const monthMatrix = (month: Date): Date[][] => {
  const first = startOfMonth(month)
  const start = addDays(first, -((first.getDay() + 6) % 7))
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
}

export const inMonth = (d: Date, month: Date): boolean => isSameMonth(d, month)
