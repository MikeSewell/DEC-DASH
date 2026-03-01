# Feature Research

**Domain:** Nonprofit Case Management — Client-Enrollment-Session Data Model, Session Tracking, Unified Client List, Data Migration, Data Export, Analytics Rewrite
**Researched:** 2026-03-01
**Confidence:** HIGH (existing codebase), HIGH (nonprofit case management patterns from industry leaders), MEDIUM (migration strategy specifics)

---

## Context: What This Milestone Is

v2.0 Data Foundation refactors the data model and removes the Google Sheets dependency, making the app the authoritative source for client and program data. It is not building new user-visible features from scratch — it is replacing a fragile sync-based architecture with a direct Convex-native one, and extending an existing data model to support multi-program enrollment and individual session records.

**What already exists that this builds on:**

| Existing Infrastructure | Relevance to v2.0 |
|-------------------------|-------------------|
| `clients` table with `programId` (single FK) | Being replaced by `enrollments` join table for many-to-many |
| `sessions` table (clientId, programId, sessionDate, notes) | Extending with `enrollmentId`, attendance status, structured data |
| `programs` table (name, type, isActive) | Stays — enrollment links clients to programs |
| `legalIntakeForms` + `coparentIntakeForms` | Stays — linked to clients via `clientId` |
| `programDataCache` table (from Sheets sync) | Being deprecated — replaced by direct Convex queries |
| `analytics.ts` getAllDemographics (queries programDataCache) | Being rewritten to query clients/enrollments directly |
| `/clients` page with role-based filtering | Being updated to show unified list across all programs |
| Import scripts: `importLegalBatch`, `importCoparentBatch` | Pattern for new migration script |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the Executive Director and staff assume exist once the milestone is delivered. Missing these makes the milestone feel incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Client can be enrolled in multiple programs simultaneously** | A co-parent client may also be in the fatherhood program. Single `programId` on clients table makes this impossible — the new `enrollments` table is the fix | HIGH | Schema change: remove `programId` from `clients`, add `enrollments` table with `clientId` + `programId` + enrollment-level fields. All existing queries touching `programId` on clients need updating |
| **Session record has an attendance status** | Staff need to mark sessions as attended, missed, excused, or cancelled — not just log that a session happened. Without status, you cannot compute retention or completion rates | MEDIUM | Add `attendanceStatus` field to `sessions` table: `"attended" \| "missed" \| "excused" \| "cancelled"`. Default `"attended"` for backward compatibility with existing session records |
| **Unified client list without program-type split** | The current `/clients` page requires selecting a program type tab — lawyers see legal, psychologists see co-parent, admins see both but in split tabs. Admin/manager should see all clients in one sortable list | MEDIUM | New `listAll` query that joins enrollments to resolve program names, collapses multi-enrollment clients to one row, preserves role-based visibility filtering |
| **New vs. returning client distinction** | Funders and grant reports require "unduplicated client count" — people who received service for the first time this period vs. those returning. Without an `enrollments.startDate`, this cannot be computed accurately | MEDIUM | Track `firstEnrolledAt` on the `clients` record (set once, never updated) plus `startDate` on each `enrollments` record. New = enrolled for first time in reporting period. Returning = `firstEnrolledAt` predates the period |
| **Historical data preserved after migration** | Existing clients, intake forms, sessions, and goals must not be lost during the schema refactor. Staff have months of records in the current model | HIGH | Migration must: (1) create an `enrollments` record for every existing `clients.programId`, (2) preserve `clients.enrollmentDate` as `enrollments.startDate`, (3) leave all linked sessions and intake forms intact |
| **Analytics Demographics tab reads from Convex (not Sheets)** | After removing `programDataCache`, the Demographics tab currently queries `programDataCache` via `getAllDemographics`. With Sheets sync removed, this query returns empty. Demographics must be rewritten to query `clients` directly | HIGH | Replace `getAllDemographics` in `analytics.ts` with a query that aggregates `clients` table fields (ethnicity, ageGroup, zipCode) plus `enrollments` for status/referralSource. Gender field needs to be added to `clients` table |
| **Session count visible on client record** | Staff expect to see "Total sessions: 12" on a client detail view without manually counting. This was tracked in `programDataCache.sessionCount` (from Sheets). Must now be computed from the `sessions` table | LOW | Computed in `getByIdWithIntake` query: count sessions by clientId (or by enrollmentId post-refactor). No schema change needed — it's a join count |
| **Data export produces a usable file** | Admins must be able to export client/session data to CSV for backup, grant reporting, and board presentation. Without export, the "app as source of truth" transition is blocked — there is no safety net | MEDIUM | Convex action exports clients + enrollments + session counts as JSON, frontend converts to CSV download via `Blob` + `URL.createObjectURL`. No server-side file generation needed |

