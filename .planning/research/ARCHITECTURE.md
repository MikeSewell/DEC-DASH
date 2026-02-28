# Architecture Research

**Domain:** Nonprofit executive dashboard — adding Google Calendar, dashboard fixes, alerts, newsletter fixes
**Researched:** 2026-02-28
**Confidence:** HIGH (based on direct codebase analysis + verified API documentation)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                        │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Dashboard   │  Newsletter  │  Grants      │  Calendar Widget    │
│  Page        │  Pages       │  Pages       │  (new)             │
│  + Sections  │              │              │                    │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
       │          useQuery / useMutation (Convex React)
       │              │              │                │
┌──────▼──────────────▼──────────────▼────────────────▼───────────┐
│                    CONVEX BACKEND                                 │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  queries/    │  mutations/  │  actions/    │  crons/            │
│  mutations   │ (write data) │  (external   │  (scheduled        │
│  (read data) │              │   API calls) │   tasks)           │
├──────────────┴──────────────┴──────┬─────── ┴────────────────────┤
│                    CONVEX TABLES                                  │
│  quickbooksCache  grantsCache  programDataCache                  │
│  googleCalendarCache (new)     alertsLog (new)                   │
│  newsletters  grants  clients  programs                          │
└────────────────────────────────────────────────────────────────  ┘
       │              │              │                │
┌──────▼──────┐ ┌─────▼────┐ ┌──────▼────┐ ┌────────▼────────────┐
│ QuickBooks  │ │ Google   │ │ Constant  │ │ Google Calendar     │
│ API         │ │ Sheets   │ │ Contact   │ │ API (new)           │
│ (OAuth)     │ │ (Service │ │ API       │ │ (Service Account)   │
│             │ │ Account) │ │ (OAuth)   │ │                     │
└─────────────┘ └──────────┘ └───────────┘ └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `convex/googleCalendarActions.ts` (new) | Fetch events from Google Calendar API using `googleapis` | Google Calendar API, internal mutations |
| `convex/googleCalendarInternal.ts` (new) | Cache calendar events in Convex tables | Convex DB only |
| `convex/googleCalendar.ts` (new) | Public queries to read calendar cache | Frontend via useQuery |
| `convex/googleCalendarSync.ts` (new) | Cron entrypoint for periodic Calendar refresh | Internal calendar actions |
| `convex/alerts.ts` (new) | Query logic that computes alert conditions from existing tables | Frontend only — reads grants, QB, clients |
| `src/components/dashboard/CalendarWidget.tsx` (new) | Display upcoming events grouped by type | `api.googleCalendar.*` |
| `src/components/dashboard/AlertsPanel.tsx` (new) | Display proactive alerts ranked by urgency | `api.alerts.*` |
| Dashboard section components (fix) | Render KPI cards and charts with real data | existing QB/Sheets hooks |
| `convex/newsletterTemplate.ts` (fix) | Generate correct HTML matching n8n format | newsletterActions |
| `convex/newsletterActions.ts` (fix) | AI polish pipeline + send pipeline | OpenAI, Constant Contact |

---

## Recommended Project Structure (New Files Only)

```
convex/
├── googleCalendarActions.ts    # "use node" — googleapis calendar.events.list()
├── googleCalendarInternal.ts   # internalMutation: upsert cached events, clear stale
├── googleCalendar.ts           # query: getUpcomingEvents, getEventsByType, getConfig
├── googleCalendarSync.ts       # internalAction: cron entrypoint (runs every 15 min)
├── alerts.ts                   # query: computeAlerts() — no new table needed
├── schema.ts                   # Add googleCalendarCache table + googleCalendarConfig
└── crons.ts                    # Add calendar-sync cron interval

src/
├── components/
│   └── dashboard/
│       ├── CalendarWidget.tsx  # Upcoming events — 5-7 items with type badges
│       └── AlertsPanel.tsx     # Alert list with urgency levels + action links
├── hooks/
│   └── useCalendar.ts          # Thin wrappers: useUpcomingEvents, useCalendarConfig
└── app/
    └── (dashboard)/
        └── admin/
            └── page.tsx        # Add "Google Calendar" tab to Admin console
```

