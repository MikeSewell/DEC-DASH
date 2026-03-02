---
phase: 28-visual-elements
plan: 02
subsystem: ui
tags: [dashboard, charts, tailwind, react, urgency-colors, dark-mode]

# Dependency graph
requires:
  - phase: 28-01
    provides: "FundingThermometer, expense progress bars, enlarged stat card values — same visual-elements phase"
  - phase: 26-02
    provides: "DonationChart inner component and FALLBACK_INCOME_TREND structure used as data source for source cards"
provides:
  - "FALLBACK_DONATION_SOURCES constant in dashboardFallbacks.ts"
  - "DonationSourceCards 2-column grid component with icons, amounts, and percentages"
  - "GrantTracking deadline urgency color coding (red/amber/green border-l-4 + tinted backgrounds)"
  - "CalendarWidget event row urgency tints + pulsing red dot for imminent events"
affects: [29-final-polish, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Urgency color scheme: <=7d red, <=30d amber, >30d green — applied consistently in GrantTracking and CalendarWidget"
    - "Source card border-l-4 border-l-primary pattern from .dads-source-item reference"
    - "rgba opacity-based urgency backgrounds (e.g. bg-red-500/5) work in both light and dark themes via dark: variants"
    - "Pulsing red dot (animate-pulse) placed before time column for events within 24 hours"

key-files:
  created: []
  modified:
    - src/lib/dashboardFallbacks.ts
    - src/components/dashboard/DonationPerformance.tsx
    - src/components/dashboard/GrantTracking.tsx
    - src/components/dashboard/CalendarWidget.tsx

key-decisions:
  - "DonationSourceCards placed between stat cards and line chart in DonationChart — matching plan layout spec"
  - "Live source data computed by summing per-account amounts across all months in the income trend data"
  - "CalendarWidget urgency uses 1/3-day thresholds (vs GrantTracking 7/30-day) since calendar events are near-term"
  - "getEventUrgencyClasses returns empty string for past events to avoid tinting already-past items"

patterns-established:
  - "getUrgencyClasses(days): pure function returning Tailwind class string for urgency-based border+background styling"
  - "getEventUrgencyClasses(startAt, now): same pattern adapted for millisecond timestamps"
  - "Inline SVG icons mapped via prop string ('heart'|'building'|'calendar'|'banknotes') — no external icon library"

requirements-completed: [VIZ-03, VIZ-04]

# Metrics
duration: 20min
completed: 2026-03-02
---

# Phase 28 Plan 02: Visual Elements Summary

**Donation source breakdown cards (icon + name + amount + pct) in DonationPerformance, plus red/amber/green urgency color coding on GrantTracking deadlines and CalendarWidget event rows**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-02T11:48:00Z
- **Completed:** 2026-03-02T12:08:20Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `FALLBACK_DONATION_SOURCES` to dashboardFallbacks.ts (156970 + 99890 + 28540 = 285400, matching FALLBACK_QB_SNAPSHOT.totalRevenue)
- Built `DonationSourceCards` sub-component with inline heroicons SVGs, teal border-left accent, amount in primary color, and % of total — renders from both live account data and fallback constant
- Added `getUrgencyClasses()` to GrantTracking — deadline items now have red border-l-4 + red-tinted bg for <=7 days, amber for <=30 days, green for >30 days (light and dark mode)
- Added `getEventUrgencyClasses()` to CalendarWidget — event rows get subtle urgency tint backgrounds based on proximity, plus a pulsing red dot for events within 24 hours

## Task Commits

Each task was committed atomically:

1. **Task 28-02-T1: Add donation source cards to DonationPerformance** - `a69ee89` (feat)
2. **Task 28-02-T2: Add urgency color coding to GrantTracking deadlines** - `1897aa1` (feat)
3. **Task 28-02-T3: Add urgency color coding to CalendarWidget event rows** - `90143e3` (feat)

## Files Created/Modified

- `src/lib/dashboardFallbacks.ts` - Added FALLBACK_DONATION_SOURCES constant (3 sources summing to 285400)
- `src/components/dashboard/DonationPerformance.tsx` - Added SourceIcon, DonationSourceCards components; compute live sources from account breakdown; render cards between stat cards and line chart
- `src/components/dashboard/GrantTracking.tsx` - Added getUrgencyClasses() helper; applied urgency border-l-4 + tinted bg to deadline item wrappers; updated DeadlineCountdown text color for comfortable deadlines (emerald)
- `src/components/dashboard/CalendarWidget.tsx` - Added getEventUrgencyClasses() helper; applied urgency class to EventRow div; added pulsing red dot for imminent events (<=1 day future)

## Decisions Made

- CalendarWidget uses tighter urgency thresholds (1/3 days) vs GrantTracking (7/30 days) because calendar events are near-term by nature
- `getEventUrgencyClasses` returns empty string for past events (diffDays < 0) so already-past items don't get urgency tinting
- DeadlineCountdown text changed from `text-muted` to `text-emerald-600 dark:text-emerald-400` for comfortable deadlines to maintain visual consistency with the green urgency scheme
- Pulsing red dot placed as first child in EventRow flex layout, before the time column

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all three tasks compiled cleanly and the build passed on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 28 is now complete (both 28-01 and 28-02 done)
- Phase 29 can proceed: final polish, cron sync update for selected calendars
- All dashboard components now have the visual richness planned for v3.0 redesign

## Self-Check: PASSED

All 5 files verified present on disk. All 3 task commits (a69ee89, 1897aa1, 90143e3) confirmed in git log.

---
*Phase: 28-visual-elements*
*Completed: 2026-03-02*
