---
phase: 15-donation-performance-charts
plan: "01"
subsystem: quickbooks-data-pipeline
tags: [quickbooks, income-trend, admin-config, data-pipeline]
dependency_graph:
  requires: []
  provides: [income_trend-cache, getIncomeTrend-query, getIncomeAccounts-query, useIncomeTrend-hook, useIncomeAccounts-hook, IncomeAccountConfig-admin-UI]
  affects: [quickbooks-sync-cycle, admin-quickbooks-tab]
tech_stack:
  added: []
  patterns: [QB-P&L-monthly-columns, recursive-row-extraction, appSettings-config-pattern]
key_files:
  created: []
  modified:
    - convex/quickbooksActions.ts
    - convex/quickbooks.ts
    - src/hooks/useQuickBooks.ts
    - src/app/(dashboard)/admin/page.tsx
decisions:
  - "extractMonthlyIncomeRows placed as module-level helper (not inline) — recursive function needs forward declaration compatibility"
  - "getIncomeTrend returns { configured: false } when no accounts designated — allows chart to show instructive empty state vs null"
  - "designated array mutation-safe sort: spread before sort in hasChanges check to avoid mutating state"
  - "IncomeAccountConfig uses initialized flag pattern (same as SettingsPanel) to avoid re-resetting user selection on re-renders"
metrics:
  duration: "~4min"
  completed: "2026-03-01"
  tasks_completed: 2
  files_modified: 4
---

# Phase 15 Plan 01: QB Income Trend Data Pipeline Summary

QB income trend fetch action, getIncomeTrend/getIncomeAccounts queries, frontend hooks, and admin checkbox UI for designating which QB income accounts appear in the donation chart.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add fetchIncomeTrend action + syncAllData wiring | 2a439b7 | convex/quickbooksActions.ts |
| 2 | Add queries, hooks, and admin UI | cd1a0f8 | convex/quickbooks.ts, src/hooks/useQuickBooks.ts, src/app/(dashboard)/admin/page.tsx |

## What Was Built

**fetchIncomeTrend internalAction** (`convex/quickbooksActions.ts`):
- Fetches QB P&L report with `summarize_column_by=Month` for last 12 months (from 1st of month 11 months ago to today)
- Caches as `income_trend` report type in `quickbooksCache` table
- Added to `syncAllData` after `fetchProfitAndLoss` so it runs on the 15-minute cron cycle

**getIncomeAccounts query** (`convex/quickbooks.ts`):
- Reads cached `accounts` data, filters to `AccountType === "Income" || "Other Income"`
- Returns sorted array of `{ id, name, accountType }` with `fetchedAt`
- Returns `null` if accounts not yet synced

**getIncomeTrend query** (`convex/quickbooks.ts`):
- Reads cached `income_trend` P&L report (monthly columns)
- Reads `donation_income_accounts` from `appSettings`
- Returns `{ configured: false }` when no accounts designated
- Parses QB column headers to extract month labels (skips "Total" column)
- Uses `extractMonthlyIncomeRows` helper to recursively walk P&L rows and match designated account names
- Returns `{ configured: true, months: [{ label, total, breakdown }], accounts, fetchedAt }`

**extractMonthlyIncomeRows helper** (`convex/quickbooks.ts`):
- Handles both Section rows (with Header + Summary) and Data rows (with ColData)
- Recursively descends into sub-sections for nested account hierarchies
- Matches by account name string (same approach as admin designation)

**useIncomeTrend / useIncomeAccounts hooks** (`src/hooks/useQuickBooks.ts`):
- Two new exports using existing `useQuery` pattern

**IncomeAccountConfig component** (`src/app/(dashboard)/admin/page.tsx`):
- Rendered below `QuickBooksConnect` in the QuickBooks admin tab
- Shows checkbox list of all QB income-type accounts with name + accountType label
- Saves selection to `donation_income_accounts` appSettings key as JSON string
- Shows "Not configured" badge when nothing selected, "N selected" badge when accounts chosen
- Handles loading state, null (QB not connected), and empty accounts gracefully
- Uses `initialized` flag to avoid resetting user selections on re-renders

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `convex/quickbooksActions.ts` exports `fetchIncomeTrend` (grep count = 1)
- `syncAllData` calls `fetchIncomeTrend` between `fetchProfitAndLoss` and `fetchPriorYearPnl`
- `convex/quickbooks.ts` exports `getIncomeTrend` and `getIncomeAccounts` (grep count = 2)
- `src/hooks/useQuickBooks.ts` exports `useIncomeTrend` and `useIncomeAccounts` (grep count = 2)
- Admin page contains `IncomeAccountConfig` and `donation_income_accounts` references (grep count = 4)
- `npx convex dev --once` deployed without errors (twice — after task 1 and task 2)
- `npm run build` compiled successfully with zero TypeScript errors

## Self-Check: PASSED

All 4 modified files verified present and containing required exports/patterns.
