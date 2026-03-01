---
phase: 12-demographics-tab
plan: "01"
subsystem: analytics
tags: [analytics, demographics, charts, convex, react-chartjs-2]
dependency_graph:
  requires: [11-02]
  provides: [demographics-tab, getAllDemographics-query, useAllDemographics-hook]
  affects: [src/app/(dashboard)/analytics/page.tsx]
tech_stack:
  added: []
  patterns: [doughnut-chart, horizontal-bar-chart, convex-query-aggregation, loading-skeleton, empty-state]
key_files:
  created:
    - src/components/analytics/DemographicsTab.tsx
  modified:
    - convex/analytics.ts
    - src/hooks/useAnalytics.ts
    - src/app/(dashboard)/analytics/page.tsx
    - convex/_generated/api.d.ts
decisions:
  - "Used Doughnut (not Pie) for gender and age charts — cutout 55% for modern look while reusing ArcElement already registered"
  - "Inline helper functions (makeDoughnutData, makeBarData, makeHorizontalBarOptions) copied from ProgramsLegal.tsx to avoid creating shared util module for 2 consumers"
  - "DemographicsTab wraps entire tab content including stat row — keeps analytics/page.tsx clean with single-line tab render"
  - "getAllDemographics returns outcomeDistribution even though not rendered here — included for Plan 12-02 reuse to avoid a second query"
  - "Cards have rounded-2xl border with warm-shadow-sm wrapping each chart for visual consistency with dashboard cards"
metrics:
  duration: "3 min"
  completed_date: "2026-03-01"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
requirements_satisfied: [DEMO-01, DEMO-02, DEMO-03, DEMO-04]
---

# Phase 12 Plan 01: Demographics Tab Summary

**One-liner:** Gender and age group doughnut charts plus ethnicity and referral source horizontal bar charts aggregated across all programDataCache rows, wired into the Analytics page Demographics tab.

## What Was Built

A full Demographics tab for the Analytics page, pulling from the Sheets-synced `programDataCache` table and displaying:

1. **Summary stats row** — Total Participants, Active, Completed (3-card grid)
2. **Gender Distribution** — Doughnut chart with 55% cutout, right-side legend, warm green palette
3. **Age Groups** — Doughnut chart matching gender pattern
4. **Ethnicity** — Horizontal bar chart with dynamic height (32px per category, min 180px), forest green bars
5. **Top Referral Sources** — Horizontal bar chart with dynamic height (32px per source, top 10, min 200px), primary teal bars

All charts use the established design tokens: PALETTE, CHART_TOOLTIP (dark green, Nunito font), PIE_LEGEND (right-side, circle point style), warm shadow cards.

Three guard states: loading skeleton (Convex loading), Sheets-not-connected (null config), no-data-synced (total === 0).

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add getAllDemographics query and useAllDemographics hook | 5350016 | convex/analytics.ts, src/hooks/useAnalytics.ts, convex/_generated/api.d.ts |
| 2 | Create DemographicsTab component and wire into analytics page | 9a901c9 | src/components/analytics/DemographicsTab.tsx, src/app/(dashboard)/analytics/page.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx convex dev --once` deployed successfully — getAllDemographics query registered
- `npm run build` passed with zero errors
- `convex/analytics.ts` exports `getAllDemographics` (line 88)
- `src/hooks/useAnalytics.ts` exports `useAllDemographics` (line 18)
- `DemographicsTab.tsx` is 226 lines (minimum 120)
- Analytics page imports and renders `<DemographicsTab />` for demographics tab
- Gender and age use `Doughnut`, ethnicity and referral use horizontal `Bar`

## Self-Check: PASSED

Files exist:
- FOUND: src/components/analytics/DemographicsTab.tsx
- FOUND: convex/analytics.ts (getAllDemographics export)
- FOUND: src/hooks/useAnalytics.ts (useAllDemographics export)
- FOUND: src/app/(dashboard)/analytics/page.tsx (DemographicsTab import + render)

Commits exist:
- FOUND: 5350016
- FOUND: 9a901c9
