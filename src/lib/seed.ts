/* eslint-disable */
import { addDays, format, startOfWeek, subDays, subHours } from 'date-fns'
import { clearDatabase, db, uid } from './db'
import type {
  Activity, Automation, AutomationRun, Comment, Cycle, Doc, Goal, Issue, IssueLink, Label,
  Milestone, Notification, Priority, Project, Risk, SavedView, Space, Team, TeamMember,
  TimeLog, User, WorkflowState, Workspace, IssueType,
} from './types'

/* ── deterministic RNG so the demo looks the same every reset ── */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260901)
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const chance = (p: number): boolean => rnd() < p
const int = (min: number, max: number): number => min + Math.floor(rnd() * (max - min + 1))
const iso = (d: Date): string => d.toISOString()

const TODAY = new Date()
const ago = (days: number, hours = 0): string => iso(subHours(subDays(TODAY, days), hours))
const ahead = (days: number): string => iso(addDays(TODAY, days))

/* ── Workspace ──────────────────────────────────────────────── */

const workspace: Workspace = {
  id: 'ws_nimbus',
  name: 'Nimbus Labs',
  slug: 'nimbus',
  logoEmoji: '🛰️',
  plan: 'business',
  createdAt: ago(420),
  settings: {
    weekStart: 1,
    workingDays: [1, 2, 3, 4, 5],
    estimateScale: 'fibonacci',
    defaultCycleDays: 14,
    autoArchiveDays: 90,
    allowGuestComments: true,
  },
}

/* ── People ─────────────────────────────────────────────────── */

const U = (
  id: string, name: string, email: string, title: string, role: User['role'],
  color: string, capacity: number, skills: string[], bio: string,
): User => ({
  id, name, email, password: 'demo123', avatarColor: color, title, role,
  status: 'active', timezone: 'Asia/Kolkata', capacityHours: capacity, skills, bio,
  createdAt: ago(int(120, 400)), lastSeenAt: ago(0, int(0, 30)),
})

const users: User[] = [
  U('u_aditya', 'Aditya Tiwari', 'aditya@nimbus.io', 'Head of Product', 'owner', '#6c62f2', 30,
    ['Roadmapping', 'Discovery', 'Analytics'], 'Runs the product org. Obsessed with cycle time and clear specs.'),
  U('u_meera', 'Meera Raghavan', 'meera@nimbus.io', 'Engineering Manager', 'admin', '#0ea5e9', 25,
    ['Go', 'Postgres', 'Systems design'], 'Leads the platform group. Ex-payments infra.'),
  U('u_kabir', 'Kabir Shah', 'kabir@nimbus.io', 'Staff Engineer', 'member', '#10b981', 38,
    ['TypeScript', 'React', 'GraphQL'], 'Front-end architecture and design systems.'),
  U('u_lena', 'Lena Fischer', 'lena@nimbus.io', 'Product Designer', 'member', '#ec4899', 36,
    ['Figma', 'Prototyping', 'Research'], 'Design lead for the mobile revamp.'),
  U('u_dev', 'Devansh Kapoor', 'devansh@nimbus.io', 'Backend Engineer', 'member', '#f59e0b', 40,
    ['Go', 'Kafka', 'Payments'], 'Ledger and settlement services.'),
  U('u_sara', 'Sara Nakamura', 'sara@nimbus.io', 'QA Lead', 'member', '#8b5cf6', 34,
    ['Playwright', 'Test strategy'], 'Owns release quality and the regression suite.'),
  U('u_tomas', 'Tomás Oliveira', 'tomas@nimbus.io', 'SRE', 'member', '#14b8a6', 36,
    ['Kubernetes', 'Terraform', 'Observability'], 'On-call rotation and reliability program.'),
  U('u_priya', 'Priya Nair', 'priya@nimbus.io', 'Growth Marketer', 'member', '#f97316', 32,
    ['Lifecycle', 'SEO', 'Copy'], 'Launch campaigns and activation funnels.'),
  U('u_jonas', 'Jonas Weber', 'jonas@nimbus.io', 'Data Analyst', 'member', '#3b82f6', 34,
    ['SQL', 'dbt', 'Experimentation'], 'Metrics, dashboards and experiment readouts.'),
  U('u_amara', 'Amara Okafor', 'amara@nimbus.io', 'Security Engineer', 'member', '#f43f5e', 30,
    ['AppSec', 'SOC 2', 'Threat modelling'], 'Driving the compliance programme.'),
  U('u_yuki', 'Yuki Tanaka', 'yuki@nimbus.io', 'Frontend Engineer', 'member', '#a855f7', 38,
    ['React', 'Animation', 'A11y'], 'Mobile web and accessibility.'),
  U('u_omar', 'Omar Haddad', 'omar@nimbus.io', 'Customer Success', 'guest', '#22c55e', 20,
    ['Onboarding', 'Support'], 'Voice of the customer in planning.'),
]
const userIds = users.map((u) => u.id)

/* ── Teams ──────────────────────────────────────────────────── */

const teams: Team[] = [
  { id: 't_eng', key: 'ENG', name: 'Engineering', description: 'Core product engineering — API, web app and mobile surfaces.', icon: '🛠️', color: '#6c62f2', leadId: 'u_meera', visibility: 'public', cycleDays: 14, cycleEnabled: true, createdAt: ago(400) },
  { id: 't_des', key: 'DES', name: 'Design', description: 'Product design, research and the Nimbus design system.', icon: '🎨', color: '#ec4899', leadId: 'u_lena', visibility: 'public', cycleDays: 14, cycleEnabled: true, createdAt: ago(380) },
  { id: 't_prd', key: 'PRD', name: 'Product', description: 'Discovery, specs, roadmap and release planning.', icon: '🧭', color: '#0ea5e9', leadId: 'u_aditya', visibility: 'public', cycleDays: 14, cycleEnabled: false, createdAt: ago(400) },
  { id: 't_ops', key: 'OPS', name: 'Platform & Security', description: 'Infrastructure, reliability and the compliance programme.', icon: '🛡️', color: '#14b8a6', leadId: 'u_tomas', visibility: 'public', cycleDays: 14, cycleEnabled: true, createdAt: ago(330) },
  { id: 't_gtm', key: 'GTM', name: 'Growth', description: 'Launches, lifecycle marketing and activation experiments.', icon: '📣', color: '#f97316', leadId: 'u_priya', visibility: 'public', cycleDays: 14, cycleEnabled: false, createdAt: ago(300) },
]

const memberMap: Record<string, string[]> = {
  t_eng: ['u_meera', 'u_kabir', 'u_dev', 'u_yuki', 'u_sara', 'u_aditya'],
  t_des: ['u_lena', 'u_yuki', 'u_aditya'],
  t_prd: ['u_aditya', 'u_jonas', 'u_omar', 'u_meera'],
  t_ops: ['u_tomas', 'u_amara', 'u_meera', 'u_dev'],
  t_gtm: ['u_priya', 'u_jonas', 'u_aditya'],
}

const teamMembers: TeamMember[] = []
for (const [teamId, ids] of Object.entries(memberMap)) {
  const lead = teams.find((t) => t.id === teamId)!.leadId
  ids.forEach((userId) => {
    teamMembers.push({
      id: uid('tm'), teamId, userId,
      role: userId === lead ? 'lead' : 'member',
      allocationPct: userId === lead ? 60 : pick([40, 60, 80, 100]),
      joinedAt: ago(int(60, 320)),
    })
  })
}

/* ── Workflow states (per team) ─────────────────────────────── */

const STATE_TEMPLATE: { slug: string; name: string; category: WorkflowState['category']; color: string }[] = [
  { slug: 'backlog', name: 'Backlog', category: 'backlog', color: '#8e96ad' },
  { slug: 'todo', name: 'Todo', category: 'unstarted', color: '#6366f1' },
  { slug: 'progress', name: 'In Progress', category: 'started', color: '#f59e0b' },
  { slug: 'review', name: 'In Review', category: 'started', color: '#0ea5e9' },
  { slug: 'blocked', name: 'Blocked', category: 'paused', color: '#f43f5e' },
  { slug: 'done', name: 'Done', category: 'completed', color: '#10b981' },
  { slug: 'canceled', name: 'Canceled', category: 'canceled', color: '#94a3b8' },
]

const states: WorkflowState[] = []
for (const team of teams) {
  STATE_TEMPLATE.forEach((s, i) => {
    states.push({ id: `st_${team.id}_${s.slug}`, teamId: team.id, name: s.name, category: s.category, color: s.color, order: i })
  })
}
const stateOf = (teamId: string, slug: string): string => `st_${teamId}_${slug}`

/* ── Labels ─────────────────────────────────────────────────── */

const labels: Label[] = [
  { id: 'lb_frontend', name: 'frontend', color: '#6c62f2', group: 'Area' },
  { id: 'lb_backend', name: 'backend', color: '#0ea5e9', group: 'Area' },
  { id: 'lb_infra', name: 'infra', color: '#14b8a6', group: 'Area' },
  { id: 'lb_design', name: 'design', color: '#ec4899', group: 'Area' },
  { id: 'lb_data', name: 'data', color: '#3b82f6', group: 'Area' },
  { id: 'lb_security', name: 'security', color: '#f43f5e', group: 'Area' },
  { id: 'lb_perf', name: 'performance', color: '#f59e0b', group: 'Quality' },
  { id: 'lb_a11y', name: 'accessibility', color: '#8b5cf6', group: 'Quality' },
  { id: 'lb_tech_debt', name: 'tech-debt', color: '#94a3b8', group: 'Quality' },
  { id: 'lb_customer', name: 'customer-reported', color: '#f97316', group: 'Source' },
  { id: 'lb_quickwin', name: 'quick-win', color: '#22c55e', group: 'Source' },
  { id: 'lb_needs_spec', name: 'needs-spec', color: '#a855f7', group: 'Process' },
]
const labelIds = labels.map((l) => l.id)

