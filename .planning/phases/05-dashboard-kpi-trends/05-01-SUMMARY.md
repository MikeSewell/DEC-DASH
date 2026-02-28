---
phase: 05-dashboard-kpi-trends
plan: "01"
subsystem: dashboard
tags: [quickbooks, trends, kpi, year-over-year, react]
dependency_graph:
  requires: []
  provides: [QB prior-year P&L sync, getTrends query, useTrends hook, KPI trend arrows]
  affects: [convex/quickbooksActions.ts, convex/quickbooks.ts, src/hooks/useQuickBooks.ts, src/components/dashboard/ExecutiveSnapshot.tsx]
tech_stack:
  added: []
  patterns: [three-state loading (undefined/null/data), shared parsePnlTotals helper, graceful null fallback]
key_files:
  created: []
  modified:
    - convex/quickbooksActions.ts
    - convex/quickbooks.ts
    - src/hooks/useQuickBooks.ts
    - src/components/dashboard/ExecutiveSnapshot.tsx
decisions:
  - "Cash on Hand excluded from trend indicators — it is a point-in-time bank balance, not a P&L metric; no meaningful same-month-last-year comparison"
  - "Prior-year P&L fetches the same calendar month in the prior year (not full YTD) for apples-to-apples monthly comparison"
  - "parsePnlTotals helper extracted to avoid code duplication between getProfitAndLoss and getTrends queries"
  - "trends=undefined included in skeleton loading gate to prevent flash of no-trend then trend appearing"
metrics:
  duration_seconds: 135
  completed_date: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 5 Plan 01: Dashboard KPI Trends Summary

**One-liner:** Year-over-year trend arrows (up/down SVG + % vs last year) on Revenue YTD and Total Expenses KPI cards, driven by a new QB prior-year P&L sync action and shared parsePnlTotals helper.

## What Was Built

Added year-over-year trend indicators to the dashboard KPI cards using QuickBooks historical P&L data:

1. **`fetchPriorYearPnl` internalAction** (`convex/quickbooksActions.ts`) — fetches the P&L report for the same calendar month in the prior year (e.g. Feb 2025 when current month is Feb 2026). Caches as `profit_loss_prior_year` in `quickbooksCache`. Added to `syncAllData` so it refreshes every 15 minutes alongside the current P&L.

2. **`parsePnlTotals` helper** (`convex/quickbooks.ts`) — shared function that takes raw P&L JSON data string and returns `{ totalRevenue, totalExpenses, netIncome }`. Used by both `getProfitAndLoss` (for category extraction) and `getTrends` (for comparison), eliminating code duplication.

3. **`getTrends` query** (`convex/quickbooks.ts`) — reads both `profit_loss` and `profit_loss_prior_year` cache entries, computes YoY percentage change for revenue and expenses, returns `null` if either cache entry is missing. Revenue: positive when current > prior. Expenses: positive when current < prior (less spending is good — inverted logic). Division by zero guarded; values rounded to 1 decimal place.

4. **`useTrends` hook** (`src/hooks/useQuickBooks.ts`) — thin wrapper around `useQuery(api.quickbooks.getTrends)`.

5. **`ExecutiveSnapshot.tsx` updates** — imports and calls `useTrends`, includes `trends` in the undefined-check loading gate (prevents flash of no-trend state), computes `revenueTrend` and `expensesTrend` props, adds directional SVG arrows (up-right diagonal = green/positive, down-left diagonal = red/negative) to `StatCard` trend rendering. Revenue YTD and Total Expenses receive trend props; Cash on Hand is unchanged (no trend).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Cash on Hand excluded from trends | Point-in-time bank balance, not a P&L figure — no meaningful year-over-year monthly comparison |
| Prior-year fetches same calendar month | Apples-to-apples comparison (Feb vs Feb) rather than YTD vs YTD |
| `parsePnlTotals` shared helper | Eliminates row-parsing duplication between `getProfitAndLoss` and `getTrends` |
| `trends` in undefined loading gate | Prevents flash of cards without trends that then suddenly acquire trend badges |
| Graceful null fallback | When QB disconnected or prior-year cache missing, `trends` is null → no trend badges render, cards look exactly as before |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` — no errors in modified files (pre-existing errors in unrelated files are out of scope)
- `npm run build` — succeeded, all 17 routes generated
- All 4 modified files compile cleanly

## Self-Check: PASSED

Files verified:
- FOUND: convex/quickbooksActions.ts (fetchPriorYearPnl action + syncAllData update)
- FOUND: convex/quickbooks.ts (parsePnlTotals helper + getTrends query)
- FOUND: src/hooks/useQuickBooks.ts (useTrends hook)
- FOUND: src/components/dashboard/ExecutiveSnapshot.tsx (trend wiring + SVG arrows)

Commits verified:
- FOUND: f8ce452 — feat(05-01): add prior-year P&L fetch and getTrends query
- FOUND: 41996b1 — feat(05-01): wire trend indicators into KPI cards with graceful loading
