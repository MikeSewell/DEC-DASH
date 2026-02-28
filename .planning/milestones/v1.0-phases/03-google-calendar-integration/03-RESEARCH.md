# Phase 3: Google Calendar Integration - Research

**Researched:** 2026-02-28
**Domain:** Google Calendar API v3 + Convex cron sync + Next.js dashboard widget
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Widget layout**
- Agenda list format — compact rows with time | title | calendar on one line
- Events grouped by day with headers: "Today", "Tomorrow", "Wednesday Mar 5", etc.
- Cap at ~10 visible events, then "Show more" link to expand the rest
- Widget uses the existing DashboardSection wrapper and fits the dashboard section system (SECTION_COMPONENTS map, DashboardSectionId type)

**Multi-calendar display**
- Color dot + calendar name label per event for visual distinction
- Expect 3-5 calendars (DEC org, program-specific, board, etc.)
- No filtering in the widget — unified view; admin controls which calendars sync
- Admin config: Calendar ID + user-defined display name; colors auto-assigned from the DEC theme palette
- Admin tab follows the existing GoogleSheetsConfig.tsx pattern (status dot, last sync badge, save & test, sync now)

**Event detail & interaction**
- Each event row shows: title, time, calendar source (dot + name), and location when available
- Click opens the event in Google Calendar in a new tab (link-out, no in-app detail view)
- All-day events pinned to top of each day group, styled without a time column
- Currently-happening events get a subtle highlight — colored left border (similar to WhatNeedsAttention severity styles)

**Today vs. upcoming structure**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAL-01 | Google Calendar events sync to Convex cache table via service account auth (reusing existing Sheets credentials) | `googleapis` v171 already installed; `google.calendar({version: 'v3', auth})` pattern mirrors existing Sheets auth; same env vars (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) reused |
| CAL-02 | Calendar sync runs on a cron schedule (configurable, default 30 min) | `crons.ts` already has `crons.interval()` pattern; add `"google-calendar-sync"` entry pointing to `internal.googleCalendarSync.runSync` |
| CAL-03 | Admin can configure which Google Calendar IDs to sync from the Admin console | New `googleCalendarConfig` table stores array of `{calendarId, displayName}` entries; Admin tab follows `GoogleSheetsConfig.tsx` pattern (status dot, last sync badge, save & test, sync now) |
| CAL-04 | Dashboard widget shows today's events and upcoming events (next 7 days) | `googleCalendar.getEvents` query filters `googleCalendarCache` by `startAt >= todayStart && startAt < todayStart + 8 days`; widget registers in `SECTION_COMPONENTS` map |
| CAL-05 | Calendar events display event title, time, and calendar source | Events cached with `summary`, `startAt`, `endAt`, `isAllDay`, `calendarId`, `calendarDisplayName`, `htmlLink`, `location`; widget renders per locked design |
</phase_requirements>

---

## Summary

