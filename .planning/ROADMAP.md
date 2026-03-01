# Roadmap: DEC DASH 2.0

## Milestones

- ✅ **v1.0 Command Center** — Phases 1-4 (shipped 2026-02-28)
- ✅ **v1.1 Polish** — Phases 5-7 (shipped 2026-02-28)
- ✅ **v1.2 Intelligence** — Phases 8-9 (shipped 2026-03-01)
- 🚧 **v1.3 Analytics** — Phases 11-15 (in progress)

## Phases

<details>
<summary>✅ v1.0 Command Center (Phases 1-4) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Newsletter Template Fix (2/2 plans) — completed 2026-02-28
- [x] Phase 2: Dashboard Data Population (4/4 plans) — completed 2026-02-28
- [x] Phase 3: Google Calendar Integration (3/3 plans) — completed 2026-02-28
- [x] Phase 4: Proactive Alerts Panel (2/2 plans) — completed 2026-02-28

Full details: `milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Polish (Phases 5-7) — SHIPPED 2026-02-28</summary>

- [x] Phase 5: Dashboard KPI Trends (1/1 plans) — completed 2026-02-28
- [x] Phase 6: Calendar Enhancements (1/1 plans) — completed 2026-02-28
- [x] Phase 7: Alert Configuration & Persistence (2/2 plans) — completed 2026-02-28

Full details: `milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Intelligence (Phases 8-9) — SHIPPED 2026-03-01</summary>

- [x] Phase 8: KB KPI Extraction (2/2 plans) — completed 2026-03-01
- [x] Phase 9: AI Summary Panel (2/2 plans) — completed 2026-03-01

Note: Phase 10 (Donation Performance Charts) was deferred from v1.2 → absorbed into v1.3 as Phase 15.

