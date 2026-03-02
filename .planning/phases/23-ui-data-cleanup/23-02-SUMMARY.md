---
phase: 23-ui-data-cleanup
plan: 02
subsystem: database
tags: [xlsx, convex, import, clients, enrollments, programs, data-migration]

requires:
  - phase: 23-01
    provides: Programs table without isActive field (schema change)

provides:
  - scripts/importMaster.ts: master spreadsheet import script (idempotent)
  - 428 total clients in Convex (78 net new from this import)
  - Enrollments linking clients to legal/coparent programs
  - enrollments.importEnrollmentBatch: public CLI-safe enrollment batch mutation
  - programs.removeIsActive: internal migration mutation for deprecated field cleanup

affects: [clients-page, analytics, programs, demographics-charts]

tech-stack:
  added: []
  patterns:
    - "Split-by-program import: single xlsx with Program column routes rows to legal vs coparent"
    - "Two-pass enrollment: import clients first, then batch-create enrollments by name lookup"
    - "Schema migration: add optional field → deploy → patch data → remove field → redeploy"

key-files:
  created:
    - scripts/importMaster.ts
  modified:
    - convex/enrollments.ts
    - convex/programs.ts

key-decisions:
  - "Program routing by 'Program' column value: 'Father Intake' → legal, 'Co-parenting Session' → coparent"
  - "Deduplication by firstName+lastName (case-insensitive) — matches importLegalBatch/importCoparentBatch pattern"
  - "importEnrollmentBatch uses ctx.db.query('users').first() for createdBy — system import placeholder"
  - "300 duplicate rows in file are expected (633 rows, 333 unique names) — dedup handled in-script before batch"

patterns-established:
  - "Public importEnrollmentBatch mutation: no-auth batch enrollment for CLI scripts, deduplicates by clientId+programId pair"
  - "Schema migration pattern: isActive field removed via optional→patch→remove cycle to avoid breaking live deploys"

requirements-completed: [DATA-01]

duration: 35min
completed: 2026-03-02
---

# Phase 23 Plan 02: Master Spreadsheet Import Summary

**Imported 633-row master xlsx (333 unique clients) into Convex via program-routing import script — 78 net new clients created, all with active enrollments in correct programs**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-02T12:30:00Z
- **Completed:** 2026-03-02T12:36:33Z
- **Tasks:** 2 (Task 1 checkpoint resolved, Task 2 auto)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Built `scripts/importMaster.ts` that reads `merged_output_2026-03-01.xlsx` (633 rows), splits by Program column, deduplicates by name, and batch-imports clients + enrollments
- 428 total clients now in Convex (was 350) — 74 new legal + 4 new coparent clients imported
- All new clients have active enrollments linking them to the correct Legal Aid Program or Co-Parent Counseling program
- Script is fully idempotent: second run shows 0 created, all skipped
- Fixed blocking schema validation error: `isActive` field persisted in live programs documents from before Phase 23-01 removed it from schema — resolved via migration cycle

## Task Commits

1. **Task 1: User provides master spreadsheet** — checkpoint resolved (file at `scripts/merged_output_2026-03-01.xlsx`)
2. **Task 2: Build and run the master spreadsheet import script** — `8f0090f` (feat)

## Files Created/Modified

- `scripts/importMaster.ts` - Master import script: reads xlsx, routes by Program column, deduplicates, batch-imports clients + enrollments
- `convex/enrollments.ts` - Added `importEnrollmentBatch` public mutation for CLI enrollment import (no auth, deduplicates by clientId+programId)
- `convex/programs.ts` - Added `removeIsActive` internal migration mutation to strip deprecated `isActive` field from existing program documents

## Decisions Made

- **Program routing by column value:** "Father Intake" maps to `legal` type, "Co-parenting Session" maps to `coparent` type — straightforward substring match
- **300 file duplicates are expected:** The 633-row file has 333 unique names (300 duplicates from multiple session sign-ins). Dedup within-script before batching to Convex.
- **Two-pass enrollment:** Import clients first via existing `importLegalBatch`/`importCoparentBatch` mutations, then create enrollments via new `importEnrollmentBatch`. This reuses existing dedup logic in the batch mutations.
- **System user for createdBy:** `importEnrollmentBatch` uses `ctx.db.query("users").first()` as the enrollment's `createdBy` — acceptable for bulk CLI import where no real user is acting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Convex schema validation blocking deployment**
- **Found during:** Task 2 (deploying `importEnrollmentBatch` mutation)
- **Issue:** `npx convex dev --once` failed with schema validation error — existing programs documents had `isActive: true` field but Phase 23-01 had removed it from the schema definition. Convex validates all existing documents on deploy.
- **Fix:** Three-step migration: (1) added `isActive: v.optional(v.boolean())` back to schema to allow deployment, (2) deployed, (3) ran `npx convex run programs:removeIsActive` to patch both program documents, (4) removed `isActive` from schema, (5) redeployed cleanly.
- **Files modified:** `convex/schema.ts` (temporary optional add then remove), `convex/programs.ts` (added `removeIsActive` migration)
- **Verification:** `npx convex dev --once` succeeded after migration; both programs confirmed clean via API query
- **Committed in:** `8f0090f` (included in Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking schema validation)
**Impact on plan:** Fix was essential to deploy any Convex function. Migration pattern is standard for Convex schema evolution. No scope creep.

## Issues Encountered

- **isActive in live data:** Phase 23-01 removed `isActive` from schema.ts but did not patch existing documents. This is a known Convex gotcha — schema validation runs against all existing data on every deploy, so stale fields in documents break deployments even if the schema considers them unknown.

## User Setup Required

None — import ran automatically via CLI. No external service configuration needed.

## Next Phase Readiness

- 428 clients now in Convex with correct program enrollments — `/clients` page shows real data
- All data is importable again from the same xlsx file (idempotent script can be re-run safely)
- Phase 24 (UI polish) can proceed with real client data populating charts and tables
- Consider: some older clients (pre-import) may be missing ethnicity if they were imported via earlier scripts that didn't capture the field

---
*Phase: 23-ui-data-cleanup*
*Completed: 2026-03-02*
