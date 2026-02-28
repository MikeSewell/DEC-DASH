---
phase: 03-google-calendar-integration
plan: "02"
subsystem: ui
tags: [convex, react, admin, google-calendar, hooks, cron]

# Dependency graph
requires:
  - phase: 03-google-calendar-integration/03-01
    provides: googleCalendar.ts query/mutation contracts, googleCalendarActions.triggerSync, googleCalendarSync.runSync internalAction

provides:
  - 30-minute google-calendar-sync cron job registered in crons.ts
  - useGoogleCalendar.ts hook module (useCalendarConfig, useCalendarEvents, useCalendarSync)
  - CALENDAR_DOT_COLORS palette constant in constants.ts
  - "calendar" section entry in DEFAULT_DASHBOARD_SECTIONS
  - GoogleCalendarConfig.tsx admin component with full CRUD
  - Admin page "Google Calendar" tab at /admin?tab=google-calendar

affects:
  - 03-03-google-calendar-integration (calendar widget uses hooks and CALENDAR_DOT_COLORS from this plan)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mirror pattern for admin config components (GoogleCalendarConfig mirrors GoogleSheetsConfig)
    - Hook module pattern for each integration (useCalendarConfig, useCalendarEvents, useCalendarSync)
    - Cron entry pattern with internal action reference

key-files:
  created:
    - src/hooks/useGoogleCalendar.ts
    - src/components/admin/GoogleCalendarConfig.tsx
  modified:
    - convex/crons.ts
    - src/lib/constants.ts
    - src/app/(dashboard)/admin/page.tsx

key-decisions:
  - "GoogleCalendarConfig uses local calendars state array initialized from config on mount — same useEffect pattern as GoogleSheetsConfig"
  - "Sync Now button only visible when isConfigured (calendars.length > 0 in saved config) — prevents triggering sync with no calendars"
  - "CALENDAR_DOT_COLORS exported as const array for deterministic index-based color assignment in dashboard widget"
  - "calendar added as last section in DEFAULT_DASHBOARD_SECTIONS — supplementary to core financial/program data"

patterns-established:
  - "Hook module per integration: each Convex integration gets a dedicated hooks file with config + events + sync exports"
  - "Admin tab CRUD component: status dot, last sync badge, list with remove buttons, add row with inputs, Save & Test + Sync Now actions"

requirements-completed: [CAL-02, CAL-03]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 3 Plan 02: Google Calendar Admin Config and Cron Summary

**30-minute google-calendar-sync cron + GoogleCalendarConfig admin tab with calendar CRUD, Save & Test, and Sync Now actions**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-28T12:05:00Z
- **Completed:** 2026-02-28T12:08:00Z
- **Tasks:** 2
- **Files modified:** 5 (3 modified, 2 created)

## Accomplishments
- Registered `google-calendar-sync` cron at 30-minute interval in crons.ts (joining quickbooks-sync and sheets-sync)
- Created `useGoogleCalendar.ts` hook module with `useCalendarConfig`, `useCalendarEvents`, and `useCalendarSync` — mirrors `useGrantTracker.ts` pattern
- Added `CALENDAR_DOT_COLORS` array constant and "calendar" entry to `DEFAULT_DASHBOARD_SECTIONS` in constants.ts
- Built `GoogleCalendarConfig.tsx` admin component with status dot, last sync badge, calendar list CRUD (add/remove rows), Save & Test, and Sync Now buttons
- Registered "Google Calendar" tab in admin page (now 8 tabs) between "Google Sheets" and "Knowledge Base" at `/admin?tab=google-calendar`

## Task Commits

Each task was committed atomically:

1. **Task 1: Register cron job, create hooks, and add color palette constant** - `16ecf35` (feat)
2. **Task 2: Build GoogleCalendarConfig admin tab and register in admin page** - `1ac0a79` (feat)

**Plan metadata:** (final commit below)

## Files Created/Modified
- `convex/crons.ts` - Added google-calendar-sync interval at 30 minutes pointing to internal.googleCalendarSync.runSync
- `src/hooks/useGoogleCalendar.ts` - New hook module with useCalendarConfig, useCalendarEvents, useCalendarSync
- `src/lib/constants.ts` - Added CALENDAR_DOT_COLORS array and "calendar" entry in DEFAULT_DASHBOARD_SECTIONS
- `src/components/admin/GoogleCalendarConfig.tsx` - New admin component for calendar ID CRUD with sync controls
- `src/app/(dashboard)/admin/page.tsx` - Added "google-calendar" to AdminTab union, TABS array, import, and renderTabContent case

## Decisions Made
- GoogleCalendarConfig uses local calendars state array initialized from config via useEffect on mount — same pattern as GoogleSheetsConfig
- Sync Now button only shows when `isConfigured` (config has saved calendars) to prevent triggering empty syncs
- CALENDAR_DOT_COLORS exported as `const` tuple for deterministic index-based color assignment in the dashboard calendar widget (plan 03)
- "calendar" placed last in DEFAULT_DASHBOARD_SECTIONS as supplementary to core financial/program data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `convex/allocationActions.ts` (implicit any types in circular initializers) — out of scope, logged as deferred. Not caused by this plan's changes.

## User Setup Required
None - no external service configuration required. Admin tab UI ready; calendar IDs must be added by admin once calendar is shared with service account.

## Next Phase Readiness
- All hooks, constants, and admin UI ready for Plan 03 (calendar dashboard widget)
- `useCalendarEvents` hook ready for CalendarWidget to consume
- `CALENDAR_DOT_COLORS` ready for per-calendar color assignment in widget
- Blocker: Google Calendar service account must be manually shared with each calendar before events populate

---
*Phase: 03-google-calendar-integration*
*Completed: 2026-02-28*