/* ── Shared spaces ──────────────────────────────────────────── */

const spaces: Space[] = [
  { id: 'sp_hq', name: 'Company HQ', description: 'Everything everyone needs: handbook, rituals, announcements and the quarterly plan.', icon: '🏛️', color: '#6c62f2', kind: 'company', visibility: 'open', memberIds: userIds, createdBy: 'u_aditya', createdAt: ago(400) },
  { id: 'sp_eng', name: 'Engineering Space', description: 'Architecture decisions, runbooks, on-call notes and RFCs.', icon: '🛠️', color: '#0ea5e9', kind: 'team', teamId: 't_eng', visibility: 'open', memberIds: memberMap.t_eng, createdBy: 'u_meera', createdAt: ago(360) },
  { id: 'sp_des', name: 'Design Studio', description: 'Research findings, critique notes and the design system source of truth.', icon: '🎨', color: '#ec4899', kind: 'team', teamId: 't_des', visibility: 'open', memberIds: memberMap.t_des, createdBy: 'u_lena', createdAt: ago(340) },
  { id: 'sp_atlas', name: 'Atlas — Payments 2.0', description: 'Shared space for the payments re-platform: specs, decisions and launch checklist.', icon: '💳', color: '#f59e0b', kind: 'project', visibility: 'open', memberIds: ['u_meera', 'u_dev', 'u_kabir', 'u_aditya', 'u_sara', 'u_omar'], createdBy: 'u_meera', createdAt: ago(120) },
  { id: 'sp_trust', name: 'Trust & Compliance', description: 'SOC 2 evidence, policies, vendor reviews. Closed space — auditors and owners only.', icon: '🛡️', color: '#f43f5e', kind: 'team', teamId: 't_ops', visibility: 'closed', memberIds: ['u_amara', 'u_tomas', 'u_meera', 'u_aditya'], createdBy: 'u_amara', createdAt: ago(150) },
]

/* ── Projects ───────────────────────────────────────────────── */

const P = (
  id: string, key: string, name: string, summary: string, icon: string, color: string,
  status: Project['status'], health: Project['health'], priority: Priority, leadId: string,
  teamIds: string[], memberIds: string[], start: number, target: number, tags: string[],
  spaceId: string | undefined, description: string, healthNote?: string,
): Project => ({
  id, key, name, summary, description, icon, color, status, health, healthNote, priority, leadId,
  memberIds, teamIds, tags, spaceId,
  startDate: ago(start), targetDate: ahead(target),
  completedAt: status === 'completed' ? ago(9) : undefined,
  budgetHours: int(400, 1400),
  onboarding: { step: 5, completedSteps: ['basics', 'team', 'milestones', 'workflow', 'kickoff'], done: true },
  createdAt: ago(start + 8), updatedAt: ago(int(0, 3)),
})

const projects: Project[] = [
  P('p_atlas', 'ATL', 'Atlas — Payments 2.0', 'Re-platform the payments stack onto the new ledger with multi-currency settlement.', '💳', '#f59e0b',
    'in_progress', 'at_risk', 4, 'u_meera', ['t_eng', 't_prd'], ['u_meera', 'u_dev', 'u_kabir', 'u_aditya', 'u_sara', 'u_omar'], 96, 38,
    ['revenue', 'platform', 'h2-bet'], 'sp_atlas',
    'Atlas replaces the legacy payments monolith with a double-entry ledger, an idempotent charge API and multi-currency settlement.\n\nThe programme covers three surfaces: the ledger service, the merchant-facing API and the reconciliation tooling used by finance. Migration is dual-write first, then a staged cutover per merchant tier.',
    'Settlement reconciliation is 2 weeks behind — vendor sandbox instability. Mitigation plan agreed, tracking weekly.'),
  P('p_nova', 'NOV', 'Nova — Mobile Revamp', 'Rebuild the mobile web experience around the new design system.', '📱', '#ec4899',
    'in_progress', 'on_track', 3, 'u_lena', ['t_des', 't_eng'], ['u_lena', 'u_yuki', 'u_kabir', 'u_aditya'], 62, 24,
    ['design-system', 'mobile'], undefined,
    'Nova rebuilds every mobile surface on the new component library, with a hard budget of 180KB JS on first paint and an AA accessibility bar.',
    'Ahead on component migration, one week of buffer left in the plan.'),
  P('p_vault', 'VLT', 'Vault — SOC 2 Type II', 'Achieve SOC 2 Type II with a 6-month observation window.', '🔐', '#f43f5e',
    'in_progress', 'off_track', 4, 'u_amara', ['t_ops'], ['u_amara', 'u_tomas', 'u_meera'], 130, 20,
    ['compliance', 'security', 'must-ship'], 'sp_trust',
    'Vault covers policy authoring, control implementation, evidence automation and the external audit. The observation window cannot start until all 61 controls are implemented.',
    'Access-review automation slipped twice; 9 controls still unimplemented against a fixed audit date.'),
  P('p_beacon', 'BCN', 'Beacon — Customer Portal', 'Self-serve portal for invoices, usage and seat management.', '🧭', '#0ea5e9',
    'planned', 'unknown', 2, 'u_aditya', ['t_prd', 't_eng'], ['u_aditya', 'u_kabir', 'u_omar', 'u_lena'], 20, 74,
    ['self-serve', 'retention'], undefined,
    'Beacon reduces support load by giving admins direct control over invoices, usage limits and seats. Discovery complete; build starts after Atlas cutover.',
    undefined),
  P('p_pulse', 'PLS', 'Pulse — Analytics v1', 'Ship the in-product analytics dashboard with saved reports.', '📊', '#3b82f6',
    'completed', 'on_track', 2, 'u_jonas', ['t_prd', 't_eng'], ['u_jonas', 'u_kabir', 'u_aditya'], 190, -9,
    ['analytics', 'shipped'], undefined,
    'Pulse shipped in-product dashboards backed by the new metrics warehouse, with saved reports and CSV export.',
    'Shipped and stable. Adoption at 41% of active workspaces.'),
  P('p_signal', 'SIG', 'Signal — Launch Campaign', 'Go-to-market for the Atlas and Nova releases.', '📣', '#f97316',
    'in_progress', 'on_track', 3, 'u_priya', ['t_gtm'], ['u_priya', 'u_jonas', 'u_aditya', 'u_lena'], 44, 30,
    ['launch', 'marketing'], undefined,
    'Signal coordinates the launch: positioning, site refresh, lifecycle sequences, docs and the customer webinar.',
    'On plan. Blocked items are all downstream of the Atlas date.'),
  P('p_sentinel', 'SEN', 'Sentinel — Reliability', 'Get to 99.95% availability with an error-budget policy.', '⚡', '#14b8a6',
    'backlog', 'unknown', 2, 'u_tomas', ['t_ops'], ['u_tomas', 'u_meera', 'u_dev'], 6, 120,
    ['reliability', 'sre'], undefined,
    'Sentinel formalises SLOs, error budgets and incident response. Scoped, not yet staffed — starts once Vault clears the audit.',
    undefined),
]

/* ── Milestones ─────────────────────────────────────────────── */

const milestoneSpec: Record<string, [string, number, Milestone['status'], string][]> = {
  p_atlas: [
    ['Ledger service GA', -34, 'done', 'Double-entry ledger live in production behind a flag.'],
    ['Dual-write migration', -6, 'done', 'All charges written to both legacy and new ledger.'],
    ['Settlement reconciliation', 16, 'in_progress', 'Automated recon for all 4 supported currencies.'],
    ['Merchant cutover — tier 1', 38, 'upcoming', 'Top 50 merchants fully on Atlas.'],
  ],
  p_nova: [
    ['Design system v2', -20, 'done', 'All primitives shipped and documented.'],
    ['Core flows migrated', 5, 'in_progress', 'Onboarding, checkout and settings on the new library.'],
    ['Perf + a11y sign-off', 24, 'upcoming', 'Under 180KB JS, AA audit clean.'],
  ],
  p_vault: [
    ['Policy set approved', -60, 'done', 'All 14 policies signed off by leadership.'],
    ['Controls implemented', -3, 'missed', '61 controls in place and evidenced.'],
    ['Observation window opens', 20, 'upcoming', 'Six-month window starts; no gaps permitted.'],
  ],
  p_beacon: [
    ['Discovery complete', -12, 'done', 'Interviews, sizing and success metrics agreed.'],
    ['Portal beta', 46, 'upcoming', '20 design partners in the beta.'],
    ['General availability', 74, 'upcoming', 'Open to all workspaces.'],
  ],
  p_pulse: [
    ['Warehouse pipeline', -120, 'done', 'dbt models and nightly loads.'],
    ['Dashboard GA', -9, 'done', 'Shipped to all plans.'],
  ],
  p_signal: [
    ['Positioning locked', -14, 'done', 'Messaging house and launch narrative approved.'],
    ['Site refresh live', 12, 'in_progress', 'New pricing and product pages.'],
    ['Launch day', 30, 'upcoming', 'Webinar, press and lifecycle sends.'],
  ],
  p_sentinel: [
    ['SLO catalogue', 40, 'upcoming', 'Every tier-1 service has an SLO and error budget.'],
  ],
}

const milestones: Milestone[] = []
for (const [projectId, specs] of Object.entries(milestoneSpec)) {
  specs.forEach(([name, offset, status, description], i) => {
    milestones.push({
      id: `ms_${projectId}_${i}`, projectId, name, description,
      targetDate: offset < 0 ? ago(-offset) : ahead(offset),
      status, order: i,
    })
  })
}

