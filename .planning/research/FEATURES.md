# Feature Research

**Domain:** Nonprofit Executive Dashboard — Daily Command Center
**Researched:** 2026-02-28
**Confidence:** HIGH (for established dashboard patterns), MEDIUM (for calendar/alert specifics)

---

## Context: What Already Exists

The DEC DASH already has substantial infrastructure. This research is for the **milestone additions**:

| Already Built | Status |
|---------------|--------|
| QB integration (P&L, expenses, budget vs. actuals) | Working but data not rendering on dashboard |
| Grant tracker (5-stage pipeline, detail pages, inline editing) | Working |
| Client & program management (unified roster, legal + co-parent intake) | Working |
| AI Director chat (knowledge base, vector store) | Working |
| Newsletter system (section editor, AI HTML generation, CC send) | Working but template formatting broken |
| RBAC (6-tier role system) | Working |
| Admin console (7-tab configuration) | Working |
| Dashboard widget framework (sectioned layout, user prefs, show/hide/reorder) | Working shell — data not populating |

**This milestone adds:** Dashboard data population fix, Google Calendar integration, Proactive alerts, Newsletter template fix.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the Executive Director assumes work. Missing = dashboard feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **KPI cards with real data** | Dashboard has the cards; empty cards are worse than no cards — signals the tool doesn't work | LOW | Root cause: likely hook data shape mismatch or missing QB cache. Fix existing `ExecutiveSnapshot`, `GrantBudget`, etc. |
| **Financial snapshot (cash on hand, revenue YTD, expenses)** | Every nonprofit exec dashboard shows this; QuickBooks is already connected | LOW | `accounts.data.totalCash` and `pnl.data.totalRevenue` are already referenced in `ExecutiveSnapshot.tsx` — data shape needs verification |
| **Grant status at a glance** | DEC lives on grants; knowing active grant count + total is daily need | LOW | `useGrants()` + `useActiveGrants()` hooks already exist; data not rendering |
| **Client activity count** | Program staff need to see active client numbers without going to /clients page | LOW | Can query `clients` table for active count; no dedicated dashboard widget yet |
| **Today's upcoming events** | If a calendar integration is added, showing today's events is minimum viable | MEDIUM | Requires Google Calendar sync to Convex table first |
| **Newsletter template rendering correctly** | Template was the core output of newsletter system; broken HTML defeats the whole feature | MEDIUM | Constant Contact sends HTML email; Outlook/Gmail render differences are the likely culprit. Use table-based layout, inline styles |
| **Consistent data refresh** | Dashboard data that auto-updates or clearly shows last-sync time | LOW | QB cron is 15min, Sheets is 30min — show `fetchedAt` timestamp in cards |

### Differentiators (Competitive Advantage)

