# Roadmap: DEC DASH 2.0

## Milestones

- ✅ **v1.0 Command Center** — Phases 1-4 (shipped 2026-02-28)
- ✅ **v1.1 Polish** — Phases 5-7 (shipped 2026-02-28)
- ✅ **v1.2 Intelligence** — Phases 8-9 (shipped 2026-03-01)
- ✅ **v1.3 Analytics** — Phases 11-15 (shipped 2026-03-01)
- ✅ **v2.0 Data Foundation** — Phases 16-22 (shipped 2026-03-02)
- 🚧 **v2.1 Polish & Deploy** — Phases 23-25 (in progress)

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

### 🚧 v2.1 Polish & Deploy (In Progress)

**Milestone Goal:** Polish the app with UI fixes and the calendar multi-select dropdown, import real client data from the master spreadsheet, and ship the full v2.0+v2.1 build to production.

- [ ] **Phase 23: UI & Data Cleanup** — Fix Programs sidebar icon, remove isActive field from programs, import master spreadsheet
- [ ] **Phase 24: Calendar Multi-Select** — Replace manual calendar ID field with a dropdown of available Google Calendars
- [ ] **Phase 25: Production Deploy** — Build and deploy v2.1 to VPS, verify Convex schema in production

## Phase Details

### Phase 23: UI & Data Cleanup
**Goal**: The app is visually polished, the programs schema is clean, and real client data is loaded from the master spreadsheet
**Depends on**: Nothing (first phase of v2.1)
**Requirements**: UI-01, UI-02, DATA-01
**Success Criteria** (what must be TRUE):
  1. Programs link in the sidebar renders its icon cleanly without any visual glitch or broken render
  2. Programs no longer have an "active" toggle — the field is absent from the schema, admin forms, and program cards
  3. Client and enrollment data from the cleaned master spreadsheet is populated in the app and visible in the /clients page
**Plans**: TBD

Plans:
- [ ] 23-01: Fix Programs sidebar icon and remove isActive from programs schema and UI

### Phase 24: Calendar Multi-Select
**Goal**: Admin can discover and select which Google Calendars to sync without manually entering calendar IDs
**Depends on**: Phase 23
**Requirements**: CAL-01, CAL-02, CAL-03
**Success Criteria** (what must be TRUE):
  1. Admin opening the Google Calendar config tab sees a list of calendars available from the connected service account
  2. Admin can check and uncheck individual calendars in the list to include or exclude them from sync
  3. Saving the selection persists it and the cron syncs only the selected calendars going forward
  4. CalendarWidget on the dashboard shows events from all selected calendars combined
**Plans**: TBD

Plans:
- [ ] 24-01: Backend — fetch available calendars action, update calendarConfig schema to store selected IDs
- [ ] 24-02: Frontend — replace manual ID input with multi-select dropdown in admin Calendar config tab

### Phase 25: Production Deploy
**Goal**: The full v2.1 build runs on the production VPS with Convex schema up to date
**Depends on**: Phase 24
**Requirements**: DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. Visiting the production URL loads the dashboard with live data — no build errors, no missing routes
  2. Convex schema changes from v2.0 and v2.1 are deployed and the backend responds correctly in production
  3. PM2 reports the dec-dash process as online with zero restarts after the deploy
**Plans**: TBD

Plans:
- [ ] 25-01: Deploy Convex schema and Next.js build to production VPS

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
| 23. UI & Data Cleanup | v2.1 | 0/1 | Not started | - |
| 24. Calendar Multi-Select | v2.1 | 0/2 | Not started | - |
| 25. Production Deploy | v2.1 | 0/1 | Not started | - |
