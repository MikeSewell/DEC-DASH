---
phase: 21-schema-cleanup
plan: 02
subsystem: database
tags: [convex, schema, clients, enrollments, cleanup]

# Dependency graph
requires:
  - phase: 21-01
    provides: programDataCache removed from schema, dashboard rewired to clients table
provides:
  - Clients table without programId, enrollmentDate, status fields and without by_programId index
  - All backend callers rewritten to use enrollments table as source of truth
  - Frontend Add Client form without program or status fields
  - Client detail page deriving status and enrolled date from enrollments
affects: [export, Phase 22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Enrollment-based status: all active/completed counts derived from enrollments.by_status index, not clients.status
    - Enrollment-based program info: listWithPrograms derives programName/programType from first active enrollment per client
    - Cross-table dedup: importLegalBatch/importCoparentBatch fetch all clients once outside loop for O(n) dedup

key-files:
  created: []
  modified:
    - convex/clients.ts
    - convex/programs.ts
    - convex/analytics.ts
    - convex/schema.ts
    - src/app/(dashboard)/clients/page.tsx
    - src/app/(dashboard)/clients/[id]/page.tsx

key-decisions:
  - "[21-02] clients table has no indexes — by_programId was the only one and it is removed"
  - "[21-02] importLegalBatch/importCoparentBatch programId arg removed — callers must create enrollments separately"
  - "[21-02] getStatsByProgram removes legacy programId fallback — clients with no active enrollments count as 'other' only"
  - "[21-02] getAllDemographics reuses scoped enrollment fetch for both client filter and active/completed counts (avoids duplicate query)"

patterns-established:
  - "Enrollment-based active count: query enrollments.withIndex('by_status').filter(active).map(clientId) then Set intersection"
  - "Enrollment-based programId filter: query enrollments.withIndex('by_programId') then Set filter on clients"

requirements-completed: [INFR-03]

# Metrics
duration: 10min
completed: 2026-03-02
---

# Phase 21 Plan 02: Clients Legacy Field Cleanup Summary

**Removed programId, enrollmentDate, status fields and by_programId index from clients schema — all callers rewritten to use enrollments table as source of truth**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-02T17:45:00Z
- **Completed:** 2026-03-02T17:51:16Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- clients.ts fully rewritten: 11 functions updated — list, listWithPrograms, getStats, getStatsByProgram, getByIdWithIntake, create, update, importLegalBatch, importCoparentBatch, internalCreate, getByProgram
- programs.ts rewritten: remove() checks enrollments.by_programId; getStats() counts active clients from enrollments
- analytics.getAllDemographics() uses enrollment join for programId filter and enrollment-based active/completed counts
- Schema cleaned: programId, enrollmentDate, status, by_programId index removed from clients table
- Frontend Add Client form no longer shows Program or Status fields
- Client detail page derives status and enrolled date from enrollments array

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite all backend callers** - `576d347` (feat)
2. **Task 2: Remove legacy fields from frontend and schema** - `962f17d` (feat)
3. **Task 3: Human verify checkpoint** - awaiting

## Files Created/Modified
- `convex/clients.ts` - Removed programId/enrollmentDate/status from all 11 functions; getByProgram uses enrollments.by_programId
- `convex/programs.ts` - remove() and getStats() use enrollments table instead of clients.by_programId
- `convex/analytics.ts` - getAllDemographics uses enrollment join for programId filter and active/completed counts
- `convex/schema.ts` - clients table: removed programId, enrollmentDate, status fields and by_programId index
- `src/app/(dashboard)/clients/page.tsx` - Removed programId/status from form, removed Program/Status selects, removed enrollmentDate column
- `src/app/(dashboard)/clients/[id]/page.tsx` - Removed programId/status from edit form, derives status/enrolled date from enrollments

## Decisions Made
- clients table now has no indexes at all — by_programId was the only one, it is removed
- importLegalBatch/importCoparentBatch programId arg removed — future imports must create enrollments separately after client creation
- getStatsByProgram: clients with no active enrollments now always count as "other" (legacy programId fallback removed)
- getAllDemographics: scoped enrollment fetch is reused for both client filter and active/completed counts to avoid duplicate query

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed unused Badge import and unused imports in clients/page.tsx**
- **Found during:** Task 2 (Frontend cleanup)
- **Issue:** After removing the status column and Program/Status selects, Badge and formatDate imports became unused
- **Fix:** Removed Badge import, changed utils import to remove formatDate
- **Files modified:** src/app/(dashboard)/clients/page.tsx
- **Verification:** No unused import warnings
- **Committed in:** 962f17d (Task 2 commit)

**2. [Rule 2 - Missing Critical] Removed unused programs query from client detail page**
- **Found during:** Task 2 (Frontend cleanup)
- **Issue:** After removing the Program select from the edit form, `useQuery(api.programs.list)` was fetching data never used
- **Fix:** Removed the programs query from client detail page
- **Files modified:** src/app/(dashboard)/clients/[id]/page.tsx
- **Verification:** No runtime errors, no unused query
- **Committed in:** 962f17d (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 - cleanup of now-unused imports/queries)
**Impact on plan:** Cleanup-only fixes, no scope creep.

## Issues Encountered
None — plan executed smoothly. Backend rewrites followed the plan's specified patterns exactly.

## Next Phase Readiness
- Schema deployed once user runs `npx convex dev --once` (Task 3 checkpoint)
- Phase 22 (Export) can proceed after human verification confirms client list loads, detail page shows enrollment-based data, program stats correct

---
*Phase: 21-schema-cleanup*
*Completed: 2026-03-02*

## Self-Check: PENDING (awaiting human-verify checkpoint)
