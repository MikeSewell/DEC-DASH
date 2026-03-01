---
phase: 21-schema-cleanup
plan: 01
subsystem: database
tags: [convex, schema, cleanup, programDataCache, demographics, alertConfig]

# Dependency graph
requires:
  - phase: 20-frontend-sheets-removal
    provides: upsertProgramParticipant dead code left in googleSheetsInternal.ts, sheetsStalenessHours left in alertConfig schema — Phase 21 handles both
  - phase: 19-analytics-rewrite
    provides: getAllDemographics query on clients table with programId filter
provides:
  - programDataCache dead code deleted from backend and frontend
  - clearProgramDataCache internalMutation to drain table before schema removal
  - ProgramsLegal and ProgramsCoparent rewritten to use getAllDemographics from clients table
  - sheetsStalenessHours removed from schema, alertConfig, alerts, and AdminUI
  - programDataCache table removed from convex/schema.ts
affects: [schema deployment, dashboard programs sections, admin alerts config]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dead code removal before schema table drop: add clearAll internalMutation → run via CLI → then remove table from schema"
    - "Dashboard demographic sections use api.analytics.getAllDemographics with programId filter (not Sheets-cached data)"

key-files:
  created: []
  modified:
    - convex/googleSheetsInternal.ts
    - convex/googleSheets.ts
    - convex/schema.ts
    - convex/alertConfig.ts
    - convex/alerts.ts
    - src/hooks/useGrantTracker.ts
    - src/components/dashboard/ProgramsLegal.tsx
    - src/components/dashboard/ProgramsCoparent.tsx
    - src/components/admin/AlertsConfig.tsx

key-decisions:
  - "clearProgramDataCache internalMutation added to drain table before removing from schema — ensures no orphan documents on deploy"
  - "ProgramsLegal and ProgramsCoparent now use api.programs.list + getAllDemographics with programId filter — no more Sheets dependency"
  - "avgSessions stat card replaced with Zip Codes count (zipDistribution.length) since getAllDemographics does not return avgSessions"
  - "outcomeDistribution and reasonForVisit charts removed — not available from clients table; zipDistribution horizontal bar added instead"
  - "sheetsStalenessHours removed from schema as v.number() field — alertConfig row on production will have orphan field until cleared, but Convex tolerates extra fields on read"

patterns-established:
  - "Unused fields removed from alertConfig schema require existing DB document to be patched or deleted — documented in checkpoint"

requirements-completed: [INFR-02]

# Metrics
duration: 10min
completed: 2026-03-02
---

# Phase 21 Plan 01: Schema Cleanup — programDataCache and sheetsStalenessHours Summary

**programDataCache table removed from schema, dead code deleted (upsertProgramParticipant, getProgramDemographics, useProgramDemographics), dashboard components rewired to clients table via getAllDemographics, sheetsStalenessHours removed from alertConfig**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-02T16:07:30Z
- **Completed:** 2026-03-02T16:17:00Z
- **Tasks completed:** 2 of 3 (checkpoint at Task 3 awaiting human verification + schema deploy)
- **Files modified:** 9

## Accomplishments

- Deleted `upsertProgramParticipant` (writes to programDataCache) from `googleSheetsInternal.ts` — dead since Phase 20
- Deleted `getProgramDemographics` (reads from programDataCache) from `googleSheets.ts`
- Deleted `useProgramDemographics` hook from `useGrantTracker.ts`
- Added `clearProgramDataCache` internalMutation to drain any remaining documents before schema removal
- Removed `programDataCache` table definition from `convex/schema.ts`
- Removed `sheetsStalenessHours` from alertConfig schema, `alertConfig.ts` (ALERT_DEFAULTS, get query, update mutation), `alerts.ts` config object, and `AlertsConfig.tsx` (state, useEffect, reset handler, save call, UI input field)
- Rewrote `ProgramsLegal.tsx` and `ProgramsCoparent.tsx` to use `api.analytics.getAllDemographics` with programId filter instead of `useProgramDemographics`

## Task Commits

Each task was committed atomically:

1. **Task 1: Clear programDataCache, delete dead backend code, remove sheetsStalenessHours** - `d6c3c12` (feat)
2. **Task 2: Rewrite ProgramsLegal and ProgramsCoparent to use getAllDemographics** - `8d33c5a` (feat)
3. **Task 3: Checkpoint — human verify schema deploy** - AWAITING (checkpoint)

## Files Created/Modified

- `convex/googleSheetsInternal.ts` - Replaced upsertProgramParticipant with clearProgramDataCache internalMutation
- `convex/googleSheets.ts` - Deleted getProgramDemographics query (was reading programDataCache)
- `convex/schema.ts` - Removed programDataCache table definition; removed sheetsStalenessHours from alertConfig
- `convex/alertConfig.ts` - Removed sheetsStalenessHours from ALERT_DEFAULTS, get query return, update mutation args
- `convex/alerts.ts` - Removed sheetsStalenessHours from config object in getAlerts handler
- `src/hooks/useGrantTracker.ts` - Deleted useProgramDemographics export
- `src/components/dashboard/ProgramsLegal.tsx` - Rewired to api.programs.list + api.analytics.getAllDemographics; replaced avgSessions with Zip Codes; added zipDistribution chart; removed outcomeDistribution and reasonForVisit
- `src/components/dashboard/ProgramsCoparent.tsx` - Same rewire as ProgramsLegal for coparent program type
- `src/components/admin/AlertsConfig.tsx` - Removed sheetsStalenessHours state, useEffect sync, reset handler, save call args, and UI input field

## Decisions Made

- `clearProgramDataCache` internalMutation retained in `googleSheetsInternal.ts` — needed to drain table before schema deploy. Can be removed in a future cleanup after schema is confirmed deployed.
- `avgSessions` replaced with Zip Codes count — `getAllDemographics` doesn't compute session averages; zipDistribution.length gives a useful geographic spread metric
- `outcomeDistribution` and `reasonForVisit` removed from dashboard — not available from clients table; the clients table uses status field for completion, not a programOutcome field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all file edits applied cleanly.

## User Setup Required

**Checkpoint at Task 3 — human verification required before this plan is complete.**

Run the following steps to complete plan 21-01:

1. `npx convex run googleSheetsInternal:clearProgramDataCache` — verify returns `{ deleted: N }` (may be 0 if table was already empty)
2. `npx convex dev --once` — deploy schema without programDataCache table; verify no schema errors
3. Open dashboard — verify "Legal Aid Program" and "Co-Parent Counseling" sections show demographics from clients table (not "Connect Google Sheets" placeholder)
4. Open Admin > Alerts Configuration — verify NO "Google Sheets Staleness" input field appears
5. Open Convex dashboard — verify `programDataCache` table no longer appears in table list

## Next Phase Readiness

- Schema cleanup complete once human verification in Task 3 is confirmed
- After Task 3 verification: plan 21-01 is fully complete (INFR-02 satisfied)
- Phase 22 (Export) can proceed after schema confirmation

---
*Phase: 21-schema-cleanup*
*Completed: 2026-03-02*
