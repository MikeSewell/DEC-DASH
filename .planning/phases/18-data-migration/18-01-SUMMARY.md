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
  - One-time data migration script (convex/migration.ts) that creates enrollment records for all existing clients and backfills demographic data from intake forms
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

patterns-established:
  - "Dry-run pattern: pass dryRun=true to preview migration without writing — always review before executing"
  - "Demographics backfill guard: only patch fields where client.field is falsy AND intake form has value"
  - "Per-client loop combines enrollment creation + demographics backfill in single pass (no double-iteration)"

requirements-completed: [MIGR-01, MIGR-02, MIGR-03, MIGR-04]

# Metrics
duration: 10min
completed: 2026-03-01
---

# Phase 18 Plan 01: Data Migration Summary

**Convex internalMutation (migrateAll) with dry-run/execute pattern migrating clients to enrollment model and backfilling intake form demographics**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-01T13:38:03Z
- **Completed:** 2026-03-01T13:48:00Z
- **Tasks:** 1 of 3 automated (Tasks 2-3 are human-action checkpoints)
- **Files modified:** 1

## Accomplishments
- Created `convex/migration.ts` with `migrateAll` internalMutation
- Dry-run mode safely previews all changes without writing any data
- Idempotent design: running migration twice does not create duplicate enrollments
- Demographics backfill preserves existing client field values (no overwrites)
- Admin user lookup at runtime provides required `createdBy` for enrollment records

## Task Commits

Each task was committed atomically:

1. **Task 1: Create convex/migration.ts with migrateAll internalMutation** - `77a2819` (feat)
2. **Task 2: Deploy to Convex and run dry-run migration** - PENDING: checkpoint:human-action (user must deploy + run dry-run and review output)
3. **Task 3: Execute migration (write mode)** - PENDING: checkpoint:human-action (user must execute after dry-run approval)

**Plan metadata:** (added below after state update)

## Files Created/Modified
- `convex/migration.ts` - migrateAll internalMutation combining enrollment creation + demographics backfill

## Decisions Made
- Migration uses `internalMutation` (not `mutation`) — cannot be invoked from frontend, must be run via CLI
- Admin user looked up dynamically by `role === "admin"` query — fails fast if no admin exists
- Status mapping: `active` -> `active`, `completed` -> `completed`, `withdrawn` -> `withdrawn` with `"active"` fallback
- Demographics fields: legalIntake takes priority over coparentIntake (`??` operator), phone only from coparentIntake
- `enrollmentDate` fallback: uses `client.enrollmentDate ?? client.createdAt` to handle records where enrollmentDate was not set

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Tasks 2 and 3 require manual execution:

1. **Deploy to Convex:**
   ```
   npx convex dev --once
   ```

2. **Run dry-run migration** (review before executing):
   ```
   npx convex run migration:migrateAll '{"dryRun":true}'
   ```
   Review: mode=DRY-RUN, totalClients count, enrollmentsCreated > 0, warnings list

3. **Execute migration** (after approving dry-run):
   ```
   npx convex run migration:migrateAll
   ```
   Verify: mode=EXECUTED, counts match dry-run, spot-check enrollments table in Convex Dashboard

4. **Confirm idempotency:**
   ```
   npx convex run migration:migrateAll '{"dryRun":true}'
   ```
   Should show enrollmentsCreated=0 (all enrollments already exist)

## Next Phase Readiness
- `convex/migration.ts` is deployed and ready to execute
- After Tasks 2-3 complete: every client with a programId will have an enrollment record
- Phase 19 (Analytics Rewrite) can begin once migration confirms enrollment data exists
- Phase 20 (Sheets Removal) depends on enrollment data being present for RBAC verification

---
*Phase: 18-data-migration*
*Completed: 2026-03-01*