Phase 3 is a read-only Google Calendar sync, tightly modeled after the existing Google Sheets integration. The `googleapis` package (v171) is already installed and the service account credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`) are already in the environment. The Calendar API v3 `events.list` endpoint is straightforward — the primary gotcha is a manual prerequisite: each Google Calendar must be explicitly shared with the service account email before any data will return. The API returns an empty array (not an error) for calendars the service account cannot read, making silent misconfiguration the most likely failure mode in production.

The Convex architecture is already well-established: a `googleCalendarConfig` table stores admin-configured calendar IDs, a `googleCalendarCache` table stores fetched events, a `googleCalendarActions.ts` module handles the API call, a `googleCalendarInternal.ts` module handles write mutations, a `googleCalendarSync.ts` module acts as the cron entrypoint, and `googleCalendar.ts` exposes public queries. This is an exact structural mirror of the Sheets family (`googleSheetsActions`, `googleSheetsInternal`, `googleSheetsSync`, `googleSheets`). All Convex actions that use `googleapis` require the `"use node"` runtime directive.

The dashboard widget (`CalendarWidget.tsx`) registers into the existing `SECTION_COMPONENTS` map and `DEFAULT_DASHBOARD_SECTIONS` array, extending `DashboardSectionId` with `"calendar"`. It follows the three-state pattern already established in `ExecutiveSnapshot.tsx`: skeleton (loading), not-configured empty state with admin link, and data view. The admin UI extends the Admin page tab bar with a "Google Calendar" tab (new `AdminTab` value `"google-calendar"`), rendered by a `GoogleCalendarConfig.tsx` component that mirrors `GoogleSheetsConfig.tsx`.

**Primary recommendation:** Mirror the Google Sheets module family exactly (actions / internal / sync / public), add a multi-calendar config table (array of calendar entries), wire the cron, extend the dashboard section type system, and build the widget. No new packages needed. The only non-code work is having Kareem share each Google Calendar with the service account email address.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `googleapis` | ^171.4.0 (already installed) | Google Calendar API v3 client | Official Google Node.js client; already used for Sheets; no alternative needed |
| `convex` | ^1.32.0 (already installed) | Database, cron scheduling, real-time queries | Project's primary backend; all sync infra already built on it |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new packages | — | — | All needed packages are already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `googleapis` (official) | `node-google-calendar` npm package | Official client has full TypeScript types and is maintained by Google; no reason to use a wrapper |
| Convex cron polling | Google Calendar push notifications (webhooks) | Webhooks require a public HTTPS endpoint and channel renewal every 7 days; polling is simpler and out of scope (see REQUIREMENTS.md) |
| Storing events as individual Convex docs | Storing as a single JSON blob | Individual docs enable indexed queries by date; JSON blob would require deserializing everything on read |

**Installation:**
```bash
# Nothing to install — googleapis is already a dependency
```

---

## Architecture Patterns

### Recommended Project Structure

```
convex/
  googleCalendarActions.ts   # "use node"; internalAction syncCalendars + action triggerSync
  googleCalendarInternal.ts  # internalQuery getFullConfig; internalMutation upsertEvent, clearEvents, updateLastSync
  googleCalendarSync.ts      # internalAction runSync (cron entrypoint — checks config, calls syncCalendars)
  googleCalendar.ts          # query getConfig, getEvents; mutation saveConfig
  schema.ts                  # +googleCalendarConfig table, +googleCalendarCache table
  crons.ts                   # +crons.interval("google-calendar-sync", {minutes:30}, ...)

src/
  components/
    admin/
      GoogleCalendarConfig.tsx  # Admin tab component (mirrors GoogleSheetsConfig.tsx)
    dashboard/
      CalendarWidget.tsx        # Dashboard widget component
  app/(dashboard)/
    admin/page.tsx              # +AdminTab "google-calendar", +TABS entry, +tab render
    dashboard/page.tsx          # +SECTION_COMPONENTS["calendar"], +import CalendarWidget
  lib/constants.ts              # +DEFAULT_DASHBOARD_SECTIONS entry for "calendar"
  types/index.ts                # +DashboardSectionId "calendar"
```

### Pattern 1: Convex Module Family (mirrors Sheets exactly)

**What:** Four-file family per integration: `actions` (node runtime, API calls) / `internal` (internalQuery + internalMutation) / `sync` (cron entrypoint) / public module (query + mutation).

**When to use:** Every time a new external API is added.

**Example — sync entrypoint (`googleCalendarSync.ts`):**
```typescript
// Source: mirrors convex/googleSheetsSync.ts
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const runSync = internalAction({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.googleCalendarInternal.getFullConfig);
    if (!config || config.calendars.length === 0) {
      console.log("Google Calendar not configured, skipping sync");
      return;
    }
    try {
      await ctx.runAction(internal.googleCalendarActions.syncCalendars, {});
      console.log("Google Calendar sync completed");
    } catch (error) {
      console.error("Google Calendar sync failed:", error);
    }
  },
});
```

**Example — API action (`googleCalendarActions.ts`):**
```typescript
"use node";  // REQUIRED — googleapis uses Node.js runtime

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

