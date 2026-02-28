---
phase: 02-dashboard-data-population
plan: "02"
subsystem: dashboard-ui
tags: [skeleton, loading-states, ux, dashboard, three-state-pattern]
dependency_graph:
  requires: []
  provides: [skeleton-components, three-state-loading-pattern]
  affects: [ProfitLoss, GrantBudget, GrantTracking, ProgramsCoparent, ProgramsLegal, DonationPerformance]
tech_stack:
  added: []
  patterns: [animate-pulse shimmer skeletons, three-state loading (undefined/null/data), Convex useQuery isolation]
key_files:
  created:
    - src/components/dashboard/skeletons/StatCardSkeleton.tsx
    - src/components/dashboard/skeletons/ChartSkeleton.tsx
    - src/components/dashboard/skeletons/TableSkeleton.tsx
  modified:
    - src/components/dashboard/ProfitLoss.tsx
    - src/components/dashboard/GrantBudget.tsx
    - src/components/dashboard/GrantTracking.tsx
    - src/components/dashboard/ProgramsCoparent.tsx
    - src/components/dashboard/ProgramsLegal.tsx
    - src/components/dashboard/DonationPerformance.tsx
decisions:
  - "Used useSheetsConfig() (already in useGrantTracker hook) instead of importing useQuery directly — keeps hook abstraction consistent"
  - "BarChartSkeleton uses deterministic height calculation (not Math.random()) to avoid hydration mismatch"
  - "DonationPerformance stays in clean empty state — no wiring attempted since no donations reportType exists in QB integration"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-02-28"
  tasks_completed: 2
  files_modified: 6
  files_created: 3
---

# Phase 02 Plan 02: Skeleton Shimmer + Three-State Loading Summary

**One-liner:** Skeleton shimmer components (animate-pulse) + standardized undefined/null/data three-state pattern across all 6 dashboard sections, with Sheets-disconnected vs no-data distinction.

## What Was Built

Created 3 reusable skeleton shimmer components and updated all 6 existing dashboard section components to use the standardized three-state loading pattern.

### Skeleton Components

**StatCardSkeleton** (`StatCardSkeleton.tsx`): Two exports — `StatCardSkeleton` (single card shimmer matching the icon+value+label layout) and `StatCardGridSkeleton` (4-up grid of StatCardSkeletons).

**ChartSkeleton** (`ChartSkeleton.tsx`): Two exports — `ChartSkeleton` (3 stat cards + labeled chart area, matches ProfitLoss/DonationPerformance layout) and `BarChartSkeleton` (variable-height bars, matches GrantBudget layout).

**TableSkeleton** (`TableSkeleton.tsx`): Two exports — `TableSkeleton` (header row + N data rows, matches GrantTracking layout) and `ListSkeleton` (icon+text item list).

All use `animate-pulse` with `bg-border/50` and `bg-border/30` blocks. All have `"use client"` directive and named exports only.

### Updated Dashboard Sections

| Component | Loading | Disconnected | No Data |
|---|---|---|---|
| ProfitLoss | ChartSkeleton | "Connect QB" + /admin link | Empty P&L message |
| GrantBudget | BarChartSkeleton | "Connect Sheets" + /admin link | "No data synced yet" |
| GrantTracking | TableSkeleton | "Connect Sheets" + /admin link | "No active grants found" |
| ProgramsCoparent | ChartSkeleton | "Connect Sheets" + /admin link | "No data synced yet" |
| ProgramsLegal | ChartSkeleton | "Connect Sheets" + /admin link | "No data synced yet" |
| DonationPerformance | ChartSkeleton | "Connect QB" + /admin link | Clean empty state |

## Three-State Pattern (Standardized)

```typescript
// QB-dependent components (ProfitLoss, DonationPerformance):
if (result === undefined) return <ChartSkeleton />;           // Loading
if (result === null) return <ConnectQBPrompt />;              // Not connected
// render with result.data

// Sheets-dependent components (GrantBudget, GrantTracking, ProgramsCoparent, ProgramsLegal):
if (data === undefined || sheetsConfig === undefined) return <Skeleton />;  // Loading
if (sheetsConfig === null) return <ConnectSheetsPrompt />;                  // Not connected
if (!data || data.length === 0) return <NoDataMessage />;                   // Connected, no data
// render with data
```

## Key Design Decisions

1. **useSheetsConfig() from existing hook** — The `useSheetsConfig()` function was already exported from `useGrantTracker.ts`. Used it directly instead of adding raw `useQuery` calls to components — keeps hook abstraction layer intact.

2. **Deterministic bar heights in BarChartSkeleton** — Replaced `Math.random()` from the plan spec with a deterministic formula `(i * 13 + 17) % 60` to avoid React hydration mismatches between server and client renders.

3. **DonationPerformance stays empty** — Per research Pitfall 5: no donation reportType exists in the QB integration. Component shows clean null state with link to /admin, does not attempt to fabricate data.

4. **Sheets components distinguish 3 states** — Not just null/data, but: loading → not connected (show admin link) → connected but no data yet (show sync message). This gives Kareem actionable info vs a generic "no data" message.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced Math.random() in BarChartSkeleton with deterministic calculation**
- **Found during:** Task 1
- **Issue:** Plan spec used `Math.random()` for bar heights, which causes React hydration mismatch (server renders different value than client)
- **Fix:** Used deterministic formula `(i * 13 + 17) % 60` to produce varied-looking heights without randomness
- **Files modified:** `src/components/dashboard/skeletons/ChartSkeleton.tsx`
- **Commit:** 50da119

**2. [Rule 2 - Missing functionality] Added Google Sheets disconnected state to GrantBudget**
- **Found during:** Task 2
- **Issue:** GrantBudget.tsx used `useGrants()` (Sheets data) but only checked for empty grants, not whether Sheets was configured — couldn't distinguish "not connected" from "synced but no active grants"
- **Fix:** Added `useSheetsConfig()` check to produce correct three-state behavior matching the other Sheets-dependent components
- **Files modified:** `src/components/dashboard/GrantBudget.tsx`
- **Commit:** 0f78bce

## Self-Check: PASSED

| Item | Status |
|---|---|
| `src/components/dashboard/skeletons/StatCardSkeleton.tsx` | FOUND |
| `src/components/dashboard/skeletons/ChartSkeleton.tsx` | FOUND |
| `src/components/dashboard/skeletons/TableSkeleton.tsx` | FOUND |
| Commit 50da119 (skeleton components) | FOUND |
| Commit 0f78bce (three-state loading) | FOUND |
