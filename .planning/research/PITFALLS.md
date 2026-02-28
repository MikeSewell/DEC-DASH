# Pitfalls Research

**Domain:** Nonprofit executive dashboard — Next.js 15 + Convex + Google Calendar integration + dashboard data population + proactive alerts + HTML email templates
**Researched:** 2026-02-28
**Confidence:** HIGH (codebase inspected directly; external API pitfalls verified with official docs and community)

---

## Critical Pitfalls

### Pitfall 1: Google Calendar Service Account Cannot Access Calendars Without Explicit Sharing

**What goes wrong:**
The service account email is created and the API is enabled, but every calendar list or events API call returns an empty result or a 404. The service account authenticates successfully — it just has no calendars shared with it.

**Why it happens:**
Service accounts are not Google Workspace users. They do not automatically have access to any user's or organization's calendars. Google Calendar's ACL (access control list) model requires explicit sharing. Unlike a personal user who logs in via OAuth and can see their own calendars, a service account's "calendar list" is empty unless calendars have been shared to its email address (`something@project.iam.gserviceaccount.com`). Developers assume authentication = access and skip the sharing step.

**How to avoid:**
For each Google Calendar to integrate (client sessions, board meetings, community events), open Google Calendar settings → "Share with specific people" → add the service account email with "See all event details" permission. Then in code, enumerate the `calendarId` values directly — do not rely on `calendarList.list()` returning them automatically, because sharing a calendar no longer automatically inserts it into the service account's calendar list (confirmed by Google Calendar API docs). Store the calendar IDs explicitly in Convex `appSettings` so they can be configured without code changes.

**Warning signs:**
- `calendar.events.list()` returns 200 but with zero events even when calendars visibly have events
- `calendarList.list()` returns an empty `items` array
- No error thrown — just empty data

**Phase to address:**
Google Calendar integration phase. Must be verified before any event rendering code is written.

---

### Pitfall 2: Dashboard "undefined" vs "null" Conflation Breaks Empty States

**What goes wrong:**
Dashboard KPI cards and charts appear blank with no explanation — not loading spinners, not empty state messages — because components treat `undefined` (still loading) and `null` (QB not connected / no data) identically, or handle neither and render broken values like `"--"` or `NaN`.

**Why it happens:**
Convex `useQuery` returns `undefined` while the query is in-flight and the actual query result (including `null`) once resolved. Components that don't explicitly branch on `undefined` vs `null` skip the loading spinner and jump straight to a broken render. In this codebase, `ExecutiveSnapshot` correctly checks `=== undefined` for loading, but components like `ProfitLoss` receive `null` from `getProfitAndLoss` when QB is not connected and must handle that separately. The real issue is that `quickbooksCache` can be empty (QB never synced) vs. the QB connection existing but the cache being stale — these produce the same `null` return but have different root causes and should show different messages.

**How to avoid:**
For every dashboard component, implement the three-state pattern explicitly:
1. `data === undefined` → show spinner (Convex loading)
2. `data === null` → show integration "not connected" empty state with action button
3. `data.someField` being falsy → show data-specific empty state

The existing `ProfitLoss.tsx` does this correctly — use it as the template for any new dashboard sections. Never let a component silently render `$0` or `--` when the real state is "data not yet available."

**Warning signs:**
- KPI cards show `$0` or `--` when QB is connected and has data
- Charts render empty canvases rather than loading spinners
- Console warnings about rendering `NaN` or `undefined` values

**Phase to address:**
Dashboard data population fix phase.

---

### Pitfall 3: QuickBooks OAuth Refresh Token Rotation — Storing the Old Token

**What goes wrong:**
QB cron syncs work for ~100 days then permanently fail with `invalid_grant`. All QB-dependent dashboard data stops populating. The Convex logs show repeated token refresh failures, but the dashboard just shows stale data silently.