/* ── Cycles ─────────────────────────────────────────────────── */

const cycles: Cycle[] = []
function buildCycles(teamId: string, startNumber: number, goals: string[]) {
  const anchor = startOfWeek(subDays(TODAY, 21), { weekStartsOn: 1 })
  for (let i = 0; i < 4; i++) {
    const start = addDays(anchor, i * 14)
    const end = addDays(start, 13)
    const status: Cycle['status'] = end < TODAY ? 'completed' : start <= TODAY ? 'active' : 'upcoming'
    // snapshots are rebuilt from real issues once cycle distribution runs below
    cycles.push({
      id: `cy_${teamId}_${startNumber + i}`, teamId, number: startNumber + i,
      name: `Cycle ${startNumber + i}`, goal: goals[i] ?? 'Keep the roadmap moving and cut the bug backlog.',
      startDate: iso(start), endDate: iso(end), status, snapshots: [],
    })
  }
}
buildCycles('t_eng', 41, [
  'Close out dual-write migration and stabilise the ledger.',
  'Settlement reconciliation end-to-end in staging.',
  'Reconciliation to production + tier-1 cutover rehearsal.',
  'Merchant cutover wave 1 and legacy read-path removal.',
])
buildCycles('t_des', 18, [
  'Design system v2 primitives complete.',
  'Migrate onboarding and checkout to new components.',
  'Settings, empty states and the a11y sweep.',
  'Marketing surfaces and launch assets.',
])
buildCycles('t_ops', 12, [
  'Evidence automation for access reviews.',
  'Close the remaining 14 controls.',
  'Audit dry run and gap remediation.',
  'Observation window readiness.',
])

/* ── Issues ─────────────────────────────────────────────────── */

type Bank = { epics: string[]; labels: string[]; items: [string, IssueType][] }

const BANKS: Record<string, Bank> = {
  p_atlas: {
    epics: ['Ledger core', 'Merchant API', 'Settlement & reconciliation'],
    labels: ['lb_backend', 'lb_infra', 'lb_perf', 'lb_security', 'lb_tech_debt', 'lb_customer'],
    items: [
      ['Double-entry posting engine', 'story'], ['Idempotency keys on charge endpoint', 'story'],
      ['Currency rounding rules per ISO 4217', 'task'], ['Backfill legacy charges into new ledger', 'task'],
      ['Charge API returns stale balance after refund', 'bug'], ['Spike: settlement file formats across PSPs', 'spike'],
      ['Reconciliation worker with retry + DLQ', 'story'], ['Merchant tier cutover runbook', 'task'],
      ['Ledger read replica lag alerting', 'task'], ['Webhook signing key rotation', 'story'],
      ['Duplicate settlement rows on partial capture', 'bug'], ['Multi-currency FX snapshot at capture time', 'story'],
      ['Deprecate v1 charge endpoints', 'chore'], ['Payment method vaulting for cards', 'story'],
      ['3DS challenge flow for EU merchants', 'story'], ['Refund partial capture mismatch', 'bug'],
      ['Load test ledger at 4k TPS', 'task'], ['Finance export: daily settlement CSV', 'story'],
      ['Sandbox instability from PSP vendor', 'bug'], ['Dual-write drift detector', 'task'],
      ['Chargeback ingestion pipeline', 'story'], ['Audit trail for every ledger mutation', 'story'],
      ['Remove feature flag payments_v2_dual_write', 'chore'], ['Merchant onboarding API keys UI', 'task'],
    ],
  },
  p_nova: {
    epics: ['Design system v2', 'Core flow migration', 'Performance & a11y'],
    labels: ['lb_frontend', 'lb_design', 'lb_a11y', 'lb_perf', 'lb_tech_debt'],
    items: [
      ['Button, Input and Select primitives', 'story'], ['Token pipeline from Figma variables', 'story'],
      ['Migrate onboarding to new components', 'story'], ['Checkout sheet on mobile viewport', 'story'],
      ['Sticky header overlaps modal on iOS', 'bug'], ['Bottom sheet drag gesture', 'story'],
      ['Reduce first-load JS under 180KB', 'task'], ['Focus trap in dialogs', 'task'],
      ['Screen reader labels on icon buttons', 'task'], ['Dark mode token audit', 'task'],
      ['Settings screens migration', 'story'], ['Skeleton loaders for slow networks', 'task'],
      ['Input zoom on focus in mobile Safari', 'bug'], ['Empty states illustration set', 'story'],
      ['Motion spec for page transitions', 'spike'], ['Drop legacy CSS bundle', 'chore'],
      ['Contrast failures on secondary buttons', 'bug'], ['Responsive data table pattern', 'story'],
    ],
  },
  p_vault: {
    epics: ['Policies & governance', 'Control implementation', 'Evidence automation'],
    labels: ['lb_security', 'lb_infra', 'lb_tech_debt', 'lb_needs_spec'],
    items: [
      ['Access review automation — quarterly', 'story'], ['Encrypt backups at rest with KMS', 'task'],
      ['Vendor risk register', 'task'], ['Change management control evidence', 'story'],
      ['Offboarding checklist not enforced', 'bug'], ['Centralised audit logging', 'story'],
      ['Pen test remediation — findings 1-6', 'task'], ['Security awareness training rollout', 'chore'],
      ['MFA enforcement on all admin consoles', 'task'], ['Incident response tabletop exercise', 'task'],
      ['Data retention policy implementation', 'story'], ['Evidence collector for CI approvals', 'story'],
      ['Secrets scanning in pipelines', 'task'], ['Asset inventory drift', 'bug'],
    ],
  },
  p_beacon: {
    epics: ['Portal foundation', 'Billing self-serve'],
    labels: ['lb_frontend', 'lb_backend', 'lb_needs_spec', 'lb_customer'],
    items: [
      ['Invoice list and PDF download', 'story'], ['Seat management with proration preview', 'story'],
      ['Usage meters per workspace', 'story'], ['Role-based access for portal admins', 'task'],
      ['Spike: billing provider webhooks', 'spike'], ['Portal information architecture', 'task'],
      ['Support ticket deflection metrics', 'task'], ['Plan upgrade flow', 'story'],
    ],
  },
  p_pulse: {
    epics: ['Warehouse & modelling', 'Dashboard UI'],
    labels: ['lb_data', 'lb_frontend', 'lb_perf'],
    items: [
      ['dbt models for activation funnel', 'story'], ['Saved reports with sharing', 'story'],
      ['CSV export with async job', 'task'], ['Chart colour palette for dark mode', 'task'],
      ['Query timeout on 90-day range', 'bug'], ['Metrics definitions doc', 'chore'],
      ['Dashboard load under 1.2s p95', 'task'], ['Cohort retention chart', 'story'],
    ],
  },
  p_signal: {
    epics: ['Launch narrative', 'Channels'],
    labels: ['lb_design', 'lb_data', 'lb_quickwin'],
    items: [
      ['Messaging house and positioning', 'story'], ['Pricing page refresh', 'story'],
      ['Lifecycle email sequence — 5 sends', 'story'], ['Customer webinar run of show', 'task'],
      ['Docs refresh for Atlas endpoints', 'task'], ['Launch-day social kit', 'task'],
      ['Analyst briefing deck', 'task'], ['Changelog entry and in-app announcement', 'chore'],
    ],
  },
  p_sentinel: {
    epics: ['SLO foundation'],
    labels: ['lb_infra', 'lb_perf', 'lb_tech_debt'],
    items: [
      ['Define SLIs for tier-1 services', 'story'], ['Error budget policy draft', 'task'],
      ['Alert routing cleanup', 'task'], ['Incident postmortem template', 'chore'],
    ],
  },
}

/* Unparented triage work, per team — what a real inbox looks like */
const TRIAGE: [string, string, IssueType][] = [
  ['t_eng', 'Session expires early on Safari 17', 'bug'],
  ['t_eng', 'Upgrade Node runtime to 22 LTS', 'chore'],
  ['t_eng', 'Flaky test: checkout.spec.ts', 'bug'],
  ['t_eng', 'Add tracing to the notification worker', 'task'],
  ['t_des', 'Audit icon set for duplicates', 'chore'],
  ['t_des', 'Research: what do admins do on day one?', 'spike'],
  ['t_ops', 'Rotate staging database credentials', 'task'],
  ['t_ops', 'Terraform drift in the eu-west account', 'bug'],
  ['t_gtm', 'Retire the old lifecycle sequence', 'chore'],
  ['t_prd', 'Write the Q4 planning brief', 'task'],
]

const issues: Issue[] = []
const issueLinks: IssueLink[] = []
const seqByTeam: Record<string, number> = { t_eng: 100, t_des: 40, t_prd: 20, t_ops: 55, t_gtm: 15 }

function nextKey(teamId: string): { key: string; seq: number } {
  seqByTeam[teamId] += 1
  const seq = seqByTeam[teamId]
  return { key: `${teams.find((t) => t.id === teamId)!.key}-${seq}`, seq }
}

/**
 * How much of each project is finished. These are deliberate, not random:
 * Orbit compares progress against elapsed schedule, so a portfolio where every
 * project happens to land 40 points behind teaches the reader nothing. Atlas and
 * Vault are meant to read as troubled; Nova and Signal as healthy.
 */
const DONE_RATIO: Record<string, number> = {
  p_atlas: 0.6,    // 72% of the schedule elapsed — slipping, matches "at risk"
  p_nova: 0.74,    // 72% elapsed — tracking
  p_vault: 0.66,   // 87% elapsed — clearly behind, matches "off track"
  p_beacon: 0.18,  // 21% elapsed — early, on plan
  p_pulse: 0.95,   // shipped
  p_signal: 0.62,  // 59% elapsed — slightly ahead
  p_sentinel: 0.0, // not started
}

