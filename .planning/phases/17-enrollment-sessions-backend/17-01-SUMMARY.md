---
phase: 17-enrollment-sessions-backend
plan: 01
subsystem: database
tags: [convex, enrollments, sessions, crud, audit-log, rbac, internalMutation]

# Dependency graph
requires:
  - phase: 16-schema-foundation
    provides: enrollments table schema, sessions.enrollmentId/attendanceStatus/duration fields, by_enrollmentId index
provides:
  - enrollments.ts with 7 exports (listByClient, listByProgram, getById, create, update, remove, importBatch)
  - sessions.create extended with attendanceStatus, enrollmentId, duration optional args
  - sessions.listByEnrollment query using by_enrollmentId index
  - internalMutation importBatch for Phase 18 migration script
affects:
  - 17-18-data-migration
  - 17-20-frontend

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "internalMutation for batch import with clientId+programId dedup returning { created, skipped }"
    - "requireRole guard on all public mutations (admin/manager/staff for create/update, admin-only for remove)"
    - "auditLog.log called on every public mutation with action/entityType/entityId/details"
    - "Sparse update pattern: build Record<string,unknown> with only non-undefined fields + updatedAt"

key-files:
  created:
    - convex/enrollments.ts
  modified:
    - convex/sessions.ts

key-decisions:
  - "importBatch uses internalMutation (not mutation) — not callable from frontend, required for Phase 18 CLI migration"
  - "Dedup in importBatch by clientId+programId: query by_clientId index then filter by programId in JS (avoids compound index requirement)"
  - "remove blocks deletion with linked sessions rather than cascading — preserves audit trail integrity"
  - "All three new sessions.create args are v.optional — zero breaking changes to existing frontend callers"

patterns-established:
  - "Pattern 1: All enrollment public mutations call requireRole(ctx, 'admin', 'manager', 'staff'); remove is admin-only"
  - "Pattern 2: importBatch internalMutation pattern — no auth, dedup by domain key, returns { created, skipped }"
  - "Pattern 3: sessions v2.0 fields appended as optional args with inline comment marking Phase 17 addition"

requirements-completed: [CLNT-04, CLNT-05]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 17 Plan 01: Enrollment Sessions Backend Summary

**Convex enrollment CRUD (7 functions) + sessions attendance extension with backward-compatible optional v2.0 fields, RBAC, and audit logging — ready for Phase 18 migration**

## Performance

- **Duration:** ~2 min (coding only; Convex deploy pending human action)
- **Started:** 2026-03-01T13:15:30Z
- **Completed:** 2026-03-01T13:17:04Z (Tasks 1-2; Task 3 awaiting deploy)
- **Tasks:** 2/3 complete (Task 3 is checkpoint:human-action for `npx convex dev --once`)
- **Files modified:** 2

## Accomplishments

- Created `convex/enrollments.ts` with 7 exports: 3 queries (listByClient, listByProgram, getById), 3 mutations (create, update, remove), 1 internalMutation (importBatch)
- All 3 public mutations enforce RBAC via requireRole and write audit log entries
- importBatch deduplicates by clientId+programId and returns { created, skipped } for Phase 18 migration script
- Extended `convex/sessions.ts`: sessions.create accepts attendanceStatus, enrollmentId, duration as optional fields (zero breaking changes); new listByEnrollment query using by_enrollmentId index

## Task Commits

Each task was committed atomically:

1. **Task 1: Create convex/enrollments.ts with CRUD + importBatch** - `5559d4c` (feat)
2. **Task 2: Extend sessions.ts with attendance fields and listByEnrollment** - `bec6c28` (feat)
3. **Task 3: Deploy to Convex** - PENDING (checkpoint:human-action — user runs `npx convex dev --once`)

## Files Created/Modified

- `convex/enrollments.ts` - New file: enrollment CRUD queries/mutations, importBatch internalMutation
- `convex/sessions.ts` - Extended: v2.0 fields added to create, listByEnrollment query added

## Decisions Made

- **importBatch as internalMutation**: Follows the same pattern as grantsInternal.ts — not callable from the frontend, safe for CLI migration scripts that bypass auth.
- **Dedup strategy in importBatch**: Query by_clientId index, then filter by programId in JavaScript. Avoids needing a compound index; acceptable for migration batch size.
- **remove blocks on linked sessions**: Rather than cascading delete, throws an error if sessions exist. Preserves audit trail and forces explicit cleanup.
- **sessions v2.0 fields all optional**: attendanceStatus, enrollmentId, duration added as v.optional — existing sessions.create callers (none in src/ currently) will continue to work unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Task 3 requires manual deployment.** Run the following command in the project directory:

```bash
npx convex dev --once
```

Expected output:
- New functions registered: enrollments.listByClient, enrollments.listByProgram, enrollments.getById, enrollments.create, enrollments.update, enrollments.remove, enrollments.importBatch
- Updated function: sessions.create (new args), sessions.listByEnrollment (new query)
- No schema changes (schema was deployed in Phase 16)

After deploy, commit the updated `convex/_generated/api.d.ts`.

## Next Phase Readiness

- **Phase 18 (Data Migration)**: `enrollments.importBatch` internalMutation is ready for the migration CLI script. Schema deployed in Phase 16. Migration script needs the cleaned master spreadsheet first (per STATE.md pending todo).
- **Phase 20 (Frontend)**: enrollment queries and mutations available for client detail views and enrollment management UI.
- **Blocker**: `npx convex dev --once` must be run by user to register new functions in Convex deployment before Phase 18 or 20 can use them.

---
*Phase: 17-enrollment-sessions-backend*
*Completed: 2026-03-01*