### Differentiators (What Makes This Milestone Meaningful)

Features that justify the architectural investment and provide lasting value beyond "we moved data around."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Enrollment-level status and completion tracking** | An enrollment can be active, completed, or withdrawn independently of whether the client is still in other programs. Completion rate becomes a meaningful metric: "87% of legal program enrollees completed the program" | MEDIUM | Add `status` and `completedAt` to `enrollments` table. Status: `"active" \| "completed" \| "withdrawn"`. `completedAt` timestamp enables time-to-completion analytics |
| **Session notes indexed by enrollment** | Sessions linked to `enrollmentId` (not just `clientId`) let staff see session history scoped to a specific program participation — "how many sessions did this client attend in the co-parent program?" — vs. all sessions across all programs | MEDIUM | Add `enrollmentId` (optional FK) to `sessions` table. Existing sessions without an enrollment stay valid — migrate using the client's `programId` to resolve the enrollment ID |
| **Referral source on enrollment (not just client)** | A client may be referred differently for each program enrollment. "Referred by court order" for legal, "self-referral" for co-parent. Storing referral source per enrollment is more accurate than per client | LOW | Add `referralSource` field to `enrollments` table. Keep `referralSource` on intake forms too — they are program-specific by nature |
| **App becomes the canonical source of truth** | When the app owns its data (not a Sheets sync), staff can trust what they see. No more "did Sheets sync yet?" confusion. Data edits in the app are immediately reflected everywhere. Analytics are real-time | HIGH | Achieved by the combination of: (1) deprecating `programDataCache`, (2) rewriting analytics queries to use Convex tables directly, (3) removing the Sheets sync cron for program data |
| **Demographics rewritten with correct gender field** | Current `programDataCache` had a `gender` field from the old spreadsheet. The `clients` table does not have a gender field. This migration adds `gender` to `clients` and surfaces it in Demographics analytics for the first time with validated app-native data | LOW | Add `gender: v.optional(v.string())` to `clients` schema. Populate during migration from the spreadsheet import. Analytics tab then shows gender distribution from real client records |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time session attendance with check-in kiosk / QR codes** | "Staff shouldn't have to log sessions manually" | Way out of scope — requires hardware, a separate check-in UI, and real-time presence detection. DEC has small cohort sizes (10-30 per session) where manual logging takes seconds | Keep session logging as a simple form with date, status, and notes. The bottleneck is not logging speed — it's staff adoption |
| **Automatic deduplication of imported clients against existing records** | "The migration spreadsheet might have clients already in the system" | Fuzzy name matching has high false-positive risk — "John Smith" matching a different "John Smith" would corrupt data. Silent deduplication is dangerous for healthcare-adjacent data | Export a deduplication report at migration time (new name vs. existing name, side by side) and require admin review before committing. Explicit human decision per conflict |
| **Soft-delete / archive for clients** | "We don't want to truly delete anyone" | Adds a `deletedAt` field to every query (filter deleted), complicates the unified list, and creates confusion when "active client count" includes or excludes archived records. DEC's volume is small enough that actual deletion is fine | Use `status: "withdrawn"` already in the schema. "Withdrawn" clients are still in the system, not deleted. Status filter on the unified list handles visibility |
| **Full audit trail for session edits** | "We need to know who changed a session" | Session edit auditing is valuable but the `auditLogs` table already logs `create_session`. Full field-level diffs require significant schema work and storage | Log `create_session` and `update_session` to auditLogs with a details string (existing pattern). Field-level diff is a v3 compliance feature if it becomes necessary |
| **Multi-level program hierarchy (programs → cohorts → sessions)** | Salesforce NPSP has program cohorts between programs and sessions | Overkill for DEC. They run 2-3 program types with small cohort sizes. Adding a cohort concept means 3 levels of navigation for staff. The Client → Enrollment → Session model is sufficient | Enrollment IS the cohort equivalent — it links a specific client to a specific program participation period. Use `notes` on enrollment for cohort identifiers if needed |
| **Email notifications when session attendance is logged** | "Staff should be notified when a client misses" | Adds Constant Contact or SendGrid integration complexity. DEC doesn't currently use the app for operational communication — the Executive Director monitors dashboards, not notification streams | Show "missed sessions" count in the unified client list as a visual indicator. Alert the director via the existing alerts panel if a client misses 3+ consecutive sessions (v2.1 enhancement) |
| **Bulk session import from Excel** | "We have historical session logs in a spreadsheet" | Historical session data is likely inconsistent, incomplete, or lacks the structure (enrollmentId, status) needed for the new model. Importing garbage data defeats the purpose of the migration | The migration script imports client records and enrollment records from the cleaned spreadsheet. Historical session counts can be approximated from `numberOfVisits` in legalIntakeForms and `sessionsCompleted` in coparentIntakeForms, stored as a legacy note |

