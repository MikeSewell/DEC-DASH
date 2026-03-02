---
phase: 27-theme-toggle
plan: 02
subsystem: ui
tags: [chart.js, react-chartjs-2, dark-mode, theme, dashboard]

# Dependency graph
requires:
  - phase: 27-01
    provides: useTheme hook with resolvedTheme, dark CSS palette (#0F0F0F bg, #1E1E1E surface, #26A69A teal)
provides:
  - Theme-aware donut chart in ProfitLoss (borders, tooltip, legend)
  - Theme-aware line chart in DonationPerformance (points, fills, grid, tooltip, legend)
  - Theme-aware bar/pie charts in ProgramsCoparent and ProgramsLegal (grid, ticks, tooltip, pie borders)
affects: [any future dashboard chart components]

# Tech tracking
tech-stack:
  added: []
  patterns: [useChartConfig() hook pattern for theme-aware Chart.js options]

key-files:
  created: []
  modified:
    - src/components/dashboard/ProfitLoss.tsx
    - src/components/dashboard/DonationPerformance.tsx
    - src/components/dashboard/ProgramsCoparent.tsx
    - src/components/dashboard/ProgramsLegal.tsx

key-decisions:
  - "useChartConfig() hook pattern used in Programs components to convert module-level constants into theme-reactive config — allows resolvedTheme to be captured at render time"
  - "Light mode colors kept exactly as before (no regressions) — isDark ternaries default to original values on false branch"
  - "Pre-existing TS error in ProgramsLegal.tsx (programs?.find implicit any) left out of scope — not caused by this plan"

patterns-established:
  - "useChartConfig() hook: encapsulates all chart color config that depends on resolvedTheme — returns CHART_TOOLTIP, PIE_LEGEND, makeHorizontalBarOptions, pieOptions, isDark"
  - "Theme-conditional pattern: isDark ? darkValue : lightValue inline in dataset/options properties"

requirements-completed: [THEME-02, THEME-03]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 27 Plan 02: Theme-Aware Chart Colors Summary

**All four dashboard Chart.js charts (donut, line, bar, pie) now adapt colors to dark/light theme via useTheme().resolvedTheme — dark mode uses dark gray tooltips, subtle white grid lines, teal line color, and surface-matched segment borders**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-02T11:23:38Z
- **Completed:** 2026-03-02T11:27:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ProfitLoss.tsx donut chart: segment borders change from warm white to #1E1E1E in dark mode; tooltip uses dark gray with visible #404040 border; legend labels use #CCCCCC in dark
- DonationPerformance.tsx line chart: total line switches to teal #26A69A in dark; grid lines use rgba(255,255,255,0.06); tick labels #999999; point borders match surface; tooltip/legend adapted
- ProgramsCoparent.tsx and ProgramsLegal.tsx: module-level constants replaced with `useChartConfig()` hook that reads resolvedTheme — bar grid lines, tick colors, pie borders, tooltip backgrounds all adapt to theme

## Task Commits

Each task was committed atomically:

1. **Task 1: Theme-aware chart colors in ProfitLoss.tsx and DonationPerformance.tsx** - `ae68f3b` (feat)
2. **Task 2: Theme-aware chart colors in ProgramsCoparent.tsx and ProgramsLegal.tsx** - `9b3503d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/dashboard/ProfitLoss.tsx` - Added useTheme import; isDark drives donut borderColor, tooltip bg/border/colors, legend label color
- `src/components/dashboard/DonationPerformance.tsx` - Added useTheme import; isDark drives total line color, point bg/border, fill bg, grid colors, tick colors, tooltip, legend
- `src/components/dashboard/ProgramsCoparent.tsx` - Replaced module-level CHART_TOOLTIP/PIE_LEGEND/makeHorizontalBarOptions with useChartConfig() hook; pieOptions moved inside hook; makePieData borderColor theme-aware
- `src/components/dashboard/ProgramsLegal.tsx` - Identical refactor to ProgramsCoparent — useChartConfig() hook, theme-aware pie borders

## Decisions Made
- Used `useChartConfig()` hook pattern for Programs components because `CHART_TOOLTIP`, `PIE_LEGEND`, and `makeHorizontalBarOptions` were module-level constants that couldn't reference `resolvedTheme` at render time. Moving them into a hook makes theme reactivity possible without architectural changes.
- Light mode branches preserve original hardcoded values exactly — no visual regression in light mode.

## Deviations from Plan

None - plan executed exactly as written.

Note: Pre-existing TypeScript error in ProgramsLegal.tsx (line 98: `programs?.find((p) => p.type === "legal")` — implicit `any` type) was already present before this plan. Not introduced by this change (verified by comparing error count before/after: 121 both ways). Documented for awareness but left out of scope per deviation rules.

## Issues Encountered
None — both tasks compiled without new errors and all four files correctly use `resolvedTheme`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All dashboard chart components now fully theme-aware
- Dark mode toggle (Phase 27-01) + chart adaptation (Phase 27-02) = complete dark mode support for the dashboard
- Ready for any subsequent phase that extends or adds new chart components

---
*Phase: 27-theme-toggle*
*Completed: 2026-03-02*
