---
phase: 31-grant-budget-core-ui
plan: 01
subsystem: ui
tags: [react, convex, chart.js, tailwind, budget, grants]

# Dependency graph
requires:
  - phase: 30-qb-budget-data-pipeline
    provides: budgetCache table with listBudgetRecords, getBudgetSummary, getBudgetByGrantId public queries

provides:
  - useBudgetSummary, useBudgetRecords, useBudgetByGrantId hooks in useQuickBooks.ts
  - GrantBudget.tsx rewritten with 4 summary cards, Table/Chart toggle, per-grant table view

affects: [32-grant-budget-chart-ui, grants-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useChartConfig hook with isDark from useTheme for dark/light chart support (already established; applied here)"
    - "Filter 'All' aggregate QB class row from table views to avoid double-counting with summary cards"
    - "Three-state loading pattern: undefined=loading, null=empty, object=data — applied to useBudgetSummary/useBudgetRecords"

key-files:
  created: []
  modified:
    - src/hooks/useQuickBooks.ts
    - src/components/dashboard/GrantBudget.tsx

key-decisions:
  - "GrantBudget no longer uses grants.list or useBudgetVsActuals — exclusively consumes budgetCache pipeline from Phase 30"
  - "Chart view is a placeholder div in this plan; full chart implementation deferred to Phase 32"
  - "Records with className === 'All' filtered out at component level (aggregate row already shown via summary cards)"
  - "statusVariant cast as union type to satisfy Badge variant type narrowing"

patterns-established:
  - "Summary cards use semantic tokens (text-foreground, text-muted, bg-surface, border-border) for automatic dark/light adaptation without manual isDark checks"

requirements-completed: [BGUI-01, BGUI-02, BGUI-03, BGUI-06]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 31 Plan 01: Grant Budget Core UI Summary

**GrantBudget.tsx rewritten to consume budgetCache pipeline with 4 summary cards, Table/Chart view toggle, per-grant table with % spent progress bars and On Track / Caution / Over Budget status badges**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T16:08:59Z
- **Completed:** 2026-03-04T16:10:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added three new hooks to `useQuickBooks.ts`: `useBudgetSummary`, `useBudgetRecords`, `useBudgetByGrantId` — each consuming the Phase 30 budgetQueries public API
- Rewrote `GrantBudget.tsx` from 233 lines (chart-focused, grants.list dependent) to 284 lines (budgetCache-powered, table-primary) with loading/empty/data states
- 4 summary cards showing Total Revenue, Total Expenses, Budget Remaining, Overall Burn Rate from aggregated budgetCache data
- Per-grant table with Budget, Actual, Remaining (color-coded), % Spent mini progress bar, and status badge (On Track / Caution / Over Budget)
- Full dark/light theme support via semantic Tailwind tokens + `useTheme` isDark for any conditional styling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add budget data hooks to useQuickBooks.ts** - `c5a81a5` (feat)
2. **Task 2: Rewrite GrantBudget.tsx with summary cards, table view, theme support** - `9365002` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `src/hooks/useQuickBooks.ts` - Added `useBudgetSummary`, `useBudgetRecords`, `useBudgetByGrantId` hooks consuming api.budgetQueries.*
- `src/components/dashboard/GrantBudget.tsx` - Fully rewritten: replaced Bar chart + grants.list with budgetCache summary cards, Table/Chart toggle, per-grant table

## Decisions Made

- GrantBudget exclusively uses the new budgetCache pipeline; old `useBudgetVsActuals` and `api.grants.list` calls removed entirely
- Chart view renders a "coming soon" placeholder — full chart implementation is Phase 32's scope
- `className === "All"` rows filtered at component level since the "All" record represents the aggregate already shown in summary cards
- Status badge variant uses `as "success" | "warning" | "danger"` cast to satisfy TypeScript union narrowing from string

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript check confirmed zero errors in modified files. Build passed cleanly. Pre-existing TS errors in `allocationActions.ts` and `auth.ts` are out of scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 32 (chart view) can import `useBudgetRecords` from `useQuickBooks.ts` and replace the Chart View placeholder in `GrantBudget.tsx`
- `useBudgetByGrantId(grantId)` hook is ready for the grants detail page to show per-grant budget vs actual
- No blockers

## Self-Check: PASSED

- FOUND: src/hooks/useQuickBooks.ts
- FOUND: src/components/dashboard/GrantBudget.tsx
- FOUND: .planning/phases/31-grant-budget-core-ui/31-01-SUMMARY.md
- FOUND commit: c5a81a5 (Task 1 — budget hooks)
- FOUND commit: 9365002 (Task 2 — GrantBudget rewrite)
- TypeScript: 0 errors in modified files
- Build: passed cleanly

---
*Phase: 31-grant-budget-core-ui*
*Completed: 2026-03-04*