**Why it happens:**
QuickBooks OAuth 2.0 uses rotating refresh tokens: every successful refresh returns a new refresh token that invalidates the old one. The current `quickbooks.ts` `saveTokens` mutation stores the new token on initial OAuth connect, but the `quickbooksActions.ts` refresh logic must also persist the new refresh token returned on every sync. If the refresh succeeds but the new token is not written back to `quickbooksConfig`, the next sync attempts to use the already-rotated (now invalid) old token. Intuit's 2025 policy update introduced explicit expiry timestamps on refresh tokens, making this failure faster to hit.

**How to avoid:**
In `quickbooksActions.ts`, whenever a token refresh is performed, immediately call a mutation to update both `accessToken` and `refreshToken` in the `quickbooksConfig` table with the new values returned by the Intuit token endpoint. Treat refresh token updates as atomic — if the write fails, treat the sync as failed, do not proceed with stale tokens. Add a `tokenRefreshedAt` field to the config table to surface token age in the admin UI.

**Warning signs:**
- QB sync cron logs show 401 or `invalid_grant` errors
- Dashboard data freezes at a specific date (last successful sync before token invalidation)
- `quickbooksConfig.tokenExpiry` is in the past

**Phase to address:**
Dashboard data population fix phase (audit existing token refresh logic before adding new features).

---

### Pitfall 4: Convex Cron Failures Are Silent — Dashboard Data Goes Stale Without Alerting Anyone

**What goes wrong:**
The QB sync cron (15 min) or Sheets sync cron (30 min) fails silently — throws an error that's logged to Convex's internal logs but not surfaced anywhere in the dashboard. The Executive Director sees data that is hours or days old with no indication anything is wrong.

**Why it happens:**
The current `crons.ts` wraps sync actions in try-catch at the action level but has no alerting mechanism. Convex does log cron failures to the dashboard logs view, but that requires someone to actively check the Convex dashboard. There is no `lastSyncAt` surface in the UI for the QB integration (only for Sheets config), and no distinction between "syncing now" and "last synced 6 hours ago."

**How to avoid:**
Add `lastSyncSucceededAt` and `lastSyncError` fields to `quickbooksConfig`. Update them on every cron run (success or failure). Surface this in the dashboard admin panel and as an alert condition: if `lastSyncSucceededAt` is more than 2x the cron interval ago, show a warning banner in the relevant dashboard sections. This also enables the "proactive alerts" feature to detect stale data as an alert condition.

**Warning signs:**
- `fetchedAt` on cached QB data is hours old even though the cron runs every 15 min
- Convex logs show repeated action failures with no auto-recovery

**Phase to address:**
Dashboard data population fix + proactive alerts phase.

---

### Pitfall 5: Newsletter HTML Exceeds Constant Contact's 400 KB Limit on Complex Newsletters

**What goes wrong:**
A newsletter with all sections filled in (welcome message, milestones, testimonials, community events, partnerships, stats, volunteer box, social section) fails to send via Constant Contact's API. The error is generic ("campaign activity could not be saved") and does not mention the file size constraint.

**Why it happens:**
The `buildNewsletterHtml` in `newsletterTemplate.ts` generates a fully inline-styled table-based HTML email. With all 19 sections populated, the generated HTML plus the OpenAI-polished version can approach or exceed the 400 KB limit enforced by Constant Contact's custom code email endpoint. Additionally, the `generatedEmailHtml` column stores the full HTML string in Convex — very large newsletters can hit Convex's per-document size limits (1 MB per document maximum, but practically slower queries at >100 KB).

**How to avoid:**
Add a byte-length check before saving generated HTML to Convex and before sending to CC. If size exceeds 380 KB (a safe margin below the 400 KB limit), warn the user to shorten sections. Remove HTML comments from the generated output (the template has numerous `<!-- Section Name -->` comments that add size without value in production). Confirm the `[[trackingImage]]` tag is included in the generated HTML for accurate open rate tracking (currently missing from the template).

**Warning signs:**
- Large newsletters fail to save as CC campaign activities
- Constant Contact API returns 400 or 500 on campaign activity creation with full-content newsletters
- `generatedEmailHtml` stored in Convex is visibly very large (inspect in Convex dashboard)