export const syncCalendars = internalAction({
  handler: async (ctx) => {
    const { google } = await import("googleapis");

    const config = await ctx.runQuery(internal.googleCalendarInternal.getFullConfig);
    if (!config) throw new Error("Google Calendar not configured");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days

    for (const { calendarId, displayName } of config.calendars) {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,    // expand recurring events into instances
          orderBy: "startTime",
          maxResults: 100,
          showDeleted: false,
        });

        const events = response.data.items ?? [];
        // Clear stale events for this calendar before re-inserting
        await ctx.runMutation(internal.googleCalendarInternal.clearCalendarEvents, { calendarId });

        for (const event of events) {
          if (!event.id || !event.summary) continue; // skip events without title
          const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
          await ctx.runMutation(internal.googleCalendarInternal.upsertEvent, {
            eventId: event.id,
            calendarId,
            calendarDisplayName: displayName,
            summary: event.summary,
            startAt: isAllDay
              ? new Date(event.start!.date!).getTime()
              : new Date(event.start!.dateTime!).getTime(),
            endAt: isAllDay
              ? new Date(event.end!.date!).getTime()
              : new Date(event.end!.dateTime!).getTime(),
            isAllDay,
            location: event.location ?? undefined,
            htmlLink: event.htmlLink ?? undefined,
            lastSyncAt: Date.now(),
          });
        }
      } catch (err) {
        // Per-calendar errors are logged but don't abort other calendars
        console.error(`Failed to sync calendar ${calendarId}:`, err);
      }
    }

    await ctx.runMutation(internal.googleCalendarInternal.updateLastSync, { configId: config._id });
  },
});

// Public action — allows admin UI "Sync Now" button
export const triggerSync = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.googleCalendarActions.syncCalendars, {});
  },
});
```

### Pattern 2: Schema Design

**What:** Two new tables — config (singleton, stores array of calendar entries) and cache (one doc per event per calendar).

```typescript
// Source: mirrors googleSheetsConfig + grantsCache in convex/schema.ts
googleCalendarConfig: defineTable({
  calendars: v.array(v.object({
    calendarId: v.string(),
    displayName: v.string(),
  })),
  lastSyncAt: v.optional(v.number()),
  configuredBy: v.id("users"),
}),

googleCalendarCache: defineTable({
  eventId: v.string(),         // Google Calendar event ID (unique per calendar)
  calendarId: v.string(),      // Google Calendar ID (e.g. "abc@group.calendar.google.com")
  calendarDisplayName: v.string(), // User-defined display name from config
  summary: v.string(),         // Event title
  startAt: v.number(),         // Unix ms timestamp — enables range queries
  endAt: v.number(),           // Unix ms timestamp
  isAllDay: v.boolean(),       // true when event.start.date present (no time component)
  location: v.optional(v.string()),
  htmlLink: v.optional(v.string()),  // Link to open event in Google Calendar
  lastSyncAt: v.number(),
})
  .index("by_eventId_calendarId", ["eventId", "calendarId"])
  .index("by_startAt", ["startAt"])
  .index("by_calendarId", ["calendarId"]),
