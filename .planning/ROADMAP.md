# Roadmap: DEC DASH 2.0

## Milestones

- ✅ **v1.0 Command Center** — Phases 1-4 (shipped 2026-02-28)
- ✅ **v1.1 Polish** — Phases 5-7 (shipped 2026-02-28)
- ✅ **v1.2 Intelligence** — Phases 8-9 (shipped 2026-03-01)
- ✅ **v1.3 Analytics** — Phases 11-15 (shipped 2026-03-01)
- ✅ **v2.0 Data Foundation** — Phases 16-22 (shipped 2026-03-02)
- ✅ **v2.1 Polish & Deploy** — Phases 23-25 (shipped 2026-03-02)
- ✅ **v3.0 Dashboard Redesign** — Phases 26-29 (shipped 2026-03-02)
- 🚧 **v3.1 Grant Budget Restoration** — Phases 30-32 (in progress)

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

<details>
<summary>✅ v1.3 Analytics (Phases 11-15) — SHIPPED 2026-03-01</summary>

- [x] Phase 11: Analytics Foundation + Dashboard Cards (2/2 plans) — completed 2026-03-01
- [x] Phase 12: Demographics Tab (2/2 plans) — completed 2026-03-01
- [x] Phase 13: Client Activity Tab (2/2 plans) — completed 2026-03-01
- [x] Phase 14: Operations Tab (2/2 plans) — completed 2026-03-01
- [x] Phase 15: Donation Performance Charts (2/2 plans) — completed 2026-03-01

Full details: `milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Data Foundation (Phases 16-22) — SHIPPED 2026-03-02</summary>

- [x] Phase 16: Schema Foundation (1/1 plans) — completed 2026-03-01
- [x] Phase 17: Enrollment and Sessions Backend (1/1 plans) — completed 2026-03-01
- [x] Phase 18: Data Migration (1/1 plans) — completed 2026-03-01
- [x] Phase 19: Analytics Backend Rewrite (1/1 plans) — completed 2026-03-01
- [x] Phase 20: Frontend and Sheets Removal (2/2 plans) — completed 2026-03-01
- [x] Phase 21: Schema Cleanup (2/2 plans) — completed 2026-03-01
- [x] Phase 22: Data Export (1/1 plans) — completed 2026-03-02

Full details: `milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Polish & Deploy (Phases 23-25) — SHIPPED 2026-03-02</summary>

- [x] Phase 23: UI & Data Cleanup (2/2 plans) — completed 2026-03-02
- [x] Phase 24: Calendar Multi-Select (2/2 plans) — completed 2026-03-02
- [x] Phase 25: Production Deploy (1/1 plans) — completed 2026-03-02