/** Deterministic state mix for a project's backlog, then shuffled. */
function buildStatePlan(count: number, project: Project): string[] {
  if (project.status === 'completed') {
    return Array.from({ length: count }, () => (chance(0.92) ? 'done' : 'canceled'))
  }
  if (project.status === 'backlog') {
    return Array.from({ length: count }, () => (chance(0.8) ? 'backlog' : 'todo'))
  }

  const ratio = DONE_RATIO[project.id] ?? 0.4
  const plan: string[] = []
  const done = Math.round(count * ratio)
  for (let i = 0; i < done; i++) plan.push('done')

  const rest = count - done
  // Troubled projects carry visible blockers; healthy ones rarely do.
  const blocked = project.status !== 'in_progress'
    ? 0
    : project.health === 'on_track' ? Math.min(1, rest) : Math.min(rest, project.health === 'off_track' ? 3 : 2)
  const review = Math.round(rest * 0.16)
  const progress = Math.round(rest * 0.26)
  const todo = Math.round(rest * 0.3)
  for (let i = 0; i < blocked; i++) plan.push('blocked')
  for (let i = 0; i < review; i++) plan.push('review')
  for (let i = 0; i < progress; i++) plan.push('progress')
  for (let i = 0; i < todo; i++) plan.push('todo')
  while (plan.length < count) plan.push('backlog')
  plan.length = count

  // Fisher-Yates with the seeded RNG so the board is mixed but reproducible
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[plan[i], plan[j]] = [plan[j], plan[i]]
  }
  return plan
}

function makeIssue(opts: {
  teamId: string; projectId?: string; parentId?: string; type: IssueType; title: string
  stateSlug: string; createdDaysAgo: number; assigneeId?: string; order: number
  cycleId?: string; milestoneId?: string; priority?: Priority; estimate?: number
  labelIds?: string[]; description?: string; dueInDays?: number
}): Issue {
  const { key, seq } = nextKey(opts.teamId)
  const stateId = stateOf(opts.teamId, opts.stateSlug)
  const done = opts.stateSlug === 'done'
  const canceled = opts.stateSlug === 'canceled'
  const started = ['progress', 'review', 'blocked'].includes(opts.stateSlug) || done
  const createdAt = ago(opts.createdDaysAgo)
  const startedAt = started ? ago(Math.max(1, opts.createdDaysAgo - int(1, 4))) : undefined
  const completedAt = done ? ago(Math.max(0, opts.createdDaysAgo - int(3, 9))) : undefined
  return {
    id: uid('is'), key, seq, teamId: opts.teamId, projectId: opts.projectId, parentId: opts.parentId,
    type: opts.type, title: opts.title,
    description: opts.description ?? '',
    stateId, priority: opts.priority ?? (pick([0, 1, 2, 2, 3, 3, 4]) as Priority),
    assigneeId: opts.assigneeId, reporterId: opts.assigneeId ?? pick(userIds),
    labelIds: opts.labelIds ?? (chance(0.65) ? [pick(labelIds)] : []),
    estimate: opts.estimate ?? pick([1, 2, 2, 3, 3, 5, 5, 8, 13]),
    cycleId: opts.cycleId, milestoneId: opts.milestoneId,
    startDate: startedAt, dueDate: opts.dueInDays !== undefined ? ahead(opts.dueInDays) : undefined,
    order: opts.order,
    checklist: chance(0.25)
      ? [
          { id: uid('ck'), text: 'Spec reviewed with the team', done: true },
          { id: uid('ck'), text: 'Tests written', done: done || chance(0.4) },
          { id: uid('ck'), text: 'Docs updated', done: done && chance(0.6) },
        ]
      : [],
    subscriberIds: opts.assigneeId ? [opts.assigneeId] : [],
    customFields: {},
    createdAt, updatedAt: ago(int(0, Math.max(1, Math.min(9, opts.createdDaysAgo)))),
    startedAt, completedAt,
    canceledAt: canceled ? ago(int(2, 20)) : undefined,
  }
}

for (const project of projects) {
  const bank = BANKS[project.id]
  if (!bank) continue
  const primaryTeam = project.teamIds[0]
  const projectMilestones = milestones.filter((m) => m.projectId === project.id)
  const epicIds: string[] = []

  bank.epics.forEach((name, i) => {
    const epic = makeIssue({
      teamId: primaryTeam, projectId: project.id, type: 'epic', title: name,
      // Epics track the project's own stage — a backlog project cannot have a finished epic.
      stateSlug: project.status === 'completed' ? 'done'
        : project.status === 'backlog' ? 'backlog'
        : project.status === 'planned' ? (i === 0 ? 'todo' : 'backlog')
        : i === 0 ? 'done' : i === 1 ? 'progress' : 'todo',
      createdDaysAgo: int(70, 110), assigneeId: project.leadId, order: i * 1000,
      priority: 3, estimate: 0, labelIds: [],
      milestoneId: projectMilestones[i]?.id,
      description: `Umbrella epic tracking **${name}** for ${project.name}.`,
    })
    issues.push(epic)
    epicIds.push(epic.id)
  })

  const statePlan = buildStatePlan(bank.items.length, project)

  bank.items.forEach(([title, type], i) => {
    const stateSlug = statePlan[i]
    // Most work belongs to the team that owns the project; only a slice goes to a partner team.
    const teamId = project.teamIds.length > 1 && chance(0.16) ? project.teamIds[1] : primaryTeam
    const assignee = chance(0.88) ? pick(project.memberIds) : undefined
    const issue = makeIssue({
      teamId, projectId: project.id, parentId: epicIds[i % epicIds.length],
      type, title, stateSlug,
      createdDaysAgo: int(4, 80), assigneeId: assignee, order: (i + 1) * 100,
      milestoneId: chance(0.5) ? pick(projectMilestones)?.id : undefined,
      priority: type === 'bug' ? (pick([2, 3, 3, 4]) as Priority) : undefined,
      labelIds: chance(0.72) ? [pick(bank.labels)] : [],
      dueInDays: chance(0.3) ? int(-6, 30) : undefined,
      description: chance(0.5)
        ? `### Context\n${title} — raised during ${project.name} planning.\n\n### Acceptance criteria\n- [ ] Behaviour verified in staging\n- [ ] Metrics/alerts in place\n- [ ] Docs updated`
        : '',
    })
    issues.push(issue)
  })
}

TRIAGE.forEach(([teamId, title, type], i) => {
  issues.push(makeIssue({
    teamId, type, title, stateSlug: chance(0.5) ? 'backlog' : 'todo',
    createdDaysAgo: int(1, 18), assigneeId: chance(0.5) ? pick(memberMap[teamId]) : undefined,
    order: (i + 1) * 100, priority: pick([0, 1, 2, 3]) as Priority,
  }))
})

/* ── Cycle distribution ─────────────────────────────────────────
   Completed work has to live inside cycles or every burndown, velocity
   bar and "on pace" check reads zero. Finished issues are dealt into past
   cycles (with completedAt moved inside that cycle's window), some into
   the active cycle up to today, and open work fills the rest. */

const dayBetween = (start: Date, end: Date): Date => new Date(+start + rnd() * Math.max(0, +end - +start))

for (const team of teams) {
  const teamCycles = cycles.filter((c) => c.teamId === team.id).sort((a, b) => a.number - b.number)
  if (!teamCycles.length) continue

  const doneStateId = stateOf(team.id, 'done')
  const canceledStateId = stateOf(team.id, 'canceled')
  const pool = issues.filter((i) => i.teamId === team.id && i.type !== 'epic')
  const finished = pool.filter((i) => i.stateId === doneStateId)
  const openWork = pool.filter((i) => i.stateId !== doneStateId && i.stateId !== canceledStateId)

  let cursor = 0
  const dealFinished = (cycle: Cycle, count: number, until: Date) => {
    for (let k = 0; k < count && cursor < finished.length; k++) {
      const issue = finished[cursor++]
      const completed = dayBetween(new Date(cycle.startDate), until)
      issue.cycleId = cycle.id
      issue.completedAt = iso(completed)
      issue.startedAt = iso(subDays(completed, int(1, 6)))
      issue.updatedAt = issue.completedAt
    }
  }

  // The active cycle is dealt first — it is the one every burndown and
  // "on pace" check reads, so it must never be left with zero finished work.
  const active = teamCycles.find((c) => c.status === 'active')
  if (active) {
    dealFinished(active, Math.max(3, Math.round(finished.length * 0.45)), TODAY)
    for (const issue of openWork.filter((i) => !i.cycleId).slice(0, int(7, 11))) issue.cycleId = active.id
  }

  for (const cycle of teamCycles.filter((c) => c.status === 'completed')) {
    dealFinished(cycle, int(4, 8), new Date(cycle.endDate))
  }

  const next = teamCycles.find((c) => c.status === 'upcoming')
  if (next) {
    for (const issue of openWork.filter((i) => !i.cycleId).slice(0, int(4, 8))) issue.cycleId = next.id
  }

  // Rebuild each cycle's stored snapshots from the issues that actually landed in it
  for (const cycle of teamCycles) {
    const inCycle = issues.filter((i) => i.cycleId === cycle.id)
    const scope = inCycle.reduce((sum, i) => sum + (i.estimate ?? 0), 0)
    if (cycle.status === 'upcoming' || !scope) { cycle.snapshots = []; continue }
    const start = new Date(cycle.startDate)
    const end = new Date(cycle.endDate)
    const last = cycle.status === 'completed' ? end : TODAY
    const days = Math.max(1, Math.ceil((+last - +start) / 86400000))
    cycle.snapshots = Array.from({ length: days }, (_, d) => {
      const day = addDays(start, d)
      const completed = inCycle
        .filter((i) => i.completedAt && new Date(i.completedAt) <= day)
        .reduce((sum, i) => sum + (i.estimate ?? 0), 0)
      return { date: iso(day), remaining: scope - completed, completed, scope }
    })
  }
}

