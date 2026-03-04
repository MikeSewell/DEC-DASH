---
phase: 32-grant-budget-charts-and-detail
plan: 01
subsystem: ui
tags: [react, chart.js, react-chartjs-2, tailwind, convex, dashboard, grants, budget]

# Dependency graph
requires:
  - phase: 31-grant-budget-core-ui
    provides: GrantBudget.tsx with summary cards, table view, useChartConfig hook stub, grantRows array from budgetCache

provides:
  - Chart View in GrantBudget.tsx with expense distribution Pie chart and budget vs actual horizontal Bar chart
  - Individual grant mini-pie card grid (3-column) with status badges and budget/spent/remaining summary
  - Grant Detail Modal with 4-summary-card header, expense distribution Pie from parsed lineItems, and full line-item table
  - Clickable table rows and chart cards that open the detail modal via selectedRecord state

affects:
  - GrantBudget.tsx (dashboard section)
  - Any future chart-related phases

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useChartConfig hook returns CHART_TOOLTIP, PIE_LEGEND, pieOptions, makeHorizontalBarOptions for dark/light theme support
    - ChartJS.register at module level for all required elements (ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)
    - BudgetRecord type derived via NonNullable<ReturnType<typeof useBudgetRecords>>[number] to avoid manual schema duplication
    - lineItems JSON.parse wrapped in try/catch to prevent modal crash on bad data
    - PALETTE constant (8 warm green colors) cycling via idx % PALETTE.length

key-files:
  created: []
  modified:
    - src/components/dashboard/GrantBudget.tsx

key-decisions:
  - "Tasks 1 and 2 implemented atomically in one file write since they share the same file and are tightly coupled — single commit covers both"
  - "GrantDetailModal extracted as a named function component inside the file for organization, using parent-scope chart config via props"
  - "Mini-pie in chart cards uses palette cycling by row index for visual variety across grants"
  - "lineItems pie chart filters to actual > 0 items only (sorted descending) to avoid zero-value wedges confusing the chart"

patterns-established:
  - "Pattern 1: Modal-in-file — local function components for modals defined in same file as parent to share types and avoid prop-drilling complexity"
  - "Pattern 2: getStatusInfo helper — centralized status/variant/progressColor logic reused across table, chart cards, and modal header"

requirements-completed: [BGUI-04, BGUI-05]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 32 Plan 01: Grant Budget Charts and Detail Summary

**Chart View with expense distribution Pie + budget/actual Bar + grant mini-pie cards, plus drill-down detail modal showing parsed lineItems account table and grant-specific Pie chart**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T16:29:18Z
- **Completed:** 2026-03-04T16:33:35Z
- **Tasks:** 2 (implemented atomically)
- **Files modified:** 1

## Accomplishments
- Replaced Chart View placeholder with full chart implementation: expense distribution Pie + budget vs actual horizontal Bar in 2-column grid
- Added 3-column Individual Grant Breakdown grid with mini Pie cards (spent/remaining ratio), status badges, and budget/spent/remaining summary per grant
- Implemented GrantDetailModal with 4-card summary, grant-specific expense Pie from lineItems JSON, and full line-items table (Account/Budget/Actual/Remaining/% Spent columns with color badges)
- Made table rows and chart cards clickable via selectedRecord state — modal opens on click, closes on X or backdrop click without disturbing activeView state
- Expanded useChartConfig hook to return full chart options (CHART_TOOLTIP, PIE_LEGEND, pieOptions, makeHorizontalBarOptions) for dark/light theme support

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Chart View** - `a895e89` (feat) — Chart View + mini-pie cards + clickable table rows
2. **Task 2: Grant Detail Modal** — included in `a895e89` (both tasks implemented in single atomic file write)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/components/dashboard/GrantBudget.tsx` - Full Chart View + Grant Detail Modal added; table rows made clickable; useChartConfig expanded; PALETTE, getGrantName, truncateLabel, getStatusInfo helpers added

## Decisions Made
- Tasks 1 and 2 were implemented in a single atomic file write since they share the same file and are tightly coupled (modal reads selectedRecord state set by chart cards/table rows). Single commit covers both tasks.
- GrantDetailModal extracted as a named function component inside GrantBudget.tsx to keep types local and avoid prop-drilling complexity from the shared chart options.
- lineItems pie chart filters to actual > 0 only (sorted descending) to avoid confusing zero-value wedges in the distribution chart.
- JSON.parse wrapped in try/catch — on failure, modal shows graceful "Unable to parse line items" message instead of crashing.

## Deviations from Plan

None - plan executed exactly as written. Both tasks implemented simultaneously (single file write) which is acceptable since they share the same file and state.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 32 Plan 01 is the only plan in the phase — phase is now complete
- GrantBudget.tsx has full feature set: summary cards (BGUI-01), view toggle (BGUI-02), table view (BGUI-03), chart view (BGUI-04), detail modal (BGUI-05)
- Grant Budget dashboard section is production-ready when QB budget data is available

---
*Phase: 32-grant-budget-charts-and-detail*
*Completed: 2026-03-04*
