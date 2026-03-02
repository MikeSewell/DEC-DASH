---
phase: 20-frontend-and-sheets-removal
plan: "02"
subsystem: infra
tags: [google-sheets, convex, admin-ui, alerts, cron, cleanup]

# Dependency graph
requires:
  - phase: 19-analytics-rewrite
    provides: programDataCache no longer read by analytics — safe to remove Sheets program sync
  - phase: 20-01
    provides: enrollment-based RBAC — client/program data sourced from Convex tables directly
provides:
  - Sheets program sync removed from cron (runSync only calls syncGrantTracker)
  - syncProgramData function deleted from googleSheetsActions.ts
  - triggerSync action trimmed to grant-only
  - Google Sheets tab removed from admin UI
  - Sheets staleness alert (Section E) deleted from alerts.ts
  - GoogleSheetsConfig.tsx component deleted
  - Google Calendar widget confirmed independent of Sheets config
affects: [21-schema-cleanup, admin-pages, alerts-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dead infrastructure removal: delete sync code, UI tab, and alert check together atomically"
    - "Calendar independence confirmed: googleCalendarConfig table distinct from googleSheetsConfig"

key-files:
  created: []
  modified:
    - convex/googleSheetsSync.ts
    - convex/googleSheetsActions.ts
    - convex/alerts.ts
    - src/app/(dashboard)/admin/page.tsx
  deleted:
    - src/components/admin/GoogleSheetsConfig.tsx

key-decisions:
  - "Grant sync (syncGrantTracker) preserved — only program sync (syncProgramData) removed"
  - "upsertProgramParticipant left in googleSheetsInternal.ts as dead code — Phase 21 handles cleanup"
  - "sheetsStalenessHours left in alertConfig schema — Phase 21 cleans up schema fields"
  - "Google Calendar reads googleCalendarConfig table (not googleSheetsConfig) — architecturally independent, no regression"

patterns-established:
  - "Remove dead infrastructure in one atomic commit: cron + action + alert + UI tab + component file"

requirements-completed: [INFR-01, INFR-04, INFR-05, INFR-06]

# Metrics
duration: 15min
completed: 2026-03-01
---

# Phase 20 Plan 02: Sheets Program Sync Removal Summary

**Google Sheets program sync excised from cron, action, alerts, and admin UI; grant sync and Calendar widget preserved and human-verified**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-01
- **Completed:** 2026-03-01
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 4 modified, 1 deleted

## Accomplishments
- Stripped `syncProgramData` calls from `runSync` cron handler — only `syncGrantTracker` remains
- Deleted `syncProgramData` internalAction from `googleSheetsActions.ts`; trimmed `triggerSync` to grant-only
- Deleted Section E (Sheets staleness check) from `alerts.ts` — no more false "Sheets is stale" warnings
- Removed Google Sheets tab (type union, TABS entry, switch case, import) from admin page
- Deleted `GoogleSheetsConfig.tsx` component entirely
- Human-verified: `/admin` shows no Sheets tab, Calendar widget shows events, no Sheets alert

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove Sheets program sync from cron, action, and alerts; clean up admin UI** - `19da4a9` (feat)
2. **Task 2: Verify Sheets removal and Calendar independence** - human-verify checkpoint (approved, no code change)

**Plan metadata:** (docs commit — see final commit hash)

## Files Created/Modified
- `convex/googleSheetsSync.ts` — runSync now only calls syncGrantTracker; syncProgramData try/catch removed
- `convex/googleSheetsActions.ts` — syncProgramData function deleted; triggerSync trimmed to grant-only
- `convex/alerts.ts` — Section E (ALRT-03 Sheets staleness) deleted entirely
- `src/app/(dashboard)/admin/page.tsx` — AdminTab type, TABS array, renderTabContent switch case, import all cleaned
- `src/components/admin/GoogleSheetsConfig.tsx` — **DELETED** (no longer imported anywhere)

## Decisions Made
- Grant sync (`syncGrantTracker`) preserved — only the dead program sync was removed
- `upsertProgramParticipant` left in `googleSheetsInternal.ts` as dead code — Phase 21 handles schema/dead code cleanup
- `sheetsStalenessHours` field left in `alertConfig` schema — prevents schema errors; Phase 21 removes it
- Calendar widget independence confirmed by architecture review: `googleCalendarSync.ts` reads `googleCalendarConfig` table, not `googleSheetsConfig` — removing Sheets config has zero effect on Calendar

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — all four files edited cleanly, Convex and Next.js builds passed, human verification approved.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 20 complete — enrollment RBAC rewritten (plan 01) and Sheets program sync removed (plan 02)
- Phase 21 (schema cleanup) can now proceed: `programDataCache` documents can be cleared, `sheetsStalenessHours` schema field can be removed, `upsertProgramParticipant` dead code can be deleted
- Concern carried forward: RBAC verification for lawyer/psychologist roles (viewing only enrolled clients) should be confirmed before Phase 21

---
*Phase: 20-frontend-and-sheets-removal*
*Completed: 2026-03-01*

## Self-Check: PASSED
- FOUND: `.planning/phases/20-frontend-and-sheets-removal/20-02-SUMMARY.md`
- FOUND: commit `19da4a9` (Task 1 — feat(20-02): remove Sheets program sync)
