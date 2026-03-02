---
phase: 16-schema-foundation
plan: 01
subsystem: database
tags: [convex, schema, enrollments, clients, sessions, indexes]

# Dependency graph
requires: []
provides:
  - enrollments table in Convex schema with 5-state lifecycle (pending/active/on_hold/completed/withdrawn)
  - clients table extended with 5 demographic fields (gender, referralSource, dateOfBirth, phone, email)
  - sessions table extended with attendanceStatus (4-state), enrollmentId, duration fields
  - 5 new Convex indexes: enrollments.by_clientId, by_programId, by_status; sessions.by_enrollmentId, by_sessionDate
  - Client-Enrollment-Session relational data model foundation for Phases 17-22
affects: [17-enrollment-crud, 18-data-migration, 19-analytics-rewrite, 20-sheets-removal, 21-schema-cleanup, 22-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "v.optional() wrapping on all new fields for additive backward-compatible schema changes"
    - "5-state enrollment lifecycle: pending/active/on_hold/completed/withdrawn"
    - "enrollmentId as optional FK on sessions (allows standalone ad-hoc sessions)"
    - "dateOfBirth stored as ISO string YYYY-MM-DD (consistent with intake forms)"
    - "duration stored as minutes (integer) for grant reporting on total service hours"

key-files:
  created: []
  modified:
    - convex/schema.ts

key-decisions:
  - "enrollments.createdBy is v.id('users') (required, not optional) — enrollments always created by authenticated user"
  - "enrollments.updatedAt is v.number() (required) — needed for status change tracking"
  - "gender and referralSource use v.optional(v.string()) not union — intake data is free-form; analytics normalize at query time"
  - "sessions.enrollmentId is v.optional() — preserves support for standalone ad-hoc sessions"
  - "attendanceStatus uses 4-value union (attended/missed/excused/cancelled) — optional at schema level, enforced in Phase 17 mutations"

patterns-established:
  - "Additive schema pattern: always wrap new fields in v.optional() before data backfill"
  - "Enrollment table positioned between clients and sessions in schema.ts for logical ordering"
  - "Index naming convention: by_{fieldName} (by_clientId, by_programId, by_status)"

requirements-completed: [DMOD-01, DMOD-02, DMOD-03, DMOD-04, DMOD-05]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 16 Plan 01: Schema Foundation Summary

**Convex schema extended with enrollments table (9 fields, 3 indexes), 5 demographic fields on clients, and 3 attendance/enrollment fields + 2 indexes on sessions — all deployed to Convex dev deployment aware-finch-86**

## Performance

- **Duration:** ~2 min (schema edit) + human deploy step
- **Started:** 2026-03-01T12:53:58Z
- **Completed:** 2026-03-01
- **Tasks:** 2/2
- **Files modified:** 1 (convex/schema.ts)

## Accomplishments

- Added complete `enrollments` table establishing the Client-Enrollment-Session relational model that Phases 17-22 build upon
- Extended `clients` table with 5 optional demographic fields (gender, referralSource, dateOfBirth, phone, email) without breaking any existing client records
- Extended `sessions` table with attendanceStatus, enrollmentId, and duration fields plus 2 new indexes (by_enrollmentId, by_sessionDate) for efficient Phase 17+ queries
- Deployed all 5 new indexes to Convex: confirmed by `npx convex dev --once` output showing all 5 indexes added successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Add enrollments table and extend clients and sessions tables** - `7bd9b87` (feat)
2. **Task 2: Deploy schema to Convex** - human-executed `npx convex dev --once`, no code commit (deploy only)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `convex/schema.ts` — Added enrollments table, 5 client fields, 3 session fields, 2 session indexes; all changes additive and backward-compatible

## Decisions Made

- `enrollments.createdBy` is required `v.id("users")` (not optional) — enrollments are always created by an authenticated user; migration scripts use internalMutation with a designated admin user ID
- `gender` and `referralSource` use `v.optional(v.string())` rather than a union type — intake form data is free-form with inconsistent terminology; analytics can normalize at query time, and Phase 18 migration is simpler with strings
- `sessions.enrollmentId` is `v.optional()` — preserves support for standalone ad-hoc sessions not tied to an enrollment record
- `dateOfBirth` stored as ISO string "YYYY-MM-DD" — consistent with how intake forms store it, simplifies Phase 18 migration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Deploy confirmed all 5 new indexes added:
- `enrollments.by_clientId`
- `enrollments.by_programId`
- `enrollments.by_status`
- `sessions.by_enrollmentId`
- `sessions.by_sessionDate`

The `convex/_generated/dataModel.d.ts` file was unchanged after deploy — expected behavior when only schema structure (indexes/tables) changes and no new query/mutation functions are added.

## User Setup Required

None - no external service configuration required. Deploy was run by user (`npx convex dev --once`) as required for interactive Convex deploys.

## Next Phase Readiness

- Schema foundation is complete — all tables, fields, and indexes for the Client-Enrollment-Session model are live in Convex
- Phase 17 (Enrollment CRUD) can begin immediately: `enrollments` table exists with correct field types and indexes
- Phase 18 (Data Migration) has the target schema ready: clients demographic fields and sessions enrollment linkage are in place
- Phase 19 (Analytics Rewrite) has `by_sessionDate` index ready for date-range queries
- All existing /clients, /analytics, and other pages continue working unchanged (all new fields are v.optional)

## Self-Check: PASSED

- FOUND: convex/schema.ts
- FOUND: .planning/phases/16-schema-foundation/16-01-SUMMARY.md
- FOUND: commit 7bd9b87 (feat(16-01): add enrollments table and extend clients/sessions schema)
- VERIFIED: 8 grep matches for new schema elements in convex/schema.ts
- VERIFIED: 5 requirements marked complete (DMOD-01 through DMOD-05)
- VERIFIED: ROADMAP.md updated for Phase 16 (1 plan, 1 summary, status: Complete)

---
*Phase: 16-schema-foundation*
*Completed: 2026-03-01*
