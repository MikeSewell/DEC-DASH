---
phase: 26-dummy-data-fallbacks
plan: "01"
subsystem: dashboard
tags: [dummy-data, fallbacks, quickbooks, nan-fix, executive-snapshot, profit-loss]
dependency_graph:
  requires: []
  provides: [dashboardFallbacks-module, QB-snapshot-fallback, PNL-fallback]
  affects: [dashboard-home, ExecutiveSnapshot, ProfitLoss]
tech_stack:
  added: []
  patterns: [fallback-content-component, nan-guard-pattern, as-const-typed-constants]
key_files:
  created:
    - src/lib/dashboardFallbacks.ts
  modified:
    - src/components/dashboard/ExecutiveSnapshot.tsx
    - src/components/dashboard/ProfitLoss.tsx
decisions:
  - "Used || 0 guards instead of ?? 0 for NaN safety because undefined and NaN both need to be covered — || 0 handles both"
  - "Extracted ProfitLossContent inner component to avoid duplicating render logic across live and fallback paths"
  - "FALLBACK_INCOME_TREND uses Math.random() for seasonal variation — acceptable for dummy data, noted in comments"
metrics:
  duration_seconds: 226
  completed_date: "2026-03-02"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 26 Plan 01: Dashboard Fallbacks (QB + P&L) Summary

**One-liner:** Hardcoded FY2024 nonprofit financials ($285k revenue, $248k expenses, 6-category donut) replace QB empty states and fix $NaN bug in P&L component via extracted ProfitLossContent pattern.

## What Was Built

A shared fallback data module (`src/lib/dashboardFallbacks.ts`) containing all dummy data for the dashboard, plus wiring in two QB-dependent components to render plausible data instead of empty/error states.

**NOTE TO USER:** The values displayed when QuickBooks is disconnected are placeholder/dummy data added in Phase 26. They represent plausible FY 2024 nonprofit financials for the Dads' Education Center. They will be replaced by live QuickBooks data once the integration is reconnected.

### New File: src/lib/dashboardFallbacks.ts

Single source of truth for all Phase 26 dummy data:

- `FALLBACK_QB_SNAPSHOT` — cash on hand ($54.3k), revenue YTD ($285.4k), expenses ($248.2k), trend indicators
- `FALLBACK_PNL` — same financial totals plus 6-category expense breakdown for donut chart
- `getFallbackCalendarEvents()` — 5 upcoming DEC events with relative dates (always future)
- `FALLBACK_KB_METRICS` — 4 program metrics (clients served, completion rate, etc.)
- `FALLBACK_KB_SUMMARY_BULLETS` — 4 narrative bullets for KB summary section
- `FALLBACK_INCOME_TREND` — 12-month income trend with seasonal variation and 3 account categories

### Modified: ExecutiveSnapshot.tsx (DATA-01)

Replaced the "Connect QuickBooks" SVG + empty state with 3 populated `StatCard` components using `FALLBACK_QB_SNAPSHOT`. Shows:
- Cash on Hand: $54,320
- Revenue YTD: $285,400 with 8.4% trend
- Total Expenses: $248,160 with 3.1% trend
- "Sample data" note with link to /admin

### Modified: ProfitLoss.tsx (DATA-05)

Two changes:
1. **Extracted `ProfitLossContent` component** — accepts `data`, `fetchedAt`, and `isFallback` props; handles all rendering
2. **NaN guards** — all `formatCurrency()` calls now use `|| 0` to prevent $NaN from undefined field values

Main export becomes a thin router:
- `undefined` → skeleton
- `null` → `ProfitLossContent` with `FALLBACK_PNL`
- non-null but no data → `ProfitLossContent` with `FALLBACK_PNL`
- live data → `ProfitLossContent` with QB data

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create dashboardFallbacks.ts | 0386938 | src/lib/dashboardFallbacks.ts (new) |
| 2 | Wire QB snapshot fallback (DATA-01) | eed727d | src/components/dashboard/ExecutiveSnapshot.tsx |
| 3 | Fix $NaN + wire P&L fallback (DATA-05) | f11f0f5 | src/components/dashboard/ProfitLoss.tsx |

## Decisions Made

1. **`|| 0` vs `?? 0` for NaN guards** — Used `|| 0` because both `undefined` (from destructuring) and `NaN` (from failed parseFloat) need to be caught. `?? 0` only handles null/undefined, not NaN.

2. **`ProfitLossContent` component extraction** — Avoids duplicating the donut chart + stat cards rendering for both live and fallback paths. Single render path is easier to maintain.

3. **`Math.random()` in FALLBACK_INCOME_TREND** — Acceptable for dummy data. Server-side bundle is stable; minor client-side variation on navigation is harmless. Noted in comments.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `src/lib/dashboardFallbacks.ts` exists and exports all 6 required constants/functions
- `ExecutiveSnapshot.tsx` renders 3 stat cards with fallback values when QB disconnected
- `ProfitLoss.tsx` renders stat cards + donut using FALLBACK_PNL when plResult is null or missing
- No $NaN: all `formatCurrency()` calls have `|| 0` guards
- TypeScript compiles without errors in all 3 modified files
- `npm run build` completed successfully (19.7s, compiled successfully)

## Self-Check: PASSED

Files confirmed on disk:
- src/lib/dashboardFallbacks.ts — FOUND
- src/components/dashboard/ExecutiveSnapshot.tsx — FOUND (modified)
- src/components/dashboard/ProfitLoss.tsx — FOUND (modified)

Commits confirmed in git log:
- 0386938 feat(26-01): create dashboardFallbacks.ts — FOUND
- eed727d feat(26-01): wire QB snapshot fallback in ExecutiveSnapshot — FOUND
- f11f0f5 feat(26-01): fix NaN bug and wire P&L fallback in ProfitLoss — FOUND
