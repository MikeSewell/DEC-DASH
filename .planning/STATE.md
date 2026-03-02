---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Data Foundation
status: unknown
last_updated: "2026-03-02T03:19:35.248Z"
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 13
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** Phase 22 — Export (v2.0 Data Foundation)

## Current Position

Phase: 22 of 22 (Data Export — COMPLETE)
Plan: 1 of 1 in current phase — COMPLETE
Status: 22-01 complete — exportAll query added (admin-only, joins clients+enrollments+sessions), exportUtils.ts created, Export dropdown button added to clients page (admin only, skip pattern, date-stamped filenames)
Last activity: 2026-03-02 — 22-01 complete: client CSV/Excel export shipped; all XPRT requirements met; npm run build passes

Progress: [████████████] 100% (v2.0 — all plans complete)

## Accumulated Context

### Decisions

- Client → Enrollment → Session model confirmed — enrollment IS the cohort equivalent
- All new schema fields deploy as v.optional first, tightened after migration backfill
- Analytics rewrite (Phase 19) and Sheets removal (Phase 20) are co-dependent — must deploy together
- Schema cleanup (Phase 21) only after programDataCache documents are cleared
- Export ships last (Phase 22) — produces richer output with complete data model
- programOutcome maps to enrollments.completionStatus string field (design decision pending Phase 16)
- importLegalBatch and importCoparentBatch should become internalMutation after migration (Phase 18/21)
- [16-01] enrollments.createdBy is required v.id("users") — enrollments always created by authenticated user; migration uses internalMutation with admin user ID
- [16-01] gender and referralSource use v.optional(v.string()) not union — intake data is free-form; analytics normalize at query time
- [16-01] sessions.enrollmentId is v.optional() — preserves support for standalone ad-hoc sessions not tied to enrollment
- [16-01] dateOfBirth stored as ISO string "YYYY-MM-DD" — consistent with intake forms, simplifies Phase 18 migration
- [Phase 17-01]: importBatch uses internalMutation (not mutation) — not callable from frontend, required for Phase 18 CLI migration script
- [Phase 17-01]: sessions v2.0 fields (attendanceStatus, enrollmentId, duration) added as v.optional — zero breaking changes to existing callers
- [Phase 17-01]: enrollments.remove blocks deletion if linked sessions exist rather than cascading — preserves audit trail
- [Phase 18-01]: Migration uses internalMutation (not mutation) — not callable from frontend, must run via npx convex run CLI
- [Phase 18-01]: Admin user looked up dynamically by role query — migration fails fast if no admin exists
- [Phase 18-01]: Demographics backfill priority: legalIntake ?? coparentIntake (legal preferred); phone only from coparentIntake
- [Phase 18-01]: enrollmentDate fallback: client.enrollmentDate ?? client.createdAt for clients missing enrollment date
- [Phase 18-01]: Migration results — 350/350 clients had programId (skipped=0), all received enrollment records; 345/350 had intake form demographics available for backfill
- [Phase 19-01]: getAllDemographics reads clients table directly — programDataCache no longer used for demographics
- [Phase 19-01]: outcomeDistribution returns [] (no programOutcome on clients) — UI length > 0 guard hides chart automatically
- [Phase 19-01]: Ethnicity normalization at query time via ETHNICITY_MAP (not at migration time) — preserves flexibility
- [Phase 19-01]: programId filter added to getAllDemographics for All/Legal/CoParent drill-down
- [Phase 19-01]: Analytics page renamed to Programs, Operations tab removed
- [Phase 20-01]: Enrollment-based RBAC uses by_status index scan + Set intersection instead of clients.programId check — lawyer/psychologist see only clients with active enrollments in qualifying programs
- [Phase 20-01]: getStatsByProgram counts clients per enrollment type (client may appear in legal + coparent if enrolled in both); falls back to legacy programId for clients with no active enrollments
- [Phase 20-01]: getByIdWithIntake returns enriched enrollments array (programName, programType) alongside legacy program field for backward compat — removed in Phase 21
- [Phase 20-01]: Client detail intake form visibility gated by enrollment type (hasLegalEnrollment/hasCoparentEnrollment) not legacy program.type
- [Phase 20-02]: Grant sync (syncGrantTracker) preserved; only program sync (syncProgramData) removed — grant tracker reads from separate spreadsheet
- [Phase 20-02]: upsertProgramParticipant left in googleSheetsInternal.ts as dead code — Phase 21 handles cleanup
- [Phase 20-02]: sheetsStalenessHours left in alertConfig schema — Phase 21 removes it; leaving prevents schema errors
- [Phase 20-02]: Google Calendar confirmed independent — reads googleCalendarConfig table (not googleSheetsConfig); no regression
- [Phase 21-01]: [21-01] clearProgramDataCache internalMutation added to drain programDataCache before schema removal
- [Phase 21-01]: [21-01] ProgramsLegal and ProgramsCoparent rewritten to use getAllDemographics from clients table — programDataCache no longer used for dashboard demographics
- [Phase 21-01]: [21-01] avgSessions replaced with zipDistribution.length in stat cards — getAllDemographics does not compute session averages
- [Phase 21-schema-cleanup]: [21-01] clearProgramDataCache ran (deleted: 0) confirming table was already drained; schema deployed cleanly without programDataCache table
- [Phase 21-schema-cleanup]: [21-02] clients table has no indexes — by_programId was the only one and it is removed
- [Phase 21-schema-cleanup]: [21-02] importLegalBatch/importCoparentBatch programId arg removed — callers must create enrollments separately after client creation
- [Phase 21-schema-cleanup]: [21-02] Migration approach: add legacy fields as v.optional temporarily, deploy, run migration to strip values, remove fields, deploy clean schema — 350/350 documents migrated
- [Phase 21-schema-cleanup]: [21-02] INFR-03 complete — clients table accurately reflects new data model with no legacy fields
- [Phase 22]: XLSX.write uses type buffer (not array) — type array returns undefined in xlsx 0.18.5 CE
- [Phase 22]: Export query uses Convex skip pattern — never fires on page load, only when exportFormat state is non-null

### Pending Todos

- Deploy v1.3 to production (carried forward)
- Inspect cleaned master spreadsheet before writing Phase 18 import script (column names, row count, name format)

### Blockers/Concerns

- npx convex dev --once must be run interactively — schema deploys cannot be automated
- Data migration depends on user cleaning/consolidating spreadsheets first
- Phase 18 (Data Migration): RESOLVED — migration executed successfully, 350 enrollments created, idempotency confirmed
- Phase 20 (Sheets Removal): RBAC verification for lawyer/psychologist roles required before marking complete

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 22-01 — client data export (CSV + Excel) shipped; exportAll query + exportUtils + Export button; Phase 22 complete; v2.0 Data Foundation milestone DONE
Resume file: None