---

## Architectural Patterns

### Pattern 1: Cache-Through Integration (existing pattern — use for Calendar)

**What:** External API (Google Calendar) is never called from the frontend. Convex actions fetch and cache into a Convex table. Frontend queries only read the cache.

**When to use:** Any external API integration. Already used for QB and Google Sheets.

**Why:** Eliminates rate-limit pressure on user actions, tolerates API downtime gracefully, and keeps all data in Convex's reactive query system.

**Example:**
```typescript
// convex/googleCalendarActions.ts — "use node" action
export const syncCalendar = internalAction({
  handler: async (ctx) => {
    const { google } = await import("googleapis");
    const config = await ctx.runQuery(internal.googleCalendar.getFullConfig);
    if (!config) return;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"],
    });

    const calendar = google.calendar({ version: "v3", auth });
    const now = new Date().toISOString();
    const twoMonthsOut = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    for (const calendarId of config.calendarIds) {
      const response = await calendar.events.list({
        calendarId,
        timeMin: now,
        timeMax: twoMonthsOut,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
      });
      // upsert to googleCalendarCache via internalMutation
    }
  },
});
```

**Reuse decision:** The same `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` env vars used for Google Sheets work for Calendar — no new credentials needed, just share each calendar with the service account email.

---

### Pattern 2: Computed Alerts via Pure Queries (no new table needed)

**What:** Alerts are computed on-demand by a Convex query that reads existing tables (grants, quickbooksCache, clients). No separate "alerts" table. The query assembles alert items sorted by urgency and returns them.

**When to use:** When alerts reflect current state of existing data rather than new events. This avoids double-writing and keeps alerts always fresh.

**Trade-offs:**
- Pro: No sync delay, no staleness, no separate writes, zero schema changes needed
- Con: Slightly more compute per query, but trivial for this scale (<100 grants, <500 clients)

**Example:**
```typescript
// convex/alerts.ts — pure query, no external calls
export const computeAlerts = query({
  handler: async (ctx) => {
    const alerts: Alert[] = [];
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // Grant report deadlines
    const grants = await ctx.db.query("grants").collect();
    for (const grant of grants) {
      for (const dateField of ["q1ReportDate", "q2ReportDate", "q3ReportDate", "q4ReportDate"] as const) {
        const dateStr = grant[dateField];
        if (!dateStr) continue;
        const dueMs = new Date(dateStr).getTime();
        const daysUntil = Math.ceil((dueMs - now) / (24 * 60 * 60 * 1000));
        if (daysUntil >= 0 && daysUntil <= 30) {
          alerts.push({
            type: "grant_report_due",
            urgency: daysUntil <= 7 ? "high" : "medium",
            title: `${grant.fundingSource} report due`,
            detail: `${daysUntil} days — ${dateField.replace("ReportDate", "").toUpperCase()}`,
            linkTo: `/grants/${grant._id}`,
            dueDate: dateStr,
          });
        }
      }
    }
    // Also: QB cash-on-hand below threshold, upcoming Calendar events, etc.
    return alerts.sort((a, b) => urgencyOrder(a.urgency) - urgencyOrder(b.urgency));
  },
});
```

---

### Pattern 3: Dashboard Section as Self-Contained Data Fetcher

**What:** Each dashboard section component owns its own `useQuery` calls. The parent `DashboardPage` only manages layout/order. No top-down prop drilling of data.

**When to use:** Already the pattern in this project — maintain it. Do not lift QB/Calendar/alert state into the parent page.

**Trade-offs:**
- Pro: Sections are independently composable, can be hidden without orphaning data
- Con: Multiple independent Convex subscriptions — acceptable for this scale

