# Milestones

## v3.0 Dashboard Redesign (Shipped: 2026-03-02)

**Phases:** 4 | **Plans:** 8 | **Commits:** 40 | **Files:** 42 | **LOC:** ~26,500 TS
**Timeline:** 1 day (Mar 2, 2026)
**Git range:** `feat(26-01)..docs(v3.0)` | **Tag:** `v3.0`

**Delivered:** Overhauled the dashboard with dummy data fallbacks for all sections, dark/light theme toggle with old-app-inspired palette, rich visual elements (funding thermometer, progress bars, urgency calendar), tighter layout polish, and calendar cron fix — resulting in a data-dense command center that looks great even without live integrations.

**Key accomplishments:**
- Dummy data fallbacks for all dashboard sections (QB financials, calendar, KB metrics, donations) with $NaN bug fix
- Dark/light theme toggle with flash-free persistence — polished dark palette (#0F0F0F bg, #1E1E1E surface, teal accents) inspired by old desktop app
- Theme-aware Chart.js components via useChartConfig hooks — all charts dynamically adapt to dark/light mode
- Funding thermometer, expense category progress bars, donation source cards with icons and amounts
- Urgency color coding on calendar events (red/yellow/green) and grant tracking deadline items
- Dashboard layout polish — tighter spacing, gradient hover accents, executive snapshot row, consolidated programs view
- Calendar cron sync respects admin-selected calendars and cleans up stale events from de-selected ones

**Phases:**
1. Dummy Data Fallbacks (2 plans) — dashboardFallbacks.ts module, QB/P&L/Calendar/KB/Donation fallback wiring, $NaN fix
2. Theme Toggle (2 plans) — Dark palette CSS variables, useTheme hook, flash-prevention IIFE, theme-aware chart colors
3. Visual Elements (2 plans) — FundingThermometer, expense progress bars, enlarged stat values, donation source cards, urgency color coding
4. Dashboard Polish + Infrastructure (2 plans) — Tighter spacing, hover accents, executive snapshot, programs consolidation, calendar cron fix

**Archives:** `milestones/v3.0-ROADMAP.md` | `milestones/v3.0-REQUIREMENTS.md` | `milestones/v3.0-MILESTONE-AUDIT.md`

---

## v2.1 Polish & Deploy (Shipped: 2026-03-02)

**Phases:** 3 | **Plans:** 5 | **Files:** 42 | **LOC:** ~25,000 TS
**Timeline:** 1 day (Mar 2, 2026)
**Git range:** `feat(23-01)..feat(25-01)` | **Tag:** `v2.1`

**Delivered:** Polished the app with UI fixes, imported 428 real clients from the master spreadsheet, added calendar multi-select admin UI, renamed `/clients` route to `/programs`, and deployed the full v2.0+v2.1 build to production VPS.

**Key accomplishments:**
- Fixed Programs sidebar icon (Grid 2x2) and removed meaningless isActive field from programs schema/UI
- Imported master spreadsheet — 428 clients with enrollments populated in Convex (78 net new)
- Built calendar multi-select backend — listAvailableCalendars action querying Google Calendar API + useListCalendars hook
- Rewrote GoogleCalendarConfig with checkbox multi-select picker, stale calendar detection, and auto-sync on save
- Renamed `/clients` route to `/programs` for nav label consistency
- Deployed full v2.1 to production VPS — Convex schema + Next.js standalone build, PM2 online

**Phases:**
1. UI & Data Cleanup (2 plans) — Grid icon, isActive removal, master spreadsheet import (428 clients)
2. Calendar Multi-Select (2 plans) — listAvailableCalendars action, GoogleCalendarConfig rewrite with checkbox picker
3. Production Deploy (1 plan) — Convex schema deploy, Next.js build, rsync to VPS, PM2 restart, human verification

**Archives:** `milestones/v2.1-ROADMAP.md` | `milestones/v2.1-REQUIREMENTS.md`

---

## v2.0 Data Foundation (Shipped: 2026-03-02)

**Phases:** 7 | **Plans:** 9 | **Commits:** 58 | **Files:** 28 | **LOC:** 24,767 TS
**Timeline:** 2 days (Mar 1-2, 2026)
**Git range:** `feat(16-01)..feat(22-01)` | **Tag:** `v2.0`

**Delivered:** Refactored the data model from flat client-with-programId to Client → Enrollment → Session, made the app the authoritative source for client/program data, removed Google Sheets program sync dependency, cleaned legacy schema, and added admin data export.

**Key accomplishments:**
- Deployed Client → Enrollment → Session data model with enrollments table (9 fields, 3 indexes) and 5 demographic fields on clients
- Built enrollment CRUD (7 functions) + session attendance tracking with backward-compatible v2.0 fields, RBAC, and audit logging
- Migrated 350 existing clients to enrollment model, backfilled 345 client demographics from intake forms via idempotent internalMutation
- Rewrote 4 analytics queries to Convex index scans, eliminated programDataCache dependency, redesigned Programs page with filter pills
- Removed Google Sheets program sync from cron/action/alerts/admin UI while preserving grant sync and Calendar independence
- Cleaned legacy schema — removed programDataCache table, sheetsStalenessHours, and legacy programId/enrollmentDate/status fields from clients
- Added admin CSV/Excel export with full client + enrollment + session joins using Convex skip-pattern query

**Phases:**
1. Schema Foundation (1 plan) — enrollments table, client demographic fields, session attendance fields, new indexes
2. Enrollment and Sessions Backend (1 plan) — enrollment CRUD, sessions attendance extension, RBAC, importBatch
3. Data Migration (1 plan) — migrateAll internalMutation, 350 enrollments created, 345 demographics backfilled
4. Analytics Backend Rewrite (1 plan) — 4 queries rewritten to index scans, demographics from clients table, Programs page redesign
5. Frontend and Sheets Removal (2 plans) — enrollment-based RBAC, client detail enrollments card, Sheets sync excised
6. Schema Cleanup (2 plans) — programDataCache removed, dead code deleted, legacy client fields stripped
7. Data Export (1 plan) — exportAll query, exportUtils, admin Export button with CSV/Excel download

### Known Gaps

- **MIGR-01 partial:** Cleaned master spreadsheet was never provided — migration ran against existing Convex data (350 clients from prior imports), not from a new consolidated dataset. Spreadsheet import deferred.
- **Programs "active" status:** User requested removal of "active" from programs (meaningless in context) — not addressed in v2.0.

**Archives:** `milestones/v2.0-ROADMAP.md` | `milestones/v2.0-REQUIREMENTS.md`

---

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

