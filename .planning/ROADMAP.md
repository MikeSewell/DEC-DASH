# Roadmap: DEC DASH 2.0

## Milestones

- ✅ **v1.0 Command Center** — Phases 1-4 (shipped 2026-02-28)
- ✅ **v1.1 Polish** — Phases 5-7 (shipped 2026-02-28)
- ✅ **v1.2 Intelligence** — Phases 8-9 (shipped 2026-03-01)
- ✅ **v1.3 Analytics** — Phases 11-15 (shipped 2026-03-01)
- ✅ **v2.0 Data Foundation** — Phases 16-22 (shipped 2026-03-02)
- ✅ **v2.1 Polish & Deploy** — Phases 23-25 (shipped 2026-03-02)
- 🚧 **v3.0 Dashboard Redesign** — Phases 26-29 (in progress)

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

### 🚧 v3.0 Dashboard Redesign (In Progress)

**Milestone Goal:** Overhaul the dashboard with dummy data fallbacks, dark/light theme toggle, ported visual elements from the old desktop app, and overall layout polish — resulting in a data-dense command center that looks great even before integrations are reconnected.

#### Phase 26: Dummy Data Fallbacks

- [x] **Phase 26: Dummy Data Fallbacks** — Dashboard renders complete, realistic data in all sections when integrations are not connected (completed 2026-03-02)

#### Phase 27: Theme Toggle

- [x] **Phase 27: Theme Toggle** — Dark/light theme switch with polished dark palette and persistent preference (completed 2026-03-02)

#### Phase 28: Visual Elements

- [ ] **Phase 28: Visual Elements** — Funding thermometer, expense progress bars, donation source cards, urgency calendar, and dense metric cards

#### Phase 29: Dashboard Polish + Infrastructure

- [ ] **Phase 29: Dashboard Polish + Infrastructure** — Tighter layout, hover accents, executive snapshot, consolidated programs view, and calendar cron fix

## Phase Details

### Phase 26: Dummy Data Fallbacks
**Goal**: Dashboard sections display complete, realistic hardcoded data whenever their live integration is absent or unconfigured
**Depends on**: Nothing (first v3.0 phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. Opening the dashboard with no QB connection shows realistic revenue, expenses, net income, and cash on hand values — no $NaN, no empty sections
  2. The calendar widget displays hardcoded upcoming events (with titles, dates, and types) when Google Calendar is not configured
  3. KB metric cards render with plausible stat values and source labels when no documents are uploaded
  4. The donation performance chart shows a multi-line trend with sample data when no income accounts are designated
  5. P&L section shows a valid expense breakdown with non-NaN dollar amounts under all conditions
**Plans**: TBD

### Phase 27: Theme Toggle
**Goal**: Users can switch between a polished dark mode and the existing warm cream light mode, with the choice persisting across sessions
**Depends on**: Phase 26
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
**Success Criteria** (what must be TRUE):
  1. A visible toggle control on the dashboard (or header) switches between dark and light themes with a single click
  2. Dark theme renders with near-black backgrounds (#0F0F0F bg, #1E1E1E surface), teal accents, and readable contrast throughout the dashboard
  3. Light theme retains the existing warm cream palette (#F7F5F0 bg, warm borders, forest foreground) with no regressions
  4. Refreshing the page or opening a new session restores the previously chosen theme without flash
**Plans**: TBD

### Phase 28: Visual Elements
**Goal**: The dashboard gains five rich visual components ported from the old desktop app — thermometer, progress bars, source cards, urgency calendar, and dense metric cards
**Depends on**: Phase 26, Phase 27
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05
**Success Criteria** (what must be TRUE):
  1. A funding goal thermometer widget shows a filled bar rising toward a target amount with a percentage label
  2. Expense category rows each display a horizontal progress bar filled proportionally to their share of total spend
  3. Donation source cards show an icon, source name, and dollar amount side by side in a compact grid
  4. Deadline calendar items are color-coded red (overdue/imminent), yellow (approaching), and green (comfortable)
  5. Metric cards across the dashboard display large, prominent values with hover lift animation
**Plans**: TBD

### Phase 29: Dashboard Polish + Infrastructure
**Goal**: The dashboard layout is tightened and visually refined, the programs section is consolidated, and the calendar cron correctly uses admin-selected calendars
**Depends on**: Phase 28
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, INFRA-01
**Success Criteria** (what must be TRUE):
  1. Dashboard sections have reduced vertical padding — more content is visible without scrolling
  2. Hovering a card reveals a gradient top-border accent matching the DEC brand teal
  3. The top of the dashboard shows a dense executive snapshot row with key financial figures at a glance
  4. Client/program data appears in a single consolidated section rather than duplicated per program type
  5. Calendar cron sync events pull only from the calendars selected in Admin > Google Calendar config — not all available calendars
**Plans**: TBD

## Progress

**Execution Order:** 26 → 27 → 28 → 29

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
| 26. Dummy Data Fallbacks | 2/2 | Complete    | 2026-03-02 | - |
| 27. Theme Toggle | 2/2 | Complete    | 2026-03-02 | - |
| 28. Visual Elements | v3.0 | 0/TBD | Not started | - |
| 29. Dashboard Polish + Infrastructure | v3.0 | 0/TBD | Not started | - |
