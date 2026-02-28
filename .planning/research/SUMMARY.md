# Project Research Summary

**Project:** DEC DASH 2.0 — Command Center Milestone
**Domain:** Nonprofit Executive Dashboard (Next.js 15 + Convex — milestone additions)
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

DEC DASH 2.0 is an existing, working executive dashboard for the Dads' Education Center nonprofit. This milestone is not a greenfield build — it is a targeted addition of four capabilities to a production system: fixing dashboard KPI data rendering, integrating Google Calendar, adding a proactive alerts panel, and fixing the newsletter HTML template. The base stack (Next.js 15, Convex, googleapis, OpenAI, Constant Contact) is locked and proven. All four additions follow established patterns already in the codebase: the Calendar sync mirrors the Sheets sync, the alerts panel reads existing tables without new infrastructure, and the newsletter fix is a targeted HTML audit rather than a rewrite.

The recommended approach is to build in dependency order: newsletter template fix first (fully isolated, no schema changes, immediate value), then dashboard data fix (unblocks core value, no new features), then Google Calendar integration (new schema and Convex modules, but follows the cache-through pattern), and finally the alerts panel (reads all of the above). This sequencing means each phase delivers independent value and the hardest phase (Calendar) does not block the others. Two new npm packages are needed: `convex-helpers` (for proper loading state management) and `sonner` (for toast notifications). No other new dependencies are required — `googleapis` already handles Calendar.

The top risk is operational, not technical: the Google Calendar service account integration requires manual sharing of each calendar with the service account email before any code will work. A second major risk is the existing dashboard's `undefined`/`null` conflation causing silent failures; this must be audited component-by-component before Calendar and alerts are added on top. The QuickBooks refresh token rotation pattern (Pitfall 3) is a latent production bug that could cause all QB data to go stale after ~100 days — it should be audited and fixed during the dashboard data phase.

## Key Findings

### Recommended Stack

The existing stack requires no major additions. `googleapis ^171.4.0` is already installed and handles Google Calendar API v3 via `google.calendar({ version: 'v3', auth })` — the same auth credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) used for Sheets work for Calendar. The only new packages needed are `convex-helpers` (Convex-team-maintained utility providing `useQueryWithStatus` for distinct loading/empty/error states) and `sonner` (the standard React 19 + Next.js 15 App Router toast library, 5KB, no peer conflicts).

**Core technologies:**
- `googleapis` (existing): Google Calendar API access — reuse exactly as used for Sheets; no new auth setup
- `convex-helpers`: `useQueryWithStatus` hook — distinguishes `undefined` (loading), `null` (not configured), and actual data for dashboard components
- `sonner`: Toast display layer for proactive alerts — `<Toaster>` in dashboard layout, `toast()` in client components
- Convex crons (built-in): Calendar sync schedule — same `crons.ts` file as QB and Sheets syncs
- `date-fns` (existing): Deadline countdown logic — `formatDistanceToNow`, `isBefore`, `addDays`

**What NOT to add:** Calendar UI libraries (`react-big-calendar`, `@fullcalendar/react`) are overkill; a simple event list widget is the correct scope. External notification services (OneSignal, Pusher) are unnecessary for a single-user internal tool.

### Expected Features

**Must have (table stakes — this milestone):**
- KPI cards showing real QB + grant data — the dashboard is the core tool; empty cards signal the whole product doesn't work
- Newsletter HTML rendering correctly in Gmail and Outlook — the template output is the primary artifact of the newsletter system
- Google Calendar read-only sync — client sessions, board meetings, community events surfaced in one place
- Calendar widget on dashboard — today's events and next 7 days minimum
- Alerts panel ("What Needs Attention") — grant report deadlines within 30 days, grants expiring, QB budget variance >15%

**Should have (add in this milestone if possible):**
- Upcoming deadlines timeline widget — low effort, reuses existing grant countdown badge pattern
- Last-sync timestamps visible on all data-dependent sections — users need to know if data is fresh
- Manual "Sync Now" trigger for QB-dependent sections

**Defer to v2+:**
- Role-filtered calendar view by event type
- Financial anomaly AI detection (unusual vendor/category spikes)
- Email digest of alerts — daily dashboard use covers this
- AI-generated weekly briefing from alert data
- Two-way calendar editing from dashboard

**Anti-features to reject:**
- Real-time calendar push webhooks — polling every 30-60 min is sufficient; webhooks require public HTTPS endpoint management on a VPS
- Editable Google Calendar events from dashboard — write scopes, two-way sync conflict risk, marginal gain
- Automated newsletter sends — human review before sending to donors is a workflow requirement, not a limitation

### Architecture Approach

