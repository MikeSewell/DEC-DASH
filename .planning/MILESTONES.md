# Milestones

## v1.1 Polish (Shipped: 2026-02-28)

**Phases:** 3 | **Plans:** 4 | **Commits:** 7 | **Files:** 24 | **LOC:** 22,027 TS
**Timeline:** 10 days (Feb 19 → Feb 28, 2026)
**Git range:** `feat(05-01)..feat(07-02)` | **Tag:** `v1.1`

**Delivered:** Enhanced the dashboard with trend indicators, color-coded calendar events, and configurable alerts — making the daily command center more informative and less noisy.

**Key accomplishments:**
- Year-over-year trend arrows on Revenue YTD and Total Expenses KPI cards from QB prior-year P&L data
- Color-coded event type badges (Client, Board, Community, Grant) with keyword classification
- Live countdown badges for imminent calendar events with 60-second auto-refresh
- Toast notifications for events starting in 30-60 minutes with useRef dedup
- Admin Alerts config tab with 5 editable thresholds (deadline window, budget variance, staleness hours)
- Per-user alert dismissal with Convex persistence and client-side filtering

**Phases:**
1. Dashboard KPI Trends (1 plan) — Prior-year P&L sync, getTrends query, SVG trend arrows on KPI cards
2. Calendar Enhancements (1 plan) — EVENT_TYPE_CONFIG classification, countdown badges, imminent event toasts
3. Alert Configuration & Persistence (2 plans) — alertConfig/alertDismissals schema + CRUD, admin tab, dismiss UI, enhanced toasts

**Known Gaps:** Phase 07 VERIFICATION.md was not created (documentation gap only — integration checker confirmed all 8/8 requirements wired in code).

**Archives:** `milestones/v1.1-ROADMAP.md` | `milestones/v1.1-REQUIREMENTS.md` | `milestones/v1.1-MILESTONE-AUDIT.md`

---

## v1.0 Command Center (Shipped: 2026-02-28)

**Phases:** 4 | **Plans:** 11 | **Commits:** 49 | **Files:** 71 | **LOC:** 21,372 TS
**Timeline:** 10 days (Feb 19 → Feb 28, 2026)
**Git range:** `feat(01-01)..feat(04-02)` | **Tag:** `v1.0`

**Delivered:** Transformed the dashboard into a daily command center — live financial data, calendar integration, and proactive alerts give the Executive Director a single-pane-of-glass view of organizational health.

**Key accomplishments:**
- Rewrote newsletter HTML with table-based email-safe layout + juice CSS inlining for cross-client compatibility (Gmail, Outlook, Apple Mail)
- Fixed all dashboard KPI cards, charts, and widgets to render live QuickBooks data with three-state loading (skeleton/prompt/data)
- Integrated Google Calendar — service account sync, admin configuration, CalendarWidget agenda view on dashboard
- Built proactive alerts panel — grant deadlines, budget variance, sync status alerts with urgency ranking
- Added reusable UI infrastructure: skeleton shimmer components, three-state loading pattern, shared utilities
- Wired "What Needs Attention" as single-query server-aggregated alert system with critical toast notifications

**Phases:**
1. Newsletter Template Fix (2 plans) — Table-based HTML rewrite + juice CSS inlining + size validation + preview accuracy
2. Dashboard Data Population (4 plans) — QB token fix, skeleton shimmers, three-state loading, KPI cards, client activity
3. Google Calendar Integration (3 plans) — Schema + Convex modules, admin config + cron, CalendarWidget dashboard component
4. Proactive Alerts Panel (2 plans) — alerts.ts backend query, WhatNeedsAttention refactor + toast notifications

**Archives:** `milestones/v1.0-ROADMAP.md` | `milestones/v1.0-REQUIREMENTS.md` | `milestones/v1.0-MILESTONE-AUDIT.md`

---

