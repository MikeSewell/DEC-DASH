# Phase 30: QB Budget Data Pipeline - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Fetch, parse, and cache budget vs actuals data from QuickBooks into a dedicated Convex table. Each active QB budget is fetched per class (grant program), parsed into structured records with revenue/expense/net actuals and budget amounts plus account-level line items, and cached on the existing 15-minute cron cycle. This phase is backend-only — no UI changes.

</domain>

<decisions>
## Implementation Decisions

### Data storage
- Create a dedicated `budgetCache` Convex table with typed fields per budget+class combo (one row per combo)
- Each row stores: budgetName, className, revenueActual, revenueBudget, expenseActual, expenseBudget, netActual, netBudget, variance fields, percentUsed fields, and syncedAt timestamp
- Line items (account-level breakdown) stored as JSON string field on the budget row — no separate table
- Store fiscal period (startDate, endDate) on each record so the UI knows what timeframe the data covers
- Replace the existing `quickbooksCache` JSON blob for `budget_vs_actuals` — the new table is the single source of truth
- Keep `quickbooksCache` entries for `budgets` and `classes` as intermediate cache (needed for the fetch pipeline)

### Grant-to-budget matching
- Keep the existing fuzzy matching approach: case-insensitive `includes()` between grant `fundingSource`/`programName` and QB `className`
- This is intentional — nonprofit grant names are quirky and don't map cleanly to QB classes. The current matching works for DEC's data
- Run matching at sync time: store matched `grantId` on each budget record when a match is found
- Re-match every sync cycle (self-healing — if grants change, matches update within 15 minutes)
- Budget records with no matching grant are still cached (stored with null grantId) — available for the UI to show as "Unmatched" if desired

### Error handling and data freshness
- Skip failed budget+class combos and continue syncing the rest (current behavior — partial data is better than no data)
- On sync failure, keep stale data in the table — last good data remains visible until next successful sync or page reload
- Each budget row has its own `syncedAt` timestamp for granularity (some combos may succeed while others fail)
- No new alert triggers — existing QB staleness alert (`qbStalenessHours` in alertConfig) already covers general QB sync failures

### Claude's Discretion
- Exact Convex table schema field names and index choices
- Whether to add a `budgetId` / `classId` field for QB entity references
- Batch size for upserting budget records
- How to handle the transition period where GrantBudget.tsx still reads from quickbooksCache (Phase 31 will update the UI)

</decisions>

<specifics>
## Specific Ideas

- The existing `fetchBudgets`, `fetchBudgetVsActuals`, `fetchClasses`, and `parseBudgetVsActualsReport` in `quickbooksActions.ts` already do the heavy lifting — this phase restructures the output into a proper Convex table rather than a JSON blob
- The fuzzy match function already exists in `GrantBudget.tsx` (lines 30-46) and `GrantsTable.tsx` (lines 22-35) — move this logic server-side into the sync pipeline
- Grant matching references the `grants` table (`fundingSource`, `programName` fields) — the sync action needs to read grants to perform matching

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `quickbooksActions.ts`: `fetchBudgets` (line 247), `fetchBudgetVsActuals` (line 274), `fetchClasses` (line 163), `parseBudgetVsActualsReport` (line 365) — complete QB API fetch and parse pipeline
- `quickbooksActions.ts`: `getAuthenticatedConfig()`, `getBaseUrl()`, `getFirstDayOfYear()`, `getToday()` — helper functions for QB API calls
- `quickbooksActions.ts`: `syncAllData` (line 489) — already calls fetchClasses, fetchBudgets, fetchBudgetVsActuals in sequence
- `quickbooksInternal.ts`: `cacheReport` mutation for writing to quickbooksCache
- `GrantBudget.tsx`: `matchGrantToClass()` — fuzzy matching function to port server-side

### Established Patterns
- QB data cached in Convex tables, synced via 15-min cron (`crons.ts` line 7-11)
- `quickbooksSync.ts`: cron handler calls `syncAllData` action
- Internal actions/mutations pattern: `quickbooksActions.ts` (actions with "use node") calls `quickbooksInternal.ts` (mutations)
- Cache pattern: reportType-keyed rows in `quickbooksCache` with JSON stringified data

### Integration Points
- `crons.ts`: QB sync cron → `quickbooksSync.runSync` → `quickbooksActions.syncAllData` — budget sync is already part of this chain
- `quickbooksCache` table: `budget_vs_actuals` reportType currently consumed by `useBudgetVsActuals` hook
- `grants` table: needed for fuzzy matching during sync (read `fundingSource`, `programName`)
- `GrantBudget.tsx` and `GrantsTable.tsx`: currently read from quickbooksCache — Phase 31 will switch to new budgetCache table

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-qb-budget-data-pipeline*
*Context gathered: 2026-03-04*