All four additions follow the cache-through integration pattern established by QuickBooks and Google Sheets. External APIs are never called from the frontend; Convex actions fetch on a cron schedule and cache into Convex tables; frontend reads only from the cache via `useQuery`. This pattern tolerates API downtime, avoids rate-limit pressure, and provides real-time reactive updates through Convex's subscription model. Alerts are computed as a pure Convex query over existing live tables (grants, quickbooksCache, googleCalendarCache) — no separate alerts table needed, which keeps alerts always current with zero sync lag.

**Major components:**
1. `convex/googleCalendarActions.ts` (new, "use node") — googleapis `calendar.events.list()` for each configured calendar ID; 60-day window; upserts to cache via internalMutation
2. `convex/googleCalendar.ts` + `googleCalendarInternal.ts` + `googleCalendarSync.ts` (new) — public queries, internal mutations, and cron entrypoint following the Sheets module family pattern
3. `convex/alerts.ts` (new, pure query) — computes Alert[] from grants (Q-report dates), quickbooksCache (budget variance), googleCalendarCache (today's events); sorted by urgency; no writes
4. `src/components/dashboard/CalendarWidget.tsx` + `AlertsPanel.tsx` (new) — self-contained components owning their own `useQuery` calls; no prop drilling to parent page
5. Schema additions: `googleCalendarConfig` table (singleton, stores calendarIds array) and `googleCalendarCache` table (indexed by startTime, eventType, eventId)
6. Admin console: new "Google Calendar" tab for configuring calendar IDs — follows QB/Sheets/CC tab pattern with singleton `.first()` config query

**Key data flow insight:** The dashboard data bug (Pitfall 4 / Anti-Pattern 4) is likely that some sections read from `grantsCache` (Google Sheets sync, limited fields) instead of `grants` (Excel import, rich data with Q-report dates). These are separate tables. Each dashboard section must be audited to confirm it reads from the correct table for its data needs.

### Critical Pitfalls

1. **Google Calendar service account not shared with calendars** — Service accounts get zero access by default; `calendar.events.list()` returns 200 with empty results (no error thrown). Fix: manually share each Google Calendar with the service account email at "See all event details" permission before writing any code. Store calendar IDs explicitly in the `googleCalendarConfig` table — do not rely on `calendarList.list()`.

2. **Dashboard `undefined` vs `null` conflation** — `useQuery` returns `undefined` (loading) then the actual result including `null` (not configured). Components that don't branch on all three states (`undefined` → spinner, `null` → "Connect X" CTA, data present → render) silently show broken values. Use `useQueryWithStatus` from `convex-helpers` and audit all 7 dashboard sections against the three-state pattern.

3. **QuickBooks refresh token not persisted after rotation** — QB's rotating refresh tokens: every successful refresh returns a new token that invalidates the old one. If `quickbooksActions.ts` refreshes the token but doesn't write the new one back to `quickbooksConfig`, the next sync fails with `invalid_grant`. This is a latent production bug — audit and fix before adding more QB-dependent features.

4. **Newsletter HTML exceeds Constant Contact's 400 KB limit** — A fully-populated newsletter with all 19 sections can exceed CC's limit. The error is generic and silent. Fix: add a byte-length check before saving/sending; remove HTML comments from the template output; verify `[[trackingImage]]` is included (required by CC for open tracking, currently missing).

5. **Calendar timezone handling — events display at wrong times** — Google Calendar API returns datetimes with timezone offsets. Converting to Unix timestamps discards timezone metadata. Fix: store both the Unix timestamp and the timezone string; render with `toLocaleString('en-US', { timeZone: org_timezone })`; add an org timezone setting to `appSettings`. This must be built into the data model from the start — retrofitting is painful.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Newsletter Template Fix
**Rationale:** Fully isolated — no schema changes, no dependencies on other phases. Quick win that restores a broken feature. The newsletter system is already built; this is an HTML/CSS audit. Should be shipped first to restore user confidence.
**Delivers:** Correctly rendering HTML emails in Gmail, Outlook, and Apple Mail; `[[trackingImage]]` included; 400 KB limit check added; OpenAI polish prompt refined to not strip filled sections.
**Addresses features:** Newsletter template rendering correctly (P1 table stakes).
**Avoids pitfalls:** Newsletter 400 KB limit (Pitfall 5), `[[trackingImage]]` missing, campaign reuse on already-sent campaigns.
**Research flag:** No additional research needed — HTML email best practices are well-documented; the fix is targeted debugging of `convex/newsletterTemplate.ts`.

### Phase 2: Dashboard Data Population Fix
**Rationale:** Unblocks the core value of the dashboard without introducing new infrastructure. Must verify data flow before adding Calendar and Alerts on top. The `undefined`/`null` audit and QB token refresh fix here prevent subtle bugs from propagating into new features.
**Delivers:** All 7 dashboard sections showing real data; three-state loading pattern applied consistently; QB token refresh properly persisting new tokens; `lastSyncSucceededAt` tracking surfaced in admin; last-sync timestamps visible on data-dependent cards.
**Addresses features:** KPI cards with real data (P1 table stakes), consistent data refresh, "Connect X" CTAs for non-configured integrations.
**Uses:** `convex-helpers` `useQueryWithStatus` (new install); `date-fns` (existing) for sync age display.
**Avoids pitfalls:** `undefined`/`null` conflation (Pitfall 2), QB refresh token rotation (Pitfall 3), silent cron failures (Pitfall 4).
**Research flag:** No additional research needed — patterns are well-established and the codebase already has `ProfitLoss.tsx` as the correct template for three-state handling.

### Phase 3: Google Calendar Integration
**Rationale:** New schema additions and a new Convex module family, but follows the exact Sheets pattern. No new credentials needed — same service account. Requires Admin tab addition. This phase has the most setup complexity (manual calendar sharing) and must be complete before calendar-sourced alerts in Phase 4.
**Delivers:** `googleCalendarConfig` + `googleCalendarCache` schema additions; new Convex module family (actions/internal/queries/sync); "Google Calendar" admin tab for configuring calendar IDs; cron sync every 15-60 minutes; `CalendarWidget.tsx` on dashboard showing next 7 days of events grouped by type.
**Addresses features:** Google Calendar unified view (P1 differentiator), calendar widget on dashboard (P1 table stakes), upcoming deadlines enriched by calendar data.
**Uses:** `googleapis` (existing); same `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` env vars; Convex crons (built-in).
**Implements:** Cache-through integration pattern (Pattern 1); Admin tab for new integration config (Pattern 4).
**Avoids pitfalls:** Service account sharing (Pitfall 1 — verify manually before code), timezone handling (Pitfall 6 — build into data model from start), fetching unbounded event history (Anti-Pattern 3 — 60-day window only), calling Calendar API from Next.js route handlers (Anti-Pattern 1).
**Research flag:** Needs manual verification of service account calendar sharing behavior before implementation. Calendar sharing must be tested with a real Google Calendar — mock responses will not reveal the silent-empty-result failure mode.

### Phase 4: Proactive Alerts Panel
**Rationale:** Depends on Phase 2 (QB data available for budget variance) and is enhanced by Phase 3 (calendar events enriching alerts). Grant-deadline and QB-variance alerts can ship before Calendar; calendar-sourced "today's events" alerts can be added once Phase 3 is complete. This phase completes the command center vision.
**Delivers:** `alerts.ts` pure Convex query computing Alert[] from grants, quickbooksCache, googleCalendarCache; `AlertsPanel.tsx` rendering ranked alerts above KPI cards; `sonner` toast on new critical alerts; tiered severity (7-day = critical/red, 30-day = warning/yellow); "dismissed" state to prevent alert fatigue; alert categories: grant report deadlines, expiring grants, QB budget variance >15%, newsletter drafts ready to review, today's calendar events.
**Addresses features:** "What Needs Attention" alert panel (P1 differentiator), upcoming deadlines timeline (P2).
**Uses:** `sonner` (new install); existing grants, quickbooksCache, googleCalendarCache tables; Convex pure query (no schema changes needed).
**Implements:** Computed alerts via pure queries pattern (Pattern 2).
**Avoids pitfalls:** Alert fatigue (UX Pitfall 1 — tiered severity + dismiss state); alerts revealing QB data to unauthorized roles (Security Pitfall 3 — RBAC-gate alert data matching underlying data permissions); alert records becoming stale (Anti-Pattern 2 — pure query avoids this).
**Research flag:** No additional research needed — alert logic derives entirely from existing data with well-understood query patterns. Alert threshold values should be validated with the Executive Director before coding.

### Phase Ordering Rationale

- **Newsletter first** because it is fully isolated and restores a broken feature with zero risk to existing functionality.
- **Dashboard fix second** because it is a prerequisite for trusting the data that Calendar and Alerts will build on. Adding alerts on top of broken KPI cards creates compounded confusion.
- **Calendar third** because it requires schema additions and new infrastructure, but does not depend on Phases 1 or 2 being complete (it is additive). However, placing it after the dashboard fix means the Calendar widget slots into a working dashboard rather than a broken one.
- **Alerts fourth** because it is the final assembly of all previous work — it reads QB data (Phase 2), grants data (existing), and calendar data (Phase 3) to compute the most valuable surface in the dashboard.

### Research Flags

Phases needing extra care during planning/implementation:
- **Phase 3 (Google Calendar):** Manual verification required before coding. The service account sharing pitfall (Pitfall 1) is a silent failure mode that will make the integration appear broken even when code is correct. Test with a real calendar and real service account sharing before writing sync logic.
- **Phase 4 (Alerts):** Alert threshold values (30-day deadline window, 15% budget variance) should be validated with the Executive Director before implementation. Alert fatigue is a high-cost recovery (Pitfall 7 — requires full redesign if thresholds are wrong at launch).

Phases with standard patterns (no additional research needed):
- **Phase 1 (Newsletter fix):** HTML email best practices are well-documented. The fix is targeted to `convex/newsletterTemplate.ts`.
- **Phase 2 (Dashboard fix):** Three-state loading pattern is established in the codebase (`ProfitLoss.tsx` is the template). QB token audit is a code review task, not a research task.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack verified from codebase; new packages (`convex-helpers`, `sonner`) verified via official docs and GitHub. No ambiguity — `googleapis` already handles Calendar with no new packages needed. |
| Features | HIGH | Features derive from existing working infrastructure; scope is well-defined in PROJECT.md. Anti-features clearly identified. Competitor analysis is directionally accurate (MEDIUM confidence) but doesn't affect implementation decisions. |
| Architecture | HIGH | Based on direct codebase inspection of `convex/googleSheetsActions.ts`, `convex/crons.ts`, `convex/schema.ts`, and dashboard components. New patterns mirror existing ones exactly. |
| Pitfalls | HIGH | Critical pitfalls verified via official Google Calendar, Convex, and Constant Contact documentation. QB token rotation pitfall confirmed via Intuit's 2025 policy update. Timezone pitfall is a known class of bug with documented prevention. |

**Overall confidence:** HIGH

### Gaps to Address

- **QB token refresh audit:** The refresh token rotation pitfall (Pitfall 3) is identified but requires a code review of `convex/quickbooksActions.ts` to confirm whether the bug exists. This is the first task of Phase 2 — read the token refresh logic before assuming it works.
- **`grantsCache` vs `grants` table confusion:** Research identified this as the likely root cause of dashboard data not rendering, but the exact component-to-table mapping must be verified by inspecting each dashboard section component in Phase 2. The hypothesis (Anti-Pattern 4 in ARCHITECTURE.md) is high-confidence but unconfirmed.
- **Newsletter `[[trackingImage]]` tag:** PITFALLS.md notes this is "currently missing from the template" — this must be confirmed by reading `convex/newsletterTemplate.ts` directly at the start of Phase 1. If it is already present, this pitfall is resolved.
- **Org timezone for calendar display:** Storing the org timezone in `appSettings` is recommended but the specific field name and admin UI surface need to be designed in Phase 3. This is a design gap, not a technical one.
- **Alert threshold validation:** The 30-day grant deadline window and 15% budget variance threshold are research-informed defaults. The Executive Director should validate these before Phase 4 implementation to prevent alert fatigue.

## Sources

### Primary (HIGH confidence)
- Google Calendar API auth docs: https://developers.google.com/workspace/calendar/api/auth — scope list, service account auth patterns
- Google Calendar API events reference: https://developers.google.com/workspace/calendar/api/v3/reference/events — API surface, pagination, sync tokens
- Google Calendar API sharing concepts: https://developers.google.com/workspace/calendar/api/concepts/sharing — service account ACL behavior
- Convex Cron Jobs docs: https://docs.convex.dev/scheduling/cron-jobs — cron pattern, error handling
- Convex Scheduled Functions docs: https://docs.convex.dev/scheduling/scheduled-functions — `ctx.scheduler` API
- Convex `useQuery` undefined vs null: https://docs.convex.dev/client/react — loading state semantics
- Constant Contact custom code email guidelines: https://developer.constantcontact.com/api_guide/design_code_emails.html — 400 KB limit, `[[trackingImage]]` requirement
- caniemail.com border-radius: https://www.caniemail.com/features/css-border-radius/ — email client CSS support
- Existing codebase: `convex/googleSheetsActions.ts`, `convex/crons.ts`, `convex/schema.ts`, `convex/quickbooks.ts`, `convex/newsletterTemplate.ts`, `src/components/dashboard/*.tsx` — direct pattern verification

### Secondary (MEDIUM confidence)
- convex-helpers GitHub: https://github.com/get-convex/convex-helpers — `useQueryWithStatus` API surface
- Sonner GitHub: https://github.com/emilkowalski/sonner — React 19 / Next.js 15 compatibility
- QuickBooks refresh token rotation: https://nango.dev/blog/quickbooks-oauth-refresh-token-invalid-grant — token rotation behavior
- Intuit 2025 refresh token policy: https://blogs.intuit.com/2025/11/12/important-changes-to-refresh-token-policy/ — expiry timestamp changes
- Databox/Funraise nonprofit dashboard guides — standard KPI patterns for nonprofit executives
- Google Developers Node.js Calendar quickstart — setup steps

### Tertiary (LOW confidence)
- Alert fatigue patterns (Astronomer blog) — directionally informative; specific threshold values need ED validation
- Service account calendar sharing (Medium/IceApple) — community confirmation; official Google docs are the authoritative source

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
