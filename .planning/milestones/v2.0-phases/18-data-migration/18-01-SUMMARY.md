---
phase: 18-data-migration
plan: 01
subsystem: database
tags: [convex, migration, internalMutation, enrollments, demographics, backfill]

# Dependency graph
requires:
  - phase: 16-schema-foundation
    provides: enrollments table schema, clients v2.0 demographic fields, sessions schema
  - phase: 17-enrollment-sessions-backend
    provides: enrollments.ts CRUD functions, sessions.ts attendance extensions
provides:
  - 350 enrollment records created linking all existing clients to their programs
  - Demographics backfilled on 345 client records from legalIntakeForms and coparentIntakeForms
  - convex/migration.ts — reusable internalMutation with dry-run/execute pattern
affects: [19-analytics-rewrite, 20-sheets-removal, 21-schema-cleanup, 22-export]

# Tech tracking
tech-stack:
  added: []
  patterns: [dry-run/execute migration pattern, internalMutation for one-time scripts, idempotent migration with existence checks]

key-files:
  created:
    - convex/migration.ts
  modified: []

key-decisions:
  - "Migration uses internalMutation (NOT mutation) so it cannot be called from frontend — safety constraint"
  - "Admin user lookup at runtime via role query — migration requires at least one admin user to exist"
  - "Idempotency via clientId+programId existence check before inserting enrollment"
  - "Status mapping uses explicit const map instead of ternary chain for clarity and exhaustiveness"
  - "Demographics backfill uses legalIntake ?? coparentIntake priority (legal data preferred where both exist)"
  - "phone field sourced from coparentIntakeForms only — legalIntakeForms has no phone field"
  - "enrollmentDate falls back to client.createdAt when client.enrollmentDate is null"
  - "All 350 clients had programId — skipped=0, confirming data integrity of existing client records"

patterns-established:
  - "Dry-run pattern: pass dryRun=true to preview migration without writing — always review before executing"
  - "Demographics backfill guard: only patch fields where client.field is falsy AND intake form has value"
  - "Per-client loop combines enrollment creation + demographics backfill in single pass (no double-iteration)"

requirements-completed: [MIGR-01, MIGR-02, MIGR-03, MIGR-04]

# Metrics
duration: 25min
completed: 2026-03-01
---

# Phase 18 Plan 01: Data Migration Summary

**350 enrollment records created + 345 client demographics backfilled via idempotent Convex internalMutation with dry-run/execute validation**

## Performance

- **Duration:** ~25 min (including human checkpoint review)
- **Started:** 2026-03-01T13:38:03Z
- **Completed:** 2026-03-01T14:03:00Z
- **Tasks:** 3 of 3 complete
- **Files modified:** 1

## Accomplishments
- Created and deployed `convex/migration.ts` with `migrateAll` internalMutation to Convex (aware-finch-86)
- Dry-run confirmed: 350 enrollments to create, 345 demographics to update, 0 skipped, 0 warnings
- Write execution succeeded: 350 enrollment records created, 345 client records updated with intake form demographics
- Idempotency verified: second dry-run showed enrollmentsCreated=0, skipped=350 — zero duplicates possible
- All 350 clients had programId (skipped=0) — confirms complete data integrity of existing client records

## Migration Results

| Metric | Dry-run | Executed |
|--------|---------|----------|
| mode | DRY-RUN | EXECUTED |
| totalClients | 350 | 350 |
| enrollmentsCreated | 350 | 350 |
| demographicsUpdated | 345 | 345 |
| skipped | 0 | 0 |
| warnings | [] | [] |

**Idempotency check (second dry-run after execution):** enrollmentsCreated=0, skipped=350 — confirmed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create convex/migration.ts with migrateAll internalMutation** - `77a2819` (feat)
2. **Task 2: Deploy to Convex and run dry-run migration** - human-action checkpoint (deploy + dry-run reviewed and approved)
3. **Task 3: Execute migration (write mode)** - human-action checkpoint (write execution confirmed + idempotency verified)

**Plan metadata:** `764c8e2` (docs: complete plan, updated after Tasks 2-3)

## Files Created/Modified
- `convex/migration.ts` — `migrateAll` internalMutation combining enrollment creation + demographics backfill in single client loop

## Decisions Made
- Migration uses `internalMutation` (not `mutation`) — cannot be invoked from frontend, must be run via CLI
- Admin user looked up dynamically by `role === "admin"` query — fails fast if no admin exists
- Status mapping: `active` -> `active`, `completed` -> `completed`, `withdrawn` -> `withdrawn` with `"active"` fallback
- Demographics fields: legalIntake takes priority over coparentIntake (`??` operator), phone only from coparentIntake
- `enrollmentDate` fallback: uses `client.enrollmentDate ?? client.createdAt` to handle records where enrollmentDate was not set
- All 350 clients had programId — the `warnings` array was empty, no orphan clients in dataset

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Migration ran cleanly on first attempt. Dry-run output matched execution output exactly.

## User Setup Required

None - all steps completed. Migration is fully executed and verified.

## Next Phase Readiness
- Every client with a `programId` now has exactly one enrollment record in the `enrollments` table
- Demographics fields (referralSource, dateOfBirth, ethnicity, zipCode, phone, email) populated on 345 of 350 client records
- Phase 19 (Analytics Rewrite) can begin — enrollment data fully populated
- Phase 20 (Sheets Removal) can proceed — enrollment-based RBAC data is present
- `convex/migration.ts` remains deployed; it is idempotent and safe to re-run if needed

---
*Phase: 18-data-migration*
*Completed: 2026-03-01*
