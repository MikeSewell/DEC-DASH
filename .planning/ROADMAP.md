# Roadmap: DEC DASH 2.0

## Milestones

- ✅ **v1.0 Command Center** — Phases 1-4 (shipped 2026-02-28)
- ✅ **v1.1 Polish** — Phases 5-7 (shipped 2026-02-28)
- ✅ **v1.2 Intelligence** — Phases 8-9 (shipped 2026-03-01)
- ✅ **v1.3 Analytics** — Phases 11-15 (shipped 2026-03-01)
- 🚧 **v2.0 Data Foundation** — Phases 16-22 (in progress)

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

### 🚧 v2.0 Data Foundation (In Progress)

**Milestone Goal:** Refactor the data model to Client → Enrollment → Session, make the app the authoritative source for client/program data, remove the Google Sheets program sync dependency, and unify Google OAuth for Calendar.

**Build Order Constraint:** Schema must deploy before any code touches new fields. Enrollment backend must exist before migration runs. Migration must complete before Sheets sync is removed. Analytics rewrite and Sheets removal are co-dependent and ship together. Schema cleanup (table/field removal) follows after documents are cleared. Export is independent and ships last with the full data model available.

- [x] **Phase 16: Schema Foundation** — Deploy enrollments table, add demographic fields to clients, add attendance status and enrollment link to sessions, add all new indexes (completed 2026-03-01)
- [x] **Phase 17: Enrollment and Sessions Backend** — Build enrollment CRUD and session backend with attendanceStatus support (completed 2026-03-01)
- [x] **Phase 18: Data Migration** — Run dry-run then execute migration from existing client records to enrollment model; backfill demographics (completed 2026-03-01)
- [x] **Phase 19: Analytics Backend Rewrite** — Rewrite Demographics and session analytics queries to read Convex directly, verified before Sheets removal (completed 2026-03-01)
- [x] **Phase 20: Frontend and Sheets Removal** — Unified client list, enrollment-based RBAC, remove Sheets program sync, admin UI cleanup, alerts staleness check removal (completed 2026-03-01)
- [x] **Phase 21: Schema Cleanup** — Remove legacy fields and deprecated tables after documents cleared (completed 2026-03-01)
- [ ] **Phase 22: Data Export** — Admin CSV and Excel export of full client + enrollment + session dataset

## Phase Details

### Phase 16: Schema Foundation
**Goal**: The Convex schema reflects the new Client → Enrollment → Session data model — all new tables and fields deployed as additive optional changes, existing code continues working
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: DMOD-01, DMOD-02, DMOD-03, DMOD-04, DMOD-05
**Success Criteria** (what must be TRUE):
  1. The enrollments table exists in Convex with clientId, programId, status, enrollmentDate, exitDate, notes, and createdBy fields
  2. Client records accept gender, referralSource, dateOfBirth, phone, and email fields without schema validation errors
  3. Session records accept attendanceStatus and enrollmentId fields without schema validation errors
  4. Querying enrollments by clientId, programId, or status returns correct results using the new indexes
  5. All existing code (clients page, sessions queries, analytics) continues working unchanged after the schema deploy
**Plans**: 1 plan
Plans:
- [ ] 16-01-PLAN.md — Deploy enrollments table, client demographic fields, session attendance fields, and all new indexes to Convex schema

### Phase 17: Enrollment and Sessions Backend
**Goal**: Staff can create enrollments and log individual sessions through Convex mutations — the CRUD layer that migration scripts and the frontend both depend on
**Depends on**: Phase 16
**Requirements**: CLNT-04, CLNT-05
**Success Criteria** (what must be TRUE):
  1. Staff can create a new enrollment for a client in any program via the enrollments.create mutation
  2. Staff can log an individual session with date, attendance status (attended/missed/excused/cancelled), and notes linked to an enrollment
  3. All enrollment and session mutations enforce RBAC (requireRole) and write to the audit log
  4. The enrollments.importBatch internal mutation exists and accepts batches of enrollment records for the migration script to call
**Plans**: TBD

### Phase 18: Data Migration
**Goal**: All existing client records have corresponding enrollment records in Convex; demographics fields are populated from intake form data — the app has a complete, deduplicated dataset before Sheets sync is removed
**Depends on**: Phase 17
**Requirements**: MIGR-01, MIGR-02, MIGR-03, MIGR-04
**Success Criteria** (what must be TRUE):
  1. Running the migration script in dry-run mode prints a report of would-create, would-update, and would-skip counts without writing any data
  2. After migration executes, every existing client record has at least one enrollment record linking them to a program
  3. No duplicate client records are created — clients already in Convex from prior imports are matched by normalized name and updated rather than duplicated
  4. Gender, referralSource, and other demographics fields are populated on client records from intake form data where available
