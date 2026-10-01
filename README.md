# Orbit — Team, Project & Delivery Tracker

An advanced work-tracking app: build **teams**, onboard **projects** through a guided
wizard, run **cycles**, write in **shared spaces**, and monitor the whole flow with
metrics computed from the work itself.

Runs entirely in the browser. Everything lives in IndexedDB — no server, no API keys,
no network calls.

```bash
npm install
npm run dev      # http://localhost:5173
```

Sign in with any demo account (password `demo123`) or press one of the quick-login
buttons. `aditya@nimbus.io` is the workspace owner and has the richest view.

## What's in it

**Teams** — each team owns its issue prefix (`ENG-142`), its own editable workflow
states, its cycle cadence, and a shared space. Members carry an allocation
percentage that feeds the workload view.

**Project onboarding** — a five-step wizard (basics → people → template → plan →
review). Six templates (product launch, platform migration, compliance programme,
design system, GTM campaign, blank) scaffold milestones, a starter backlog and the
docs a project of that shape needs on day one, then notify everyone added.

**Work items** — epics, stories, tasks, bugs, spikes and chores with sub-issues,
dependencies (blocks / blocked-by / relates-to / duplicates), checklists, labels,
estimates, start and due dates, followers, comments and time logs.

**Five views over the same data** — board (drag-and-drop, multi-select via
⌘/shift-click), list, table, timeline and calendar. Group by status, assignee,
priority, project, type, label, cycle, team or milestone; sort nine ways; filter on
anything and save the result as a shared view.

**Cycles** — burndown reconstructed from real `completedAt` timestamps against a
weekend-aware ideal line, velocity (committed vs completed), pace projection, and
one-click rollover that carries unfinished work forward while leaving history intact.

**Shared spaces & docs** — Markdown docs (specs, decisions, runbooks, meeting notes,
retros) with a live outline, version history with restore, pinning, tags, threaded
comments, `@mention` notifications and emoji reactions.

**Monitoring** — project health signals derived automatically (behind schedule,
blocked, overdue, unowned work, open risks) with a suggested health rating the lead
can accept or override; cycle time distribution and trend; weekly created-vs-completed
flow; throughput forecast with a confidence rating; aging work-in-progress; workload
against per-person capacity; a risk register scored by severity × likelihood; and OKR
goals whose progress is measured from each key result's starting value.

**Automations** — a real rules engine. Triggers (created, status changed, assigned,
priority changed, due soon, stale), conditions, and actions (move, assign, re-prioritise,
label, comment, notify). Every run is recorded, including the skips.

**Collaboration** — live cross-tab presence, an inbox, notifications, and a global
command palette (`⌘K`) that searches issues, projects, docs, people, teams and spaces
and runs commands.

## Try these

- `⌘K` → search anything, or run a command
- `C` → new issue · `G` then `P` / `M` / `I` → projects / my work / inbox · `?` → all shortcuts
- Drag a card between board columns — the state change fires automations and notifies followers
- **Projects → Onboard project** → pick a template → watch milestones, backlog and docs appear
- Open a second tab, **Switch user** to Meera, and mention `@aditya` in a comment
- **Settings → Data** → export the workspace as JSON, or reset the demo data

## Stack

React 19 · TypeScript · Vite · Tailwind v3 · Dexie (IndexedDB) · React Router ·
Recharts · zustand · date-fns · lucide-react

Path alias `@/` → `src/`. `tsconfig` runs `verbatimModuleSyntax` and
`erasableSyntaxOnly`, so use `import type` and string-literal unions rather than enums.

## Layout

```
src/
  lib/          domain model, Dexie schema, seed, and one module per concern
                (issues, projects, teams, cycles, docs, comments, automations,
                 analytics, search, markdown, realtime, auth, store)
  hooks/        liveQuery data hooks, scroll lock, hotkeys, presence
  components/
    ui/         design system (Icon registry, Button, Modal, Popover, form, …)
    board/      the five work views + filter bar + bulk actions
    issue/      cards, rows, atoms, property pickers, create modal
    common/     Markdown renderer/editor, comment thread, activity feed
    project/    project card
    chart/      shared chart chrome
    layout/     app shell, sidebar, header, command palette, notifications
  pages/        one file per route
```

### Things worth knowing before you change it

- **Overlays must portal to `document.body`.** The header uses `backdrop-blur`, which
  creates a containing block for `position: fixed` descendants — a modal rendered
  inside it would position against the header, not the viewport. `Modal` and `Popover`
  already portal; anything new must too, and must call `useScrollLock`.
- **Grid columns need `minmax(0, …)`.** A grid item won't shrink below its
  min-content, which silently pushes pages wider than a phone viewport. The
  two-column page layouts use `minmax(0, 1.6fr)` and `min-w-0` wrappers for this reason.
- **Form controls stay ≥16px below `sm`.** Mobile Safari zooms in on focusing a
  smaller control and never zooms back. `.input` handles this; there's a raw
  `input/select/textarea` backstop at the end of `index.css`.
- **The scroll architecture is deliberately breakpoint-split.** The document scrolls
  on phones; only `lg` and up gets the fixed app frame with a nested scroller.
- **Board columns key on state *name*.** A project spanning several teams shows one
  "In Progress" column that aggregates each team's own state, and a drop maps back to
  the target team's concrete state (`components/board/columns.ts`).
- **The seed is deterministic** (seeded PRNG) and completion ratios are set
  intentionally per project, so the portfolio reads as a real mix of healthy and
  troubled work rather than uniformly late. Seed changes only appear after
  **Reset demo data**, since seeding skips a non-empty database.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck (`tsc -b`) then production build |
| `npm run preview` | serve the production build |
| `npm run lint` | oxlint |
