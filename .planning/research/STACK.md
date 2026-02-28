# Stack Research

**Domain:** Nonprofit Executive Dashboard (Next.js 15 + Convex — milestone additions)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (existing stack verified from codebase; new additions verified via official docs and WebSearch)

---

## Context: What Already Exists

This is a subsequent milestone on an existing app. The base stack is locked:

| Already Installed | Version | Do Not Change |
|-------------------|---------|---------------|
| next | 16.1.6 | Core framework |
| convex | ^1.32.0 | Backend, DB, real-time |
| googleapis | ^171.4.0 | Google Sheets — **reuse for Calendar** |
| react / react-dom | 19.2.3 | Client framework |
| openai | ^6.22.0 | AI features |
| chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 | Dashboard charts |
| date-fns | ^4.1.0 | Date utilities |
| tailwindcss | ^4 | CSS framework |

---

## Recommended Stack (New Additions Only)

### Google Calendar Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| googleapis (existing) | ^171.4.0 | Google Calendar API v3 client | Already installed for Google Sheets. The same `google.calendar({ version: 'v3', auth })` pattern mirrors the existing `google.sheets({ version: 'v4', auth })` pattern in `googleSheetsActions.ts`. No new package needed. |
| Google Calendar API v3 | N/A | Read calendar events | REST API accessed via googleapis. Service account authentication (already configured with `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` env vars) works by sharing each calendar with the service account email. |

**Authentication approach (HIGH confidence — mirrors existing pattern):**

The project already uses a Google service account for Sheets with `google.auth.GoogleAuth` + `credentials: { client_email, private_key }`. The same pattern works for Calendar:

```typescript
// In a new convex/googleCalendarActions.ts — "use node" required
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});
const calendar = google.calendar({ version: "v3", auth });
```

**Required one-time setup:** Each Google Calendar (client sessions, board meetings, community events, grant deadlines) must be shared with the service account email via Google Calendar settings > Share with specific people > "See all event details" permission.

**Scope to use:** `https://www.googleapis.com/auth/calendar.readonly` — read-only is sufficient, matches least-privilege principle. (MEDIUM confidence — verified via official Google Calendar API auth docs and multiple community sources.)

**Do NOT use** `@googleapis/calendar` (separate scoped package, v14.2.0) — it's a lighter alternative, but the project already has the full `googleapis` package and using it avoids introducing another dependency for the same API surface.

### Convex Integration Pattern for Calendar

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Convex crons (built-in) | convex ^1.32.0 | Sync Calendar events on schedule | Exact same pattern as the existing `sheets-sync` cron. Add a `calendar-sync` interval to `convex/crons.ts`. |
| Convex googleCalendarCache table | schema addition | Cache fetched events | Following the `quickbooksCache` / `grantsCache` pattern. Store events as JSON string, sync every 15-30 min. Avoids Google API rate limits. Real-time reactivity from Convex `useQuery`. |

### Dashboard Data Population Fix

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| convex-helpers | ^0.1.x (latest) | `useQueryWithStatus` hook | The root cause of dashboard widgets showing "--" is that `useQuery` returns `undefined` during load and `null` when QB/Sheets data isn't configured. `convex-helpers` provides `makeUseQueryWithStatus` which returns `{ status, data, isSuccess, isPending, isError }` — making loading vs. empty vs. configured-but-empty states distinct. |

**Install:** `npm install convex-helpers`

**Pattern:**
```typescript
import { makeUseQueryWithStatus } from "convex-helpers/react";
import { useQueries } from "convex/react";
export const useQueryWithStatus = makeUseQueryWithStatus(useQueries);

// In component:
const { isSuccess, isPending, data } = useQueryWithStatus(api.quickbooks.getProfitAndLoss);
```

**Alternative considered:** `useStableQuery` via `useRef` (custom implementation). Rejected because `convex-helpers` is maintained by the Convex team, well-tested, and avoids bespoke boilerplate. (MEDIUM confidence — verified via Convex docs and official convex-helpers GitHub.)

### Proactive Alerts / Notifications

**Two-layer pattern: storage (Convex) + display (in-app toast).**

#### Storage Layer — Convex alerts table

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Convex schema addition (`alerts` table) | convex ^1.32.0 | Persist alert records | Store generated alerts (grant deadline approaching, no QB sync in 24h, client with overdue follow-up). The dashboard queries this table via `useQuery` for real-time reactive display. Alerts generated by cron jobs, not pushed externally. |
| Convex cron (daily) | built-in | Generate alerts | A daily `checkAlerts` internal mutation scans grants for upcoming deadlines, checks `quickbooksCache.fetchedAt` for stale data, surfaces anomalies. Writes to `alerts` table. This is the existing cron pattern — same `convex/crons.ts` file. |

