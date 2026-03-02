---
phase: 29-dashboard-polish-infrastructure
plan: "02"
subsystem: infra
tags: [convex, google-calendar, cron, sync, cleanup]

# Dependency graph
requires:
  - phase: 29-01
    provides: Dashboard layout polish (prerequisite phase)
provides:
  - Stale calendar event cleanup after admin de-selects calendars
  - Defensive logging showing which calendars are synced per cron cycle
affects: [google-calendar, cron-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cleanupDeselectedCalendars runs after successful per-calendar sync — cleanup is safe since it only fires after all selected calendars are processed"
    - "Set<string> used for O(1) membership test when checking which calendarIds to remove"

key-files:
  created: []
  modified:
    - convex/googleCalendarActions.ts
    - convex/googleCalendarInternal.ts
    - convex/googleCalendarSync.ts

key-decisions:
  - "cleanupDeselectedCalendars iterates all cached events (full scan) — acceptable given dataset size < 500 rows with typical 2-5 calendars"
  - "Cleanup runs AFTER per-calendar sync completes — ensures events from de-selected calendars are not wiped mid-sync if one selected calendar fails"
  - "Log message only emitted when removed > 0 — avoids noise in Convex logs during normal operation"

patterns-established:
  - "Post-sync cleanup pattern: sync selected resources, then remove stale records from de-selected resources in a single pass"

requirements-completed:
  - INFRA-01

# Metrics
duration: 2min
completed: "2026-03-02"
---

# Phase 29 Plan 02: Google Calendar Stale Cleanup Summary

**Calendar cron sync now removes stale cached events from de-selected calendars and logs which calendars are being synced by name**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T14:17:00Z
- **Completed:** 2026-03-02T14:19:08Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `cleanupDeselectedCalendars` internal mutation that removes any cached events whose `calendarId` is not in the current admin-selected list
- Wired cleanup call into `syncCalendars` action — runs after per-calendar sync loop, before `updateLastSync`
- Enhanced cron entry point logging to show calendar names and count, making it clear which calendars the cron respects

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stale calendar cleanup to syncCalendars action** - `dae04a8` (feat)
2. **Task 2: Add defensive logging to cron sync entry point** - `24c88a6` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `convex/googleCalendarActions.ts` - Added cleanup call after sync loop with Set-based membership check
- `convex/googleCalendarInternal.ts` - Added `cleanupDeselectedCalendars` internalMutation
- `convex/googleCalendarSync.ts` - Updated logging: calendar names + count on start, "successfully" on completion, clearer skip message

## Decisions Made
- Cleanup iterates all cached events (full table scan) rather than querying per-excluded-calendarId — simpler and fast enough given small dataset
- Cleanup fires after the full sync loop completes, not inside the per-calendar try/catch — this ensures partial sync failures don't accidentally trigger early cleanup

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing TypeScript errors in unrelated files (allocationActions.ts, constantContactActions.ts, etc.) confirmed pre-existing and out of scope. No TypeScript errors in any googleCalendar files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 29 complete — all 2 plans done
- INFRA-01 requirement satisfied: cron sync respects admin-selected calendars and cleans up stale events from de-selected ones
- No blockers or concerns

---
*Phase: 29-dashboard-polish-infrastructure*
*Completed: 2026-03-02*

## Self-Check: PASSED

- convex/googleCalendarActions.ts: FOUND
- convex/googleCalendarInternal.ts: FOUND
- convex/googleCalendarSync.ts: FOUND
- 29-02-SUMMARY.md: FOUND
- Commit dae04a8 (Task 1): FOUND
- Commit 24c88a6 (Task 2): FOUND