**Fix implication:** The data population issue in dashboard sections is likely in the individual component hooks, not the page. Investigate `useGrantTracker.ts` → `api.googleSheets.getGrants` (reads `grantsCache` table) versus `useGrants.ts` → `api.grants.list` (reads `grants` table) — these are different tables and the components may be reading the wrong one.

---

### Pattern 4: Admin Tab for New Integration Config

**What:** Add "Google Calendar" as a new tab in the existing Admin console (`/admin`), matching the existing pattern for QB, CC, and Sheets tabs. Config stored in a new `googleCalendarConfig` Convex table (singleton pattern, `.first()`).

**When to use:** Every new external service integration that requires admin setup.

**Config fields needed:**
- `calendarIds: string[]` — list of calendar IDs shared with service account
- `syncedAt: number` — last sync timestamp
- `configuredBy: Id<"users">` — audit trail

---

## Data Flow

### Google Calendar Sync Flow

```
crons.ts (every 15 min)
    ↓
googleCalendarSync.runSync (internalAction)
    ↓ checks config exists
googleCalendarActions.syncCalendar (internalAction, "use node")
    ↓ googleapis calendar.events.list() for each calendarId
googleCalendarInternal.upsertEvent (internalMutation)
    ↓ writes to googleCalendarCache table
    ↑
googleCalendar.getUpcomingEvents (query)
    ↑
useCalendar.ts (useQuery hook)
    ↑
CalendarWidget.tsx (React component)
    ↑
Dashboard page (renders as a section)
```

### Alerts Computation Flow

```
AlertsPanel.tsx (React component)
    ↓ useQuery(api.alerts.computeAlerts)
alerts.ts computeAlerts (pure query)
    ↓ reads: grants, quickbooksCache, googleCalendarCache, clients
    ↓ assembles Alert[] sorted by urgency
    ↑ returns Alert[] to component
AlertsPanel.tsx renders ranked list with action links
```

### Dashboard Data Population Fix Flow

The existing sections use two different data sources that need clarification:

```
ExecutiveSnapshot reads:
  useGrants() → api.googleSheets.getGrants → grantsCache table (Sheets sync)
  useActiveGrants() → api.googleSheets.getActiveGrants → grantsCache table
  useAccounts() → api.quickbooks.getAccounts → quickbooksCache table (QB sync)
  useProfitAndLoss() → api.quickbooks.getProfitAndLoss → quickbooksCache table

GrantTracking/GrantBudget likely read:
  Check if these use grantsCache (Sheets) or grants (Excel import) table
  → These are separate tables; must match to the data source that is populated
```

**Root cause hypothesis:** Dashboard sections return `null` (not `undefined`) when the cache tables are empty, which means QB/Sheets have not synced yet. The fix is to ensure caches are populated (QB must be connected and synced, Sheets must be configured), and verify components handle the `null` empty state with a clear "Connect X" CTA rather than silently blank.

### Newsletter Template Fix Flow

```
User fills section editor → saves sections JSON
    ↓
newsletterActions.generateEmailHtml (action, "use node")
    ↓ calls buildNewsletterHtml() from newsletterTemplate.ts
    ↓ passes result to OpenAI for polish
    ↓ saves polished HTML to newsletters.generatedEmailHtml
    ↑
NewsletterPreview.tsx renders HTML in sandboxed iframe
    ↑
User edits visually via contentEditable → saves outerHTML
```

**Known template issues to fix:**
- Verify the `buildNewsletterHtml` output matches n8n "New test" node HTML exactly (check column widths, border-radius values, shadow styles)
- OpenAI polish prompt must not strip correctly-filled sections; refine system prompt to only remove literal `[PLACEHOLDER]` strings
- The `contentEditable` iframe edit mode may corrupt head/style tags — verify `documentElement.outerHTML` extraction preserves complete structure

---

## Schema Additions Required

