import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Dot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Segmented, Select } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/misc'
import { TimelineChart } from '@/components/board/TimelineView'
import type { TimelineBar, TimelineMarker } from '@/components/board/TimelineView'
import { useIssues, useLookups, useMilestones } from '@/hooks/useData'
import { healthMeta, projectStatusMeta } from '@/lib/constants'
import { fmtDate } from '@/lib/format'
import { portfolio } from '@/lib/analytics'

export function Roadmap() {
  const navigate = useNavigate()
  const { projects, teams, stateMap, userMap } = useLookups()
  const issues = useIssues()
  const milestones = useMilestones()

  const [teamFilter, setTeamFilter] = useState('all')
  const [scope, setScope] = useState<'active' | 'all'>('active')
  const [density, setDensity] = useState<'compact' | 'roomy'>('compact')

  const visible = useMemo(
    () => projects
      .filter((p) => (scope === 'active' ? !['completed', 'canceled'].includes(p.status) : true))
      .filter((p) => (teamFilter === 'all' ? true : p.teamIds.includes(teamFilter))),
    [projects, scope, teamFilter],
  )

  const rows = useMemo(
    () => portfolio(visible, issues.filter((i) => !i.archivedAt), stateMap),
    [visible, issues, stateMap],
  )

  const { bars, markers } = useMemo(() => {
    const b: TimelineBar[] = []
    const m: TimelineMarker[] = []
    for (const row of rows) {
      const p = row.project
      if (!p.startDate || !p.targetDate) continue
      b.push({
        id: p.id,
        label: p.name,
        icon: p.icon,
        color: p.color,
        start: new Date(p.startDate),
        end: new Date(p.targetDate),
        progress: row.progress,
        muted: p.status === 'completed' || p.status === 'canceled',
        onClick: () => navigate(`/app/projects/${p.id}`),
      })
      for (const ms of milestones.filter((x) => x.projectId === p.id)) {
        m.push({
          id: ms.id,
          label: ms.name,
          date: new Date(ms.targetDate),
          color: ms.status === 'done' ? '#10b981' : ms.status === 'missed' ? '#f43f5e' : p.color,
        })
      }
    }
    return { bars: b, markers: m }
  }, [rows, milestones, navigate])

  return (
    <div className="pb-10">
      <PageHeader
        title="Roadmap"
        subtitle="Every project on one timeline, with milestone markers and live progress."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="gantt" size={19} /></span>}
        actions={<Button variant="primary" icon="wand" onClick={() => navigate('/app/projects/new')}>Onboard project</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 sm:px-6">
        <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="h-8 w-auto !text-[13px]">
          <option value="all">All teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
        </Select>
        <Segmented
          size="sm"
          value={scope}
          onChange={setScope}
          options={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'Everything' }]}
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs tabular-nums text-faint">{rows.length} projects</span>
          <Segmented
            size="sm"
            value={density}
            onChange={setDensity}
            options={[{ value: 'compact', icon: 'minimize', title: 'Compact' }, { value: 'roomy', icon: 'maximize', title: 'Roomy' }]}
          />
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {!bars.length ? (
          <EmptyState
            icon={<Icon name="gantt" size={20} />}
            title="Nothing to plot"
            description="Projects need a start and target date to appear on the roadmap."
            action={<Button variant="primary" icon="wand" onClick={() => navigate('/app/projects/new')}>Onboard a project</Button>}
          />
        ) : (
          <>
            <div className="card overflow-hidden">
              <TimelineChart bars={bars} markers={markers} dayWidth={density === 'compact' ? 6 : 12} rowHeight={density === 'compact' ? 38 : 46} />
            </div>

            <div className="mt-5 card divide-y divide-line">
              {rows.map((row) => {
                const p = row.project
                const health = healthMeta(p.health)
                const status = projectStatusMeta(p.status)
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/app/projects/${p.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sunken/60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base" style={{ background: `${p.color}1f` }}>{p.icon}</span>
                    <div className="min-w-0 flex-[2]">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                        <Dot color={health.dot} />
                      </div>
                      <p className="truncate text-2xs text-faint">
                        {p.startDate ? fmtDate(p.startDate) : '—'} → {p.targetDate ? fmtDate(p.targetDate, 'MMM d, yyyy') : '—'} · lead {userMap.get(p.leadId)?.name}
                      </p>
                    </div>
                    <div className="hidden flex-1 sm:block">
                      <Progress value={row.progress} color={p.color} height={5} showLabel />
                    </div>
                    <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
                      <Badge className={status.color}>{status.label}</Badge>
                      {row.blocked > 0 && <Badge className="bg-rose-500/12 text-rose-600 dark:text-rose-300">{row.blocked} blocked</Badge>}
                      {row.scheduleDelta !== null && row.scheduleDelta < -10 && (
                        <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-300">{Math.abs(row.scheduleDelta)}pt behind</Badge>
                      )}
                    </div>
                    <span className="shrink-0 text-2xs tabular-nums text-muted">
                      {row.daysLeft !== null ? (row.daysLeft >= 0 ? `${row.daysLeft}d` : `${Math.abs(row.daysLeft)}d over`) : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