**Alert generation cron pattern (HIGH confidence — documented in Convex cron docs):**
```typescript
// convex/crons.ts
crons.daily("check-alerts", { hourUTC: 8, minuteUTC: 0 }, internal.alerts.checkAndGenerate);
```

#### Display Layer — In-app toast notification

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| sonner | ^1.x | Toast notification display | The standard in 2025 for Next.js + React 19 toast notifications. Shadcn UI ships sonner by default. Works in Server Components (Toaster in layout), called from client components. 5KB, no peer dependency conflicts. The alternative (react-hot-toast) has the same pattern but sonner is more actively maintained and better aligned with React 19. |

**Install:** `npm install sonner`

**Pattern for Convex-driven alerts:**
```tsx
// In dashboard layout — place <Toaster /> once in (dashboard)/layout.tsx
import { Toaster } from "sonner";

// In dashboard page — watch alerts table, toast on new items
const newAlerts = useQuery(api.alerts.getUnread);
useEffect(() => {
  newAlerts?.forEach(alert => toast.warning(alert.message));
}, [newAlerts]);
```

**What NOT to use for notifications:**
- External push notification services (OneSignal, Pusher) — overkill for a single-user executive dashboard, adds cost and complexity
- Email notifications for proactive alerts — the dashboard IS the notification surface; email adds latency and noise
- Browser Push API — requires service workers, complex permissions, not worth it for an internal tool

### Newsletter Template Formatting Fix

No new libraries needed. This is a debugging task on existing code in `convex/newsletterTemplate.ts`.

**Key findings from research (MEDIUM confidence — verified via caniemail.com and multiple sources):**

| CSS Property | Gmail | Outlook Desktop | Apple Mail | Notes |
|--------------|-------|-----------------|------------|-------|
| `border-radius` | Supported (2019+) | Partially (VML fallback needed) | Full support | The template uses `border-radius: 8px 8px 0 0` — this works in Gmail but fails in Outlook desktop |
| `box-shadow` | NOT supported | NOT supported | Supported | The template uses `box-shadow: 0 2px 10px rgba(0,0,0,0.1)` — silently ignored in Gmail and Outlook |
| `display: flex` | Partial | No | Yes | The template correctly uses tables, not flex — good |
| Inline `style=` | Required | Required | Required | All styling must be inline — no `<style>` tags |

**Fix approach:** The template in `newsletterTemplate.ts` already uses table-based layout (correct). The fixes are:
1. Remove `box-shadow` from the main container table — it won't render in Gmail/Outlook (the most common clients). Use border as fallback.
2. Ensure all CSS is inline (already done). The `<style>` tag in `<head>` is ignored by Gmail.
3. The `border-radius` on the header (`border-radius: 8px 8px 0 0`) is acceptable — it degrades gracefully in unsupported clients (renders as square corners).

