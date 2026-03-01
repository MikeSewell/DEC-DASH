---
phase: 13-client-activity-tab
plan: "01"
subsystem: api
tags: [convex, analytics, sessions, goals, intake, react-hooks]

# Dependency graph
requires:
  - phase: 11-analytics-tab
    provides: analytics.ts file with getActiveClientCount, getSessionVolume, getIntakeTrend, getAllDemographics patterns
  - phase: 12-demographics-tab
    provides: getAllDemographics query pattern, getLast12Months month-bucket pattern established
provides:
  - getSessionTrends Convex query: 12-month session count trend array
  - getGoalStats Convex query: clientGoals status counts + completionRate
  - getIntakeVolume Convex query: 12-month legal/coparent intake counts
  - useSessionTrends React hook
  - useGoalStats React hook
  - useIntakeVolume React hook
affects:
  - 13-02 and later: client activity tab UI charts consume these hooks

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getLast12Months() helper for 12-month bucket generation (defined before first export, not exported)
    - Promise.all() for parallel per-month index queries in getIntakeVolume
    - In-memory filter for tables without createdAt index (sessions uses sessionDate, no index)
    - by_createdAt index range queries for efficient per-month intake counts

key-files:
  created: []
  modified:
    - convex/analytics.ts
    - src/hooks/useAnalytics.ts

key-decisions:
  - "getLast12Months() placed before first export (not exported) — reused by both getSessionTrends and getIntakeVolume"
  - "getSessionTrends uses in-memory filter (collect + filter) — sessions table has no createdAt index, only by_clientId"
  - "getIntakeVolume uses Promise.all() over month buckets with index range queries — leverages by_createdAt for efficiency"
  - "getGoalStats computes completionRate as Math.round(completed/total*100), 0 when total=0 — avoids NaN"

patterns-established:
  - "Month-bucket pattern: getLast12Months() generates {label, start, end} array, chronological oldest-first"
  - "Hook pattern: useQuery(api.analytics.getXxx) — no args, named after query, returns Convex reactive result"

requirements-completed: [ACT-01, ACT-02, ACT-03]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 13 Plan 01: Client Activity Tab Data Layer Summary

**Three Convex aggregate queries (session trends, goal stats, intake volume) with matching React hooks enabling 12-month historical charts for the Client Activity tab**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T05:30:20Z
- **Completed:** 2026-03-01T05:31:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `getSessionTrends` Convex query — 12-month session count trend using in-memory filter on sessionDate
- Added `getGoalStats` Convex query — clientGoals status breakdown (in_progress/completed/not_started) + completionRate %
- Added `getIntakeVolume` Convex query — 12-month legal/coparent intake using efficient by_createdAt index range queries
- Added `getLast12Months()` local helper shared by getSessionTrends and getIntakeVolume (not exported)
- Added useSessionTrends, useGoalStats, useIntakeVolume hooks following existing hook pattern
- Convex deployed without errors, `npm run build` passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getSessionTrends, getGoalStats, getIntakeVolume queries** - `249d207` (feat)
2. **Task 2: Add useSessionTrends, useGoalStats, useIntakeVolume hooks** - `b40cbd5` (feat)

## Files Created/Modified
- `convex/analytics.ts` - Added getLast12Months helper + 3 new query exports (81 lines added)
- `src/hooks/useAnalytics.ts` - Appended 3 new hook exports (12 lines added)

## Decisions Made
- `getLast12Months()` placed as a module-level helper before the first export, not exported — used by two queries, keeps logic DRY without polluting the API surface
- `getSessionTrends` uses collect-all + in-memory filter because sessions table has no index on sessionDate (only by_clientId); this matches the existing `getSessionVolume` pattern in the same file
- `getIntakeVolume` uses `Promise.all()` over month buckets with `by_createdAt` index range queries for efficient per-month filtering (same pattern as `getIntakeTrend`)
- `getGoalStats` returns `completionRate: 0` when total is 0 to avoid NaN division

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Data layer is complete and deployed to Convex (`aware-finch-86`)
- All three hooks return typed reactive data compatible with Chart.js components
- Ready for 13-02: Client Activity tab UI charts (session trend line chart, goal stats doughnut, intake volume stacked bar)

## Self-Check: PASSED

All files verified present. Both task commits confirmed in git log.

---
*Phase: 13-client-activity-tab*
*Completed: 2026-03-01*
