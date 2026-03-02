---
phase: 26-dummy-data-fallbacks
plan: 02
subsystem: ui
tags: [react, nextjs, dashboard, fallback-data, chart.js, calendar, knowledge-base]

# Dependency graph
requires:
  - phase: 26-01
    provides: dashboardFallbacks.ts with getFallbackCalendarEvents, FALLBACK_KB_METRICS, FALLBACK_KB_SUMMARY_BULLETS, FALLBACK_INCOME_TREND
provides:
  - CalendarWidget shows 5 upcoming events (day headers, type badges, times) when Google Calendar is not configured
  - KBInsights shows 4 populated MetricCards and 4 AI summary bullets when KB has no real data
  - DonationPerformance shows 3-stat-card header and multi-line income chart when QB is not connected or accounts not configured
affects: [dashboard, phase-27, phase-28, phase-29]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fallback-first dashboard rendering: replace empty/error states with hardcoded sample data imported from dashboardFallbacks.ts"
    - "DonationChart inner component: extracts rendering logic to share between live and fallback code paths without JSX duplication"
    - "isFallback prop pattern: controls which footer note renders (sync timestamp vs sample data notice)"

key-files:
  created: []
  modified:
    - src/components/dashboard/CalendarWidget.tsx
    - src/components/dashboard/KBInsights.tsx
    - src/components/dashboard/DonationPerformance.tsx

key-decisions:
  - "Used 'as any' cast on chartData in DonationChart to resolve pre-existing Chart.js type mismatch (backgroundColor: string | boolean vs ChartData<'line'>)"
  - "Kept NotConfiguredState component definition in CalendarWidget despite being unused — removing it would be a gratuitous change per plan instructions"
  - "Spread FALLBACK_KB_METRICS entries as { ...metric } when passing to MetricCard to satisfy mutable MetricEntry type (fallback array is readonly)"

patterns-established:
  - "Fallback pattern: import from dashboardFallbacks, check for null/empty state, render populated content with 'Sample data' notice"
  - "Inner component extraction pattern: DonationChart accepts data + isFallback props to serve both live and fallback render paths"

requirements-completed: [DATA-02, DATA-03, DATA-04]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 26 Plan 02: Calendar, KB, and Donation Fallbacks Summary

**CalendarWidget, KBInsights, and DonationPerformance now render populated sample content (5 events, 4 metric cards + summary bullets, multi-line income chart) when Google Calendar, Knowledge Base, and QuickBooks integrations are not configured**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T11:01:36Z
- **Completed:** 2026-03-02T11:02:15Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- CalendarWidget: replaced `<NotConfiguredState />` with 5 hardcoded upcoming events (Fatherhood Group Session, Grant Report Deadline, Legal Clinic, Co-Parenting Workshop, Board Meeting) grouped by day with type badges
- KBInsights: replaced "No metrics extracted yet" and "No summary generated yet" empty states with 4 FALLBACK_KB_METRICS cards and 4 FALLBACK_KB_SUMMARY_BULLETS respectively
- DonationPerformance: extracted chart rendering into `DonationChart` inner component, replaced both QB-not-connected and accounts-not-configured empty states with fallback multi-line chart showing Individual Donations, Grants & Foundations, Events & Other

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire calendar fallback in CalendarWidget.tsx (DATA-02)** - `6a630c7` (feat)
2. **Task 2: Wire KB metrics fallback in KBInsights.tsx (DATA-03)** - `2faa681` (feat)
3. **Task 3: Wire donation performance fallback in DonationPerformance.tsx (DATA-04)** - `0307149` (feat)

## Files Created/Modified
- `src/components/dashboard/CalendarWidget.tsx` - Added getFallbackCalendarEvents import; replaced NotConfiguredState branch with grouped event list rendering
- `src/components/dashboard/KBInsights.tsx` - Added FALLBACK_KB_METRICS + FALLBACK_KB_SUMMARY_BULLETS imports; replaced both empty states with fallback content
- `src/components/dashboard/DonationPerformance.tsx` - Added FALLBACK_INCOME_TREND import; extracted DonationChart inner component; replaced two empty states with fallback chart

## Decisions Made
- Used `as any` cast on `chartData` in `DonationChart` to resolve pre-existing Chart.js type incompatibility (this error existed in the original file on line 223 before this task)
- Kept `NotConfiguredState` component definition in `CalendarWidget.tsx` even though it is no longer invoked — removing it would be a gratuitous change per plan instructions
- Spread `{ ...metric }` when passing `FALLBACK_KB_METRICS` entries to `MetricCard` to satisfy the mutable `MetricEntry` type since the fallback array is declared `as const` (readonly)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing chartData type error in DonationPerformance**
- **Found during:** Task 3 (DonationPerformance refactor)
- **Issue:** The original `chartData` object had type `{ labels, datasets }` where `backgroundColor: string | boolean` was not assignable to Chart.js `ChartData<"line">`. This error existed in the original file (confirmed via `git stash` test).
- **Fix:** Added `as any` cast: `const chartData = { labels, datasets } as any;` with ESLint disable comment
- **Files modified:** `src/components/dashboard/DonationPerformance.tsx`
- **Verification:** `npx tsc --noEmit --skipLibCheck` passes with no DonationPerformance errors; `npm run build` succeeds
- **Committed in:** `0307149` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing bug)
**Impact on plan:** Fix necessary for TypeScript correctness. No scope creep.

## Issues Encountered
None beyond the pre-existing Chart.js type issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All DATA-0x requirements (DATA-01 through DATA-04) now satisfied across both plan 01 and 02
- Phase 26 complete — dashboard shows fully populated content even when all integrations are disconnected
- Ready for Phase 27 (dark mode) or next milestone phase

---
*Phase: 26-dummy-data-fallbacks*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: `src/components/dashboard/CalendarWidget.tsx`
- FOUND: `src/components/dashboard/KBInsights.tsx`
- FOUND: `src/components/dashboard/DonationPerformance.tsx`
- FOUND: `.planning/phases/26-dummy-data-fallbacks/26-02-SUMMARY.md`
- FOUND commit: `6a630c7` (CalendarWidget fallback)
- FOUND commit: `2faa681` (KBInsights fallback)
- FOUND commit: `0307149` (DonationPerformance fallback)