/* Dependencies — a few real blockers so the graph has teeth */
const atlasIssues = issues.filter((i) => i.projectId === 'p_atlas' && i.type !== 'epic')
const novaIssues = issues.filter((i) => i.projectId === 'p_nova' && i.type !== 'epic')
const vaultIssues = issues.filter((i) => i.projectId === 'p_vault' && i.type !== 'epic')
function link(from?: Issue, to?: Issue, type: IssueLink['type'] = 'blocks') {
  if (!from || !to || from.id === to.id) return
  issueLinks.push({ id: uid('lk'), fromId: from.id, toId: to.id, type, createdAt: ago(int(1, 30)) })
}
link(atlasIssues[6], atlasIssues[7])
link(atlasIssues[18], atlasIssues[6])
link(atlasIssues[11], atlasIssues[17])
link(atlasIssues[3], atlasIssues[19], 'relates_to')
link(novaIssues[0], novaIssues[2])
link(novaIssues[6], novaIssues[15])
link(vaultIssues[0], vaultIssues[11])
link(vaultIssues[8], vaultIssues[4], 'relates_to')

/* ── Docs ───────────────────────────────────────────────────── */

const D = (
  id: string, title: string, icon: string, kind: Doc['kind'], authorId: string,
  body: string, opts: Partial<Doc> = {},
): Doc => ({
  id, title, icon, kind, authorId, body,
  spaceId: opts.spaceId, projectId: opts.projectId, parentId: opts.parentId,
  status: opts.status ?? 'published',
  collaboratorIds: opts.collaboratorIds ?? [],
  tags: opts.tags ?? [], pinned: opts.pinned ?? false,
  createdAt: opts.createdAt ?? ago(int(20, 200)),
  updatedAt: opts.updatedAt ?? ago(int(0, 12)),
  versions: [],
})

const docs: Doc[] = [
  D('dc_handbook', 'How we work at Nimbus', '📕', 'doc', 'u_aditya', `# How we work

We optimise for **short feedback loops** and written thinking. Three rules cover most situations.

## 1. Write it down
Any decision that outlives the meeting gets a doc in the relevant space. A decision doc is three paragraphs, not thirty: the choice, the alternatives, and what would make us reverse it.

## 2. One owner, always
Every project, issue and risk has exactly one accountable owner. Shared ownership means nobody is accountable when the date slips.

## 3. Status is a fact, not a mood
Project health is \`on track\`, \`at risk\` or \`off track\`. "At risk" is not a failure — hiding it is.

## Rituals
| Ritual | Cadence | Owner |
| --- | --- | --- |
| Cycle planning | Every 2nd Monday | Team lead |
| Project health update | Friday | Project lead |
| Retro | End of cycle | Rotating |
| Roadmap review | Monthly | Product |

> If a ritual stops producing decisions, we kill it.`, { spaceId: 'sp_hq', pinned: true, collaboratorIds: ['u_meera', 'u_lena'], tags: ['handbook'] }),

  D('dc_q3', 'Q3 2026 plan on a page', '🎯', 'doc', 'u_aditya', `# Q3 2026 — plan on a page

## The bet
Payments is the wedge. If Atlas lands with tier-1 merchants this quarter, expansion revenue follows in Q4.

## Three outcomes
1. **Atlas cutover for tier-1 merchants** — 50 merchants fully migrated, zero settlement incidents.
2. **Nova ships to 100% of mobile traffic** — under 180KB JS, AA accessibility.
3. **SOC 2 observation window opens** — all 61 controls implemented.

## Explicitly not doing
- Beacon build (discovery only)
- Sentinel staffing
- Any new integrations

## How we'll know
Weekly: cycle throughput, escaped defects, settlement recon lag.
Monthly: activation rate, expansion pipeline.`, { spaceId: 'sp_hq', pinned: true, tags: ['planning', 'okr'] }),

  D('dc_ledger_rfc', 'RFC-014: Double-entry ledger', '📐', 'spec', 'u_dev', `# RFC-014 — Double-entry ledger

**Status:** Accepted · **Author:** Devansh Kapoor · **Reviewers:** Meera, Kabir

## Problem
The legacy payments schema stores a single mutable \`balance\` per merchant. Refunds, partial captures and FX adjustments all mutate it in place, so we cannot reconstruct history, and finance reconciles by hand every month.

## Proposal
A strict double-entry ledger. Every movement is a pair of postings that sum to zero, appended, never updated.

\`\`\`sql
create table posting (
  id            bigserial primary key,
  entry_id      uuid not null,
  account_id    uuid not null,
  amount_minor  bigint not null,     -- signed
  currency      char(3) not null,
  created_at    timestamptz not null default now()
);
create index on posting (account_id, created_at desc);
\`\`\`

Balance becomes a **derived** value: \`sum(amount_minor) where account_id = ?\`. Hot accounts get a rolling snapshot table refreshed every minute.

## Invariants
1. Every entry's postings sum to zero, per currency.
2. Postings are immutable. Corrections are new, compensating entries.
3. FX rate is captured **at capture time** and stored on the entry.

## Alternatives considered
- *Keep mutable balances, add an audit table* — cheaper, but audit and truth can diverge, which is exactly today's failure.
- *Buy a ledger vendor* — 14-week integration and we lose control of the settlement schedule.

## What would make us reverse this
Sustained write latency above 40ms p99 at 4k TPS, or reconciliation complexity exceeding the manual process it replaced.`, { spaceId: 'sp_atlas', projectId: 'p_atlas', pinned: true, collaboratorIds: ['u_meera', 'u_kabir'], tags: ['rfc', 'architecture'] }),

  D('dc_cutover', 'Atlas cutover runbook', '🔁', 'runbook', 'u_meera', `# Atlas cutover runbook

**Blast radius:** all charges for the selected merchant tier. **Rollback window:** 30 minutes.

## Pre-flight (T-24h)
- [x] Dual-write drift detector reporting zero deltas for 72h
- [x] Settlement recon green for 4 consecutive days
- [ ] On-call staffed: 2 engineers + 1 SRE
- [ ] Finance notified of the settlement pause window

## Cutover (T-0)
1. Set \`payments_v2_read_path\` to \`true\` for the merchant cohort.
2. Watch \`charge_error_rate\` and \`ledger_write_latency_p99\` for 15 minutes.
3. Run \`bin/verify-cohort --tier 1\` — expect 100% parity.
4. Announce in #payments-launch.

## Rollback
Flip the flag back. Dual-write means the legacy path is still current — no data migration is needed to roll back.

## Known risks
- PSP sandbox instability has produced false parity failures. Confirm against production before rolling back.`, { spaceId: 'sp_atlas', projectId: 'p_atlas', kind: 'runbook', tags: ['runbook', 'launch'] }),

  D('dc_decision_fx', 'Decision: FX rate captured at authorisation', '⚖️', 'decision', 'u_meera', `# Decision — capture FX at authorisation

**Date:** ${format(subDays(TODAY, 26), 'MMMM d, yyyy')} · **Decider:** Meera Raghavan · **Consulted:** Finance, Devansh

## Decision
We snapshot the FX rate at **authorisation**, store it on the ledger entry, and use it for capture, refund and settlement.

## Why
Merchants price at authorisation. Using the settlement-day rate produced 0.4–1.2% discrepancies that finance absorbed manually and merchants disputed.

## Consequences
- We carry FX risk between auth and settlement. Treasury has accepted this, capped at 7 days.
- Refunds after 7 days use the original rate and may differ from the market — documented in the merchant API changelog.

## Reversal trigger
FX exposure above $50k/month, or treasury withdrawing the cap.`, { spaceId: 'sp_atlas', projectId: 'p_atlas', tags: ['decision'] }),

  D('dc_ds', 'Design system v2 — foundations', '🎨', 'spec', 'u_lena', `# Design system v2 — foundations

## Principles
1. **Tokens, not values.** No component hard-codes a hex, radius or spacing step.
2. **Two themes, one source.** Light and dark are the same tokens with different values, generated from Figma variables.
3. **Density is a mode.** Comfortable and compact share components; only spacing tokens change.

## Type scale
| Token | Size / line | Use |
| --- | --- | --- |
| \`text-2xs\` | 11 / 16 | Metadata, chips |
| \`text-xs\` | 12 / 16 | Labels, table headers |
| \`text-sm\` | 14 / 20 | Body default |
| \`text-base\` | 16 / 24 | Mobile inputs, long-form |
| \`text-xl\` | 20 / 28 | Section titles |

## Non-negotiables
- Every interactive target is at least 44×44 on touch.
- Focus is always visible — no \`outline: none\` without a replacement.
- Colour never carries meaning alone; pair it with an icon or a label.`, { spaceId: 'sp_des', projectId: 'p_nova', pinned: true, collaboratorIds: ['u_yuki'], tags: ['design-system'] }),

  D('dc_research', 'Research: mobile checkout drop-off', '🔬', 'doc', 'u_lena', `# Research — mobile checkout drop-off

**Method:** 11 moderated sessions + funnel analysis over 30 days.

## Headline
Drop-off is **not** about payment fear. It is about the keyboard.

## What we saw
- 7 of 11 participants lost their place when the keyboard opened; the page scrolled and the CTA moved off-screen.
- 4 participants zoomed in on the card field (font under 16px) and could not zoom back out.
- Nobody read the trust badges. Two participants covered them with a thumb.

## Recommendations
1. Fix the viewport behaviour first — it is worth more than any copy change.
2. Card inputs at 16px minimum on mobile.
3. Persistent summary bar so the total is never occluded.

## Impact estimate
Funnel maths puts the keyboard fixes at **+2.1 to +3.4pp** conversion on mobile.`, { spaceId: 'sp_des', projectId: 'p_nova', tags: ['research'] }),

  D('dc_oncall', 'On-call handbook', '📟', 'runbook', 'u_tomas', `# On-call handbook

## Rotation
One primary, one secondary, weekly, handover Wednesday 10:00 IST.

## Severity
| Sev | Meaning | Response | Comms |
| --- | --- | --- | --- |
| Sev1 | Money or data at risk | 5 min | Status page + exec |
| Sev2 | Core flow degraded | 15 min | #incidents |
| Sev3 | Minor, workaround exists | Next business day | Ticket |

## First five minutes
1. Acknowledge the page. Silence is the only real failure.
2. Post in #incidents: what you see, what you're checking.
3. Stabilise before diagnosing — roll back, flag off, scale out.
4. Only then find the cause.

## After
Postmortem within 3 business days. Blameless, with action items that have owners and dates.`, { spaceId: 'sp_eng', tags: ['runbook', 'oncall'] }),

  D('dc_retro41', 'Retro — Cycle 41', '🔁', 'retro', 'u_meera', `# Retro — Cycle 41

**Participants:** Meera, Kabir, Devansh, Yuki, Sara

## What went well
- Dual-write shipped a cycle early.
- Zero escaped Sev1s.
- The drift detector caught two data bugs before finance did.

## What hurt
- PSP sandbox was down 3 of 10 working days; two people were blocked and did not say so for four days.
- Estimates on reconciliation work were off by ~2×. We had never done it before.

## Actions
| Action | Owner | Due |
| --- | --- | --- |
| Blocked > 1 day must be flagged in standup | Meera | Ongoing |
| Spike unfamiliar work before estimating it | Kabir | Cycle 42 |
| Escalate PSP sandbox SLA with the vendor | Devansh | ${format(addDays(TODAY, 5), 'MMM d')} |`, { spaceId: 'sp_eng', tags: ['retro'] }),

  D('dc_soc2', 'SOC 2 control matrix — status', '🛡️', 'doc', 'u_amara', `# SOC 2 control matrix

**Framework:** SOC 2 Type II (Security, Availability, Confidentiality) · **Auditor:** engaged · **Window:** opens in 20 days

## Status
| Category | Controls | Implemented | Evidence automated |
| --- | --- | --- | --- |
| Access control | 18 | 16 | 11 |
| Change management | 12 | 12 | 9 |
| Operations | 14 | 11 | 6 |
| Risk & vendor | 9 | 8 | 3 |
| Confidentiality | 8 | 5 | 2 |
| **Total** | **61** | **52** | **31** |

## The nine open controls
Access reviews (2), encryption at rest for backups, retention enforcement, vendor reassessment, secrets scanning, asset inventory accuracy, IR tabletop evidence, awareness training completion.

> **The date does not move.** The observation window cannot open with gaps, and the audit is booked. Everything else in Platform yields to these nine.`, { spaceId: 'sp_trust', projectId: 'p_vault', pinned: true, tags: ['compliance'] }),

  D('dc_launch', 'Launch plan — Atlas + Nova', '🚀', 'doc', 'u_priya', `# Launch plan

## Narrative
"Payments that reconcile themselves." One message, everywhere.

## Timeline
| When | What | Owner |
| --- | --- | --- |
| T-21d | Docs and changelog drafted | Priya |
| T-14d | Pricing page live | Priya |
| T-7d | Analyst + design-partner briefings | Aditya |
| T-1d | Status page notice, support brief | Omar |
| T-0 | Webinar, social, lifecycle send 1 | Priya |
| T+7d | Readout: signups, activation, pipeline | Jonas |

## Dependencies
Launch date is downstream of the Atlas tier-1 cutover. **We do not announce before the cutover is green for 5 days.**`, { spaceId: 'sp_hq', projectId: 'p_signal', tags: ['launch'] }),

  D('dc_meeting', 'Roadmap review — notes', '🗒️', 'meeting', 'u_aditya', `# Roadmap review

**Attendees:** Aditya, Meera, Lena, Tomás, Priya

## Decisions
1. **Beacon stays in discovery** this quarter. Revisit at Q4 planning.
2. **Vault takes priority over Sentinel** for platform capacity until the window opens.
3. Launch is gated on cutover, not on the calendar.

## Open questions
- Do we need a dedicated reconciliation engineer, or is this a two-cycle spike? → Meera to size by Friday.
- Who owns merchant comms during cutover? → Omar, confirmed.

## Follow-ups
- [x] Update the Q3 plan doc
- [ ] Reforecast Vault against the fixed audit date
- [ ] Share the launch gate with the wider team`, { spaceId: 'sp_hq', tags: ['meeting'] }),
]

