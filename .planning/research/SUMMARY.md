# Project Research Summary

**Project:** DEC DASH 2.0 — v2.0 Data Foundation
**Domain:** Nonprofit case management — Client/Enrollment/Session data model refactor, Sheets removal, analytics rewrite, data migration, export
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

The v2.0 Data Foundation milestone is a structural refactor of an already-working executive dashboard for the Dads' Education Center nonprofit. The goal is to replace a fragile Google Sheets sync architecture with a Convex-native data model where the app is the authoritative source of client and program data. This is not a greenfield build — it is a carefully sequenced migration on a live, single-deployment system (`aware-finch-86`) where any schema push that breaks validation immediately affects the production environment.

The recommended approach is a strict eight-phase build order driven by Convex schema dependency constraints: the `enrollments` table must exist before any RBAC rewrites, migration scripts, analytics changes, or frontend updates can proceed. All fields added to existing tables must start as `v.optional` and only be tightened to required after a migration mutation backfills existing documents. The Sheets sync removal and the analytics rewrite are co-dependent and must ship in the same deployment — not sequentially. No new npm packages are needed; the entire milestone is achievable with the existing stack (`convex` 1.32.0, `xlsx` 0.18.5, `googleapis` 171.4.0, `dotenv` 17.3.1, `date-fns` 4.1.0).

The primary risks are: (1) Convex schema push failures due to existing documents not matching tightened field types, (2) RBAC breakage for lawyer/psychologist roles if `programId` is removed from `clients` before the enrollment-join filter is deployed, and (3) the Demographics analytics tab appearing broken if Sheets sync is removed before the replacement Convex-native query is verified. All three are preventable with the sequenced deployment approach documented in the architecture research. The dataset is small (200–500 clients), so in-memory aggregation in Convex queries is appropriate and no caching or pagination infrastructure is needed for this milestone.

---

## Key Findings

### Recommended Stack

No new packages are required for v2.0. The milestone is pure Convex schema, query, mutation, and migration script work using the already-installed stack. This is a significant finding — it means no dependency risk, no bundle size increase, and no new auth or integration concerns.

**Core technologies:**
- `convex` 1.32.0 — all new backend work: `enrollments` table, modified `clients`/`sessions`, rewritten `analytics.getAllDemographics`, new `enrollments.ts` and `sessions.ts` files
- `xlsx` 0.18.5 — already used by import scripts; covers Excel export via `json_to_sheet` + `writeFile` and migration script spreadsheet reading
- `date-fns` 4.1.0 — date formatting for export labels and analytics queries
- `dotenv` 17.3.1 — env loading for CLI migration scripts (`NEXT_PUBLIC_CONVEX_URL`)
- Native `Blob` API — CSV export without any library (no `react-csv` or `papaparse` needed)

**What NOT to add:** `@convex-dev/migrations` (overkill at this scale — existing `internalMutation` + `npx convex run` pattern handles it), `react-csv` / `papaparse` (native Blob + xlsx cover all export cases), `@convex-dev/aggregate` (in-memory aggregation is sufficient at nonprofit scale), OAuth2 user-flow for Calendar (service account already works and is validated).

See: `.planning/research/STACK.md`

### Expected Features

**Must have (table stakes — v2.0 launch):**
- `enrollments` table schema — new Convex table linking clients to programs with status, dates, and notes; removes `programId` direct FK from `clients`
- Gender field on `clients` — `gender: v.optional(v.string())` required for Demographics analytics to query Convex instead of Sheets (the field exists in `programDataCache` but not on `clients`)
- Attendance status on sessions — `attendanceStatus: "attended" | "missed" | "excused" | "cancelled"` field; industry standard from Salesforce NPM and PlanStreet patterns
- Data migration script — one-time CLI script creating `enrollments` records for all existing clients; deduplicates by `firstName+lastName`; dry-run mode required before writing
- Unified client list — `listWithPrograms` query joins through `enrollments` instead of `clients.programId`; role-based filtering preserved via enrollment join
- Analytics Demographics rewrite — `getAllDemographics` reads `clients` table directly; removes `programDataCache` and Sheets config dependency
- Data export — admin-only CSV download of clients + enrollments + session counts; native Blob API implementation
- Remove `programDataCache` / Sheets program sync — after migration validated: remove cron, deprecate table writes

