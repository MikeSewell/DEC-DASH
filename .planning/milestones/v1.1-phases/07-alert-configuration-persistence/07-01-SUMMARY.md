---
phase: 07-alert-configuration-persistence
plan: "01"
subsystem: database
tags: [convex, alerts, configuration, dismissals, rbac]

# Dependency graph
requires:
  - phase: 06-calendar-enhancements
    provides: completed v1.1 calendar enhancements; alertConfig/alertDismissals are net-new tables with no prior phase dependency
provides:
  - alertConfig singleton table in Convex schema with 5 configurable thresholds
  - alertDismissals per-user per-alertKey table in Convex schema with compound index
  - convex/alertConfig.ts with get query and update mutation (admin/manager RBAC guard)
  - convex/alertDismissals.ts with dismiss, undismiss, getMyDismissals
  - getAlerts query refactored to read dynamic thresholds (no hardcoded values)
affects:
  - phase 07-02 (frontend alert config admin tab + dismissal UI consumes alertConfig and alertDismissals)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton config table pattern: single row queried with .first(), upserted on update"
    - "Per-user dismissal filtering: getAlerts returns all alerts; getMyDismissals returns string[]; client-side filtering separates auth concerns"
    - "Inline ?? fallback defaults: config thresholds use configRow?.field ?? default instead of cross-file constant imports"

key-files:
  created:
    - convex/alertConfig.ts
    - convex/alertDismissals.ts
  modified:
    - convex/schema.ts
    - convex/alerts.ts

key-decisions:
  - "alertConfig as singleton table (not appSettings KV): typed fields, structured schema, native Convex patch semantics"
  - "Dismissal filtering is client-side in WhatNeedsAttention.tsx: keeps getAlerts a public unauthenticated query; getMyDismissals handles auth separately"
  - "Inline ?? fallbacks in alerts.ts instead of importing ALERT_DEFAULTS: avoids cross-file constant import, simpler"
  - "update mutation calls requireRole once, stores result as user variable: avoids double requireRole call from plan draft"

patterns-established:
  - "Singleton upsert: query().first() -> patch if exists, insert if not"
  - "getAuthUserId for dismissal mutations (not requireRole): any authenticated user can dismiss, not just admin/manager"

requirements-completed: [ALRT-01, ALRT-02]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 7 Plan 01: Alert Configuration & Persistence Backend Summary

**Convex alertConfig singleton + alertDismissals per-user tables with CRUD modules and dynamic threshold wiring into getAlerts**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-28T16:06:04Z
- **Completed:** 2026-02-28T16:09:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `alertConfig` and `alertDismissals` table definitions to `convex/schema.ts` with proper indexes
- Created `convex/alertConfig.ts`: `get` query returns thresholds (or defaults if no row), `update` mutation upserts with admin/manager RBAC guard
- Created `convex/alertDismissals.ts`: `dismiss` and `undismiss` mutations with idempotency guards, `getMyDismissals` query returns string[] for client-side filtering
- Refactored `convex/alerts.ts` `getAlerts` to load all 5 thresholds from `alertConfig` singleton at handler start, replacing every hardcoded value

## Task Commits

Each task was committed atomically:

1. **Task 1: Add alertConfig and alertDismissals tables to schema + create CRUD modules** - `0fe3e85` (feat)
2. **Task 2: Refactor getAlerts to read dynamic thresholds from alertConfig table** - `6b92c72` (feat)

**Plan metadata:** (docs commit — see state update below)

## Files Created/Modified

- `convex/schema.ts` - Added alertConfig and alertDismissals table definitions
- `convex/alertConfig.ts` - get query and update mutation with admin/manager RBAC
- `convex/alertDismissals.ts` - dismiss, undismiss, getMyDismissals exports
- `convex/alerts.ts` - getAlerts refactored to use dynamic config thresholds

## Decisions Made

- **Singleton upsert pattern:** `alertConfig` uses `.first()` / patch-or-insert, consistent with `quickbooksConfig` and `constantContactConfig` patterns already in the codebase.
- **Client-side dismissal filtering:** `getAlerts` remains a public query (no auth required) returning all alerts. `getMyDismissals` is a separate authenticated query returning `string[]`. Frontend filters by set difference. This keeps concerns clean and avoids adding auth to a query that other consumers may call.
- **Inline `??` fallbacks:** Thresholds in `alerts.ts` use `configRow?.deadlineWindowDays ?? 30` inline rather than importing `ALERT_DEFAULTS` from `alertConfig.ts`. Avoids potential circular dependency and keeps the file self-contained.
- **Single `requireRole` call in `update`:** Plan draft had a double `requireRole` call bug; implemented with single call storing result as `user` variable.

## Deviations from Plan

None — plan executed exactly as written (single `requireRole` call was already called out in the plan's note section and implemented correctly).

## Issues Encountered

None. Pre-existing TypeScript errors in other Convex files (allocationActions.ts, constantContactActions.ts, etc.) are out of scope — `npm run build` passes, which is the specified verification target for this plan.

## User Setup Required

None — no external service configuration required. Tables will be auto-created by Convex when `npx convex dev --once` is run (user action, not automated).

## Next Phase Readiness

- Backend foundation complete for Phase 7 Plan 02 (frontend: admin "Alerts" tab in /admin consuming `alertConfig.get`/`update`, and dismiss buttons in WhatNeedsAttention consuming `alertDismissals.dismiss`/`getMyDismissals`)
- No blockers. `npx convex dev --once` must be run interactively to deploy schema changes.

---
*Phase: 07-alert-configuration-persistence*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: convex/schema.ts
- FOUND: convex/alertConfig.ts
- FOUND: convex/alertDismissals.ts
- FOUND: convex/alerts.ts
- FOUND: .planning/phases/07-alert-configuration-persistence/07-01-SUMMARY.md
- FOUND: commit 0fe3e85 (Task 1)
- FOUND: commit 6b92c72 (Task 2)