/* ── Goals (OKRs) ───────────────────────────────────────────── */

const period = `${TODAY.getFullYear()}-Q${Math.floor(TODAY.getMonth() / 3) + 1}`
const goals: Goal[] = [
  {
    id: 'g_atlas', name: 'Land Atlas with tier-1 merchants', description: 'Payments 2.0 carrying real volume, with no manual reconciliation.',
    ownerId: 'u_meera', teamIds: ['t_eng'], projectIds: ['p_atlas'], period, status: 'at_risk',
    keyResults: [
      { id: 'kr_1', name: 'Tier-1 merchants migrated', start: 0, target: 50, current: 18, unit: 'merchants' },
      { id: 'kr_2', name: 'Settlement recon lag', start: 96, target: 4, current: 22, unit: 'hours' },
      { id: 'kr_3', name: 'Manual finance adjustments', start: 140, target: 10, current: 46, unit: 'per month' },
    ],
    createdAt: ago(80), updatedAt: ago(2),
  },
  {
    id: 'g_nova', name: 'Mobile experience people finish', description: 'Rebuild mobile on the design system and lift checkout conversion.',
    ownerId: 'u_lena', teamIds: ['t_des', 't_eng'], projectIds: ['p_nova'], period, status: 'on_track',
    keyResults: [
      { id: 'kr_4', name: 'Mobile checkout conversion', start: 41, target: 48, current: 45.6, unit: '%' },
      { id: 'kr_5', name: 'First-load JS', start: 341, target: 180, current: 214, unit: 'KB' },
      { id: 'kr_6', name: 'Flows migrated to v2', start: 0, target: 12, current: 9, unit: 'flows' },
    ],
    createdAt: ago(80), updatedAt: ago(1),
  },
  {
    id: 'g_trust', name: 'Be enterprise-buyable', description: 'SOC 2 Type II observation window open with zero control gaps.',
    ownerId: 'u_amara', teamIds: ['t_ops'], projectIds: ['p_vault'], period, status: 'off_track',
    keyResults: [
      { id: 'kr_7', name: 'Controls implemented', start: 0, target: 61, current: 52, unit: 'controls' },
      { id: 'kr_8', name: 'Evidence automated', start: 0, target: 61, current: 31, unit: 'controls' },
      { id: 'kr_9', name: 'Open pen-test findings', start: 11, target: 0, current: 3, unit: 'findings' },
    ],
    createdAt: ago(84), updatedAt: ago(3),
  },
  {
    id: 'g_velocity', name: 'Predictable delivery', description: 'Ship on the dates we commit to, with fewer escaped defects.',
    ownerId: 'u_aditya', teamIds: ['t_eng', 't_des', 't_ops'], projectIds: [], period, status: 'on_track',
    keyResults: [
      { id: 'kr_10', name: 'Cycle completion rate', start: 62, target: 85, current: 79, unit: '%' },
      { id: 'kr_11', name: 'Median cycle time', start: 9.4, target: 5, current: 6.2, unit: 'days' },
      { id: 'kr_12', name: 'Escaped Sev1/Sev2', start: 7, target: 1, current: 2, unit: 'per quarter' },
    ],
    createdAt: ago(80), updatedAt: ago(4),
  },
]

/* ── Risks ──────────────────────────────────────────────────── */

const risks: Risk[] = [
  { id: 'rk_1', projectId: 'p_atlas', title: 'PSP sandbox instability blocks reconciliation testing', detail: 'The provider sandbox has been unavailable 3 of the last 10 working days, producing false parity failures and idle engineering time.', severity: 4, likelihood: 3, mitigation: 'Escalated to vendor account team; building a local stub that replays recorded settlement files so testing continues offline.', ownerId: 'u_dev', status: 'mitigating', createdAt: ago(22) },
  { id: 'rk_2', projectId: 'p_atlas', title: 'Finance cannot absorb a manual settlement month', detail: 'If cutover slips past month end, finance reconciles two ledgers by hand for a full cycle.', severity: 3, likelihood: 2, mitigation: 'Freeze cutover window to the first week of the month; agreed with the finance lead.', ownerId: 'u_meera', status: 'open', createdAt: ago(15) },
  { id: 'rk_3', projectId: 'p_vault', title: 'Audit date is fixed and nine controls are open', detail: 'The observation window cannot open with gaps. Auditor availability does not shift for a quarter.', severity: 4, likelihood: 4, mitigation: 'Platform team fully reallocated to Vault; Sentinel paused. Daily control burndown in the Trust space.', ownerId: 'u_amara', status: 'mitigating', createdAt: ago(19) },
  { id: 'rk_4', projectId: 'p_vault', title: 'Single owner for the whole compliance programme', detail: 'Amara is the only person with full context. Any absence stops the programme.', severity: 3, likelihood: 2, mitigation: 'Tomás shadowing on evidence automation; control matrix documented in the shared space.', ownerId: 'u_tomas', status: 'open', createdAt: ago(30) },
  { id: 'rk_5', projectId: 'p_nova', title: 'Performance budget regressions creep back in', detail: 'First-load JS drifts up as flows migrate; no automated gate today.', severity: 2, likelihood: 3, mitigation: 'Bundle-size check in CI failing the build above 180KB.', ownerId: 'u_yuki', status: 'mitigating', createdAt: ago(11) },
  { id: 'rk_6', projectId: 'p_signal', title: 'Launch announced before cutover is proven', detail: 'Marketing timeline pressure could push the announcement ahead of a green cutover.', severity: 3, likelihood: 2, mitigation: 'Written gate: five consecutive green days post-cutover before any external comms.', ownerId: 'u_priya', status: 'open', createdAt: ago(8) },
  { id: 'rk_7', projectId: 'p_beacon', title: 'Billing provider webhook reliability unknown', detail: 'Self-serve plan changes depend on webhooks we have never load-tested.', severity: 2, likelihood: 2, mitigation: 'Spike scheduled in discovery to measure delivery and retry behaviour.', ownerId: 'u_kabir', status: 'open', createdAt: ago(13) },
  { id: 'rk_8', projectId: 'p_atlas', title: 'Legacy read path removal has no rollback', detail: 'Once v1 endpoints are deleted, rollback requires a redeploy rather than a flag flip.', severity: 3, likelihood: 1, mitigation: 'Keep v1 behind a flag for two full cycles after cutover before deleting.', ownerId: 'u_kabir', status: 'open', createdAt: ago(5) },
]