```

**Rationale for `startAt` as number (not string):** Convex can range-query numeric indexes. Storing as Unix milliseconds lets the public query do `q.gte("startAt", todayStart).lt("startAt", windowEnd)` without fetching and filtering all events in JS.

### Pattern 3: Public Query for Widget

```typescript
// convex/googleCalendar.ts
export const getEvents = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("googleCalendarConfig").first();
    if (!config || config.calendars.length === 0) return null; // null = not configured

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const windowEnd = todayStart.getTime() + 8 * 24 * 60 * 60 * 1000; // 8 days

    const events = await ctx.db
      .query("googleCalendarCache")
      .withIndex("by_startAt", (q) =>
        q.gte("startAt", todayStart.getTime()).lt("startAt", windowEnd)
      )
      .order("asc")
      .collect();

    return { events, lastSyncAt: config.lastSyncAt ?? null };
  },
});
```

### Pattern 4: Widget Three-State Pattern (mirrors ExecutiveSnapshot.tsx)

```typescript
// src/components/dashboard/CalendarWidget.tsx
export default function CalendarWidget() {
  const result = useQuery(api.googleCalendar.getEvents);

  // State 1: Loading (undefined = query in flight)
  if (result === undefined) {
    return <CalendarWidgetSkeleton />;
  }

  // State 2: Not configured (null = config table empty)
  if (result === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        {/* Calendar icon */}
        <p className="text-sm mt-3">No calendars configured.</p>
        <a href="/admin?tab=google-calendar" className="text-primary hover:underline text-xs mt-2">
          Connect Google Calendar &rarr;
        </a>
      </div>
    );
  }

  // State 3: Data
  const { events, lastSyncAt } = result;
  // ... group events by day, render agenda list
}
```

### Pattern 5: Admin Config Component (mirrors GoogleSheetsConfig.tsx)

The `GoogleCalendarConfig.tsx` component follows `GoogleSheetsConfig.tsx` exactly:
- Status dot (green/amber) + last sync badge
- Form: list of existing calendars (calendarId + displayName) with delete button, plus "Add Calendar" row (text inputs for calendarId + displayName)
- "Save & Test" button calls `saveConfig` mutation then `triggerSync` action
- "Sync Now" button calls `triggerSync` action directly

### Pattern 6: Admin Page Tab Registration

```typescript
// src/app/(dashboard)/admin/page.tsx — add to AdminTab union and TABS array
type AdminTab =
  | "users" | "quickbooks" | "constant-contact"
  | "google-sheets" | "google-calendar"  // NEW
  | "knowledge-base" | "audit-log" | "ai-config";
```

### Pattern 7: Color Palette Assignment for Calendar Dots

Since color assignment is Claude's discretion, recommend a deterministic index-based approach using the DEC brand chart palette from CLAUDE.md:

```typescript
// src/lib/constants.ts
export const CALENDAR_DOT_COLORS = [
  "#1B5E6B", // primary teal
  "#6BBF59", // accent green
  "#2B9E9E", // mid teal
  "#8CC63F", // lime
  "#5BBFB5", // light teal
  "#1A7A7A", // dark teal
];

