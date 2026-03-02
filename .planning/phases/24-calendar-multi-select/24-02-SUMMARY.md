---
phase: 24-calendar-multi-select
plan: 02
subsystem: ui
tags: [react, convex, google-calendar, admin, checkbox, multi-select]

# Dependency graph
requires:
  - phase: 24-01
    provides: listAvailableCalendars action and useListCalendars hook in useGoogleCalendar.ts
provides:
  - GoogleCalendarConfig.tsx rewritten with Fetch Calendars + checkbox multi-select UI
  - Admin can discover and select calendars without knowing calendar IDs
  - Stale calendar detection for calendars removed from service account
affects:
  - 24-03 (cron sync update uses selectedCalendars from config)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fetch-then-select: data is fetched on demand via user action, not on mount"
    - "Set<string> for checkbox state with functional updates (prev => next)"
    - "Stale config handling: filter config.calendars against fetched IDs to show removed calendars"

key-files:
  created: []
  modified:
    - src/components/admin/GoogleCalendarConfig.tsx

key-decisions:
  - "Save button disabled until Fetch Calendars has been clicked (hasFetched guard) — prevents saving without seeing available options"
  - "Stale calendars shown in a warning-styled section after fetch — admin can uncheck and re-save to clean up"
  - "Save triggers an automatic sync when any calendars are selected — reduces friction"

patterns-established:
  - "Fetch-on-demand pattern: hasFetched boolean gates the calendar list display"
  - "Functional Set updates: setSelectedIds(prev => new Set(prev)) for checkbox toggles"

requirements-completed: [CAL-01, CAL-02, CAL-03]

# Metrics
duration: ~10min
completed: 2026-03-02
---

# Phase 24 Plan 02: Calendar Multi-Select Admin UI Summary

**Replaced manual calendar ID text inputs with a Fetch Calendars button + checkbox list, so admins can discover and select Google Calendars by name without knowing calendar IDs.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-02T07:13:00Z
- **Completed:** 2026-03-02T07:13:29Z (commit timestamp)
- **Tasks:** 1 auto + 1 checkpoint (human-verify, approved)
- **Files modified:** 1

## Accomplishments

- Rewrote `GoogleCalendarConfig.tsx` completely — no more manual ID/displayName text inputs
- "Fetch Calendars" button calls `listCalendars()` from `useListCalendars` hook (built in 24-01) and renders results as a checkbox list
- Stale calendar detection: previously-configured calendars no longer in the service account are shown in a warning section so admins can remove them
- Auto-sync triggered after saving a non-empty selection to reduce setup friction
- Status header (Configured/Not Configured badge + last sync time) preserved from original component
- TypeScript compiles clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite GoogleCalendarConfig with multi-select calendar picker** - `803e11a` (feat)
2. **Task 2: checkpoint:human-verify** - approved by user (no code changes)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `src/components/admin/GoogleCalendarConfig.tsx` - Full rewrite: Fetch Calendars button + checkbox list + stale calendar warning section + Save Selection + Sync Now

## Decisions Made

- Save button is disabled until Fetch Calendars has been clicked (`hasFetched` guard) — prevents accidental saves before the admin has seen available options
- Stale calendars (in config but not returned by service account) shown in a warning-styled bordered section; admin can uncheck and re-save to clean up
- Saving a non-empty selection automatically triggers `triggerSync()` to immediately apply the new config — reduces the "save then sync" two-step
- No auto-fetch on mount — user must explicitly click "Fetch Calendars" (intent-driven, avoids unnecessary API calls on every page load)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond what was set up in Phase 24-01 (service account credentials).

## Next Phase Readiness

- Admin UI for calendar selection is complete and verified
- Phase 24-03 can now update the Convex cron sync to read `config.calendars` and fetch events from all selected calendars (instead of a single hardcoded calendar ID)
- `config.calendars` array shape `{ calendarId, displayName }[]` is the contract for the sync cron

---
*Phase: 24-calendar-multi-select*
*Completed: 2026-03-02*