/* ── Comments ───────────────────────────────────────────────── */

const comments: Comment[] = []
const C = (entityType: Comment['entityType'], entityId: string, authorId: string, body: string, daysAgo: number, opts: Partial<Comment> = {}) => {
  const c: Comment = {
    id: uid('cm'), entityType, entityId, authorId, body,
    mentionIds: opts.mentionIds ?? [], reactions: opts.reactions ?? {},
    resolved: opts.resolved ?? false, parentId: opts.parentId,
    createdAt: ago(daysAgo), editedAt: opts.editedAt,
  }
  comments.push(c)
  return c
}

const threadIssues = issues.filter((i) => i.projectId === 'p_atlas' && i.type !== 'epic').slice(0, 6)
if (threadIssues[0]) {
  const root = C('issue', threadIssues[0].id, 'u_dev', 'Posting engine is behind the flag in staging. Ran 50k synthetic entries — p99 write is 23ms, well inside budget.', 9, { reactions: { '🚀': ['u_meera', 'u_kabir'], '👍': ['u_aditya'] } })
  C('issue', threadIssues[0].id, 'u_meera', 'Nice. Did you test the compensating-entry path? That is the one that will bite us during a partial capture.', 8, { parentId: root.id, mentionIds: ['u_dev'] })
  C('issue', threadIssues[0].id, 'u_dev', 'Covered — see the new `posting_reversal` suite. @sara added a regression case for the double-refund scenario.', 8, { parentId: root.id, mentionIds: ['u_sara'] })
}
if (threadIssues[1]) {
  C('issue', threadIssues[1].id, 'u_kabir', 'Idempotency keys are in. One open question: how long do we retain them? 24h is standard but our retry backoff can exceed that.', 6, { mentionIds: ['u_meera'] })
  C('issue', threadIssues[1].id, 'u_meera', 'Go with 72h. Storage is trivial and it covers the worst backoff we allow.', 6, { reactions: { '✅': ['u_kabir'] } })
}
if (threadIssues[4]) {
  C('issue', threadIssues[4].id, 'u_sara', 'Reproduced on staging: refund a partially-captured charge and the balance reads pre-refund for about 400ms. Cache invalidation ordering.', 4, { reactions: { '👀': ['u_dev', 'u_meera'] } })
  C('issue', threadIssues[4].id, 'u_dev', 'Confirmed — invalidation fires before the posting commits. Fixing by moving it into the transaction commit hook.', 3)
}
if (novaIssues[4]) {
  C('issue', novaIssues[4].id, 'u_lena', 'This is the keyboard problem from the research sessions, not a z-index bug. @yuki the fix is the viewport strategy, not the stacking context.', 5, { mentionIds: ['u_yuki'], reactions: { '💡': ['u_yuki'] } })
  C('issue', novaIssues[4].id, 'u_yuki', 'Agreed. Switching the shell to document-scroll on mobile and keeping the fixed frame for desktop only.', 5)
}
if (vaultIssues[0]) {
  C('issue', vaultIssues[0].id, 'u_amara', 'Access reviews are the long pole. Manual quarterly review will not satisfy the auditor without evidence of completeness. @tomas can you take the collector?', 7, { mentionIds: ['u_tomas'] })
  C('issue', vaultIssues[0].id, 'u_tomas', 'Taking it. Collector will snapshot IAM state nightly and diff against the approved baseline.', 6, { reactions: { '🙏': ['u_amara'] } })
}
C('doc', 'dc_ledger_rfc', 'u_kabir', 'The snapshot table is the part I would watch. If refresh falls behind, balances read stale and nobody notices until settlement.', 12, { mentionIds: ['u_dev'] })
C('doc', 'dc_ledger_rfc', 'u_dev', 'Added a freshness alert at 90s. Beyond that we fall back to the live sum, slower but correct.', 11, { reactions: { '👍': ['u_kabir', 'u_meera'] } })
C('doc', 'dc_soc2', 'u_meera', 'Reallocating Devansh for two cycles once the drift detector lands. That should clear four of the nine.', 3, { mentionIds: ['u_amara'] })
C('project', 'p_atlas', 'u_aditya', 'Weekly check: recon lag is 22h against a target of 4h. Still at risk, but the trend is right. Holding the cutover date for now.', 2, { reactions: { '👍': ['u_meera'] } })
C('project', 'p_vault', 'u_amara', 'Nine controls open, 20 days to the window. I need the platform reallocation confirmed this week or the date moves.', 3, { mentionIds: ['u_meera', 'u_aditya'], reactions: { '👀': ['u_aditya'] } })

/* ── Activity feed ──────────────────────────────────────────── */

const activities: Activity[] = []
const A = (actorId: string, verb: string, entityType: Activity['entityType'], entityId: string, entityLabel: string, daysAgo: number, meta: Record<string, any> = {}, projectId?: string, teamId?: string) => {
  activities.push({ id: uid('ac'), actorId, verb, entityType, entityId, entityLabel, projectId, teamId, meta, createdAt: ago(daysAgo, int(0, 20)) })
}

for (const issue of issues) {
  A(issue.reporterId, 'created', 'issue', issue.id, issue.key, Math.max(0, daysBetween(issue.createdAt)), { title: issue.title }, issue.projectId, issue.teamId)
  if (issue.completedAt) {
    A(issue.assigneeId ?? issue.reporterId, 'completed', 'issue', issue.id, issue.key, Math.max(0, daysBetween(issue.completedAt)), { title: issue.title }, issue.projectId, issue.teamId)
  } else if (issue.startedAt && chance(0.5)) {
    A(issue.assigneeId ?? issue.reporterId, 'started', 'issue', issue.id, issue.key, Math.max(0, daysBetween(issue.startedAt)), { title: issue.title }, issue.projectId, issue.teamId)
  }
  if (issue.assigneeId && chance(0.2)) {
    A(pick(userIds), 'assigned', 'issue', issue.id, issue.key, int(0, 12), { title: issue.title, to: issue.assigneeId }, issue.projectId, issue.teamId)
  }
}
for (const c of comments) A(c.authorId, 'commented on', c.entityType, c.entityId, c.entityType === 'issue' ? (issues.find((i) => i.id === c.entityId)?.key ?? 'item') : c.entityId, daysBetween(c.createdAt), {})
for (const d of docs) A(d.authorId, 'published', 'doc', d.id, d.title, daysBetween(d.updatedAt), { icon: d.icon }, d.projectId)
for (const p of projects) {
  A(p.leadId, 'created', 'project', p.id, p.name, daysBetween(p.createdAt), { icon: p.icon })
  if (p.healthNote) A(p.leadId, 'updated health on', 'project', p.id, p.name, int(1, 6), { health: p.health, note: p.healthNote })
}
for (const g of goals) A(g.ownerId, 'updated', 'goal', g.id, g.name, daysBetween(g.updatedAt), { status: g.status })
for (const r of risks) A(r.ownerId, 'raised a risk on', 'project', r.projectId, r.title, daysBetween(r.createdAt), { severity: r.severity })

function daysBetween(isoStr: string): number {
  return Math.max(0, Math.round((+TODAY - +new Date(isoStr)) / 86400000))
}

/* ── Notifications (for the signed-in demo user and peers) ─── */

const notifications: Notification[] = []
const N = (userId: string, kind: Notification['kind'], title: string, body: string, link: string, daysAgo: number, hoursAgo: number, read: boolean, actorId?: string, entityType?: Notification['entityType'], entityId?: string) => {
  notifications.push({ id: uid('nt'), userId, actorId, kind, title, body, link, entityType, entityId, read, createdAt: ago(daysAgo, hoursAgo) })
}