---

## Feature Dependencies

```
[Enrollments Table]
    └──required by──> [Multi-Program Enrollment]
    └──required by──> [Enrollment-Level Status/Completion]
    └──required by──> [Session → EnrollmentId Link]
    └──required by──> [New vs. Returning Client Metric]
    └──required by──> [Unified Client List (cross-program view)]
    └──required by──> [Analytics Rewrite (demographics + activity)]
    └──blocks if missing──> [Data Migration Script]

[Gender Field on Clients]
    └──required by──> [Demographics Tab (gender distribution chart)]
    └──populated by──> [Data Migration Script]

[Attendance Status on Sessions]
    └──enables──> [Completion Rate / Retention Metrics]
    └──independent of──> [Enrollments Table] (can be added separately)

[Data Migration Script]
    └──requires──> [Enrollments Table] (to create enrollment records for existing clients)
    └──requires──> [Gender Field on Clients] (to populate from spreadsheet)
    └──runs after──> [Schema deployed to Convex]
    └──blocks──> [Remove programDataCache dependency]
    └──blocks──> [Analytics Rewrite] (rewrite queries before removing old data)

[Analytics Rewrite (Demographics)]
    └──requires──> [Clients table has gender, ethnicity, ageGroup, zipCode]
    └──requires──> [Enrollments table has referralSource, status]
    └──replaces──> [programDataCache.getAllDemographics]
    └──safe to remove after──> [Data Migration complete + validated]

[Data Export]
    └──requires──> [Enrollments table] (to export meaningful program participation data)
    └──independent of──> [Migration] (can be built before or after)
    └──depends on──> [Admin role] (export is admin-only)

[Remove programDataCache / Sheets Sync]
    └──requires──> [Analytics Rewrite complete] (nothing should query programDataCache)
    └──requires──> [Data Migration complete] (all data now in Convex natively)
    └──affects──> [Sheets cron] (remove or repurpose)
    └──affects──> [googleSheetsConfig] (may remain for Calendar-related Google auth unification)

[Unified Google OAuth]
    └──independent of──> [Enrollments / Session model]
    └──requires──> [Remove Sheets sync for program data] (simplifies what Sheets connection is used for)
```

### Dependency Notes

- **Enrollments table is the critical path blocker.** Every other new feature either requires it or is much simpler once it exists. Schema deployment to Convex must happen before any frontend or migration work can proceed.
- **Data migration must run after schema is deployed, before the Sheets sync is removed.** The migration script creates enrollment records for every existing client. Only after validating migration results is it safe to remove the `programDataCache` dependency.
- **Analytics rewrite is a dependency on removing Sheets sync, not the reverse.** Rewrite `getAllDemographics` to use `clients` table, then remove `programDataCache` queries, then deprecate the Sheets cron for program data. Doing it out of order breaks the Demographics tab.
- **Attendance status on sessions is independent.** It adds a field to the existing sessions schema and doesn't depend on the enrollments table. It can be built in parallel with the enrollment refactor.
- **Data export is independent.** It can be built against either the old or new schema. Building against the new schema produces more useful output (includes enrollment data). Priority: build after enrollments table exists.

