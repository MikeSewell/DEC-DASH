---
phase: 02-dashboard-data-population
plan: "03"
subsystem: dashboard
tags: [dashboard, attention-panel, client-stats, components, ui]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [WhatNeedsAttention panel, ClientActivity section, 8-entry SECTION_COMPONENTS]
  affects: [dashboard/page.tsx, types/index.ts, constants.ts]
tech_stack:
  added: []
  patterns: [useQuery three-state pattern, ListSkeleton, StatCardGridSkeleton, severity-styled attention items]
key_files:
  created:
    - src/components/dashboard/WhatNeedsAttention.tsx
    - src/components/dashboard/ClientActivity.tsx
  modified:
    - src/types/index.ts
    - src/lib/constants.ts
    - src/app/(dashboard)/dashboard/page.tsx
decisions:
  - "WhatNeedsAttention rendered outside DashboardSection wrapper — not reorderable, always visible above sections loop"
  - "AttentionItem severity drives border-l-4 color strip: warning=amber-400, info=primary, success=accent"
  - "qbConfig === null (not undefined) correctly detects QB not-connected vs still-loading"
  - "ClientActivity per-program breakdown uses inline badge pills (primary for Legal, accent for Co-Parent)"
  - "client-activity registered after profit-loss in DEFAULT_DASHBOARD_SECTIONS — money-then-people ordering"
metrics:
  duration: "~3 min"
  completed_date: "2026-02-28"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
---

# Phase 2 Plan 3: WhatNeedsAttention + ClientActivity Summary

**One-liner:** Always-visible attention panel surfacing QB status and grant deadlines, plus a reorderable ClientActivity section showing active client counts with per-program breakdown.

## Objective

Build two new dashboard components and wire them into the dashboard page: the "What Needs Attention" panel (CMD-03, always visible at top) and the "Client Activity" section (CMD-02, reorderable). Both consume backend queries added in Plan 02-01.

## What Was Built

### WhatNeedsAttention Panel (`src/components/dashboard/WhatNeedsAttention.tsx`)

- Always-visible panel rendered above the reorderable sections loop
- Three `useQuery` calls: `grants.getUpcomingDeadlines`, `quickbooks.getConfig`, `grants.getStats`
- `ListSkeleton` shown while any query is `undefined`
- `AttentionItem` interface: `{id, type, severity, title, description, action?}`
- Logic: QB null → "Not Connected" warning; QB expired → "Token Expired" warning; each deadline entry → deadline item
- Item count badge (`rounded-full bg-primary text-white`) in panel header
- All-clear state: centered checkmark + "All clear — nothing needs your attention right now."
- Severity color strips: `warning=border-amber-400 bg-amber-50/50`, `info=border-primary bg-primary/5`, `success=border-accent bg-accent/5`
- Icon per type: CalendarIcon for deadlines, PlugIcon for integrations
- Action link buttons styled as small bordered pills

### ClientActivity Section (`src/components/dashboard/ClientActivity.tsx`)

- Reorderable dashboard section registered in `DashboardSectionId` and `SECTION_COMPONENTS`
- Two `useQuery` calls: `clients.getStats`, `clients.getStatsByProgram`
- `StatCardGridSkeleton count={3}` shown during loading
- 3 stat cards in `grid-cols-1 sm:grid-cols-3 gap-4`: Active Clients / New This Month / Total Clients
- Active Clients card shows per-program breakdown as inline badge pills: `Legal: N` (primary) and `Co-Parent: N` (accent)
- SVG icons inline: UsersIcon / UserPlusIcon / UsersRoundIcon — consistent with ExecutiveSnapshot pattern
- "View all clients →" link at bottom-right

### Type and Constants Updates

- `DashboardSectionId` union: added `"client-activity"` (8th entry)
- `DEFAULT_DASHBOARD_SECTIONS`: added `client-activity` after `profit-loss` (money-then-people order)
- Dashboard page: imports for both new components, `"client-activity": ClientActivity` in SECTION_COMPONENTS, `<WhatNeedsAttention />` before sections loop

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] `npx tsc --noEmit` passes (zero src/ errors; pre-existing convex/allocationActions.ts errors excluded — same as before plan)
- [x] `WhatNeedsAttention.tsx` exists, imports `api.grants.getUpcomingDeadlines`, `api.quickbooks.getConfig`, `api.grants.getStats`
- [x] `ClientActivity.tsx` exists, imports `api.clients.getStats`, `api.clients.getStatsByProgram`
- [x] `"client-activity"` in `DashboardSectionId` in `types/index.ts`
- [x] `SECTION_COMPONENTS` has 8 entries (7 original + `client-activity`)
- [x] `<WhatNeedsAttention />` rendered outside sections loop in `dashboard/page.tsx`
- [x] `ClientActivity` in `SECTION_COMPONENTS` — rendered via DashboardSection wrapper

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | d604486 | feat(02-03): build WhatNeedsAttention panel component |
| Task 2 | bbb1ffd | feat(02-03): add ClientActivity section + wire both components into dashboard |

## Self-Check: PASSED

- FOUND: src/components/dashboard/WhatNeedsAttention.tsx
- FOUND: src/components/dashboard/ClientActivity.tsx
- FOUND: commit d604486 (Task 1)
- FOUND: commit bbb1ffd (Task 2)
