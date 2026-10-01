import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Input, Select } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/misc'
import { EmptyState } from '@/components/ui/Card'
import { ActivityFeed } from '@/components/common/ActivityFeed'
import { useActivities, useLookups } from '@/hooks/useData'
import { format, parseISO } from 'date-fns'

export function ActivityPage() {
  const { userMap, teams, projects, users } = useLookups()
  const activities = useActivities(400)

  const [actor, setActor] = useState('all')
  const [teamId, setTeamId] = useState('all')
  const [projectId, setProjectId] = useState('all')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => activities
    .filter((a) => (actor === 'all' ? true : a.actorId === actor))
    .filter((a) => (teamId === 'all' ? true : a.teamId === teamId))
    .filter((a) => (projectId === 'all' ? true : a.projectId === projectId))
    .filter((a) => !q.trim() || `${a.entityLabel} ${a.verb} ${JSON.stringify(a.meta)}`.toLowerCase().includes(q.toLowerCase())),
  [activities, actor, teamId, projectId, q])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const a of filtered) {
      const key = format(parseISO(a.createdAt), 'yyyy-MM-dd')
      map.set(key, [...(map.get(key) ?? []), a])
    }
    return [...map.entries()].slice(0, 14)
  }, [filtered])

  return (
    <div className="pb-10">
      <PageHeader
        title="Activity"
        subtitle="Every change in the workspace, in order. The audit trail nobody has to maintain."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="activity" size={19} /></span>}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 sm:px-6">
        <Input icon="search" placeholder="Search activity…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-full !text-[13px] sm:w-56" />
        <Select value={actor} onChange={(e) => setActor(e.target.value)} className="h-8 w-auto !text-[13px]">
          <option value="all">Everyone</option>
          <option value="automation">Automation</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-8 w-auto !text-[13px]">
          <option value="all">All teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
        </Select>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 w-auto !text-[13px]">
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </Select>
        <span className="ml-auto text-xs tabular-nums text-faint">{filtered.length} events</span>
      </div>

      <div className="space-y-6 px-4 py-5 sm:px-6">
        {!grouped.length ? (
          <EmptyState icon={<Icon name="activity" size={20} />} title="No activity matches" description="Try widening the filters." />
        ) : grouped.map(([day, rows]) => (
          <section key={day}>
            <h2 className="sticky top-0 z-10 -mx-4 mb-2 bg-canvas/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted backdrop-blur sm:-mx-6 sm:px-6">
              {format(parseISO(day), 'EEEE, MMMM d')}
              <span className="ml-2 font-medium normal-case tracking-normal text-faint">{rows.length} events</span>
            </h2>
            <div className="card p-4">
              <ActivityFeed activities={rows} userMap={userMap} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