**Tool for verification:** Use [Litmus](https://www.litmus.com/) or [Email on Acid](https://www.emailonacid.com/) for cross-client preview if needed. Neither requires installation.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| convex-helpers | ^0.1.x | `useQueryWithStatus`, query caching | Dashboard components needing distinct loading/empty/error states |
| sonner | ^1.x | In-app toast notifications | Alert display layer for proactive notifications |
| date-fns (existing) | ^4.1.0 | Calendar event date formatting, deadline countdown | Already installed — use `formatDistanceToNow`, `isBefore`, `addDays` for deadline logic |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| googleapis (existing, reuse) | @googleapis/calendar v14.2.0 | Only if you want to drop the full googleapis package; not appropriate here since Sheets already uses it |
| Service account auth (reuse existing) | OAuth 2.0 user auth (next-auth flow) | Only if you need to read a private personal Google Calendar that cannot be shared — service account requires the calendar to be explicitly shared |
| Convex cron + alerts table | External scheduler (cron.job, Upstash QStash) | Only if Convex backend were not the primary data store; unnecessary since crons.ts already runs QB and Sheets syncs |
| sonner | react-hot-toast | Both are equivalent; sonner has better Next.js 15 App Router docs and React 19 compatibility |
| convex-helpers useQueryWithStatus | Custom useStableQuery via useRef | Custom is fine but convex-helpers is Convex-team-maintained and avoids bespoke code |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-big-calendar` or `@fullcalendar/react` | Full calendar UI component — not needed. Kareem needs a widget showing upcoming events, not a calendar editor | Custom event list component reading from the Convex `calendarCache` table |
| `node-google-calendar` npm package | Unmaintained wrapper, last release 2019 | `googleapis` (existing) |
| External notification service (OneSignal, Pusher, Knock) | Adds external dependency, cost, and configuration overhead for a single-user internal tool | Convex `alerts` table + sonner toast |
| CSS `@media` queries inside email `<head>` | Stripped by Gmail | Use inline styles only; `border-radius` and `box-shadow` fallback gracefully |
| `react-email` or MJML | Full email templating systems — the newsletter template is already written and working | Fix existing `newsletterTemplate.ts` inline |

---

## Stack Patterns by Variant

**For Google Calendar sync (read-only, service account, multiple calendars):**
- Use one `calendarCache` Convex table with a `calendarId` field (to distinguish client sessions / board meetings / community events / grant deadlines calendars)
- Sync all calendars in one `syncCalendars` internalAction (mirrors `syncProgramData` pattern)
- Store events as JSON-stringified array per calendar, or individual rows per event
- Fetch next 60 days of events: `timeMin: new Date().toISOString()`, `timeMax: new Date(Date.now() + 60*24*60*60*1000).toISOString()`

**For dashboard data population fix:**
- Debug each component individually: check if the underlying Convex query returns data in the dashboard or returns `null` (QB not connected vs. connected but empty)
- Use `useQueryWithStatus` to surface distinct states: "QB not configured", "Loading", "No data for period", "Data ready"
- The `quickbooksCache` table and `grantsCache` table have data — the issue is likely in how components handle the `undefined` → `null` transition

**For proactive alerts:**
- Store alerts with: `{ type, message, severity: "info"|"warning"|"critical", entityId?, createdAt, readAt? }`
- Daily cron checks: grants with report due in ≤14 days, QB sync age >2 hours, grants with 0 spending against budget
- Dashboard AlertBanner component queries unread alerts, renders inline (above KPI cards) + sonner toast on new items

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| googleapis ^171.4.0 | Google Calendar API v3 | Calendar API accessed same way as Sheets — `google.calendar({ version: 'v3', auth })` |
| convex ^1.32.0 | convex-helpers ^0.1.x | convex-helpers is a peer of convex, matches the installed version |
| sonner ^1.x | React 19, Next.js 15+ | Verified — sonner works with React Server Components; `<Toaster />` in server layout, `toast()` in client components |
| @convex-dev/auth ^0.0.90 | convex ^1.32.0 | Existing — no changes needed |

---

## Installation

```bash
# New packages needed for this milestone
npm install convex-helpers sonner

# No new packages needed for:
# - Google Calendar (googleapis already installed)
# - Alerts storage (Convex schema extension)
# - Newsletter fix (no new deps)
```

---

## Sources

- **Official Google Calendar API auth docs** — https://developers.google.com/workspace/calendar/api/auth — scope list, authentication patterns (HIGH confidence)
- **Official Google Calendar API Node.js quickstart** — https://developers.google.com/workspace/calendar/api/quickstart/nodejs — setup steps, package requirements (HIGH confidence)
- **Convex Cron Jobs docs** — https://docs.convex.dev/scheduling/cron-jobs — cron pattern, database mutation from crons (HIGH confidence)
- **Convex Scheduled Functions docs** — https://docs.convex.dev/scheduling/scheduled-functions — `ctx.scheduler` API (HIGH confidence)
- **convex-helpers GitHub** — https://github.com/get-convex/convex-helpers — `useQueryWithStatus`, utility hooks (MEDIUM confidence — GitHub README reviewed)
- **caniemail.com border-radius** — https://www.caniemail.com/features/css-border-radius/ — email client CSS support data (HIGH confidence)
- **Sonner GitHub** — https://github.com/emilkowalski/sonner — React 19 / Next.js 15 compatibility (MEDIUM confidence — WebSearch verified)
- **Existing codebase** — `convex/googleSheetsActions.ts`, `convex/crons.ts`, `convex/schema.ts` — pattern verification (HIGH confidence — read directly)
- **WebSearch: "Google Calendar service account share calendar permissions"** — multiple sources confirming share-with-service-account approach (MEDIUM confidence)
- **WebSearch: "@googleapis/calendar npm version"** — confirmed v14.2.0 for scoped package; full googleapis at ^171 sufficient (MEDIUM confidence)

---

*Stack research for: DEC DASH 2.0 — Google Calendar integration, dashboard data fix, alerts, newsletter template fix*
*Researched: 2026-02-28*