// Usage: CALENDAR_DOT_COLORS[calendarIndex % CALENDAR_DOT_COLORS.length]
```

This is deterministic (same calendar always gets same color) and uses the project's existing palette.

### Anti-Patterns to Avoid

- **Not adding `"use node"` to googleCalendarActions.ts:** All googleapis usage must run in Node.js runtime. Without this directive, Convex will fail with a runtime error. The Sheets actions already demonstrate the correct pattern.
- **Storing `startAt` as ISO string instead of number:** Convex index range queries require numbers. String date comparisons across timezone representations are unreliable.
- **Single-mutation clear-and-reinsert inside a loop:** For multiple calendars, clear per-calendar before inserting (as shown above) so one calendar's failure doesn't affect others.
- **Not handling per-calendar errors individually:** A calendar that returns an error (e.g., permission denied) should log and continue, not abort the entire sync. Wrap each calendar in its own try/catch.
- **Assuming `event.start.dateTime` always exists:** All-day events only have `event.start.date` (a `yyyy-mm-dd` string). Always check `isAllDay` and use the correct field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date grouping for agenda view | Custom date-diff logic | `Date` object methods (`setHours(0,0,0,0)`, `toLocaleDateString`) | Already works; no additional library needed |
| Color assignment for calendar dots | Random colors per session | Index mod palette array (deterministic) | Colors must be stable across re-renders and users |
| Pagination of events from Calendar API | Manual pageToken loop | Set `maxResults: 100` and skip pagination | With a 7-day window and 3-5 calendars, 100 results per calendar is more than sufficient for a nonprofit |
| Calendar sharing setup | Programmatic ACL mutation | Manual sharing in Google Calendar UI + docs | ACL setup is a one-time admin action, not runtime code |

**Key insight:** The Google Calendar API returns an empty `items` array (not an error) when the service account lacks access. This silent failure mode requires a manual verification step after configuration (the "Save & Test" flow in the admin panel, which triggers a sync and the admin can verify events appeared).

---

## Common Pitfalls

### Pitfall 1: Service Account Not Shared With Calendar (Silent Empty Results)
**What goes wrong:** The sync runs successfully (no error), but `googleCalendarCache` has 0 events. The dashboard widget shows "No upcoming events" instead of the actual calendar data.
**Why it happens:** Google Calendar returns HTTP 200 with an empty `items: []` when the service account doesn't have reader access to a calendar. This is not an error from the API perspective.
**How to avoid:** In the Admin UI's "Save & Test" flow, after saving and syncing, display the count of events synced per calendar. If a calendar shows 0 events when the admin knows there are events, the sharing step was missed.
**Warning signs:** `googleCalendarCache` table is empty after a successful sync; no error in Convex logs.
**Pre-code prerequisite (from STATE.md):** "Google Calendar service account must be manually shared with each calendar before any code will work — silent empty-result failure mode." This was already identified as a Phase 3 concern.

### Pitfall 2: `"use node"` Directive Missing
**What goes wrong:** Convex build error or runtime error: `Cannot find module 'googleapis'` or similar.
**Why it happens:** `googleapis` relies on Node.js built-ins unavailable in Convex's default Deno-like runtime.
**How to avoid:** Always put `"use node";` as the very first line of `googleCalendarActions.ts`. The existing `googleSheetsActions.ts` correctly demonstrates this.
**Warning signs:** Convex deploy fails with module resolution error.

### Pitfall 3: All-Day Event Time Parsing
**What goes wrong:** All-day events display with wrong times (midnight or NaN) in the widget.
**Why it happens:** All-day events use `event.start.date` (format: `"2026-03-15"`) not `event.start.dateTime`. Using `new Date(event.start.dateTime!)` on an all-day event returns `Invalid Date`.
**How to avoid:** Always check `isAllDay = Boolean(event.start?.date && !event.start?.dateTime)`. Use `event.start.date` for all-day events and `event.start.dateTime` for timed events.
**Warning signs:** NaN or epoch-1970 timestamps in `googleCalendarCache`.

### Pitfall 4: DashboardSectionId Type Not Extended
**What goes wrong:** TypeScript error when adding `"calendar"` to `DEFAULT_DASHBOARD_SECTIONS` or `SECTION_COMPONENTS`.
**Why it happens:** `DashboardSectionId` is a union type in `src/types/index.ts`. Adding a new section ID requires updating the union before using it.
**How to avoid:** Update `src/types/index.ts` in Plan 03-01 before touching `dashboard/page.tsx` or `constants.ts`.

### Pitfall 5: `startAt` Range Query Boundary
**What goes wrong:** Events on the last day (day 7) are missing from the widget.
**Why it happens:** Off-by-one in the time window: querying `< today + 7 days` misses events that start at any time on day 7.
**How to avoid:** Use `today + 8 days` as the upper bound (exclusive), so `startAt < todayMidnight + 8 * 86400000` captures all events through end of day 7.

### Pitfall 6: Convex Config Singleton Assumption
**What goes wrong:** Multiple config rows accumulate in `googleCalendarConfig`, and queries return the wrong one.
**Why it happens:** If `saveConfig` mutation inserts without checking for an existing row, each save creates a new document.
**How to avoid:** Pattern from `googleSheets.ts saveConfig`: query `.first()`, delete if exists, then insert fresh. Always use singleton pattern for config tables.

---

## Code Examples

Verified patterns from codebase + official sources:

### Auth Setup (mirrors googleSheetsActions.ts exactly)
```typescript
// Source: convex/googleSheetsActions.ts (verified in codebase)
// "use node" at top of file is REQUIRED

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  // Use calendar.readonly — less permissive than calendar, sufficient for read-only sync
});

