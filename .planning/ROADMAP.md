# Roadmap: DEC DASH 2.0 — Command Center Milestone

## Overview

This milestone transforms DEC DASH 2.0 from a working-but-incomplete dashboard into a true daily command center. Four delivery phases in dependency order: fix the newsletter HTML (isolated, immediate value), restore dashboard data rendering (unblocks core value), integrate Google Calendar (new infrastructure following the established Sheets pattern), and wire the proactive alerts panel (final assembly reading all prior phases). Each phase ships independent value and does not require the next phase to be useful.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Newsletter Template Fix** - Repair HTML email rendering so newsletters display correctly in Gmail, Outlook, and Apple Mail
- [x] **Phase 2: Dashboard Data Population** - Fix all KPI cards, charts, and widgets to render live data with proper three-state loading (completed 2026-02-28)
- [x] **Phase 3: Google Calendar Integration** - Sync calendar events to Convex and surface today/next-7-days on the dashboard (completed 2026-02-28)
- [ ] **Phase 4: Proactive Alerts Panel** - Surface what needs Kareem's attention via a computed alerts panel and toast notifications

## Phase Details

### Phase 1: Newsletter Template Fix
**Goal**: Newsletter emails render correctly and consistently in major email clients
**Depends on**: Nothing (fully isolated — no schema changes, no dependencies)
**Requirements**: NEWS-01, NEWS-02, NEWS-03, NEWS-04
**Success Criteria** (what must be TRUE):
  1. A newsletter sent from the dashboard displays correctly in Gmail, Outlook, and Apple Mail with no broken layout
  2. Kareem can see a warning in the editor when the newsletter content is approaching the 400 KB Constant Contact limit
  3. The newsletter preview panel in the dashboard matches how the email actually renders in a real email client
  4. All CSS is inlined in the generated HTML and no unsupported properties (e.g., box-shadow) appear in the output
**Plans:** 2/2 plans executed (COMPLETE)

Plans:
- [x] 01-01-PLAN.md — Rewrite newsletterTemplate.ts with table-based layout and add juice CSS inlining to generation pipeline
- [x] 01-02-PLAN.md — Add content size validation and preview accuracy improvements

### Phase 2: Dashboard Data Population
**Goal**: Every section of the dashboard shows live data with correct loading, empty, and error states
**Depends on**: Nothing (can run parallel to Phase 1, but must complete before Phase 4)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, CMD-01, CMD-02, CMD-03, CMD-04
**Success Criteria** (what must be TRUE):
  1. Kareem opens the dashboard and sees real cash-on-hand, revenue YTD, and expense totals pulled from QuickBooks — not zeros or blank cards
  2. All charts (P&L doughnut, expense breakdown, grant budget bars, demographics) render with actual data rather than empty containers
  3. When QuickBooks is not connected, the dashboard shows a "Connect QuickBooks" prompt rather than a broken or empty card
  4. Active grants with their status and upcoming deadlines appear in the grant tracking section without manual refresh
  5. Client activity totals (active clients, new this month, per-program counts) display correctly on the dashboard
**Plans**: TBD

Plans:
- [ ] 02-01: Audit QB token refresh rotation and fix token persistence in quickbooksActions.ts
- [ ] 02-02: Apply three-state loading pattern (undefined/null/data) to all dashboard sections using useQueryWithStatus
- [ ] 02-03: Fix data source wiring — audit each dashboard component and ensure it reads from the correct table (grants vs. grantsCache, etc.)
- [ ] 02-04: Build "What Needs Attention" panel container and client activity / financial snapshot sections

### Phase 3: Google Calendar Integration
**Goal**: Calendar events from Google sync to Convex and appear on the dashboard as a unified schedule view
**Depends on**: Phase 2 (calendar widget slots into a working dashboard)
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05
**Success Criteria** (what must be TRUE):
  1. Kareem sees today's events and the next 7 days of events on the dashboard without opening Google Calendar
  2. An admin can add or remove Google Calendar IDs from the Admin console, and the sync respects that configuration
  3. Calendar events sync automatically on a schedule (default every 30 minutes) without manual intervention
  4. Each event in the dashboard widget shows its title, time, and which calendar it came from
**Plans**: TBD

Plans:
- [ ] 03-01: Schema additions (googleCalendarConfig, googleCalendarCache tables) and Convex module family (actions, internal mutations, queries, sync entrypoint)
- [ ] 03-02: Cron registration, Admin console "Google Calendar" tab for calendar ID configuration
- [ ] 03-03: CalendarWidget.tsx dashboard component showing today + next 7 days

### Phase 4: Proactive Alerts Panel
**Goal**: The dashboard surfaces what needs Kareem's attention — grant deadlines, budget warnings, sync failures — without him having to dig for it
**Depends on**: Phase 2 (QB data available), Phase 3 (calendar data available)
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04
**Success Criteria** (what must be TRUE):
  1. Kareem sees a "What Needs Attention" panel on the dashboard listing upcoming grant reports due within 30 days, without checking the grants page
  2. When a grant's QuickBooks spending exceeds pacing thresholds, a budget variance alert appears automatically
  3. If QuickBooks or Google Sheets data is stale (QB >1 hour, Sheets >2 hours since last sync), a sync status alert appears in the panel
  4. All alerts are ranked by urgency and the panel loads even if one underlying data source is temporarily unavailable
**Plans**: TBD

Plans:
- [ ] 04-01: Build alerts.ts pure Convex query computing Alert[] from grants, quickbooksCache, googleCalendarCache with urgency ranking
- [ ] 04-02: Build AlertsPanel.tsx component and wire sonner toasts for critical alerts; integrate panel into dashboard layout

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Newsletter Template Fix | 2/2 | Complete | 2026-02-28 |
| 2. Dashboard Data Population | 4/4 | Complete   | 2026-02-28 |
| 3. Google Calendar Integration | 3/3 | Complete   | 2026-02-28 |
| 4. Proactive Alerts Panel | 0/2 | Not started | - |