**Should have (differentiators — v2.0 launch):**
- Enrollment-level status and completion tracking — `status` on `enrollments` (not `clients`); enables "87% completion rate" metrics
- Sessions linked to `enrollmentId` — optional FK on sessions; enables program-scoped session history
- App becomes canonical source of truth — staff can trust what they see without "did Sheets sync yet?" confusion
- `by_sessionDate` index on sessions — fixes known full-table scan in `getSessionVolume`/`getSessionTrends`

**Defer to v2.1 (post-validation):**
- Enrollment-level session history UI — build after `enrollmentId` FK is stable with real data
- Completion tracking dashboard widget — requires `completedAt` data from real usage
- New vs. returning client KPI card — requires a full quarter of data in new model
- Missed session alerts (3+ consecutive misses) — requires attendance status data from real usage

**Anti-features (never build for this milestone):**
- Real-time check-in kiosk / QR codes — out of scope; DEC cohort sizes make manual logging fast
- Automatic silent deduplication of import data — dangerous for healthcare-adjacent data; require admin review
- Multi-level program hierarchy (programs > cohorts > sessions) — overkill; Enrollment IS the cohort equivalent
- Bulk session import from Excel — historical session data lacks the structure needed for the new model

See: `.planning/research/FEATURES.md`

### Architecture Approach

The architecture follows the Salesforce Nonprofit Cloud PMM pattern (Programs > Enrollments > Sessions) adapted for Convex's schema constraints. The central insight is that client status (`active`, `completed`, `withdrawn`) must move from the `clients` table to the `enrollments` table — a client record is permanent identity, an enrollment is a program participation episode. This enables multi-program enrollment and correct active-client counting without ambiguity.

**Major components:**

1. `enrollments` table (NEW) — `clientId`, `programId`, `status`, `enrollmentDate`, `exitDate`, `completionStatus`, `notes`, `createdAt`, `createdBy`; indexes: `by_clientId`, `by_programId`, `by_status`
2. `clients` table (MODIFIED) — drop `programId`, `enrollmentDate`, `status`; add `gender`, `referralSource`, `dateOfBirth`, `phone`, `email`; add `by_lastName` index
3. `sessions` table (MODIFIED) — add `enrollmentId` (optional FK), `attendanceStatus`; add `by_sessionDate`, `by_enrollmentId`, `by_programId` indexes
4. `enrollments.ts` (NEW FILE) — CRUD with `requireRole` + audit log; `importBatch` internal mutation for migration
5. `sessions.ts` (NEW FILE) — formalized session CRUD with `attendanceStatus`
6. `analytics.ts` (MODIFIED) — `getAllDemographics` reads `clients` directly; `getActiveClientCount` reads enrollments by `by_status` index
7. `googleSheetsActions.ts` / `googleSheetsSync.ts` / `googleSheetsInternal.ts` (MODIFIED) — remove `syncProgramData`, `upsertProgramParticipant`; keep grant sync only
8. `scripts/migrateV2.ts` (NEW) — CLI migration: backfill enrollments from `clients.programId`; patch demographics from intake forms; batch 50 per call
9. `scripts/importFromSpreadsheet.ts` (NEW) — import cleaned spreadsheet into new model; idempotent by name match

**Key patterns:**
- Enrollment-centric status: active client count queries `enrollments` filtered by `by_status` index, collects distinct `clientId` values
- Demographics on client record: demographic fields describe the person, not the program episode; query `clients` directly
- Role-based filtering via enrollments: join `clients > enrollments > programs` for lawyer/psychologist RBAC
- Batched CLI migration: `ConvexHttpClient` + 50-record batches via separate mutation calls (avoids Convex write-per-transaction limit)
- Google auth already unified: Calendar and Sheets both read `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` from env vars; no new infrastructure needed