Full details: `milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 Analytics (In Progress)

**Milestone Goal:** Surface all untapped data across a dashboard summary layer and a dedicated /analytics page — demographics, client activity, operational health, and donation trends.

## Phases

- [x] **Phase 11: Analytics Foundation + Dashboard Cards** - /analytics route with sidebar nav, tab structure, and three dashboard KPI cards for clients/sessions/intake (completed 2026-03-01)
- [x] **Phase 12: Demographics Tab** - Gender, ethnicity, age group, referral source, outcome rates, and zip code charts using existing Sheets data (completed 2026-03-01)
- [x] **Phase 13: Client Activity Tab** - Session trends, goal status breakdown, and intake volume charts backed by new aggregate queries (completed 2026-03-01)
- [ ] **Phase 14: Operations Tab** - Staff activity feed, per-user action stats, and expense categorization metrics from audit log + allocation data
- [ ] **Phase 15: Donation Performance Charts** - QB monthly income trend chart with account breakdown and admin designation UI

## Phase Details

### Phase 11: Analytics Foundation + Dashboard Cards
**Goal**: Users can navigate to /analytics from the sidebar and see three new KPI cards on the dashboard reflecting live client and session data
**Depends on**: Nothing (new route, no new backend dependencies for the foundation)
**Requirements**: PAGE-01, PAGE-02, DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. Admin, manager, and staff users see an Analytics link in the sidebar; lawyer and psychologist roles do not
  2. Clicking Analytics routes to /analytics with a tab bar showing Demographics, Client Activity, and Operations tabs
  3. Dashboard shows an active client count card with a live total across all programs
  4. Dashboard shows a session volume card with sessions logged in the last 30 days
  5. Dashboard shows an intake trend indicator comparing new intakes this month vs. last month
**Plans:** 2/2 plans complete

Plans:
- [ ] 11-01: Analytics route scaffold (/analytics page, tab nav component, sidebar nav registration with role gating)
- [ ] 11-02: Dashboard KPI cards backend (getActiveClientCount, getSessionVolume, getIntakeTrend Convex queries) + card components

### Phase 12: Demographics Tab
**Goal**: Users can explore program demographics through charts showing gender, ethnicity, age group, referral sources, outcome rates, and geographic coverage
**Depends on**: Phase 11 (analytics page and tab structure)
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06
**Success Criteria** (what must be TRUE):
  1. Demographics tab renders a gender distribution chart with labeled segments from Sheets data
  2. Demographics tab renders an ethnicity distribution chart showing breakdown across all tracked categories
  3. Demographics tab renders an age group distribution chart (grouped by DEC's defined age bands)
  4. Demographics tab renders a top referral sources list or chart showing which sources send the most clients
  5. Demographics tab renders a program outcome chart showing completed vs. in-progress vs. dropped counts
  6. Demographics tab renders a zip code coverage breakdown (table or bar chart) showing client geographic distribution
**Plans**: 2 plans

Plans:
- [ ] 12-01: getAllDemographics query + DemographicsTab scaffold with gender, ethnicity, age, referral charts
- [ ] 12-02: Outcome rates doughnut + zip code coverage bar chart completing DemographicsTab

### Phase 13: Client Activity Tab
**Goal**: Users can see session volume trends, goal completion status, and intake volume patterns over time on the Client Activity tab
**Depends on**: Phase 11 (analytics page and tab structure)
**Requirements**: ACT-01, ACT-02, ACT-03
**Success Criteria** (what must be TRUE):
  1. Client Activity tab renders a monthly session volume chart showing trend over the past 12 months
  2. Client Activity tab renders a goal status breakdown showing counts for in-progress vs. completed goals and an overall completion rate percentage
  3. Client Activity tab renders an intake volume chart with separate series for legal and co-parent intakes by month
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — Convex aggregate queries (getSessionTrends, getGoalStats, getIntakeVolume) + React hooks
- [ ] 13-02-PLAN.md — ClientActivityTab.tsx with session trend line chart, goal status cards, and intake volume grouped bar chart

### Phase 14: Operations Tab
**Goal**: Users can review staff activity, per-user action counts, and expense categorization health metrics on the Operations tab
**Depends on**: Phase 11 (analytics page and tab structure)
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04
**Success Criteria** (what must be TRUE):
  1. Operations tab renders a recent staff activity feed showing the last 20-50 audit log entries with human-readable action descriptions
  2. Operations tab renders a per-staff action count table and highlights the most active user in the period
  3. Operations tab renders a categorization acceptance rate stat (accepted / total categorized as a percentage)
  4. Operations tab renders an expense category distribution chart showing the breakdown of categorized expenses by category
**Plans**: TBD

Plans:
- [ ] 14-01: Backend queries (getAuditLogFeed, getStaffActionStats for audit log; getAllocationStats historical/acceptance rate for allocation data)
- [ ] 14-02: OperationsTab.tsx with activity feed, staff stats table, and categorization metric components

### Phase 15: Donation Performance Charts
**Goal**: Kareem can see real QB income trends and breakdowns on the dashboard, and an admin can configure which accounts represent donation income
**Depends on**: Phase 11 (analytics page in place; this chart lives on dashboard but shares admin tab infrastructure)
**Requirements**: DON-01, DON-02, DON-03, DON-04
**Success Criteria** (what must be TRUE):
  1. Dashboard DonationPerformance section displays a populated line chart showing 12 months of QB income data
  2. The income chart breaks down revenue by QB account category so Kareem can see which sources (grants, fees, contributions) contribute each month
  3. Admin can open Admin settings and designate which QB income accounts represent donation/income categories, and the chart reflects that designation on next render
  4. When no accounts have been designated, the DonationPerformance section shows a clear "Configure donation accounts in Admin" prompt rather than an empty or broken chart
**Plans**: TBD

Plans:
- [ ] 15-01: fetchIncomeTrend QB action (summarize_column_by=Month) + getIncomeTrend Convex query + admin account designation UI in appSettings
- [ ] 15-02: DonationPerformance.tsx data source swap (useIncomeTrend hook) + income breakdown chart rendering + empty/unconfigured states

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Newsletter Template Fix | v1.0 | 2/2 | Complete | 2026-02-28 |
| 2. Dashboard Data Population | v1.0 | 4/4 | Complete | 2026-02-28 |
| 3. Google Calendar Integration | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Proactive Alerts Panel | v1.0 | 2/2 | Complete | 2026-02-28 |
| 5. Dashboard KPI Trends | v1.1 | 1/1 | Complete | 2026-02-28 |
| 6. Calendar Enhancements | v1.1 | 1/1 | Complete | 2026-02-28 |
| 7. Alert Configuration & Persistence | v1.1 | 2/2 | Complete | 2026-02-28 |
| 8. KB KPI Extraction | v1.2 | 2/2 | Complete | 2026-03-01 |
| 9. AI Summary Panel | v1.2 | 2/2 | Complete | 2026-03-01 |
| 11. Analytics Foundation + Dashboard Cards | 2/2 | Complete    | 2026-03-01 | - |
| 12. Demographics Tab | 2/2 | Complete    | 2026-03-01 | - |
| 13. Client Activity Tab | 2/2 | Complete   | 2026-03-01 | - |
| 14. Operations Tab | v1.3 | 0/2 | Not started | - |
| 15. Donation Performance Charts | v1.3 | 0/2 | Not started | - |
