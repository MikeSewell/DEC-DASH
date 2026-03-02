---
phase: 24-calendar-multi-select
plan: "01"
subsystem: api
tags: [google-calendar, googleapis, convex, hooks, service-account]

# Dependency graph
requires:
  - phase: 23-ui-data-cleanup
    provides: stable Convex backend and frontend hook patterns

provides:
  - listAvailableCalendars Convex action that queries Google Calendar API calendarList.list()
  - useListCalendars React hook wrapping the action for admin UI use

affects:
  - 24-02 (admin UI calendar selection — consumes listAvailableCalendars via useListCalendars)
  - 24-03 (cron sync reads calendars from googleCalendarConfig.calendars)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Action returns empty array on error instead of throwing — UI handles empty state gracefully"
    - "useAction hook pattern: useListCalendars mirrors useCalendarSync structure in same file"

key-files:
  created: []
  modified:
    - convex/googleCalendarActions.ts
    - src/hooks/useGoogleCalendar.ts

key-decisions:
  - "listAvailableCalendars uses try/catch returning [] on failure — avoids surface errors in admin UI when credentials missing or partial"
  - "Return type Array<{ id, summary }> uses summary fallback to id — handles unnamed calendars safely"

patterns-established:
  - "Google Calendar API auth: GoogleAuth with GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY env vars, calendar.readonly scope"
  - "calendarList.list() for service account calendar discovery, events.list() for event sync — separate concerns in same file"

requirements-completed: [CAL-01, CAL-03]

# Metrics
duration: 1min
completed: 2026-03-02
---

# Phase 24 Plan 01: Calendar Backend Discovery Summary

**New `listAvailableCalendars` Convex action + `useListCalendars` hook enabling admin UI to discover and select Google Calendar service account calendars via calendarList.list()**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-02T07:09:04Z
- **Completed:** 2026-03-02T07:10:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `listAvailableCalendars` public action to `convex/googleCalendarActions.ts` — uses same service account credentials as `syncCalendars`, calls `calendarList.list()`, returns sorted `{ id, summary }[]`, never throws
- Added `useListCalendars` hook to `src/hooks/useGoogleCalendar.ts` — wraps action via `useAction`, consistent with `useCalendarSync` pattern
- Convex deployed successfully with `npx convex dev --once`, no type errors in modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add listAvailableCalendars action** - `bcf15ad` (feat)
2. **Task 2: Add useListCalendars hook** - `c80fdd2` (feat)

**Plan metadata:** _(final docs commit follows)_

## Files Created/Modified
- `convex/googleCalendarActions.ts` - Added `listAvailableCalendars` action (35 lines added); existing `syncCalendars` and `triggerSync` unchanged
- `src/hooks/useGoogleCalendar.ts` - Added `useListCalendars` hook (5 lines added); existing `useCalendarConfig`, `useCalendarEvents`, `useCalendarSync` unchanged

## Decisions Made
- `listAvailableCalendars` catches all errors and returns `[]` instead of throwing — the admin UI will handle the empty state gracefully without surfacing internal credential errors to the user
- Return shape `{ id, summary }` uses `item.summary ?? item.id` fallback to handle any unnamed calendars returned by the API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — Convex deployed cleanly. Pre-existing TypeScript errors in unrelated files confirmed not caused by these changes (no errors in googleCalendarActions.ts or useGoogleCalendar.ts).

## User Setup Required

None - no external service configuration required. The action reuses existing `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` environment variables already configured for `syncCalendars`.

## Next Phase Readiness
- Backend discovery action ready for consumption by admin UI (Plan 24-02)
- Hook exported and typed correctly — admin tab can call `listCalendars()` and render checkbox list
- No regressions to existing calendar sync pipeline (cron → syncCalendars → events)

---
*Phase: 24-calendar-multi-select*
*Completed: 2026-03-02*
