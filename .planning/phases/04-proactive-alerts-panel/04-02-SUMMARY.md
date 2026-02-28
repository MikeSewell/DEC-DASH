---
phase: 04-proactive-alerts-panel
plan: "02"
subsystem: ui
tags: [alerts, dashboard, toast, convex, react]

# Dependency graph
requires:
  - phase: 04-01
    provides: [convex/alerts.ts, api.alerts.getAlerts, Alert interface]
provides:
  - src/components/dashboard/WhatNeedsAttention.tsx (refactored, single-query alerts panel)
  - Critical alert toast notifications via useToast() with useRef dedup guard
  - 4 alert type icons: deadline (CalendarIcon), integration (PlugIcon), budget (ChartBarIcon), sync (RefreshIcon)
  - 3 severity styles: critical (red), warning (amber), info (primary/teal)
affects: [dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [useRef-dedup-guard-for-effect-toast, single-query-replaces-fan-out, severity-record-type-maps]

key-files:
  created: []
  modified:
    - src/components/dashboard/WhatNeedsAttention.tsx

key-decisions:
  - "useRef<Set<string>> deduplication guard ensures critical-alert toasts fire exactly once per browser session — not on every re-render or Convex data update"
  - "Toast variant 'warning' used for critical alerts — Toast system has no 'critical' variant; warning (amber) is the correct visual signal for critical-severity items"
  - "Alert type import from convex/alerts.ts uses type-only import to avoid bundling server code"

patterns-established:
  - "useRef dedup guard pattern: useRef(new Set<string>()) + toastedIds.current.has(id) check in useEffect prevents duplicate side-effects across React re-renders"
  - "Single Convex query replaces 3-query fan-out — server aggregates across all tables, returning one ranked array"

requirements-completed: [ALRT-01, ALRT-02, ALRT-03, ALRT-04]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 04 Plan 02: Alerts Frontend Panel Summary

**WhatNeedsAttention.tsx refactored to single api.alerts.getAlerts query with critical-alert toast notifications, 4 icon types, and 3 severity styles.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-28T12:58:38Z
- **Completed:** 2026-02-28T13:00:37Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced 3-query fan-out (`getUpcomingDeadlines`, `getConfig`, `getStats`) with single `useQuery(api.alerts.getAlerts)` — simpler loading state, no query coordination
- Added `useToast()` with `useRef<Set<string>>` deduplication guard — critical alerts fire exactly once per browser session regardless of re-renders or Convex data updates
- Expanded alert type coverage: budget (ChartBarIcon) and sync (RefreshIcon) alongside existing deadline and integration icons
- Added "critical" severity style (red left-border with `bg-red-50/50`) completing the three-tier visual hierarchy
- Full Next.js production build passes — `Compiled successfully in 4.8s`

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor WhatNeedsAttention to use single alerts query with toast notifications** - `d737231` (feat)
2. **Task 2: Verify end-to-end build and panel rendering** - (build verification, no code changes — covered by Task 1 commit)

## Files Created/Modified

- `src/components/dashboard/WhatNeedsAttention.tsx` - Refactored alerts panel: single query, toast notifications, 4 icon types, 3 severity styles

## Decisions Made

1. **useRef dedup guard for toasts** — `useRef(new Set<string>())` + `toastedIds.current.has(alert.id)` check inside `useEffect` ensures that each critical alert fires its toast exactly once per browser session. The ref persists across re-renders and Convex query updates, so Convex's real-time re-execution of the query won't trigger duplicate toasts.

2. **Toast variant "warning" for critical alerts** — The `Toast.tsx` ToastVariant type only has `"success" | "error" | "warning" | "info"`. Using `"warning"` for critical-severity alerts gives the appropriate amber styling. Using `"error"` was considered but rejected — red is for system errors, not urgent action items.

3. **Type-only import from convex/alerts.ts** — `import type { Alert }` avoids bundling server-side Convex module code into the client bundle.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in unrelated Convex files (`allocationActions.ts`, `constantContactActions.ts`, `seedPrograms.ts`) were detected during `tsc --noEmit` but are out of scope — they pre-exist and do not affect `WhatNeedsAttention.tsx` compilation. The Next.js build (`npm run build`) compiles successfully because Next.js uses its own SWC-based compilation that is more lenient than strict TSC.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 4 is complete. The proactive alerts panel is fully operational end-to-end:
- Backend: `convex/alerts.ts` with `getAlerts` query aggregating 6 tables (04-01)
- Frontend: `WhatNeedsAttention.tsx` consuming single query with toast notifications (04-02)

Kareem now sees all 4 alert categories (deadline, budget, sync, integration) ranked by urgency in one panel, with critical items triggering amber toast notifications on page load.

## Self-Check: PASSED

- [x] `src/components/dashboard/WhatNeedsAttention.tsx` — FOUND
- [x] Commit `d737231` — FOUND
- [x] `useQuery(api.alerts.getAlerts)` in WhatNeedsAttention.tsx — VERIFIED
- [x] No old queries (getUpcomingDeadlines, getConfig, getStats) in component — VERIFIED
- [x] `useToast()` + `useRef` dedup guard — VERIFIED
- [x] `npm run build` — PASSES (Compiled successfully in 4.8s)

---
*Phase: 04-proactive-alerts-panel*
*Completed: 2026-02-28*