```typescript
// Add to convex/schema.ts

googleCalendarConfig: defineTable({
  calendarIds: v.array(v.string()),    // calendar IDs shared with service account
  syncedAt: v.optional(v.number()),
  configuredBy: v.id("users"),
}).index("by_configuredBy", ["configuredBy"]),

googleCalendarCache: defineTable({
  calendarId: v.string(),              // source calendar
  eventId: v.string(),                 // Google event ID (for dedup)
  title: v.string(),
  startTime: v.number(),               // Unix ms
  endTime: v.number(),                 // Unix ms
  isAllDay: v.boolean(),
  eventType: v.union(
    v.literal("client_session"),
    v.literal("board_meeting"),
    v.literal("community_event"),
    v.literal("grant_deadline"),
    v.literal("other")
  ),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  cachedAt: v.number(),
})
  .index("by_startTime", ["startTime"])
  .index("by_eventType", ["eventType"])
  .index("by_eventId", ["eventId"]),
```

**Event type classification:** Events can be classified by calendar (one calendar per type) or by keyword matching in the title. Calendar-per-type is cleaner — Kareem maintains separate "Client Sessions", "Board Meetings", "Community Events" calendars and all are shared with the service account.

---

## Integration Points

### External Services

| Service | Integration Pattern | Auth Method | Existing? |
|---------|---------------------|-------------|-----------|
| QuickBooks | OAuth tokens stored in `quickbooksConfig`, refreshed by action | OAuth 2.0 | Yes |
| Google Sheets | Service account via env vars, config in `googleSheetsConfig` | Service Account JWT | Yes |
| Google Calendar | Service account (same env vars as Sheets), config in `googleCalendarConfig` | Service Account JWT | No — new |
| Constant Contact | OAuth tokens stored in `constantContactConfig` | OAuth 2.0 | Yes |
| OpenAI | API key in `appSettings` table (`openai_api_key` key) | API Key | Yes |

### Key Reuse Opportunity

Google Calendar uses the **same service account credentials** (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) already used for Google Sheets. The only requirement: each Google Calendar must be shared with the service account email at "See all event details" permission level. No new env vars or OAuth flow needed.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `googleCalendarActions` ↔ `googleCalendarInternal` | `ctx.runMutation(internal.googleCalendarInternal.upsertEvent, ...)` | Same pattern as Sheets |
| `alerts.ts` ↔ `grants`, `quickbooksCache`, `googleCalendarCache` | Direct `ctx.db.query()` inside query | No cross-module calls; pure DB reads |
| Dashboard sections ↔ Convex queries | `useQuery` hooks in `src/hooks/` | No props drilling — each section self-sufficient |
| Newsletter template ↔ OpenAI | `openai.chat.completions.create()` in `newsletterActions.ts` | Already wired; fix is in prompt and template accuracy |

---

## Build Order Implications

The features have these dependencies:

```
1. Newsletter template fix
   → No dependencies. Isolated to convex/newsletterTemplate.ts + newsletterActions.ts
   → Build first (quick win, no schema changes)

2. Dashboard data population fix
   → No schema changes. Fix is in existing components + queries
   → Requires verifying QB is synced and grantsCache/quickbooksCache are populated
   → Build second (unblocks core value of the dashboard)

3. Google Calendar integration
   → Requires schema additions (googleCalendarConfig, googleCalendarCache)
   → Requires Admin tab addition
   → Requires new Convex module family (actions/internal/queries/sync)
   → Build third (all dependencies are new, no risk to existing features)

4. Proactive alerts
   → Requires googleCalendarCache to exist for calendar-based alerts
   → But grant deadline alerts can ship before Calendar (use grants table)
   → Can be split: grant/QB alerts in Phase 3, Calendar event alerts after Calendar sync ships
   → Build fourth, but grant-only alerts can start in Phase 3

5. Dashboard redesign (command center layout)
   → Requires alerts (Phase 4) and Calendar widget (Phase 3) to be meaningful
   → Build last — adds CalendarWidget + AlertsPanel as new sections
```

---

## Anti-Patterns

### Anti-Pattern 1: Calling Google Calendar API from Next.js Route Handlers

