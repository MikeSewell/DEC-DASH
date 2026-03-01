---
phase: 12-demographics-tab
plan: 02
subsystem: ui
tags: [chart.js, react-chartjs-2, convex, analytics, demographics]

# Dependency graph
requires:
  - phase: 12-01
    provides: DemographicsTab with gender/age/ethnicity/referral charts and getAllDemographics returning outcomeDistribution
  - phase: 12-01
    provides: useAllDemographics hook and helper constants (PALETTE, CHART_TOOLTIP, PIE_LEGEND, makeHorizontalBarOptions)
provides:
  - useZipCodeStats hook in src/hooks/useAnalytics.ts wrapping clients.getZipCodeStats
  - Program Outcomes doughnut chart with semantic OUTCOME_COLORS (green=completed, teal=active, red=dropped)
  - Client Zip Codes horizontal bar chart showing top 15 zip codes sorted by client count
  - Complete DemographicsTab with 6 total charts covering all DEMO-01 through DEMO-06 requirements
affects: [analytics, demographics, clients-geographic-coverage, program-outcomes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - IIFE pattern inside JSX for local computed data (sortedZips) in zip code chart
    - Semantic color map (OUTCOME_COLORS) for status-aware chart coloring
    - Loading guard includes all query deps (zipCodeStats undefined check added)

key-files:
  created: []
  modified:
    - src/hooks/useAnalytics.ts
    - src/components/analytics/DemographicsTab.tsx

key-decisions:
  - "Used IIFE inside JSX for sortedZips local computation — avoids polluting component scope with one-use derived data"
  - "Zip code chart always renders its card container (not conditional) so empty state message has proper visual framing"
  - "OUTCOME_COLORS uses named keys matching Convex outcomeDistribution names — fallback to PALETTE[0] if unknown status appears"
  - "makeOutcomeData defined at module level (not inline) for consistency with makeDoughnutData and makeBarData"

patterns-established:
  - "Semantic color maps: define Record<string, string> keyed by status name for status-aware chart coloring"
  - "Zip code top-N slice: sort descending, .slice(0, 15) for manageable horizontal bar height"

requirements-completed: [DEMO-05, DEMO-06]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 12 Plan 02: Demographics Tab — Outcomes & Geography Summary

**DemographicsTab completed with Program Outcomes doughnut (semantic colors) and Client Zip Codes horizontal bar (top 15 by count), satisfying all DEMO-01 through DEMO-06 requirements**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T04:54:16Z
- **Completed:** 2026-03-01T04:57:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `useZipCodeStats` hook to `src/hooks/useAnalytics.ts` calling `clients.getZipCodeStats`
- Extended `DemographicsTab` with Chart 5 (Program Outcomes doughnut) using semantic OUTCOME_COLORS
- Extended `DemographicsTab` with Chart 6 (Client Zip Codes horizontal bar) showing top 15 zip codes sorted by client count
- Updated loading guard to wait for `zipCodeStats` alongside existing queries
- All 6 DEMO requirements (DEMO-01 through DEMO-06) now satisfied across plans 12-01 and 12-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Add useZipCodeStats hook and extend DemographicsTab with outcome and zip charts** - `2ea292f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/hooks/useAnalytics.ts` - Added `useZipCodeStats` export wrapping `api.clients.getZipCodeStats`
- `src/components/analytics/DemographicsTab.tsx` - Added OUTCOME_COLORS map, makeOutcomeData helper, Program Outcomes chart (5), Client Zip Codes chart (6), updated loading check

## Decisions Made

- Used IIFE inside JSX for `sortedZips` computation — keeps derived data local without component-scope variables
- Zip code card always renders its container so the empty state message has proper card framing (unlike outcome chart which conditionally renders the whole card)
- `OUTCOME_COLORS` uses fallback to `PALETTE[0]` for any unexpected status names from Convex
- `makeOutcomeData` defined at module level alongside other helpers for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build compiled successfully on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 demographics requirements (DEMO-01 through DEMO-06) are complete
- Phase 12 is fully done — Demographics tab live with 6 charts: gender, age, ethnicity, referral, outcomes, zip coverage
- Ready for Phase 13 (next analytics phase per ROADMAP)

---
*Phase: 12-demographics-tab*
*Completed: 2026-03-01*
