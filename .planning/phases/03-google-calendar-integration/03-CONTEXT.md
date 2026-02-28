# Phase 3: Google Calendar Integration - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Sync Google Calendar events to Convex via the existing service account auth and surface today + next 7 days on the dashboard as a read-only calendar widget. Admin configures which calendar IDs to sync from the Admin console. Calendar events sync automatically on a cron schedule. This phase does NOT include two-way editing, color-coded event types (v2), countdown badges (v2), or event reminders/notifications (v2).

</domain>

<decisions>
## Implementation Decisions

### Widget layout
- Agenda list format — compact rows with time | title | calendar on one line
- Events grouped by day with headers: "Today", "Tomorrow", "Wednesday Mar 5", etc.
- Cap at ~10 visible events, then "Show more" link to expand the rest
- Widget uses the existing DashboardSection wrapper and fits the dashboard section system (SECTION_COMPONENTS map, DashboardSectionId type)

### Multi-calendar display
- Color dot + calendar name label per event for visual distinction
- Expect 3-5 calendars (DEC org, program-specific, board, etc.)
- No filtering in the widget — unified view; admin controls which calendars sync
- Admin config: Calendar ID + user-defined display name; colors auto-assigned from the DEC theme palette
- Admin tab follows the existing GoogleSheetsConfig.tsx pattern (status dot, last sync badge, save & test, sync now)

### Event detail & interaction
- Each event row shows: title, time, calendar source (dot + name), and location when available
- Click opens the event in Google Calendar in a new tab (link-out, no in-app detail view)
- All-day events pinned to top of each day group, styled without a time column
- Currently-happening events get a subtle highlight — colored left border (similar to WhatNeedsAttention severity styles)

### Today vs. upcoming structure
- One continuous scrolling list with day headers (Today first, then each subsequent day)
- Day headers include count badge: "Today (3)" to show how packed the day is
- Empty today: "No events today" friendly message with subtle icon, upcoming week events still render below
- No calendars configured: "Connect Google Calendar" setup prompt with link to Admin console (matches the QB "Connect QuickBooks" pattern)

### Claude's Discretion
- Exact color palette assignment algorithm for calendar dots
- Loading skeleton design for the calendar widget
- "Show more" expand/collapse animation
- Error state handling when sync fails
- Exact compact row spacing and typography

</decisions>

<specifics>
## Specific Ideas

- Widget should feel consistent with the rest of the dashboard — same rounded-2xl cards, warm shadows, Fraunces headings
- "Currently happening" highlight should be noticeable but not loud — a tinted left border, not a flashy animation
- The admin config should be dead simple — paste a calendar ID, type a display name, done

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `googleapis` package already installed — Google Sheets uses it with service account auth (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` env vars)
- `GoogleSheetsConfig.tsx` admin component — same form pattern (status dot, last sync badge, save & test, sync now buttons) can be replicated for Google Calendar
- `DashboardSection` wrapper + `SECTION_COMPONENTS` map — new widget registers like existing sections
- `WhatNeedsAttention.tsx` severity styles (border-l-4 pattern) — reusable for "currently happening" highlight
- UI components: `Card`, `Button`, `Input`, `Badge`, `Spinner`, `ListSkeleton`

### Established Patterns
- Config table: `googleSheetsConfig` with `.index("by_purpose")` — calendar config can follow same structure or use a dedicated table
- Cache table: `grantsCache`, `quickbooksCache` pattern — store events with `lastSyncAt`
- Sync architecture: cron calls `internalAction` sync entrypoint → `internalAction` for API work → `internalMutation` for data writes
- Cron registration: simple `.interval()` in `crons.ts`
- Service account auth: `new google.auth.GoogleAuth({ credentials: {...}, scopes: [...] })`

### Integration Points
- `convex/schema.ts` — needs `googleCalendarConfig` and `googleCalendarCache` table definitions
- `convex/crons.ts` — add new cron interval for calendar sync
- `src/app/(dashboard)/admin/` — add "Google Calendar" tab to admin page
- `src/app/(dashboard)/dashboard/page.tsx` — register CalendarWidget in `SECTION_COMPONENTS` and `DEFAULT_DASHBOARD_SECTIONS`
- `src/lib/constants.ts` — add `DashboardSectionId` entry for calendar
- `src/types/index.ts` — extend `DashboardSectionId` type

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-google-calendar-integration*
*Context gathered: 2026-02-28*