Features that make DEC DASH meaningfully better than generic nonprofit tools like Salesforce NPSP or Bloomerang for daily use.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"What Needs Attention" alert panel** | Proactive surface: grant deadlines in 30 days, QB budget anomaly, clients with no recent sessions — replaces email-checking workflow | MEDIUM | Computed from existing data: grants table (`q1/q2/q3/q4ReportDate`), QB variance, clients table. No new data sources needed |
| **Google Calendar unified view** | Surfaces client sessions, board meetings, community events, grant deadlines in one place — eliminates context-switching to Google Calendar | HIGH | Requires new Convex table `calendarEvents`, new Convex action using googleapis (already a dependency), new cron job. OAuth via service account or user OAuth |
| **Upcoming deadlines timeline** | Visual countdown of grant report dates, client follow-up reminders — the "what's coming" complement to "what's happening now" | MEDIUM | Can derive from `grants` table Q1-Q4 dates + Calendar events; render as ordered list with countdown badges (already done on grant detail page, duplicate pattern) |
| **Anomaly-flagged alerts** | Identify spend categories exceeding budget by >15%, unusual vendor charges, grants nearing expiry — surfaces the non-obvious | HIGH | Requires threshold logic computed from QB data; likely AI-assisted analysis using existing `allocationActions.ts` patterns |
| **Newsletter preview that matches what CC sends** | WYSIWYG preview so Kareem sees exactly what subscribers receive before sending | MEDIUM | Already exists (`NewsletterPreview.tsx` with contentEditable iframe) — depends on template fix |
| **Role-filtered calendar view** | Lawyers see only client session events; staff see team meetings; admin sees everything | MEDIUM | Extend existing `ROLE_PROGRAM_TYPE_MAP` pattern from clients to calendar event types |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time calendar sync (webhooks/push)** | Seems more up-to-date than polling | Google Calendar push notifications require a publicly accessible HTTPS endpoint + webhook registration management, token refresh complexity — much harder to maintain on a VPS. Polling every 30-60min is sufficient for daily command center use | Cron-based polling with sync token for incremental updates (Google's own recommended approach for server-side apps) |
| **In-app email notifications / push alerts** | "Get notified when X happens" | Adds infrastructure complexity (web push API, service workers, notification permissions) for a single-user exec tool. Kareem opens the app daily — the dashboard IS the notification | Prominent "Attention Required" panel on dashboard home page, visible immediately on open |
| **Editable Google Calendar events from dashboard** | Seems convenient | Creates two-way sync conflict risk, requires write OAuth scopes, much more complexity for marginal gain. The calendar is already maintained in Google | Read-only display only. Link out to Google Calendar for editing |
| **Custom dashboard widget builder** | Power user flexibility | Existing show/hide/reorder already covers DEC's single-user need. Full drag-and-drop widget builder is weeks of work for a small nonprofit | The existing `dashboardPrefs` section ordering is sufficient |
| **Full-screen Gantt chart for grant timeline** | Looks comprehensive | Overkill for 46 grants managed by one ED. The quarterly reporting countdown badges on grant detail pages already serve this need | Keep the existing countdown badges; surface upcoming reports in the alert panel |
| **Automated newsletter sends on schedule** | Efficiency | Newsleters to donors require human review. Automated sends risk wrong content reaching donors. The current test→review→send flow is correct | Keep the manual review/send flow; surface draft newsletters in the alert panel as "ready to review" |
| **Gmail or Outlook integration** | Unified inbox seems useful | Explicitly out of scope per PROJECT.md; adds auth complexity and privacy concerns | The alert panel covers the "things needing action" use case without email integration |

---

## Feature Dependencies

```
[Google Calendar Cron Sync]
    └──requires──> [calendarEvents Convex table]
    └──requires──> [googleapis credential config in Admin]
    └──enables──> [Calendar Widget on Dashboard]
    └──enables──> [Calendar events in Alerts Panel]

[Dashboard KPI Cards Fix]
    └──requires──> [QB data shape verification]
    └──requires──> [Grant hook data shape verification]
    └──independent of──> [Calendar integration]

[Alerts / "What Needs Attention" Panel]
    └──requires──> [Dashboard KPI cards working] (for financial anomaly alerts)
    └──requires──> [grants table with Q-report dates] (already exists)
    └──enhanced by──> [calendarEvents table] (optional: calendar-sourced deadlines)
    └──does NOT require──> [Calendar integration to launch basic version]

[Newsletter Template Fix]
    └──requires──> [HTML email audit: Outlook vs Gmail rendering]
    └──independent of──> [all other features]
    └──enables──> [Newsletter preview accuracy]
    └──enables──> [Constant Contact send reliability]

[Upcoming Deadlines Timeline Widget]
    └──requires──> [grants Q-report dates] (already exists)
    └──enhanced by──> [calendarEvents table]
```

### Dependency Notes

- **Alerts panel does NOT require Calendar:** The most valuable alerts (grant deadlines, QB anomalies) come from existing data. Calendar enriches it but is not a blocker.
- **Dashboard fix is independent:** Can fix KPI card data population without touching Calendar or Alerts.
- **Newsletter fix is fully isolated:** Template HTML rendering is its own contained problem.
- **Calendar requires Admin config surface:** Need a place for Kareem to paste Google service account credentials or complete OAuth. The existing Admin console (7 tabs) is the right place to add a "Google Calendar" tab.

---

## MVP Definition

This is a subsequent milestone on a working app. MVP here means "what makes this milestone shippable."

### Launch With (v1 — this milestone)

- [x] Fix dashboard KPI cards to actually render QB + grant data — the dashboard is the core of the tool
- [x] Fix newsletter HTML template — Outlook-safe table-based layout with inline styles
- [x] Google Calendar read-only sync via service account — cron job storing events in Convex
- [x] Calendar widget on dashboard (today's events + next 7 days)
- [x] Alerts panel ("What Needs Attention") — grant report deadlines within 30 days, grants expiring, QB budget variance >15%

### Add After Validation (v1.x)

- [ ] Calendar events by event type with role-based filtering — trigger: multiple users report seeing irrelevant events
- [ ] Financial anomaly detection (unusual vendor, category spike) — trigger: QB data proves useful enough to analyze
- [ ] Upcoming deadlines timeline as standalone dashboard section — trigger: Kareem asks for it

### Future Consideration (v2+)

- [ ] Email digest of alerts — defer until Kareem asks; daily dashboard open covers this
- [ ] AI-generated weekly briefing from alert data — cool but complex; out of scope now
- [ ] Multi-calendar support (personal + org calendar) — out of scope now

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fix dashboard KPI data rendering | HIGH | LOW (data shape fix, existing infrastructure) | P1 |
| Fix newsletter HTML template | HIGH | LOW (HTML/CSS audit, table-based layout) | P1 |
| Alerts panel (grant deadlines, budget warnings) | HIGH | MEDIUM (computed from existing data) | P1 |
| Google Calendar sync + widget | HIGH | HIGH (new OAuth, new table, new cron, new UI) | P1 |
| Upcoming deadlines timeline | MEDIUM | LOW (reuse grant countdown badge pattern) | P2 |
| Role-filtered calendar view | LOW | MEDIUM | P3 |
| Financial anomaly AI detection | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when possible in this milestone
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | Salesforce NPSP | Bloomerang | DEC DASH Approach |
|---------|-----------------|------------|-------------------|
| Dashboard KPIs | Generic, requires heavy config | Donor-centric, not program-focused | Purpose-built for DEC's specific grant/program/QB data mix |
| Calendar integration | Via AppExchange ($) | Not built-in | Direct Google Calendar API, no extra cost |
| Grant tracking | Opportunity records (generic CRM) | Not built-in | Custom 5-stage pipeline with Q-report dates |
| Newsletter | Third-party (Mailchimp integration) | Built-in basic | CC integration with AI-generated template |
| Alerts | Configurable but complex setup | Email-only | In-dashboard alert panel with computed rules |
| AI tools | Einstein (expensive add-on) | None | Built-in AI Director + expense categorization |

DEC DASH wins by being purpose-built for DEC's exact workflow, not a horizontal CRM adapted for nonprofits.

---

## Implementation Notes by Feature

### Dashboard KPI Data Fix
The `ExecutiveSnapshot.tsx` already references `accounts.data.totalCash` and `pnl.data.totalRevenue`. The issue is likely:
1. QB cache returns data in unexpected shape (check `quickbooksCache` table `data` field — it's stored as JSON string)
2. `useAccounts()` / `useProfitAndLoss()` hooks parse the JSON string; verify the parsed shape matches what components expect
3. Missing null guards — `--` fallback exists but data may be `null` vs `undefined`

### Google Calendar Integration Pattern
- **Auth:** Service account (not user OAuth) — same pattern as Google Sheets (`googleSheetsConfig` table with `serviceAccountEmail`). Admin shares calendar with service account email.
- **Scope:** `https://www.googleapis.com/auth/calendar.readonly` — read-only, no write risk
- **Sync:** Cron every 60 minutes (less frequent than QB/Sheets is fine). Use Google's incremental sync token pattern — store `nextSyncToken` in a new `googleCalendarConfig` table.
- **Storage:** New `calendarEvents` table: `{ eventId, calendarId, title, startTime, endTime, location, description, eventType, lastSyncAt }`
- **Event types:** Classify by calendar source or event title keyword matching (e.g., "session" → client_session, "board" → board_meeting, "grant" → grant_deadline)
- **Token expiry:** Handle 410 response by wiping `calendarEvents` and doing full re-sync

### Alerts Panel Design
The "What Needs Attention" panel should appear at the top of the dashboard, above KPI cards, only when there are active alerts. Empty state = no panel shown (clean default view).

Alert categories:
1. **Grant deadlines** — Q-report dates within 30 days (from `grants` table)
2. **Grants expiring** — `endDate` within 60 days (from `grants` table)
3. **Budget variance** — QB expense category exceeds budget by >15% (from QB cache)
4. **Newsletter drafts** — newsletters in `review` status ready to send
5. **Calendar today** — events starting today (from `calendarEvents` table, if connected)

Each alert = title + severity (warning/critical) + action link. Computed as a Convex query — no new infrastructure needed.

### Newsletter Template Fix
HTML email rendering problems are well-documented. The fix:
1. **Replace div layout with table-based layout** — tables render consistently across Outlook, Gmail, Apple Mail
2. **Inline all CSS** — email clients strip `<style>` tags; use `style=""` attributes on every element
3. **Use web-safe fonts or fallback stacks** — Nunito/Fraunces are Google Fonts; they won't load in email clients. Use `Arial, Helvetica, sans-serif` as fallbacks
4. **Max-width 600px** — standard email width that works across all clients
5. **Test against Litmus or Email on Acid patterns** — the CLAUDE.md describes a specific template with `box-shadow`, `border-radius`, two-column header. `box-shadow` doesn't render in Outlook; `border-radius` support is partial. Simplify to flat design for Outlook compatibility while preserving visual hierarchy.

---

## Sources

- [Databox: The Ultimate Guide to Nonprofit Dashboards](https://databox.com/nonprofit-kpi-dashboard) — MEDIUM confidence (multiple verified by Funraise guide)
- [Funraise: Your Ultimate Nonprofit Dashboard Guide](https://www.funraise.org/blog/your-ultimate-nonprofit-dashboard-guide-with-samples) — MEDIUM confidence
- [ClariBI: Build Executive Dashboards That Get Used Daily](https://claribi.com/blog/post/build-executive-dashboard-that-actually-gets-used/) — MEDIUM confidence (design patterns verified across sources)
- [GoLimelight: 5 Financial Dashboards Every Nonprofit Needs](https://www.golimelight.com/blog/financial-dashboards-for-nonprofits) — MEDIUM confidence
- [Google Developers: Synchronize resources efficiently](https://developers.google.com/workspace/calendar/api/guides/sync) — HIGH confidence (official Google docs)
- [Google Developers: Authorizing Requests to the Google Calendar API](https://developers.google.com/calendar/api/guides/auth) — HIGH confidence (official Google docs)
- [Tabular: 2025 Email Newsletter Design Tips](https://tabular.email/blog/newsletter-design-best-practices) — MEDIUM confidence
- [TextMagic: HTML Email Best Practices](https://www.textmagic.com/blog/html-email-best-practices/) — MEDIUM confidence (consistent with industry standards)

---

*Feature research for: DEC DASH 2.0 — Command Center Milestone*
*Researched: 2026-02-28*