const myIssues = issues.filter((i) => i.assigneeId === 'u_aditya')
N('u_aditya', 'mention', 'Amara mentioned you', 'Nine controls open, 20 days to the window. I need the platform reallocation confirmed…', '/app/projects/p_vault', 0, 3, false, 'u_amara', 'project', 'p_vault')
N('u_aditya', 'risk', 'Project health changed to Off track', 'Vault — SOC 2 Type II was moved to off track by Amara Okafor', '/app/projects/p_vault', 0, 5, false, 'u_amara', 'project', 'p_vault')
if (myIssues[0]) N('u_aditya', 'assign', 'Assigned to you', `${myIssues[0].key} · ${myIssues[0].title}`, `/app/issues/${myIssues[0].id}`, 0, 9, false, 'u_meera', 'issue', myIssues[0].id)
N('u_aditya', 'comment', 'Meera replied on RFC-014', 'Reallocating Devansh for two cycles once the drift detector lands…', '/app/docs/dc_soc2', 1, 2, false, 'u_meera', 'doc', 'dc_soc2')
N('u_aditya', 'automation', 'Automation ran: Triage urgent bugs', '3 issues were routed to the Engineering triage state', '/app/automations', 1, 6, true, undefined, undefined, undefined)
N('u_aditya', 'due', '2 items due this week', 'Atlas cutover runbook review and the Q4 planning brief', '/app/my-work', 2, 1, true)
N('u_aditya', 'state', 'Cycle 43 started', 'Engineering · Reconciliation to production + tier-1 cutover rehearsal', '/app/cycles', 3, 4, true, 'u_meera', 'cycle', 'cy_t_eng_43')
N('u_aditya', 'system', 'Weekly digest ready', 'Throughput up 12%, 2 projects at risk, 6 items overdue', '/app/insights', 4, 2, true)
for (const u of ['u_meera', 'u_lena', 'u_kabir']) {
  N(u, 'mention', 'Aditya mentioned you', 'Holding the cutover date for now — flagging the recon lag as the gate.', '/app/projects/p_atlas', 0, int(1, 20), false, 'u_aditya', 'project', 'p_atlas')
}

/* ── Automations ────────────────────────────────────────────── */

const automations: Automation[] = [
  {
    id: 'au_1', name: 'Triage urgent bugs', description: 'Any new urgent bug goes straight to the Engineering lead and lands in Todo.',
    teamId: 't_eng', enabled: true,
    trigger: { type: 'issue.created', config: {} },
    conditions: [{ field: 'type', op: 'eq', value: 'bug' }, { field: 'priority', op: 'gte', value: 4 }],
    actions: [{ type: 'set_state', value: stateOf('t_eng', 'todo') }, { type: 'set_assignee', value: 'u_meera' }, { type: 'add_label', value: 'lb_customer' }],
    runCount: 17, lastRunAt: ago(0, 6), createdBy: 'u_meera', createdAt: ago(90),
  },
  {
    id: 'au_2', name: 'Blocked means visible', description: 'When an issue moves to Blocked, notify the project lead and raise its priority.',
    enabled: true,
    trigger: { type: 'issue.state_changed', config: { toCategory: 'paused' } },
    conditions: [],
    actions: [{ type: 'set_priority', value: 3 }, { type: 'notify_user', value: 'u_aditya' }],
    runCount: 34, lastRunAt: ago(1, 3), createdBy: 'u_aditya', createdAt: ago(120),
  },
  {
    id: 'au_3', name: 'Definition of done', description: 'Completing an issue with an unfinished checklist posts a reminder instead of passing silently.',
    enabled: true,
    trigger: { type: 'issue.state_changed', config: { toCategory: 'completed' } },
    conditions: [],
    actions: [{ type: 'add_comment', value: 'Automation: checklist items remain open on this issue — confirm the definition of done before release.' }],
    runCount: 9, lastRunAt: ago(2, 8), createdBy: 'u_sara', createdAt: ago(60),
  },
  {
    id: 'au_4', name: 'Stale work check', description: 'Anything untouched for 14 days in an active state gets flagged for the assignee.',
    enabled: true,
    trigger: { type: 'issue.stale', config: { days: 14 } },
    conditions: [{ field: 'stateCategory', op: 'eq', value: 'started' }],
    actions: [{ type: 'add_label', value: 'lb_tech_debt' }, { type: 'add_comment', value: 'Automation: no activity for 14 days. Still in progress, or should this go back to the backlog?' }],
    runCount: 22, lastRunAt: ago(3, 1), createdBy: 'u_meera', createdAt: ago(75),
  },
  {
    id: 'au_5', name: 'Due soon, due loud', description: 'Two days before a due date the assignee gets a notification.',
    enabled: true,
    trigger: { type: 'issue.due_soon', config: { days: 2 } },
    conditions: [{ field: 'priority', op: 'gte', value: 2 }],
    actions: [{ type: 'notify_user', value: 'assignee' }],
    runCount: 51, lastRunAt: ago(0, 11), createdBy: 'u_aditya', createdAt: ago(110),
  },
  {
    id: 'au_6', name: 'Compliance work is urgent work', description: 'Anything labelled security in the Vault project is pinned to urgent.',
    projectId: 'p_vault', enabled: false,
    trigger: { type: 'issue.created', config: {} },
    conditions: [{ field: 'labelId', op: 'has', value: 'lb_security' }],
    actions: [{ type: 'set_priority', value: 4 }, { type: 'notify_user', value: 'u_amara' }],
    runCount: 6, lastRunAt: ago(12, 0), createdBy: 'u_amara', createdAt: ago(40),
  },
]

const automationRuns: AutomationRun[] = []
const runSamples: [string, string, AutomationRun['status'], string, number][] = [
  ['au_1', 'Triage urgent bugs', 'success', 'Routed to Todo, assigned to Meera Raghavan', 0],
  ['au_5', 'Due soon, due loud', 'success', 'Notified 4 assignees about work due in 2 days', 0],
  ['au_2', 'Blocked means visible', 'success', 'Priority raised to High, project lead notified', 1],
  ['au_4', 'Stale work check', 'success', 'Flagged 3 issues with no activity for 14 days', 3],
  ['au_3', 'Definition of done', 'skipped', 'Checklist complete — no action needed', 2],
  ['au_2', 'Blocked means visible', 'success', 'Priority raised to High, project lead notified', 4],
  ['au_1', 'Triage urgent bugs', 'skipped', 'Conditions not met (priority was Medium)', 5],
  ['au_6', 'Compliance work is urgent work', 'error', 'Rule disabled before the action could run', 12],
]
runSamples.forEach(([automationId, automationName, status, summary, days], i) => {
  const target = issues[(i * 13) % issues.length]
  automationRuns.push({
    id: uid('ar'), automationId, automationName, summary, status,
    issueId: target?.id, issueKey: target?.key, createdAt: ago(days, int(0, 20)),
  })
})

/* ── Saved views ────────────────────────────────────────────── */

const savedViews: SavedView[] = [
  { id: 'sv_1', name: 'Urgent & overdue', icon: '🔥', ownerId: 'u_aditya', shared: true, layout: 'list', groupBy: 'assignee', sortBy: 'due', filter: { priorities: [3, 4], overdueOnly: true }, createdAt: ago(40) },
  { id: 'sv_2', name: 'Everything blocked', icon: '🚧', ownerId: 'u_meera', shared: true, layout: 'board', groupBy: 'project', sortBy: 'priority', filter: { stateCategories: ['paused'] }, createdAt: ago(35) },
  { id: 'sv_3', name: 'Bugs this cycle', icon: '🐞', ownerId: 'u_sara', shared: true, layout: 'table', groupBy: 'state', sortBy: 'priority', filter: { types: ['bug'], cycleIds: [] }, createdAt: ago(28) },
  { id: 'sv_4', name: 'Unassigned backlog', icon: '📥', ownerId: 'u_aditya', shared: false, layout: 'list', groupBy: 'team', sortBy: 'created', filter: { unassignedOnly: true, stateCategories: ['backlog'] }, createdAt: ago(20) },
]

/* ── Time logs ──────────────────────────────────────────────── */

const timeLogs: TimeLog[] = []
const workedIssues = issues.filter((i) => i.assigneeId && (i.startedAt || i.completedAt))
for (const issue of workedIssues) {
  const entries = int(1, 4)
  for (let i = 0; i < entries; i++) {
    const daysAgo = int(0, 21)
    timeLogs.push({
      id: uid('tl'), issueId: issue.id, userId: issue.assigneeId!,
      minutes: pick([30, 45, 60, 90, 120, 150, 180, 240]),
      date: format(subDays(TODAY, daysAgo), 'yyyy-MM-dd'),
      note: pick(['Implementation', 'Pairing session', 'Review feedback', 'Debugging', 'Spec + design', 'Testing']),
      createdAt: ago(daysAgo),
    })
  }
}

/* ── Entry point ────────────────────────────────────────────── */

export const DEMO_LOGINS = users.map((u) => ({ email: u.email, name: u.name, title: u.title, id: u.id, color: u.avatarColor }))

export async function seedDatabase(force = false): Promise<void> {
  const existing = await db.workspaces.count()
  if (existing > 0 && !force) return
  if (force) await clearDatabase()

  await db.transaction('rw', db.tables, async () => {
    await db.workspaces.bulkPut([workspace])
    await db.users.bulkPut(users)
    await db.teams.bulkPut(teams)
    await db.teamMembers.bulkPut(teamMembers)
    await db.states.bulkPut(states)
    await db.labels.bulkPut(labels)
    await db.spaces.bulkPut(spaces)
    await db.projects.bulkPut(projects)
    await db.milestones.bulkPut(milestones)
    await db.cycles.bulkPut(cycles)
    await db.issues.bulkPut(issues)
    await db.issueLinks.bulkPut(issueLinks)
    await db.docs.bulkPut(docs)
    await db.comments.bulkPut(comments)
    await db.activities.bulkPut(activities)
    await db.notifications.bulkPut(notifications)
    await db.goals.bulkPut(goals)
    await db.risks.bulkPut(risks)
    await db.automations.bulkPut(automations)
    await db.automationRuns.bulkPut(automationRuns)
    await db.savedViews.bulkPut(savedViews)
    await db.timeLogs.bulkPut(timeLogs)
  })
}
