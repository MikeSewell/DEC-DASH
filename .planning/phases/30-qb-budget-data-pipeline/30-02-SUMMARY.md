---
phase: 30-qb-budget-data-pipeline
plan: 02
subsystem: database
tags: [convex, quickbooks, budget, grants, fuzzy-match, sync-pipeline]

# Dependency graph
requires:
  - phase: 30-01
    provides: budgetCache schema, batchUpsertBudgetRecords internalMutation, by_grantId index
provides:
  - fetchBudgetVsActuals writes structured records to budgetCache with grant fuzzy matching
  - getAllGrants internalQuery in budgetInternal.ts for sync pipeline
  - listBudgetRecords public query — sorted budget cache records for UI
  - getBudgetByGrantId public query — efficient index lookup for grant detail pages
  - getBudgetSummary public query — aggregated totals, burn rate, budget remaining
affects: [31-grant-budget-ui, GrantBudget.tsx, GrantTracking.tsx, FundingThermometer.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side fuzzy matching: port client-side string includes logic to internalAction for deterministic sync-time matching"
    - "Dual-write pattern: write to both quickbooksCache (backward compat) and budgetCache (new structured store)"
    - "Three-state null pattern: getBudgetSummary returns null when no records (undefined=loading, null=empty, data=ready)"

key-files:
  created:
    - convex/budgetQueries.ts
  modified:
    - convex/quickbooksActions.ts
    - convex/budgetInternal.ts

key-decisions:
  - "Dual-write to quickbooksCache and budgetCache during transition: existing UI components still consume quickbooksCache budget_vs_actuals; new Phase 31 UI will use budgetCache exclusively"
  - "matchBudgetToGrant checks both funderLower.includes(classLower) and classLower.includes(funderLower) for bidirectional substring match — same logic ported from GrantBudget.tsx client-side implementation"
  - "Grant fuzzy matching runs after quickbooksCache write so a grants query failure cannot prevent the backward-compat write"

patterns-established:
  - "internalQuery in budgetInternal.ts for data reads needed by internalActions in quickbooksActions.ts"
  - "Public queries in budgetQueries.ts follow project pattern: no auth check, null return for empty state, in-memory sort/aggregate for small datasets"

requirements-completed: [BGTD-01, BGTD-02, BGTD-03, BGTD-04, BGTD-06]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 30 Plan 02: QB Budget Data Pipeline — Sync & Public Queries Summary

**`fetchBudgetVsActuals` now batch-upserts structured budgetCache records with server-side grant fuzzy matching, and three public queries expose that data for Phase 31 UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T15:36:16Z
- **Completed:** 2026-03-04T15:38:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Modified `fetchBudgetVsActuals` to write one structured `budgetCache` record per budget+class combination at sync time, with all revenue/expense/net actuals and budgets, line items JSON, fiscal period, and fuzzy-matched grantId
- Added `matchBudgetToGrant()` helper that ports the client-side fuzzy match from `GrantBudget.tsx` to the server, matching QB class names against grant `fundingSource` and `programName` via bidirectional case-insensitive substring matching
- Created `convex/budgetQueries.ts` with three public queries: `listBudgetRecords` (sorted), `getBudgetByGrantId` (index lookup), and `getBudgetSummary` (aggregated totals + burn rate)
- Existing `quickbooksCache` write preserved so current UI components have zero breakage during Phase 31 transition

## Task Commits

Each task was committed atomically:

1. **Task 1: Modify fetchBudgetVsActuals to write to budgetCache with grant matching** - `8edb31e` (feat)
2. **Task 2: Create public budget queries for UI consumption** - `9edaf02` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `convex/quickbooksActions.ts` - Added `matchBudgetToGrant()` helper; `fetchBudgetVsActuals` now batch-upserts to budgetCache after the backward-compat quickbooksCache write; reads grants via `internal.budgetInternal.getAllGrants`
- `convex/budgetInternal.ts` - Added `getAllGrants` internalQuery so the sync action can read grants without importing public query modules
- `convex/budgetQueries.ts` - New file: `listBudgetRecords`, `getBudgetByGrantId`, `getBudgetSummary` public queries for Phase 31 UI

## Decisions Made
- Dual-write to both `quickbooksCache` and `budgetCache` during the transition: the existing UI components still read `budget_vs_actuals` from `quickbooksCache`, while Phase 31 will exclusively use the new `budgetCache` table. This avoids any breakage during the migration.
- `matchBudgetToGrant` performs bidirectional substring matching (funder includes class AND class includes funder) to handle cases where the QB class name is an abbreviation or a superset of the grant funder name.
- Grant fuzzy matching runs after the quickbooksCache write so that a grants query failure does not prevent the backward-compat write from completing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing TypeScript errors in unrelated files (clients.ts, migration.ts, googleSheetsInternal.ts, etc.) were out of scope and not touched.

## User Setup Required
None - no external service configuration required. Budget data will populate automatically on the next QB 15-minute cron cycle.

## Next Phase Readiness
- Phase 31 can now call `api.budgetQueries.listBudgetRecords`, `api.budgetQueries.getBudgetByGrantId`, and `api.budgetQueries.getBudgetSummary` from React components using `useQuery`
- The `by_grantId` index enables O(1) lookup for grant detail pages
- Grant fuzzy matching will improve as more grants are imported via the grant matrix script
- The `quickbooksCache` backward-compat write can be removed in Phase 32 once all UI components have been migrated to budgetCache queries

---
*Phase: 30-qb-budget-data-pipeline*
*Completed: 2026-03-04*