const calendar = google.calendar({ version: "v3", auth });
```

### Event Listing with 8-Day Window
```typescript
// Source: googleapis.dev/nodejs/googleapis/latest/calendar + official events.list docs
const now = new Date();
const response = await calendar.events.list({
  calendarId,                                        // e.g. "abc123@group.calendar.google.com"
  timeMin: now.toISOString(),                        // RFC3339 format required
  timeMax: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
  singleEvents: true,                                // expand recurring events into instances
  orderBy: "startTime",                              // requires singleEvents: true
  maxResults: 100,
  showDeleted: false,
});
const events = response.data.items ?? [];           // empty array (not null) when no events
```

### All-Day vs Timed Event Detection
```typescript
// Source: Google Calendar API events resource docs (verified)
// event.start.date is present for all-day events; event.start.dateTime for timed events
const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);

const startAt = isAllDay
  ? new Date(event.start!.date!).getTime()          // "2026-03-15" → midnight local
  : new Date(event.start!.dateTime!).getTime();     // RFC3339 with tz offset → UTC ms
```

### Day-Grouping Logic for Widget
```typescript
// Source: DEC-DASH design pattern (no library needed)
function getDayLabel(eventDate: Date, today: Date): string {
  const diffDays = Math.floor(
    (eventDate.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / 86400000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return eventDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

// Group events by day key (YYYY-MM-DD)
const grouped = events.reduce((acc, event) => {
  const key = new Date(event.startAt).toISOString().slice(0, 10);
  if (!acc[key]) acc[key] = [];
  acc[key].push(event);
  return acc;
}, {} as Record<string, typeof events>);
```

### Admin Config Save Pattern (mirrors googleSheets.ts)
```typescript
// convex/googleCalendar.ts
export const saveConfig = mutation({
  args: {
    calendars: v.array(v.object({ calendarId: v.string(), displayName: v.string() })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("googleCalendarConfig").first();
    const userId = await getAuthUserId(ctx); // or requireRole if needed
    if (existing) {
      await ctx.db.patch(existing._id, { calendars: args.calendars });
    } else {
      await ctx.db.insert("googleCalendarConfig", {
        calendars: args.calendars,
        configuredBy: userId as any,
      });
    }
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Calendar push notifications (webhooks) | Cron polling every 30 min | Project decision | Simpler, no endpoint management, no channel renewal; polling is correct for infrequent schedule data |
| OAuth 2.0 per-user flow | Service account with calendar sharing | Project architecture decision | Matches existing Sheets pattern; no per-user token management |
| Domain-wide delegation | Per-calendar sharing (ACL) | Project context | DEC is not a Google Workspace org; domain-wide delegation requires Workspace admin; per-calendar sharing is simpler |

**Deprecated/outdated:**
- `google.auth.JWT` constructor with keyFile: Current pattern uses `google.auth.GoogleAuth` with `credentials` object (passing env vars directly). Both work, but the GoogleAuth class handles JWT internally and is the recommended modern approach per googleapis README.

---

## Open Questions

1. **Does DEC use Google Workspace (G Suite) or personal Gmail?**
   - What we know: The Sheets integration already works, so the service account is already configured and shares work.
   - What's unclear: If DEC uses Google Workspace, domain-wide delegation is available as an alternative to per-calendar ACL sharing. Per-calendar sharing is simpler for either case.
   - Recommendation: Document the per-calendar sharing instructions clearly in the Admin UI and assume manual sharing per calendar. This works for both Gmail and Workspace.

2. **Should events older than 8 days be purged from `googleCalendarCache`?**
   - What we know: Each sync clears and re-inserts per calendar (see `clearCalendarEvents` pattern). This naturally keeps the cache current within the sync window.
   - What's unclear: If a calendar is removed from config, its old events remain in the cache.
   - Recommendation: In `clearCalendarEvents`, only delete events with `startAt >= todayStart`. Past events are excluded from queries anyway; aggressive cleanup adds complexity for no user benefit.

3. **Error visibility when a calendar sync fails?**
   - What we know: Per-calendar errors are caught and logged. The `lastSyncAt` timestamp still updates on the config even if one calendar failed.
   - What's unclear: Whether admins need per-calendar error reporting in the admin UI.
   - Recommendation: CONTEXT.md puts "Error state handling when sync fails" under Claude's Discretion. Keep it simple: display the aggregate `lastSyncAt` badge in the admin UI (as Sheets does). A sync failure will be noticed when expected events don't appear.

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not present in `.planning/config.json` (workflow keys are `research`, `plan_check`, `verifier`, not `nyquist_validation`). No automated test infrastructure is configured for this project.

---

## Sources

### Primary (HIGH confidence)
- Google Calendar API v3 events.list official docs (https://developers.google.com/workspace/calendar/api/v3/reference/events/list) — parameters, response structure, RFC3339 format requirement
- Google Calendar API events resource (https://developers.google.com/workspace/calendar/api/v3/reference/events) — field reference: `id`, `summary`, `start.date`, `start.dateTime`, `end`, `location`, `htmlLink`, `status`
- googleapis Node.js type definitions (https://googleapis.dev/nodejs/googleapis/latest/calendar/interfaces/Params$Resource$Events$List.html) — TypeScript parameter types confirmed
- Google Calendar sharing docs (https://developers.google.com/workspace/calendar/api/concepts/sharing) — `reader` role for read-only access; manual ACL sharing required
- `convex/googleSheetsActions.ts` (codebase) — verified auth pattern, `"use node"` requirement, module import style
- `convex/googleSheetsSync.ts` (codebase) — verified cron entrypoint pattern
- `convex/googleSheets.ts` (codebase) — verified public query/mutation patterns, singleton config pattern
- `convex/schema.ts` (codebase) — verified table definition patterns, index definitions
- `convex/crons.ts` (codebase) — verified `crons.interval()` registration pattern
- `src/components/admin/GoogleSheetsConfig.tsx` (codebase) — verified admin component pattern to replicate
- `src/app/(dashboard)/dashboard/page.tsx` (codebase) — verified SECTION_COMPONENTS map, DashboardSection wrapper
- `src/types/index.ts` (codebase) — verified DashboardSectionId union to extend
- `src/lib/constants.ts` (codebase) — verified DEFAULT_DASHBOARD_SECTIONS array, BRAND_COLORS palette
- `src/components/dashboard/ExecutiveSnapshot.tsx` (codebase) — verified three-state loading pattern (skeleton / not-configured / data)

### Secondary (MEDIUM confidence)
- DEV Community: Google Calendar integration with NodeJS without OAuth 2.0 (https://dev.to/maartennnn/google-calendar-integration-with-nodejs-without-oauth-2-0-5256) — confirms `event.start.dateTime || event.start.date` pattern; code example verified against official docs

### Tertiary (LOW confidence)
- None applicable — all significant claims verified against official docs or codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `googleapis` is already installed, version confirmed (^171.4.0); no new packages required
- Architecture: HIGH — mirrors established Sheets family pattern 1:1; all integration points verified in codebase
- Google Calendar API specifics: HIGH — verified against official events.list docs and googleapis TypeScript types
- Service account sharing: HIGH — verified against official Calendar sharing docs; manual ACL sharing (reader role) is the correct approach for non-Workspace orgs
- Pitfalls: HIGH — silent empty-results pitfall verified from official docs (200 + empty items on permission denied); `"use node"` requirement verified in codebase; all-day event parsing verified from events resource docs

**Research date:** 2026-02-28
**Valid until:** 2026-05-28 (googleapis API is stable; Convex patterns are project-established)