**Phase to address:**
Newsletter template fix phase.

---

### Pitfall 6: Google Calendar Timezone Handling — Events Display at Wrong Times

**What goes wrong:**
Calendar events fetched from the Google Calendar API display in the wrong timezone on the dashboard. A 9 AM board meeting in the organization's local timezone (Pacific/Eastern) shows as 4 PM or 2 PM depending on UTC offset.

**Why it happens:**
Google Calendar API returns event `start.dateTime` as an ISO 8601 string with the event's original timezone offset (e.g., `2026-03-15T09:00:00-08:00`). When this is parsed with `new Date()` in JavaScript and displayed with `.toLocaleTimeString()` without a locale/timezone argument, it renders in the user's browser timezone — which may match, or may not. The deeper issue is that the Convex action fetching events converts the datetime to a Unix timestamp for storage, discarding timezone metadata. When the frontend renders the timestamp, there's no stored timezone to reference.

**How to avoid:**
Store event times as ISO 8601 strings with their original timezone offset rather than converting to Unix timestamps. Alternatively, store both the Unix timestamp and the `timeZone` field from the calendar event's `start` object. In the frontend, render event times using `toLocaleString('en-US', { timeZone: org_timezone })` where `org_timezone` is a stored org preference (e.g., `"America/Los_Angeles"`). Add an org timezone setting to `appSettings` during the calendar integration phase.

**Warning signs:**
- Displayed event times are off by exactly N hours (UTC offset)
- All-day events show as starting the day before (date boundary issue when converting to timestamps)

