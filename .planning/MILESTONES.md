# Milestones

## v1.3 Analytics (Shipped: 2026-03-01)

**Phases:** 5 | **Plans:** 10 | **Commits:** 39 | **Files:** 42 | **LOC:** 24,548 TS
**Timeline:** 1 day (Mar 1, 2026)
**Git range:** `feat(11-01)..feat(15-02)` | **Tag:** `v1.3`

**Delivered:** Added a full analytics layer — dedicated /analytics page with Demographics, Client Activity, and Operations tabs plus dashboard summary cards and real QB income trend charts with admin account designation.

**Key accomplishments:**
- /analytics page with tab navigation and role-gated sidebar entry (admin/manager/staff)
- 3 dashboard KPI summary cards — active clients, session volume, intake trend with month-over-month comparison
- Demographics tab with 6 charts — gender, ethnicity, age group, referral sources, outcome rates, zip code coverage
- Client Activity tab — 12-month session trend line chart, goal status breakdown with completion rate, intake volume by program
- Operations tab — staff activity feed with timeAgo, per-user action counts, expense categorization acceptance rate and distribution
- DonationPerformance rewrite — real QB income data via fetchIncomeTrend, multi-line chart with account breakdown, admin designation UI, proper empty states

**Phases:**
1. Analytics Foundation + Dashboard Cards (2 plans) — /analytics route scaffold, sidebar nav, AnalyticsCards KPI section
2. Demographics Tab (2 plans) — getAllDemographics query, 6 chart components (doughnut, bar, horizontal bar)
3. Client Activity Tab (2 plans) — getSessionTrends/getGoalStats/getIntakeVolume queries, line chart + grouped bar chart UI
4. Operations Tab (2 plans) — getAuditFeed/getStaffActionStats/getCategorizationStats queries, activity feed + stats + category chart UI
5. Donation Performance Charts (2 plans) — fetchIncomeTrend QB action, income cache, admin IncomeAccountConfig, DonationPerformance rewrite

**Archives:** `milestones/v1.3-ROADMAP.md` | `milestones/v1.3-REQUIREMENTS.md` | `milestones/v1.3-MILESTONE-AUDIT.md`

---

## v1.2 Intelligence (Shipped: 2026-03-01)

**Phases:** 2 (of 3 planned) | **Plans:** 4 | **Files:** 8
**Timeline:** 1 day (Mar 1, 2026)
**Git range:** `feat(08-01)..feat(09-02)`

**Delivered:** Added AI-powered organizational intelligence to the dashboard — KB-extracted KPI stat cards and AI-generated summary panel give Kareem data-driven insights from uploaded documents.

**Key accomplishments:**
- Chat Completions extraction pipeline with json_schema for structured KPI metrics from KB documents
- Nullable schema fields prevent hallucinated values — returns null when metric not found
- KPI stat cards on dashboard with source document name, extraction timestamp, and staleness detection
- AI summary panel with 3-5 bullet organizational highlights and manual Regenerate button
- Role-gated generation (admin/manager only) to control API costs
- Previous summary persists during regeneration — no blank screen mid-refresh

**Phases:**
1. KB KPI Extraction (2 plans) — kbSummaryCache schema, Chat Completions action, KBInsights.tsx stat cards
2. AI Summary Panel (2 plans) — Summary fields + generateSummary action, bullet panel + Regenerate UI

**Deferred:** Phase 10 (Donation Performance Charts) moved to v1.3 — QB income account names unknown, admin designation UI prerequisite

**Archives:** `milestones/v1.2-ROADMAP.md` | `milestones/v1.2-REQUIREMENTS.md`

---

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