Full details: `milestones/v2.1-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 Dashboard Redesign (Phases 26-29) — SHIPPED 2026-03-02</summary>

- [x] Phase 26: Dummy Data Fallbacks (2/2 plans) — completed 2026-03-02
- [x] Phase 27: Theme Toggle (2/2 plans) — completed 2026-03-02
- [x] Phase 28: Visual Elements (2/2 plans) — completed 2026-03-02
- [x] Phase 29: Dashboard Polish + Infrastructure (2/2 plans) — completed 2026-03-02

Full details: `milestones/v3.0-ROADMAP.md`

</details>

### 🚧 v3.1 Grant Budget Restoration (In Progress)

**Milestone Goal:** Restore the full Grant Budget Overview dashboard section with real QB Budget API integration, tabbed table/chart views, and per-grant detail drill-down.

- [x] **Phase 30: QB Budget Data Pipeline** — Fetch, parse, and cache budget vs actuals data from QuickBooks (completed 2026-03-04)
- [x] **Phase 31: Grant Budget Core UI** — Summary cards, table view with progress bars and status badges, theme integration (completed 2026-03-04)
- [ ] **Phase 32: Grant Budget Charts and Detail** — Chart view with pie/bar visualizations, per-grant detail modal

## Phase Details

### Phase 30: QB Budget Data Pipeline
**Goal**: Live budget vs actuals data for every grant is fetched from QuickBooks, parsed into structured records, and cached in Convex on the existing 15-minute cron cycle
**Depends on**: Nothing (QB OAuth is already configured and working)
**Requirements**: BGTD-01, BGTD-02, BGTD-03, BGTD-04, BGTD-05, BGTD-06
**Success Criteria** (what must be TRUE):
  1. Running the QB sync action populates the budgetCache Convex table with at least one budget record per active QB budget
  2. Each cached record contains revenue actuals, expense actuals, net revenue, budget amounts, and account-level line items
  3. Each budget record is correctly associated with a QB Class (grant program) via the class mapping fetch
  4. The existing QB 15-minute cron includes budget sync — budget data refreshes automatically without manual intervention
  5. A budget record with no matching QB data returns a graceful empty state rather than crashing the sync
**Plans**: 2 plans
Plans:
- [ ] 30-01-PLAN.md — Schema foundation: budgetCache table + internal upsert mutations
- [ ] 30-02-PLAN.md — Sync pipeline: fetchBudgetVsActuals writes to budgetCache + grant matching + public queries

### Phase 31: Grant Budget Core UI
**Goal**: Users can view the Grant Budget Overview section on the dashboard with summary cards, toggle between Table and Chart views, and see per-grant rows with spend progress in a theme-consistent display
**Depends on**: Phase 30
**Requirements**: BGUI-01, BGUI-02, BGUI-03, BGUI-06
**Success Criteria** (what must be TRUE):
  1. User sees 4 summary cards displaying Total Revenue (actual vs budget), Total Expenses (actual vs budget), Budget Remaining ($ and %), and Overall Burn Rate
  2. User can click a toggle to switch between Table View and Chart View — the active view persists within the session
  3. Table View renders one row per grant with Budget, Actual, Remaining, a % Spent progress bar, and a status badge (On Track / Caution / Over Budget)
  4. The Grant Budget section renders correctly in both dark and light themes with no unstyled elements or contrast failures
**Plans**: TBD

### Phase 32: Grant Budget Charts and Detail
**Goal**: Users can explore budget data visually via chart view and drill into any individual grant to see a full account-level line-item breakdown
**Depends on**: Phase 31
**Requirements**: BGUI-04, BGUI-05
**Success Criteria** (what must be TRUE):
  1. Chart View displays an expense distribution pie chart showing each grant's share of total spend
  2. Chart View displays a horizontal bar chart comparing budget vs actual spend per grant
  3. Each grant in Chart View shows an individual mini pie chart card with its own budget vs actual ratio
  4. Clicking any grant row (Table View) or grant card (Chart View) opens a detail modal showing account-level line items and an expense distribution pie chart specific to that grant
  5. The detail modal closes cleanly and the user returns to their prior Table or Chart view state
**Plans**: 1 plan
Plans:
- [ ] 32-01-PLAN.md — Chart view (Pie + Bar + grant cards) and detail modal (line items + expense pie)

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
| 11. Analytics Foundation + Dashboard Cards | v1.3 | 2/2 | Complete | 2026-03-01 |
| 12. Demographics Tab | v1.3 | 2/2 | Complete | 2026-03-01 |
| 13. Client Activity Tab | v1.3 | 2/2 | Complete | 2026-03-01 |
| 14. Operations Tab | v1.3 | 2/2 | Complete | 2026-03-01 |
| 15. Donation Performance Charts | v1.3 | 2/2 | Complete | 2026-03-01 |
| 16. Schema Foundation | v2.0 | 1/1 | Complete | 2026-03-01 |
| 17. Enrollment and Sessions Backend | v2.0 | 1/1 | Complete | 2026-03-01 |
| 18. Data Migration | v2.0 | 1/1 | Complete | 2026-03-01 |
| 19. Analytics Backend Rewrite | v2.0 | 1/1 | Complete | 2026-03-01 |
| 20. Frontend and Sheets Removal | v2.0 | 2/2 | Complete | 2026-03-01 |
| 21. Schema Cleanup | v2.0 | 2/2 | Complete | 2026-03-01 |
| 22. Data Export | v2.0 | 1/1 | Complete | 2026-03-02 |
| 23. UI & Data Cleanup | v2.1 | 2/2 | Complete | 2026-03-02 |
| 24. Calendar Multi-Select | v2.1 | 2/2 | Complete | 2026-03-02 |
| 25. Production Deploy | v2.1 | 1/1 | Complete | 2026-03-02 |
| 26. Dummy Data Fallbacks | v3.0 | 2/2 | Complete | 2026-03-02 |
| 27. Theme Toggle | v3.0 | 2/2 | Complete | 2026-03-02 |
| 28. Visual Elements | v3.0 | 2/2 | Complete | 2026-03-02 |
| 29. Dashboard Polish + Infrastructure | v3.0 | 2/2 | Complete | 2026-03-02 |
| 30. QB Budget Data Pipeline | 2/2 | Complete    | 2026-03-04 | - |
| 31. Grant Budget Core UI | 1/1 | Complete    | 2026-03-04 | - |
| 32. Grant Budget Charts and Detail | v3.1 | 0/TBD | Not started | - |
