import type { ProjectTemplate } from './types'

/** Templates power the project onboarding wizard — each one scaffolds
 *  milestones, a starter backlog and the docs a project needs on day one. */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl_blank',
    name: 'Blank project',
    description: 'Start from nothing. Just the basics — name, team, dates.',
    icon: '📄', color: '#8e96ad', tags: [],
    milestones: [], issues: [], docs: [],
  },
  {
    id: 'tpl_product',
    name: 'Product launch',
    description: 'Discovery → build → beta → GA, with the specs and launch checklist already in place.',
    icon: '🚀', color: '#6c62f2', tags: ['product', 'launch'],
    milestones: [
      { name: 'Discovery complete', offsetDays: 14, description: 'Problem validated, success metrics agreed, scope written down.' },
      { name: 'Alpha — internal', offsetDays: 42, description: 'Core flow works end to end for the team.' },
      { name: 'Beta — design partners', offsetDays: 70, description: 'A small cohort using it for real work.' },
      { name: 'General availability', offsetDays: 98, description: 'Open to everyone, docs and support ready.' },
    ],
    issues: [
      { title: 'Write the problem statement and success metrics', type: 'task', estimate: 2, priority: 3 },
      { title: 'Customer interviews — 8 sessions', type: 'task', estimate: 5, priority: 3 },
      { title: 'Competitive and pricing scan', type: 'spike', estimate: 3, priority: 1 },
      { title: 'Technical design review', type: 'task', estimate: 3, priority: 3 },
      { title: 'Build the core flow', type: 'story', estimate: 13, priority: 4 },
      { title: 'Instrumentation and analytics events', type: 'task', estimate: 3, priority: 2 },
      { title: 'Beta feedback loop and triage rota', type: 'task', estimate: 2, priority: 2 },
      { title: 'Docs, changelog and support brief', type: 'task', estimate: 3, priority: 2 },
      { title: 'Launch readiness review', type: 'task', estimate: 2, priority: 3 },
    ],
    docs: [
      { title: 'Product brief', icon: '📌', kind: 'spec', body: `# Product brief\n\n## Problem\nWho hurts, how often, and what do they do today instead?\n\n## Why now\nWhat changed that makes this the right quarter?\n\n## Proposal\nOne paragraph. If it needs three, the scope is too big.\n\n## Success metrics\n| Metric | Baseline | Target |\n| --- | --- | --- |\n|  |  |  |\n\n## Non-goals\nWhat we are explicitly not building.\n\n## Open questions\n- [ ] ` },
      { title: 'Launch checklist', icon: '✅', kind: 'runbook', body: `# Launch checklist\n\n## T-14 days\n- [ ] Docs drafted\n- [ ] Support brief written\n- [ ] Pricing confirmed\n\n## T-7 days\n- [ ] Beta feedback triaged\n- [ ] Rollback plan written\n- [ ] Metrics dashboard live\n\n## T-0\n- [ ] Flag on for 5% of traffic\n- [ ] Watch error rate for 30 minutes\n- [ ] Announce\n\n## T+7 days\n- [ ] Readout: adoption, defects, support volume` },
    ],
  },
  {
    id: 'tpl_platform',
    name: 'Platform / migration',
    description: 'Dual-write, staged cutover and rollback — the shape most infrastructure migrations take.',
    icon: '🏗️', color: '#14b8a6', tags: ['platform', 'migration'],
    milestones: [
      { name: 'Design accepted', offsetDays: 10, description: 'RFC reviewed and accepted.' },
      { name: 'New path live behind a flag', offsetDays: 35, description: 'Shipped but dark.' },
      { name: 'Dual-write complete', offsetDays: 63, description: 'Both paths current, drift detector green.' },
      { name: 'Cutover wave 1', offsetDays: 84, description: 'First cohort fully migrated.' },
      { name: 'Legacy path removed', offsetDays: 119, description: 'Old code and data deleted.' },
    ],
    issues: [
      { title: 'Write the RFC', type: 'task', estimate: 5, priority: 4 },
      { title: 'Define parity checks and drift detection', type: 'story', estimate: 8, priority: 4 },
      { title: 'Implement the new path behind a flag', type: 'story', estimate: 13, priority: 4 },
      { title: 'Dual-write with idempotency', type: 'story', estimate: 8, priority: 4 },
      { title: 'Backfill historical data', type: 'task', estimate: 8, priority: 3 },
      { title: 'Load test at 2× peak', type: 'task', estimate: 5, priority: 3 },
      { title: 'Cutover runbook and rollback plan', type: 'task', estimate: 3, priority: 4 },
      { title: 'Remove the legacy read path', type: 'chore', estimate: 5, priority: 1 },
    ],
    docs: [
      { title: 'RFC — technical design', icon: '📐', kind: 'spec', body: `# RFC — <title>\n\n**Status:** Draft · **Author:** · **Reviewers:**\n\n## Problem\n\n## Proposal\n\n## Invariants\n1. \n\n## Alternatives considered\n- *Option A* — why not\n\n## Rollout\nFlag, cohorts, and what we watch.\n\n## What would make us reverse this` },
      { title: 'Cutover runbook', icon: '🔁', kind: 'runbook', body: `# Cutover runbook\n\n**Blast radius:** · **Rollback window:**\n\n## Pre-flight (T-24h)\n- [ ] Parity green for 72h\n- [ ] On-call staffed\n\n## Cutover (T-0)\n1. Flip the flag for the cohort\n2. Watch error rate and latency for 15 minutes\n3. Verify parity\n4. Announce\n\n## Rollback\nFlip the flag back. No data migration required.` },
    ],
  },
  {
    id: 'tpl_compliance',
    name: 'Compliance programme',
    description: 'Policies, controls, evidence and an external audit with a date that does not move.',
    icon: '🛡️', color: '#f43f5e', tags: ['compliance', 'security'],
    milestones: [
      { name: 'Gap assessment', offsetDays: 14, description: 'Every control mapped to owner and status.' },
      { name: 'Policies approved', offsetDays: 35, description: 'Signed off by leadership.' },
      { name: 'Controls implemented', offsetDays: 84, description: 'All controls live and evidenced.' },
      { name: 'Observation window opens', offsetDays: 98, description: 'No gaps permitted from this date.' },
    ],
    issues: [
      { title: 'Gap assessment against the framework', type: 'task', estimate: 8, priority: 4 },
      { title: 'Author and approve the policy set', type: 'story', estimate: 8, priority: 4 },
      { title: 'Access review automation', type: 'story', estimate: 8, priority: 4 },
      { title: 'Centralised audit logging', type: 'story', estimate: 8, priority: 3 },
      { title: 'Evidence collectors in CI', type: 'story', estimate: 5, priority: 3 },
      { title: 'Vendor risk register', type: 'task', estimate: 3, priority: 2 },
      { title: 'Incident response tabletop', type: 'task', estimate: 3, priority: 2 },
      { title: 'Awareness training rollout', type: 'chore', estimate: 2, priority: 1 },
    ],
    docs: [
      { title: 'Control matrix', icon: '🛡️', kind: 'doc', body: `# Control matrix\n\n| Category | Controls | Implemented | Evidence automated | Owner |\n| --- | --- | --- | --- | --- |\n| Access control |  |  |  |  |\n| Change management |  |  |  |  |\n| Operations |  |  |  |  |\n\n> The audit date does not move. Anything that threatens a control gets escalated the same day.` },
    ],
  },
  {
    id: 'tpl_design',
    name: 'Design system',
    description: 'Tokens, primitives, migration and adoption tracking.',
    icon: '🎨', color: '#ec4899', tags: ['design', 'design-system'],
    milestones: [
      { name: 'Foundations', offsetDays: 21, description: 'Tokens, type scale, colour and spacing.' },
      { name: 'Primitives shipped', offsetDays: 49, description: 'Buttons, inputs, overlays, tables.' },
      { name: 'Core flows migrated', offsetDays: 77, description: 'The flows that matter are on the new library.' },
      { name: 'Accessibility sign-off', offsetDays: 91, description: 'AA audit clean.' },
    ],
    issues: [
      { title: 'Token pipeline from design tool to code', type: 'story', estimate: 8, priority: 4 },
      { title: 'Type scale and spacing system', type: 'task', estimate: 3, priority: 3 },
      { title: 'Button, Input and Select primitives', type: 'story', estimate: 8, priority: 4 },
      { title: 'Overlay pattern: modal, sheet, popover', type: 'story', estimate: 8, priority: 3 },
      { title: 'Dark mode token audit', type: 'task', estimate: 3, priority: 2 },
      { title: 'Accessibility sweep — focus and labels', type: 'task', estimate: 5, priority: 3 },
      { title: 'Adoption dashboard', type: 'task', estimate: 3, priority: 1 },
    ],
    docs: [
      { title: 'Foundations', icon: '🎨', kind: 'spec', body: `# Foundations\n\n## Principles\n1. **Tokens, not values.**\n2. **Two themes, one source.**\n3. **Density is a mode.**\n\n## Non-negotiables\n- 44×44 minimum touch target\n- Focus always visible\n- Colour never carries meaning alone` },
    ],
  },
  {
    id: 'tpl_gtm',
    name: 'Go-to-market campaign',
    description: 'Positioning, channels and a launch-day run of show.',
    icon: '📣', color: '#f97316', tags: ['marketing', 'launch'],
    milestones: [
      { name: 'Positioning locked', offsetDays: 14, description: 'Messaging house approved.' },
      { name: 'Assets ready', offsetDays: 35, description: 'Site, emails, docs and social kit.' },
      { name: 'Launch day', offsetDays: 49, description: 'Everything goes live.' },
      { name: 'Readout', offsetDays: 63, description: 'What worked, what did not, what next.' },
    ],
    issues: [
      { title: 'Messaging house and positioning', type: 'story', estimate: 5, priority: 4 },
      { title: 'Pricing and product page refresh', type: 'story', estimate: 8, priority: 3 },
      { title: 'Lifecycle email sequence', type: 'story', estimate: 5, priority: 3 },
      { title: 'Launch-day run of show', type: 'task', estimate: 3, priority: 4 },
      { title: 'Docs and changelog', type: 'task', estimate: 3, priority: 2 },
      { title: 'Post-launch readout', type: 'task', estimate: 2, priority: 2 },
    ],
    docs: [
      { title: 'Launch plan', icon: '🚀', kind: 'doc', body: `# Launch plan\n\n## Narrative\nOne sentence. Everywhere.\n\n## Timeline\n| When | What | Owner |\n| --- | --- | --- |\n| T-21d |  |  |\n| T-7d |  |  |\n| T-0 |  |  |\n\n## Dependencies\nWhat has to be true before we announce.` },
    ],
  },
]

export const templateById = (id?: string): ProjectTemplate | undefined =>
  PROJECT_TEMPLATES.find((t) => t.id === id)
