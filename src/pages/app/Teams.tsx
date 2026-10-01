import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Progress } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/misc'
import { useCycles, useIssues, useLookups, useTeamMembers } from '@/hooks/useData'
import { plural } from '@/lib/format'

export function Teams() {
  const navigate = useNavigate()
  const { teams, userMap, stateMap, projects } = useLookups()
  const issues = useIssues()
  const members = useTeamMembers()
  const cycles = useCycles()

  const rows = useMemo(() => teams.map((team) => {
    const teamIssues = issues.filter((i) => i.teamId === team.id && !i.archivedAt)
    const done = teamIssues.filter((i) => stateMap.get(i.stateId)?.category === 'completed').length
    const open = teamIssues.length - done
    const blocked = teamIssues.filter((i) => stateMap.get(i.stateId)?.category === 'paused').length
    const memberIds = members.filter((m) => m.teamId === team.id).map((m) => m.userId)
    const activeCycle = cycles.find((c) => c.teamId === team.id && c.status === 'active')
    const teamProjects = projects.filter((p) => p.teamIds.includes(team.id))
    return { team, open, done, blocked, memberIds, activeCycle, teamProjects, total: teamIssues.length }
  }), [teams, issues, stateMap, members, cycles, projects])

  return (
    <div className="pb-10">
      <PageHeader
        title="Teams"
        subtitle="Each team owns its workflow, its cycles and its own shared space."
        icon={<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="users" size={19} /></span>}
        actions={<Button variant="primary" icon="plus" onClick={() => navigate('/app/teams/new')}>New team</Button>}
      />

      <div className="px-4 py-5 sm:px-6">
        {!rows.length ? (
          <EmptyState icon={<Icon name="users" size={20} />} title="No teams yet" description="Teams are where work lives — create one to get started." action={<Button variant="primary" icon="plus" onClick={() => navigate('/app/teams/new')}>New team</Button>} />
        ) : (
          <div className="grid gap-3 grid-dense-cols">
            {rows.map(({ team, open, done, blocked, memberIds, activeCycle, teamProjects, total }) => (
              <Link key={team.id} to={`/app/teams/${team.id}`} className="card card-hover flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${team.color}1f` }}>{team.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-ink">{team.name}</h3>
                      <span className="shrink-0 font-mono text-2xs text-faint">{team.key}</span>
                      {team.visibility === 'private' && <Icon name="lock" size={11} className="text-faint" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{team.description}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge className="bg-sunken text-muted">{plural(memberIds.length, 'member')}</Badge>
                  <Badge className="bg-sunken text-muted">{plural(teamProjects.length, 'project')}</Badge>
                  {blocked > 0 && <Badge className="bg-rose-500/12 text-rose-600 dark:text-rose-300">{blocked} blocked</Badge>}
                  {activeCycle && <Badge className="bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"><Icon name="repeat" size={10} />{activeCycle.name}</Badge>}
                </div>

                <div className="mt-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-2xs text-muted">
                    <span>{open} open · {done} done</span>
                    <span className="tabular-nums">{total ? Math.round((done / total) * 100) : 0}%</span>
                  </div>
                  <Progress value={total ? (done / total) * 100 : 0} color={team.color} height={5} />
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3">
                  <span className="flex items-center gap-1.5">
                    <Avatar user={userMap.get(team.leadId)} size="sm" />
                    <span className="text-2xs text-muted">{userMap.get(team.leadId)?.name}</span>
                  </span>
                  <AvatarStack users={memberIds.map((m) => userMap.get(m))} max={4} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