**Plans**: 1 plan
Plans:
- [ ] 18-01-PLAN.md — Write and execute migrateAll internalMutation: create enrollment records for all clients with programId, backfill demographics from intake forms, dry-run/execute pattern

### Phase 19: Analytics Backend Rewrite
**Goal**: The Demographics tab and session analytics queries read from Convex tables directly — verified returning correct data before the Sheets programDataCache is touched
**Depends on**: Phase 18
**Requirements**: ANLY-01, ANLY-02, ANLY-03
**Success Criteria** (what must be TRUE):
  1. The Demographics tab on /analytics shows gender, referralSource, and other breakdowns aggregated from the clients Convex table (not from programDataCache)
  2. Session volume and trend queries use a by_sessionDate index range scan instead of a full table scan — no performance degradation after migration adds historical data
  3. The active client count on dashboard KPI cards is derived from enrollments with status=active, not from the clients table directly
  4. All three analytics results show totals greater than zero when the new queries are verified before Sheets removal proceeds
**Plans**: TBD

### Phase 20: Frontend and Sheets Removal
**Goal**: The /clients page shows all clients in one unified list with enrollment-based role filtering; Google Sheets program sync is removed from all backend and frontend surfaces; the app is the sole source of truth for client and program data
**Depends on**: Phase 19 (analytics rewrite must be deployed and verified first)
**Requirements**: CLNT-01, CLNT-02, CLNT-03, INFR-01, INFR-04, INFR-05, INFR-06
**Success Criteria** (what must be TRUE):
  1. Logging in as admin or staff shows all clients in one list regardless of which programs they are enrolled in
  2. Logging in as lawyer shows only clients with active legal enrollments; logging in as psychologist shows only clients with active co-parent enrollments
  3. The client detail page shows all of a client's enrollments across programs alongside their intake forms
  4. The Admin console no longer shows a Google Sheets program config section, and the Sheets program sync cron no longer runs
  5. Google Calendar data continues syncing correctly after the Sheets program configuration is removed
  6. The proactive alerts panel no longer shows a Sheets staleness warning for program data
**Plans**: 2 plans
Plans:
- [ ] 20-01-PLAN.md — Rewrite client queries for enrollment-based RBAC and enrich client detail page with enrollments section
- [ ] 20-02-PLAN.md — Remove Sheets program sync from cron/action/alerts, remove admin Sheets tab, verify Calendar independence

### Phase 21: Schema Cleanup
**Goal**: The Convex schema accurately reflects only the new data model — legacy fields and deprecated tables are fully removed after their documents have been cleared
**Depends on**: Phase 20 (Sheets documents must be cleared and removal confirmed before table definitions can be deleted)
**Requirements**: INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. The programDataCache table no longer exists in the Convex schema and no documents remain in it
  2. The clients schema definition no longer contains programId, enrollmentDate, or status fields
  3. The Convex schema push succeeds without validation errors after all legacy fields and tables are removed
**Plans**: 2 plans
Plans:
- [ ] 21-01-PLAN.md — Clear programDataCache documents, delete dead Sheets code, rewrite dashboard components to use getAllDemographics, remove programDataCache table and sheetsStalenessHours from schema
- [ ] 21-02-PLAN.md — Rewrite all callers of clients.programId/enrollmentDate/status to use enrollments table, update frontend forms, drop legacy fields and by_programId index from clients schema

### Phase 22: Data Export
**Goal**: An admin can download the complete client dataset — including enrollment history and session counts — as CSV or Excel for backup and grant reporting purposes
**Depends on**: Phase 21 (export produces richer output with the complete stable data model)
**Requirements**: XPRT-01, XPRT-02, XPRT-03
**Success Criteria** (what must be TRUE):
  1. An admin can click an Export button and download a CSV file containing all clients with their demographics, enrollment history, and session counts
  2. An admin can download the same data as an Excel (.xlsx) file with human-readable column headers
  3. The exported data includes all clients regardless of program, and each client row includes their demographics fields, program name, enrollment status, and total session count
**Plans**: TBD

## Progress

**Execution Order:** 16 → 17 → 18 → 19 → 20 → 21 → 22

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
| 16. Schema Foundation | 1/1 | Complete    | 2026-03-01 | - |
| 17. Enrollment and Sessions Backend | 1/1 | Complete    | 2026-03-01 | - |
| 18. Data Migration | 1/1 | Complete    | 2026-03-01 | - |
| 19. Analytics Backend Rewrite | 1/1 | Complete    | 2026-03-01 | - |
| 20. Frontend and Sheets Removal | 2/2 | Complete    | 2026-03-01 | - |
| 21. Schema Cleanup | 2/2 | Complete   | 2026-03-01 | - |
| 22. Data Export | v2.0 | 0/TBD | Not started | - |