**Phase to address:**
Google Calendar integration phase — must handle timezone in the data model from the start; retrofitting is painful.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing QB raw JSON blobs in `quickbooksCache.data` as strings | Avoids schema changes per QB report format | No type safety; JSON.parse errors crash silently; querying data requires parsing in every query function | Acceptable for v1 caching layer; never for primary data |
| Using `grantsCache` (Sheets) and `grants` (Excel) as parallel tables without sync logic | Simpler implementation | Dashboard can show contradictory data from two sources; no single source of truth | Acceptable until a real sync strategy is designed |
| Hardcoded calendar IDs in code (if implemented this way) | Faster to ship | Cannot change calendars without a deployment; breaks when org restructures calendars | Never acceptable; use `appSettings` table instead |
| Alert thresholds hardcoded in queries | Simpler MVP | Cannot tune alerts without deployment; admin cannot configure sensitivity | Acceptable in phase 1; move to `appSettings` by phase 2 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Calendar API | Using `calendarList.list()` expecting to see shared calendars | Explicitly share each calendar to the service account email; store calendar IDs in `appSettings`; call `events.list()` with stored `calendarId` values |
| Google Calendar API | Fetching `maxResults` default (250) without pagination for active orgs | Always pass `maxResults` explicitly (250 is fine for this org scale); implement `pageToken` loop for completeness |
| Constant Contact newsletter | Missing `[[trackingImage]]` tag in generated HTML | Add `[[trackingImage]]` to the `<body>` of `buildNewsletterHtml` before the closing tag; CC needs this for open tracking |
| Constant Contact newsletter | Re-using a campaign activity ID without checking its current state | Before reusing `campaignActivityId`, check if the campaign was already sent — sent campaigns cannot be resent, only duplicated |
| QuickBooks token refresh | Not persisting the new refresh token returned by Intuit after each refresh | After every `refreshToken()` call, immediately run `ctx.runMutation` to write the new tokens back to `quickbooksConfig` |
| Google Sheets sync | Hardcoded column index offsets (e.g., `row[8]` for session count) | Document which sheet column maps to which field; if the sheet structure changes, all sync breaks silently |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all calendar events on every dashboard load | Dashboard slow to load; Convex action budget consumed quickly | Cache events in a Convex table with TTL (e.g., 30 min cron like Sheets); never fetch from Google directly on page load | Immediately — the Google Calendar API adds 200-800ms latency per call |
| Rendering all grant events in a single calendar widget with no date filtering | Calendar widget shows hundreds of events; UI hangs | Limit to upcoming 30-60 days by default; paginate | At ~50+ active grants with quarterly report deadlines |
| Dashboard renders all 7 sections simultaneously on load | Initial load triggers 7 parallel Convex query subscriptions | Already handled by section visibility; ensure hidden sections do not mount their components | Currently fine; becomes an issue if sections are always mounted regardless of visibility |
| QB P&L parser iterating nested row structure with any[] types | Type errors surface in production but not development | Add explicit type definitions for the QB report shape; use Zod for parse validation | At the first QB report format change |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Google service account private key in `appSettings` table (Convex DB) | Private key readable by any user who can query `appSettings`; DB breach exposes key | Keep the private key in Convex environment variables (`GOOGLE_PRIVATE_KEY`) — this is already the correct pattern in the codebase; never move it to the DB |
| Exposing calendar event attendee email addresses on the dashboard | Exposes client PII to any authenticated user regardless of role | Filter attendee data server-side in the Convex query; return only event summary, date/time, and calendar type — not attendee lists |
| Alert notifications revealing sensitive financial thresholds to all roles | Staff/readonly users seeing budget anomaly alerts that reveal QB data they shouldn't access | Gate alert data on the same RBAC rules as the underlying data; alerts about QB data visible only to admin/manager |
| Using `calendarId: "primary"` with domain-wide delegation | With domain-wide delegation enabled, this accesses the service account's own "primary" calendar (empty) — not the intended calendar | Always use explicit calendar IDs from the sharing approach; do not use domain-wide delegation unless Google Workspace admin access is available |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing an alert for every grant with a report due in the next 90 days | Executive sees 15 alerts every day; alert fatigue sets in immediately | Tier alerts: "Due within 7 days" = red urgent; "Due within 30 days" = yellow warning; "Due 31-90 days" = informational or hidden by default |
| Calendar widget showing raw Google Calendar event titles (internal naming conventions) | Executive sees "CONF-2026-Q1-Legal-Review" instead of "Legal Case Review" | Normalize event display names; allow renaming at the calendar category level |
| Newsletter preview showing the raw AI-polished HTML with placeholder artifacts | Executive sees `[RECENT_MILESTONE_2]` strings in the preview | Validate that all placeholder patterns are removed before saving `generatedEmailHtml`; the current OpenAI prompt does this but needs a post-process regex check as a safety net |
| Dashboard data showing "Last synced: 3 hours ago" with no action to refresh | Executive cannot tell if data is stale due to a bug or expected timing | Add a manual "Sync Now" button next to the last-synced timestamp; already exists for Sheets but not consistently for QB-dependent sections |

---

## "Looks Done But Isn't" Checklist