---

## MVP Definition

This is a structural milestone on a working app. MVP means "what makes v2.0 shippable without breaking existing functionality."

### Launch With (v2.0)

- [ ] **Enrollments table schema** — New Convex table `enrollments` with `clientId`, `programId`, `startDate`, `status`, `completedAt`, `referralSource`, `notes`. Remove `programId` direct FK from `clients`.
- [ ] **Gender field added to clients** — `gender: v.optional(v.string())` to enable Demographics analytics to query Convex instead of Sheets.
- [ ] **Attendance status on sessions** — `attendanceStatus` field with `"attended" | "missed" | "excused" | "cancelled"` enum. Defaults to `"attended"`.
- [ ] **Data migration script** — One-time script that creates an `enrollments` record for every existing client with a `programId`. Preserves existing `enrollmentDate` as `startDate`. Does NOT touch sessions, intake forms, or goals.
- [ ] **Unified client list** — `listWithPrograms` query updated to join through `enrollments` instead of `clients.programId`. Frontend `/clients` page shows all clients in one list with program names from their enrollments. Role-based filtering preserved.
- [ ] **Analytics Demographics rewrite** — `getAllDemographics` in `analytics.ts` queries `clients` table directly (not `programDataCache`). Aggregates gender, ethnicity, ageGroup, zipCode, and enrollment status/referralSource.
- [ ] **Data export** — Admin-only action that returns all clients + enrollments + session counts as JSON. Frontend converts to CSV download. Includes: name, programs, enrollment dates, session count, status, demographics fields.
- [ ] **Remove programDataCache sync** — After migration validated: remove the Sheets cron for program data, deprecate `programDataCache` table queries. Leave table in schema (Convex doesn't delete tables automatically) but stop writing to it.

### Defer to v2.1 (Post-Validation)

- [ ] **Enrollment-level session history UI** — Show sessions scoped by enrollment on client detail page. Build after `enrollmentId` FK on sessions is stable.
- [ ] **Completion tracking dashboard widget** — "X of Y clients completed the program this quarter." Requires `completedAt` data from real usage.
- [ ] **New vs. returning client KPI card** — Requires a full quarter of data in the new model to be statistically meaningful. Build once data is confirmed clean.
- [ ] **Missed session alerts** — Notify admin if client misses 3+ consecutive sessions. Requires attendance status data from real usage.

### Future Consideration (v3+)

- [ ] **Program outcome scoring** — Structured outcomes per enrollment (goal achieved, partial, not achieved) with analytics. Requires significant intake workflow changes.
- [ ] **Cohort-level analytics** — Compare program effectiveness across intake cohorts. Requires 6+ months of enrollment data.
- [ ] **HIPAA-compliant encrypted export** — Password-protected ZIP with encrypted CSVs. Only relevant if client PII sensitivity escalates.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Enrollments table schema + Convex deployment | HIGH | MEDIUM (schema change, all existing queries need review) | P1 |
| Data migration script (existing clients → enrollments) | HIGH | MEDIUM (one-time, destructive if wrong — needs validation) | P1 |
| Analytics Demographics rewrite (Convex-native) | HIGH | MEDIUM (replace Sheets-sourced aggregation with client table queries) | P1 |
| Remove programDataCache / Sheets cron for program data | HIGH | LOW (delete cron + queries — but must come after above) | P1 |
| Unified client list (multi-enrollment aware) | HIGH | MEDIUM (query rewrite + frontend update) | P1 |
| Attendance status on sessions | HIGH | LOW (add field, update create mutation) | P1 |
| Gender field on clients | MEDIUM | LOW (add optional field to schema + migration) | P1 |
| Data export (CSV download) | HIGH | LOW (frontend-only CSV generation from existing queries) | P1 |
| Enrollment-level session FK (enrollmentId on sessions) | MEDIUM | LOW (optional FK, backward compatible) | P2 |
| Session count on client detail view | MEDIUM | LOW (computed join, no schema change) | P2 |
| Unified Google OAuth (Calendar + Sheets single token) | MEDIUM | HIGH (auth flow redesign) | P2 |
| New vs. returning client metric in analytics | MEDIUM | MEDIUM (requires firstEnrolledAt or createdAt comparison) | P2 |
| Completion rate dashboard widget | LOW | MEDIUM (requires meaningful completedAt data) | P3 |

**Priority key:**
- P1: Must ship for v2.0 milestone
- P2: Should have; schedule in later phases of the same milestone
- P3: Future milestone

---

## Implementation Behavior Notes by Feature

### Session Attendance Status — Expected Behavior

Industry standard from Salesforce Nonprofit Cloud PMM and PlanStreet (human services):

- **Default statuses needed:** `attended`, `missed`, `excused`, `cancelled`
- `attended` = client was present; default for all new sessions
- `missed` = client did not show, no advance notice
- `excused` = client notified in advance, absence accepted
- `cancelled` = session itself was cancelled by staff (not client no-show)
- **Reporting implication:** Completion rate = sessions `attended` / sessions (all statuses except `cancelled`). Do not penalize clients for staff-cancelled sessions.
- **Existing records:** All sessions created before this migration have no `attendanceStatus`. Treat these as `"attended"` implicitly (they were logged as events that occurred). Do NOT backfill to avoid data quality issues.

### New vs. Returning Client — Expected Behavior

Nonprofit funders use "unduplicated participant count" as a standard grant metric:

- **New client:** `clients.createdAt` (or `firstEnrolledAt`) falls within the reporting period (e.g., this fiscal year)
- **Returning client:** Client's `firstEnrolledAt` predates the reporting period, but has at least one active enrollment during it
- **Implementation:** The simplest approach is `clients.createdAt` as `firstEnrolledAt`. When a client is first created (during migration or staff entry), `createdAt` serves as first-seen date. For historical data, migration date becomes their `createdAt`. This is acceptable — the organization did not have accurate creation dates in the spreadsheet anyway.
- **Analytics query:** Count clients where `createdAt >= periodStart` (new) vs. clients where `createdAt < periodStart AND has enrollment in period` (returning)

### Data Migration Strategy — Expected Behavior

Based on nonprofit data migration best practices (CaseWorthy, NeonOne, DataLadder):

1. **Deduplication approach:** Use firstName + lastName as the match key (same as existing `importLegalBatch` pattern). Flag conflicts for manual admin review — never silently merge.
2. **Migration is append-only:** Create `enrollments` records for existing clients. Do not delete, modify, or move any existing client records, intake forms, sessions, or goals.
3. **Validation report:** After running, output counts: clients processed, enrollment records created, clients skipped (no programId), conflicts flagged. Admin reviews before confirming.
4. **Rollback strategy:** Since migration only inserts enrollment records (no deletes), rolling back means deleting all enrollment records created by the migration run. Simple and safe.
5. **Test first:** Run migration against a small batch (10 records) and inspect results before full run. Pattern established by existing CLI scripts.
6. **Historical session count:** `legalIntakeForms.numberOfVisits` and `coparentIntakeForms.sessionsCompleted` contain historical session counts as strings. Do NOT import these as session records — they lack dates, types, and staff context. Store them as a `migrationNote` on the enrollment record for reference.

### Data Export — Expected Behavior

Standard for nonprofit backup/audit compliance:

- **Format:** CSV, not JSON or Excel. CSV opens in any tool without software dependencies. Two files: `clients.csv` and `sessions.csv` (or a single wide-format file).
- **Client export fields:** firstName, lastName, programs (pipe-delimited if multiple), enrollmentDate, status, gender, ethnicity, ageGroup, zipCode, sessionCount, createdAt
- **Session export fields:** clientName, programName, sessionDate, attendanceStatus, sessionType, notes, createdAt
- **Access:** Admin-only. The export button lives in the Admin console (existing 9-tab system, add under a new tab or existing Data section).
- **Implementation:** Convex action that returns JSON → frontend converts to CSV string → `Blob` + `URL.createObjectURL` → `<a download>` click. No server-side file generation. No storage needed — generated on demand.
- **No PII encryption required:** DEC is a social services nonprofit, not HIPAA-covered entity. Basic access control (admin role) is sufficient. If HIPAA coverage is needed in future, that is a v3 feature.
- **Size concern:** At current scale (~200-500 clients), CSV generation takes <1 second in-browser. Convex query payload is well under limits.

### Analytics Rewrite — Expected Behavior

The Demographics tab currently calls `getAllDemographics` which queries `programDataCache`. Post-migration, that table is deprecated. The rewrite:

1. **Gender distribution:** Query `clients.gender` (new field). Group and count.
2. **Ethnicity distribution:** Query `clients.ethnicity` (existing field). Group and count.
3. **Age distribution:** Query `clients.ageGroup` (existing field). Group and count.
4. **Referral source:** Query `enrollments.referralSource` (new field on enrollment) OR `legalIntakeForms.referralSource` + `coparentIntakeForms.referralSource`. The enrollment approach is cleaner for the new model.
5. **Outcome distribution:** Query `enrollments.status` (active / completed / withdrawn). This replaces the ambiguous `programOutcome` from the old spreadsheet.
6. **Zip code distribution:** Query `clients.zipCode` (existing field). Group and count.
7. **Totals:** Total clients from `clients` table. Active = clients with at least one `enrollment.status = "active"`. Completed = clients with at least one `enrollment.status = "completed"`.

The Client Activity tab (`getSessionTrends`, `getGoalStats`, `getIntakeVolume`) already queries Convex directly and requires no changes for the v2.0 milestone.

---

## Sources

- Existing codebase analysis: `convex/schema.ts`, `convex/clients.ts`, `convex/sessions.ts`, `convex/analytics.ts`, `convex/programs.ts` — HIGH confidence (direct code inspection)
- Salesforce Nonprofit Cloud Program Management data model (Programs → Enrollments → Sessions pattern): [Nonprofit Cloud Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.nonprofit_cloud.meta/nonprofit_cloud/npc_pm_data_model.htm) — MEDIUM confidence (Salesforce patterns are industry standard but their object model is more complex than DEC needs)
- PlanStreet human services attendance tracking: [Attendance Tracking for Human Services](https://www.planstreet.com/attendance-tracking-human-services-guide) — MEDIUM confidence (attendance status options validated: attended, missed, excused, cancelled are industry standard)
- Salesforce Nonprofit attendance status fields: [Trailhead - Manage Schedule Participants and Attendance](https://trailhead.salesforce.com/content/learn/modules/attendance-and-benefit-tracking-in-nonprofit-cloud-for-programs/manage-schedule-participants-and-attendance) — MEDIUM confidence (Present/Excused Absence/Unexcused Absence confirmed; mapped to DEC's attended/excused/missed)
- Nonprofit data migration best practices: [CaseWorthy — Data Migration Plan](https://caseworthy.com/articles/how-to-create-a-data-migration-plan-for-nonprofits/), [NeonOne — Donor Data Migration](https://neonone.com/resources/blog/donor-data-migration/) — MEDIUM confidence (deduplication strategy and validation report pattern validated across sources)
- Nonprofit impact metrics: [10 Metrics to Track Nonprofit Program Impact](https://blog.helpyousponsor.com/metrics-track-nonprofit-program-impact/) — MEDIUM confidence (new vs. returning, retention/dropout rate, completion rate confirmed as standard funder metrics)
- Data deduplication for imports: [DataLadder deduplication guide](https://dataladder.com/the-duplicate-data-dread-a-guide-to-data-deduplication/) — MEDIUM confidence (name+email composite key for dedup validated; DEC uses name-only which is acceptable at small scale)

---

*Feature research for: DEC DASH 2.0 — v2.0 Data Foundation Milestone*
*Researched: 2026-03-01*
