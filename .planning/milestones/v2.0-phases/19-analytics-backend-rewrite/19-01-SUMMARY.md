---
phase: 19-analytics-backend-rewrite
plan: 01
subsystem: database
tags: [convex, analytics, index-scan, demographics, sessions, enrollments]

requires:
  - phase: 18-data-migration
    provides: "350 enrollment records + 345 client demographics backfilled (gender, ethnicity, ageGroup, referralSource)"
  - phase: 16-schema-extension
    provides: "enrollments.by_status and sessions.by_sessionDate indexes in schema"
  - phase: 17-enrollment-sessions-backend
    provides: "enrollments and sessions tables populated with data"

provides:
  - "Four analytics queries rewritten to use index scans — no full programDataCache or sessions table scans"
  - "getAllDemographics reads from clients table directly (Sheets dependency eliminated)"
  - "getActiveClientCount uses enrollments.by_status index + clientId deduplication"
  - "getSessionVolume uses sessions.by_sessionDate range scan"
  - "getSessionTrends uses Promise.all per-bucket by_sessionDate range scans"
  - "DemographicsTab has no Sheets config guard — renders from clients table immediately"
  - "Demographics query supports programId filter (All / Legal / Co-Parent)"
  - "Ethnicity normalized via ETHNICITY_MAP, age/ethnicity capped to top 8 + Other"
  - "Analytics page renamed to Programs, Operations tab removed"

affects:
  - phase: 20-sheets-removal
  - phase: 21-schema-cleanup

tech-stack:
  added: []
  patterns:
    - "Promise.all + per-bucket index range scans for trend queries (mirror of getIntakeVolume pattern)"
    - "clientId deduplication via Set after index equality scan on enrollments"
    - "ETHNICITY_MAP normalization — free-text intake values → standard categories at query time"

key-files:
  created: []
  modified:
    - convex/analytics.ts
    - src/components/analytics/DemographicsTab.tsx
    - src/app/(dashboard)/analytics/page.tsx

key-decisions:
  - "getAllDemographics reads clients table directly — programDataCache removed as data source for demographics"
  - "outcomeDistribution returns [] (no programOutcome on clients table) — UI length > 0 guard hides chart automatically"
  - "Ethnicity normalization done at query time in Convex, not at migration time — flexible for future intake variations"
  - "programId filter added to getAllDemographics args — All/Legal/CoParent pills in Demographics UI"
  - "Analytics page renamed to Programs — better reflects nonprofit's primary domain focus"
  - "Operations tab removed — audit log UI considered separate concern from program analytics"

patterns-established:
  - "Index range scan pattern for session/enrollment trend queries: Promise.all over getLast12Months() buckets with .withIndex().collect()"
  - "Demographics normalization at query time via lookup map (not at migration time)"

requirements-completed: [ANLY-01, ANLY-02, ANLY-03]

duration: ~65min
completed: 2026-03-01
---

# Phase 19 Plan 01: Analytics Backend Rewrite Summary

**Four analytics queries rewritten to use Convex index scans, demographics migrated from programDataCache to clients table, DemographicsTab decoupled from Sheets config, and Analytics page redesigned with program filter pills**

## Performance

- **Duration:** ~65 min
- **Started:** 2026-03-01T14:21:24Z
- **Completed:** 2026-03-01T15:26:00Z
- **Tasks:** 3 (including human-verify)
- **Files modified:** 3

## Accomplishments

- Four Convex query handlers rewritten to use index scans — `programDataCache` Sheets dependency eliminated from analytics
- `getActiveClientCount` now counts unique clients from `enrollments.by_status=active` index (not `clients.status` which is being deprecated)
- `getSessionVolume` and `getSessionTrends` use `sessions.by_sessionDate` range scans (no more full table collects)
- `DemographicsTab.tsx` fully decoupled from Google Sheets — renders immediately from 350 migrated client records
- Post-checkpoint enhancements: programId filter pills (All/Legal/Co-Parent), ethnicity normalization via ETHNICITY_MAP, page renamed to Programs, Operations tab removed

## Task Commits

1. **Task 1: Rewrite four analytics queries** - `3e983eb` (feat)
2. **Task 2: Remove Sheets config guard from DemographicsTab** - `57affe9` (feat)
3. **Task 3: Human verify + post-checkpoint redesign** - `9ea8ac2` (feat)

## Files Created/Modified

- `convex/analytics.ts` — Four queries rewritten: getActiveClientCount, getSessionVolume, getSessionTrends, getAllDemographics (+ programId filter arg added post-checkpoint)
- `src/components/analytics/DemographicsTab.tsx` — Sheets guard removed; full redesign with program filter pills, ethnicity normalization, improved chart layout
- `src/app/(dashboard)/analytics/page.tsx` — Renamed to Programs, Operations tab removed

## Decisions Made

- `getAllDemographics` reads `clients` table directly — `programDataCache` removed as data source
- `outcomeDistribution` returns `[]` — no `programOutcome` on clients; UI `length > 0` guard hides chart automatically
- Ethnicity normalization at query time via `ETHNICITY_MAP` (not at migration time) — preserves flexibility
- `programId` filter added to `getAllDemographics` args for All/Legal/CoParent drill-down
- Page renamed "Analytics" → "Programs" — better domain focus for nonprofit dashboard
- Operations tab removed — audit log is a separate admin concern, not program analytics

## Deviations from Plan

None — plan executed as written. Post-checkpoint improvements (programId filter, ethnicity normalization, page rename, Operations tab removal) were user-initiated enhancements committed separately by the user.

## Issues Encountered

Pre-existing TypeScript errors in `allocationActions.ts`, `auth.ts`, `constantContactActions.ts`, `grants.ts`, and `kbInsightsActions.ts` appeared in `npx tsc --noEmit` output — confirmed as pre-existing, out of scope for this plan. `convex/analytics.ts` itself has zero TypeScript errors. `npx convex dev --once` and `npm run build` both passed cleanly.

## User Setup Required

None — no external service configuration required. Convex deployed to `aware-finch-86`.

## Next Phase Readiness

- Phase 19 verified and cleared — analytics queries no longer depend on `programDataCache` or Sheets
- Phase 20 (Sheets Removal) can proceed: remove Sheets sync cron, clear `programDataCache` table
- Phase 21 (Schema Cleanup) follows after `programDataCache` documents are cleared

---
*Phase: 19-analytics-backend-rewrite*
*Completed: 2026-03-01*