See: `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

1. **Convex schema push fails on existing data** — Never make a field required in the same deploy that introduces it. Always add as `v.optional`, run migration mutation to backfill, then tighten to required in a second deploy. This applies to every new field on `clients` and `sessions`.

2. **RBAC breaks when `programId` removed from `clients`** — Lawyers and psychologists see all clients if the enrollment-join filter is not deployed before `programId` is removed. Keep `programId` as `v.optional` during the entire transition. Only remove after every role-filtered query is rewritten to join through `enrollments`.

3. **Demographics tab shows empty state after Sheets removal** — `getAllDemographics` currently reads `programDataCache`; `DemographicsTab.tsx` has a `useSheetsConfig()` gate. Sheets removal and the analytics rewrite must ship in the same deployment — never sequentially. Verify `total > 0` from the new query before cutting over.

4. **Sheets cron/table removal order matters** — Must follow the 8-step ordered sequence: remove cron, update `alerts.ts` to remove Sheets staleness check, clear `programDataCache` documents, clear `googleSheetsConfig` documents, remove table definitions from schema, remove backend files, remove frontend references. Skipping steps causes blocked schema pushes or runtime errors.

5. **Duplicate clients from migration script** — The spreadsheet likely contains clients already in Convex from earlier imports. Always build and run dry-run mode first that reports `{ wouldCreate, wouldUpdate, wouldSkip }` without writing. Normalize name keys (`toLowerCase().trim()`) for dedup matching. Verify final client count matches expectations before deleting `programDataCache`.

6. **Sessions full-table scan gets worse after migration data import** — `getSessionVolume` and `getSessionTrends` have no `by_sessionDate` index. Add it in the Phase 1 schema deploy before historical data is imported. Do not defer this — adding it after performance degrades is harder to verify.

See: `.planning/research/PITFALLS.md`

---

## Implications for Roadmap

Based on Convex schema constraints and the dependency chain identified in research, the build order is non-negotiable. The roadmap must follow schema > backend > migration > analytics > frontend > cleanup > export sequencing.

### Phase 1: Schema Foundation

**Rationale:** Everything else depends on the `enrollments` table existing in Convex. This is the critical path blocker. Non-breaking additive change — existing code continues working after deploy.
**Delivers:** `enrollments` table deployed; new optional fields on `clients` (`gender`, `referralSource`, `dateOfBirth`, `phone`, `email`); new fields on `sessions` (`enrollmentId`, `attendanceStatus`); new indexes (`by_sessionDate`, `by_enrollmentId`, `by_programId`, `by_status`, `by_lastName`).
**Addresses:** Enrollment multi-program schema, session attendance status, sessions full-table scan fix.
**Avoids:** Schema push failures (all new fields are `v.optional`); RBAC breakage (existing `programId` fields remain during transition).
**Research flag:** Standard Convex additive schema pattern — well documented; no additional research needed.

### Phase 2: Enrollment and Sessions Backend

**Rationale:** Before any migration can run, `enrollments.importBatch` must exist. Before any frontend work, the enrollment CRUD queries must be available. Sessions backend formalization can run in parallel.
**Delivers:** `enrollments.ts` with `list`, `create`, `update`, `remove`, `listByClient`, `importBatch` (internal mutation). `sessions.ts` with formalized CRUD + `attendanceStatus`. Both use `requireRole` + audit log pattern.
**Addresses:** Enrollment CRUD, attendance status tracking, session-enrollment link.
**Avoids:** Migration script calling mutations that do not exist yet.
**Research flag:** Standard patterns matching existing `clients.ts` and `grants.ts`; no additional research needed.

### Phase 3: Data Migration

**Rationale:** Migration must run after schema and enrollment backend exist. Creates the enrollment records that analytics and the unified client list depend on. Must run before Sheets sync is removed.
**Delivers:** `scripts/migrateV2.ts` — dry-run mode then execute: backfill `enrollments` from `clients.programId`; patch `gender`, `referralSource` from intake forms. Optional: `scripts/importFromSpreadsheet.ts` for cleaned spreadsheet import. All clients have enrollment records after this phase.
**Addresses:** Historical data preservation, deduplication-safe migration, demographic data gap (gender field).
**Avoids:** Duplicate clients (dry-run required first); data corruption (idempotent batch script); skipping validation.
**Research flag:** Needs careful implementation attention — dry-run validation output must be reviewed before write execution. Inspect the actual spreadsheet before writing the import script to verify column names and data quality.

### Phase 4: Analytics Backend Rewrite

**Rationale:** Must happen before Sheets sync is removed. The new queries must be deployed and verified to return correct data before cutting over. Co-dependent with Phase 5 (must ship together).
**Delivers:** Rewritten `analytics.getAllDemographics` reading `clients` table directly; `getActiveClientCount` via `enrollments.by_status`; `getSessionTrends`/`getSessionVolume` using `by_sessionDate` index range query.
**Addresses:** Demographics-from-Convex, performance-fixed session analytics.
**Avoids:** Empty Demographics tab during Sheets removal; full-table scan performance trap.
**Research flag:** Standard Convex query patterns; no additional research needed.

### Phase 5: Frontend and Sheets Removal (co-deployed with Phase 4)

**Rationale:** Sheets removal and analytics frontend update must ship together. Also covers RBAC rewrite in the client list, which must be verified before `programId` is removed. This is the most coordinated phase.
**Delivers:** `clients.listWithPrograms` role filter via enrollments; `/clients` page unified list (no program-tab split by role); `DemographicsTab.tsx` with `useSheetsConfig()` guard removed; `syncProgramData` removed from Sheets actions; program Sheets config removed from admin UI; Sheets cron narrowed to grant sync only.
**Addresses:** Unified client list, role-based filtering correctness, Sheets dependency removal.
**Avoids:** RBAC breakage (deploy enrollment-join filter before removing `programId`); Demographics empty state (analytics rewrite already deployed from Phase 4); `alerts.ts` runtime errors (remove Sheets staleness check in this phase per the 8-step sequence).
**Research flag:** RBAC verification required after deploy — log in as `lawyer` and `psychologist` roles and confirm filtered results before marking complete.

### Phase 6: Schema Cleanup

**Rationale:** Can only happen after Phase 5 is confirmed working and `programDataCache` documents are cleared. Removes all legacy fields and deprecated tables.
**Delivers:** `programId`, `enrollmentDate`, `status` removed from `clients` schema definition; `programDataCache` table removed from schema; `googleSheetsConfig` documents cleared and table removed; `upsertProgramParticipant` removed from `googleSheetsInternal.ts`.
**Addresses:** Technical debt cleanup, schema accuracy.
**Avoids:** Schema push failure (all documents in removed tables are cleared before table definition is removed).
**Research flag:** No research needed; follow the documented 8-step removal sequence from PITFALLS.md precisely.

### Phase 7: Data Export

**Rationale:** Deliberately last — export produces more useful output (includes enrollment data) after the data model is fully migrated and stable. Can be built earlier if needed but is lower risk at the end.
**Delivers:** `clients.exportAll` query (clients + enrollments + session counts, admin-only); `src/lib/exportUtils.ts` with `downloadCsv` and `downloadXlsx` utilities; export button in admin console.
**Addresses:** Admin data export, backup/audit compliance, grant reporting support.
**Avoids:** JSON-only export (CSV with human-readable headers required for nonprofit admin use).
**Research flag:** Standard implementation — native Blob API and `xlsx` 0.18.5 `json_to_sheet` + `writeFile`; no additional research needed.

### Phase Ordering Rationale

- Schema must deploy before any code touches new fields — Convex validates every push against production data
- Enrollment backend must exist before migration scripts run — `importBatch` internal mutation is the target
- Migration must complete before Sheets sync is removed — enrollment records are the replacement for `programDataCache`
- Analytics rewrite must deploy and be verified before Sheets sync is removed — they are co-dependent, not sequential
- Schema cleanup (table/field removal) must come after documents are cleared — Convex blocks schema pushes with orphaned data
- Export is independent and comes last because it produces richer output with the complete new data model

### Research Flags

Phases needing careful implementation attention (not external research, but execution complexity):
- **Phase 3 (Data Migration):** Dry-run output must be reviewed before write execution. Inspect the actual cleaned spreadsheet before writing the import script. The deduplication and name-normalization logic are the highest-risk implementation details.
- **Phase 5 (Frontend + Sheets Removal):** Most coordinated phase — RBAC verification for restricted roles required before shipping; follow the 8-step Sheets removal sequence precisely.

Phases with standard patterns (straightforward execution):
- **Phase 1 (Schema):** Well-documented Convex additive schema pattern; all fields `v.optional`.
- **Phase 2 (Backend):** Matches existing `clients.ts` and `grants.ts` CRUD patterns exactly.
- **Phase 4 (Analytics):** Direct table reads replacing `programDataCache` reads; same query structure.
- **Phase 6 (Schema Cleanup):** Documented removal sequence; no implementation complexity.
- **Phase 7 (Export):** Client-side Blob + xlsx; simple utility functions.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are already installed and in production use. No version research needed. The "zero new packages" finding is verified against package.json and confirmed against each feature's implementation approach. |
| Features | HIGH | Existing codebase inspected directly. Industry patterns (Salesforce NPM, PlanStreet) cross-validate the feature set and attendance status enum values. Migration strategy specifics are MEDIUM — depends on actual spreadsheet data quality not yet inspected. |
| Architecture | HIGH | All findings based on direct code inspection of every relevant file in the codebase. No external API uncertainty. Schema design is validated against Convex documentation. The 8-step Sheets removal sequence is specific to this codebase's `alerts.ts` dependency chain. |
| Pitfalls | HIGH | v2.0 pitfalls verified against official Convex migration docs, stack.convex.dev blog posts, and direct codebase inspection. The RBAC breakage and schema validation failure patterns are confirmed Convex behaviors, not speculative risks. |

**Overall confidence:** HIGH

### Gaps to Address

- **Spreadsheet data quality is unknown:** The "cleaned master spreadsheet" referenced in milestone requirements has not been inspected. The migration script's deduplication logic will work correctly only if the spreadsheet uses consistent name formatting. Inspect the spreadsheet before writing the import script — determine: how many rows, what columns exist, whether names match existing Convex client names exactly.

- **`programOutcome` field has no equivalent in the new model:** `programDataCache` has a `programOutcome` field. The architecture research recommends using `enrollments.completionStatus` as a string field. This needs a design decision before Phase 1 schema deploy: does `programOutcome` map to `enrollments.completionStatus`, or is it dropped for v2.0?

- **"Unified Google OAuth" scope is narrower than it sounds:** The feature is actually "remove Sheets program sync config" — not new auth infrastructure. The Calendar service account is already unified with Sheets at the env var level. Confirm this interpretation before Phase 5 to avoid over-engineering.

- **`importLegalBatch` and `importCoparentBatch` remain public mutations:** These unauthenticated batch insert mutations should be converted to `internalMutation` after migration is complete. This is a security cleanup item that belongs in Phase 3 or Phase 6 rather than being forgotten.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `convex/schema.ts`, `convex/clients.ts`, `convex/sessions.ts`, `convex/analytics.ts`, `convex/googleSheetsActions.ts`, `convex/googleCalendarActions.ts`, `convex/alerts.ts`, `convex/crons.ts`, `scripts/importCoparent.ts`, `src/components/analytics/DemographicsTab.tsx`, `src/app/(dashboard)/clients/page.tsx`
- Convex index documentation — https://docs.convex.dev/database/reading-data/indexes/
- Convex schema documentation — https://docs.convex.dev/database/schemas
- Convex migration patterns — https://stack.convex.dev/intro-to-migrations, https://stack.convex.dev/migrating-data-with-mutations, https://stack.convex.dev/lightweight-zero-downtime-migrations
- SheetJS XLSX write documentation — https://docs.sheetjs.com/docs/solutions/output/
- Google OAuth service account documentation — https://developers.google.com/identity/protocols/oauth2/service-account

### Secondary (MEDIUM confidence)
- Salesforce Nonprofit Cloud Program Management data model — https://developer.salesforce.com/docs/atlas.en-us.nonprofit_cloud.meta/nonprofit_cloud/npc_dm_overview.htm — Programs/Enrollments/Sessions pattern
- PlanStreet human services attendance tracking — https://www.planstreet.com/attendance-tracking-human-services-guide — attendance status options (attended/missed/excused/cancelled)
- Nonprofit data migration best practices — CaseWorthy, NeonOne — deduplication strategy and validation report pattern
- Nonprofit impact metrics — funder-standard metrics: new vs. returning, retention/dropout, completion rate

### Tertiary (LOW confidence — validate during implementation)
- Spreadsheet data quality: unknown until actual spreadsheet is inspected before Phase 3
- Historical session count in `legalIntakeForms.numberOfVisits` and `coparentIntakeForms.sessionsCompleted`: assumed usable for migration notes, not for creating actual session records

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
