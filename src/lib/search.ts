import type { Doc, Issue, Project, Space, Team, User } from './types'

export interface SearchHit {
  id: string
  kind: 'issue' | 'project' | 'doc' | 'user' | 'team' | 'space'
  title: string
  subtitle: string
  icon?: string
  color?: string
  link: string
  score: number
}

function score(query: string, ...fields: (string | undefined)[]): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  let best = 0
  fields.forEach((field, index) => {
    if (!field) return
    const f = field.toLowerCase()
    const weight = 1 - index * 0.18
    if (f === q) best = Math.max(best, 100 * weight)
    else if (f.startsWith(q)) best = Math.max(best, 80 * weight)
    else if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(f)) best = Math.max(best, 65 * weight)
    else if (f.includes(q)) best = Math.max(best, 45 * weight)
  })
  return best
}

export function searchAll(
  query: string,
  data: { issues: Issue[]; projects: Project[]; docs: Doc[]; users: User[]; teams: Team[]; spaces: Space[] },
  limit = 24,
): SearchHit[] {
  const q = query.trim()
  if (!q) return []
  const hits: SearchHit[] = []

  for (const i of data.issues) {
    const s = score(q, i.key, i.title, i.description)
    if (s > 0) {
      hits.push({
        id: i.id, kind: 'issue', title: i.title, subtitle: i.key,
        link: `/app/issues/${i.id}`, score: s + (i.archivedAt ? -20 : 0),
      })
    }
  }
  for (const p of data.projects) {
    const s = score(q, p.name, p.key, p.summary, p.tags.join(' '))
    if (s > 0) hits.push({ id: p.id, kind: 'project', title: p.name, subtitle: p.summary || 'Project', icon: p.icon, color: p.color, link: `/app/projects/${p.id}`, score: s + 6 })
  }
  for (const d of data.docs) {
    const s = score(q, d.title, d.tags.join(' '), d.body)
    if (s > 0) hits.push({ id: d.id, kind: 'doc', title: d.title, subtitle: d.kind, icon: d.icon, link: `/app/docs/${d.id}`, score: s })
  }
  for (const u of data.users) {
    const s = score(q, u.name, u.email, u.title, u.skills.join(' '))
    if (s > 0) hits.push({ id: u.id, kind: 'user', title: u.name, subtitle: u.title, color: u.avatarColor, link: `/app/people/${u.id}`, score: s })
  }
  for (const t of data.teams) {
    const s = score(q, t.name, t.key, t.description)
    if (s > 0) hits.push({ id: t.id, kind: 'team', title: t.name, subtitle: `${t.key} · team`, icon: t.icon, color: t.color, link: `/app/teams/${t.id}`, score: s + 4 })
  }
  for (const sp of data.spaces) {
    const s = score(q, sp.name, sp.description)
    if (s > 0) hits.push({ id: sp.id, kind: 'space', title: sp.name, subtitle: 'Shared space', icon: sp.icon, color: sp.color, link: `/app/spaces/${sp.id}`, score: s + 2 })
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