- [ ] **Google Calendar integration:** Verify events actually appear — calendars must be explicitly shared with the service account email before any code works; test with a real calendar, not a mocked response
- [ ] **Dashboard KPI cards:** Verify cards show real values, not `"--"`, after QB sync — check that `quickbooksCache` actually has data by inspecting the Convex dashboard data tab
- [ ] **Newsletter template:** Verify `[[trackingImage]]` is present in generated HTML (required by Constant Contact for open tracking); confirm the 400 KB limit is not exceeded with a fully-populated newsletter
- [ ] **Proactive alerts:** Verify alerts do not fire for already-resolved conditions on every page load — alerts need a "dismissed" or "acknowledged" state to avoid repeating
- [ ] **Calendar timezone display:** Verify a test event at 9 AM Pacific shows as 9 AM (not 5 PM UTC) for a user in Pacific timezone
- [ ] **Constant Contact campaign reuse:** Verify that calling send newsletter a second time creates a new send activity rather than trying to resend an already-sent campaign

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| QB refresh token rotated but not stored (all QB data stale) | MEDIUM | Delete `quickbooksConfig` record in Convex dashboard → have admin re-authorize QB OAuth → wait for next 15-min cron |
| Calendar service account not shared with calendars (zero events) | LOW | Share each Google Calendar with service account email → next cron sync will populate events |
| Newsletter HTML too large sent to CC (fails silently) | LOW | Edit newsletter sections to reduce content → regenerate HTML → retry send |
| Alert fatigue causing executive to ignore dashboard | HIGH | Requires full alert redesign: tiered severity, dismiss/acknowledge UI, configurable thresholds — prevent this at design phase |
| Dashboard sections showing wrong data due to `null`/`undefined` confusion | MEDIUM | Component-by-component audit against the three-state pattern (undefined/null/data); test with QB disconnected, then connected with empty cache, then connected with data |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Calendar service account not shared with calendars | Google Calendar integration | Manually create a test event in the shared calendar; verify it appears in the Convex-cached events list |
| Dashboard undefined/null state confusion | Dashboard data population fix | Test all 7 dashboard sections with QB disconnected, with QB connected but no cache, with QB connected and synced |
| QB refresh token not persisted after rotation | Dashboard data population fix | Inspect `quickbooksActions.ts` token refresh logic; confirm new tokens are written back; check `tokenExpiry` advances after a sync |
| Silent cron failures with stale data | Dashboard data population fix + proactive alerts | Add `lastSyncSucceededAt` tracking; verify the admin page surfaces sync health |
| Newsletter 400 KB limit exceeded | Newsletter template fix | Test full newsletter generation with all 19 fields populated; measure `generatedEmailHtml.length` before sending |
| Timezone display errors in calendar | Google Calendar integration | Test with a calendar event explicitly at 9:00 AM in local org timezone; verify display matches |
| Alert fatigue from ungated notifications | Proactive alerts phase | Design alert severity tiers before building any alert UI; require ED sign-off on threshold values |

---

## Sources

- Google Calendar API sharing concepts: [https://developers.google.com/workspace/calendar/api/concepts/sharing](https://developers.google.com/workspace/calendar/api/concepts/sharing)
- Service account calendar access pattern: [https://medium.com/iceapple-tech-talks/integration-with-google-calendar-api-using-service-account-1471e6e102c8](https://medium.com/iceapple-tech-talks/integration-with-google-calendar-api-using-service-account-1471e6e102c8)
- Constant Contact custom code email design guidelines: [https://developer.constantcontact.com/api_guide/design_code_emails.html](https://developer.constantcontact.com/api_guide/design_code_emails.html) — 400 KB limit confirmed, `[[trackingImage]]` requirement documented
- QuickBooks refresh token rotation: [https://nango.dev/blog/quickbooks-oauth-refresh-token-invalid-grant](https://nango.dev/blog/quickbooks-oauth-refresh-token-invalid-grant)
- Intuit 2025 refresh token policy changes: [https://blogs.intuit.com/2025/11/12/important-changes-to-refresh-token-policy/](https://blogs.intuit.com/2025/11/12/important-changes-to-refresh-token-policy/)
- Convex `useQuery` undefined vs null patterns: [https://docs.convex.dev/client/react](https://docs.convex.dev/client/react)
- Convex cron job error handling: [https://docs.convex.dev/scheduling/cron-jobs](https://docs.convex.dev/scheduling/cron-jobs)
- HTML email coding mistakes and size limits: [https://kb.benchmarkemail.com/en/common-html-email-coding-mistakes/](https://kb.benchmarkemail.com/en/common-html-email-coding-mistakes/)
- Alert fatigue patterns: [https://www.astronomer.io/blog/how-astro-observe-helps-airflow-teams-prevent-alert-fatigue-and-catch-failures-at-the-source/](https://www.astronomer.io/blog/how-astro-observe-helps-airflow-teams-prevent-alert-fatigue-and-catch-failures-at-the-source/)
- Direct codebase inspection: `convex/quickbooks.ts`, `convex/newsletterTemplate.ts`, `convex/crons.ts`, `convex/googleSheetsActions.ts`, `src/components/dashboard/*.tsx`

---
*Pitfalls research for: DEC DASH 2.0 — nonprofit executive dashboard milestone (Calendar + Dashboard + Alerts + Newsletter)*
*Researched: 2026-02-28*