**What people do:** Create a `/api/calendar/events` Next.js route that calls the Google Calendar API directly on user request.

**Why it's wrong:** Breaks the established caching pattern. Every dashboard load triggers an API call. Hits rate limits under multi-user scenarios. Calendar data is unavailable during API downtime.

**Do this instead:** Follow the Sheets pattern — Convex action syncs to cache on cron schedule, frontend reads only from `googleCalendarCache` via Convex query.

---

### Anti-Pattern 2: Separate Alert Events Table with Async Writes

**What people do:** Create a separate `alerts` table, have a cron job write alert records, have the frontend read them.

**Why it's wrong:** Alert records become stale between cron runs. A grant report due in 6 days requires a record written 6 days ago. When grants are edited, old alert records are orphaned. Double-write complexity.

**Do this instead:** Compute alerts as a pure query from existing live data. The `grants` table is always current (inline editing). The computed alert is always accurate. No sync lag.

---

### Anti-Pattern 3: Fetching All Events for All Time in Calendar Sync

**What people do:** `calendar.events.list({ calendarId })` with no `timeMin`/`timeMax` bounds.

**Why it's wrong:** Returns entire calendar history. For an organization with years of events, this is thousands of records, slow, and exceeds API quotas.

**Do this instead:** Set `timeMin: now` and `timeMax: 60-days-out`. Only future events matter for a command center dashboard. Store only the next 60 days, refresh every 15 minutes.

---

### Anti-Pattern 4: Mixing grantsCache and grants Tables in Dashboard

**What people do (likely root cause of current bug):** Components call `api.googleSheets.getGrants` (reads `grantsCache` — Sheets sync) when they should call `api.grants.list` (reads `grants` — Excel import with rich data), or vice versa.

**Why it's wrong:** `grantsCache` is populated by the Sheets cron and has limited fields. `grants` is the rich table with Q1-Q4 report dates, contact info, and funding stages. The Executive Snapshot uses `grantsCache` for total amounts (correct — this is Sheets data). The Grant Tracker and Grant Budget sections may be reading the wrong table or reading from an empty cache.

**Do this instead:** Dashboard sections that need stage-pipeline and rich grant data should use `api.grants.*`. Sections that need Sheets-synced totals and spending should use `api.googleSheets.*`. Document which table each section reads.

---

## Scaling Considerations

This is a single-organization internal tool. Scale is ~10 concurrent users maximum. Convex's free tier handles this trivially.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (1-10 users) | Current architecture is correct. Crons run on Convex infra regardless of user count. |
| 10-100 users | No changes needed. Convex subscriptions are efficient. Consider cron interval tuning. |
| Multi-organization | Would require per-org config rows and row-level auth scoping — out of scope. |

### Scaling Priorities (if needed)

1. **First bottleneck:** Convex query fan-out on `computeAlerts` — if grants table grows to thousands. Mitigate with indexes.
2. **Second bottleneck:** Google Calendar API quota (10,000 requests/day per project, free). At 15-min intervals with 4 calendars = ~384 requests/day — well within limits.

---

## Sources

- Google Calendar API Auth Scopes: https://developers.google.com/workspace/calendar/api/auth (HIGH confidence — official docs)
- Google Calendar API Events Reference: https://developers.google.com/workspace/calendar/api/v3/reference/events (HIGH confidence — official docs)
- Convex Scheduled Functions: https://docs.convex.dev/scheduling/scheduled-functions (HIGH confidence — official docs)
- Existing codebase patterns: `convex/googleSheetsActions.ts`, `convex/quickbooksActions.ts`, `convex/crons.ts` (HIGH confidence — direct source)
- Service Account calendar sharing: https://developers.google.com/workspace/calendar/api/concepts/sharing (HIGH confidence — official docs)

---

*Architecture research for: DEC DASH 2.0 — Google Calendar integration, dashboard fixes, proactive alerts, newsletter fixes*
*Researched: 2026-02-28*
