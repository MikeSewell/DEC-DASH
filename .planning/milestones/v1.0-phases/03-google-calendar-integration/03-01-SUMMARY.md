---
phase: 03-google-calendar-integration
plan: "01"
subsystem: backend
tags: [convex, google-calendar, schema, types]
dependency_graph:
  requires: []
  provides: [googleCalendarConfig-table, googleCalendarCache-table, googleCalendarActions, googleCalendarInternal, googleCalendarSync, googleCalendar-public, DashboardSectionId-calendar]
  affects: [convex/schema.ts, src/types/index.ts]
tech_stack:
  added: [googleapis (calendar.readonly scope)]
  patterns: [singleton-config-table, cache-table-with-indexes, internalAction-cron-entrypoint, three-state-query-pattern, patch-or-insert-singleton]
key_files:
  created:
    - convex/googleCalendarActions.ts
    - convex/googleCalendarInternal.ts
    - convex/googleCalendarSync.ts
    - convex/googleCalendar.ts
  modified:
    - convex/schema.ts
    - src/types/index.ts
decisions:
  - "saveConfig uses patch-or-insert (not delete-then-insert) to preserve lastSyncAt and configuredBy across saves"
  - "clearCalendarEvents runs per-calendar before re-inserting so one calendar failure does not wipe another calendar's data"
  - "getEvents returns null (not empty array) when not configured — enables three-state pattern: undefined=loading, null=not-configured, data=events"
  - "configuredBy uses empty string cast (same Sheets pattern) since no auth context is available in mutation without requireRole"
metrics:
  duration: "2 minutes"
  completed_date: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
---

# Phase 3 Plan 01: Google Calendar Backend Foundation Summary

**One-liner:** Complete 4-file Google Calendar Convex module family (actions/internal/sync/public) with schema tables and DashboardSectionId extension, mirroring the Google Sheets pattern.

## What Was Built

Established the complete backend data layer for Google Calendar integration:

1. **Schema additions** (`convex/schema.ts`):
   - `googleCalendarConfig` table: stores `calendars` array (calendarId + displayName objects), `lastSyncAt` timestamp, and `configuredBy` user reference
   - `googleCalendarCache` table: caches event data (eventId, calendarId, calendarDisplayName, summary, startAt/endAt timestamps, isAllDay boolean, optional location/htmlLink, lastSyncAt) with 3 indexes: `by_eventId_calendarId`, `by_startAt`, `by_calendarId`

2. **Type extension** (`src/types/index.ts`):
   - `DashboardSectionId` union type extended with `"calendar"` value

3. **`convex/googleCalendarInternal.ts`** — 4 internal functions:
   - `getFullConfig`: internalQuery returns full config record
   - `upsertEvent`: internalMutation with patch-or-insert via `by_eventId_calendarId` index
   - `clearCalendarEvents`: internalMutation deletes all events for a given calendarId
   - `updateLastSync`: internalMutation patches lastSyncAt on config record

4. **`convex/googleCalendarActions.ts`** — Node.js action file (`"use node"` directive):
   - `syncCalendars`: internalAction that authenticates via Google service account, fetches events for each configured calendar (today + 8-day window), clears stale events per calendar, then upserts fresh data
   - `triggerSync`: public action for admin UI "Sync Now" button

5. **`convex/googleCalendarSync.ts`** — Cron entrypoint:
   - `runSync`: internalAction that checks config before delegating to syncCalendars — safe no-op when unconfigured

6. **`convex/googleCalendar.ts`** — Public queries/mutations:
   - `getConfig`: returns `null` if not configured, otherwise stripped config fields
   - `getEvents`: returns `null` when unconfigured (three-state), otherwise events + lastSyncAt for 8-day window using `by_startAt` index
   - `saveConfig`: patch-or-insert singleton (preserves lastSyncAt across saves)

## Verification Results

- TypeScript: 0 errors in calendar files (pre-existing errors only in `allocationActions.ts`, `auth.ts`, `constantContactActions.ts`)
- Schema: both tables present with correct fields and all 3 indexes on `googleCalendarCache`
- All 4 Convex files created and accessible
- `googleCalendarActions.ts` line 1 is `"use node";`
- `getEvents` returns `null` on lines 8 and 21 for unconfigured state
- `DashboardSectionId` includes `"calendar"`

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| f5784dc | feat(03-01): add googleCalendarConfig/Cache schema tables and extend DashboardSectionId |
| 459d54d | feat(03-01): create Google Calendar Convex module family (actions/internal/sync/public) |

## Self-Check: PASSED

All 5 created/modified files verified present on disk.
Both task commits (f5784dc, 459d54d) verified in git log.
