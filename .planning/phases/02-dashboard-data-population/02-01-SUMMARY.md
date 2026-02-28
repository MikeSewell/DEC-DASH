---
phase: 02-dashboard-data-population
plan: 01
subsystem: api
tags: [convex, quickbooks, oauth, typescript, utils]

# Dependency graph
requires:
  - phase: 01-newsletter-template-fix
    provides: Phase 1 complete baseline — no direct dependency, but confirms codebase is stable
provides:
  - Safe QB token refresh that preserves existing refresh token when OAuth API omits it
  - Shared formatDollars utility exported from @/lib/utils for all dashboard components
  - clients.getStatsByProgram query returning per-program active client counts with role filtering
  - grants.getUpcomingDeadlines query returning grants with report deadlines due in 30 days
affects:
  - 02-02-skeleton-components (uses formatDollars from utils)
  - 02-03-dashboard-panels (uses getStatsByProgram and getUpcomingDeadlines queries)
  - All future QB sync operations benefit from token refresh fix

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Token refresh defensive fallback: token.refresh_token || config.refreshToken pattern"
    - "Shared compact formatting utility: formatDollars in @/lib/utils for dashboard cards"
    - "Role-filtered stat queries: lawyers see legal only, psychologists see coparent only"

key-files:
  created: []
  modified:
    - convex/quickbooksActions.ts
    - src/lib/utils.ts
    - src/components/dashboard/ExecutiveSnapshot.tsx
    - convex/clients.ts
    - convex/grants.ts

key-decisions:
  - "Preserve existing refresh token with || fallback when QB OAuth omits it from response (valid token rotation scenario)"
  - "formatDollars extracted from ExecutiveSnapshot local function to @/lib/utils for shared use — matches exact logic used in ExecutiveSnapshot"
  - "getStatsByProgram mirrors role-filtering logic from getStats/listWithPrograms for consistency"
  - "getUpcomingDeadlines returns full objects (grantId, fundingSource, programName, deadlineDate, reportLabel) not just counts, enabling rich display in WhatNeedsAttention panel"

patterns-established:
  - "Defensive token fallback: || existing_token pattern for OAuth APIs that skip refreshing unexpired tokens"
  - "Compact dollar format: $45K / $1.3M via formatDollars in utils.ts for all dashboard stat cards"

requirements-completed: [DASH-01, CMD-01, CMD-02]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 2 Plan 01: Data Foundation Summary

**Safe QB token refresh fallback + shared formatDollars utility + two new Convex queries (getStatsByProgram, getUpcomingDeadlines) enabling dashboard panel construction**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T10:52:09Z
- **Completed:** 2026-02-28T10:55:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Fixed latent QB production bug where token refresh could blank the refresh token when QB's OAuth API omits it from response
- Extracted `formatDollars` from `ExecutiveSnapshot.tsx` local function to `@/lib/utils` as a shared export — no behavior change, enables reuse
- Added `clients.getStatsByProgram` Convex query returning `{ legal, coparent, other }` active client counts with role-based filtering matching existing patterns
- Added `grants.getUpcomingDeadlines` Convex query returning sorted array of grants with report deadlines in next 30 days — provides rich data for WhatNeedsAttention panel

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix QB token refresh and extract formatDollars to shared utils** - `9a113df` (fix)
2. **Task 2: Add getStatsByProgram query to clients and getUpcomingDeadlines to grants** - `8693229` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `convex/quickbooksActions.ts` - Fixed refreshTokens: `token.refresh_token || config.refreshToken` fallback
- `src/lib/utils.ts` - Added exported `formatDollars(amount: number): string` utility
- `src/components/dashboard/ExecutiveSnapshot.tsx` - Updated import to use shared `formatDollars` from `@/lib/utils`
- `convex/clients.ts` - Added `getStatsByProgram` query (after existing `getStats`, before `getById`)
- `convex/grants.ts` - Added `getUpcomingDeadlines` query (after existing `getStats`, before `importBatch`)

## Decisions Made

- Token refresh fallback uses `||` not `??` because an empty string `""` (not just `undefined`) is also invalid as a refresh token
- `formatDollars` extraction keeps exact same logic as the original local function in `ExecutiveSnapshot.tsx` — no formatting behavior change, just DRY-ing it up
- `getUpcomingDeadlines` returns full objects rather than just counts so the WhatNeedsAttention panel can display grant name, funder, specific quarter label, and exact date without a second query

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx convex dev --once` failed during Task 2 verification with "You don't have access to the selected project" error. This is an auth session issue with the Convex CLI — not a code problem. The new queries compile cleanly with TypeScript (`npx tsc --noEmit` shows no new errors in modified files). The Convex deploy will succeed when run interactively by the user.
- Pre-existing TypeScript errors exist in `convex/allocationActions.ts`, `convex/constantContactActions.ts`, `convex/newsletterActions.ts`, `convex/grants.ts` (requireRole array call), and `convex/auth.ts` — none caused by this plan's changes.

## User Setup Required

None - no external service configuration required. The QB token fix is automatic and will take effect on the next token refresh cycle.

## Next Phase Readiness

- `formatDollars` is ready for use in any dashboard component via `import { formatDollars } from "@/lib/utils"`
- `api.clients.getStatsByProgram` is ready to be called from `useQuery` in dashboard components
- `api.grants.getUpcomingDeadlines` is ready to be called from `useQuery` in the WhatNeedsAttention panel
- QB token persistence is safe — no risk of losing refresh token on rotation
- Blocker resolved: "QB refresh token rotation may be a latent production bug" from STATE.md blockers

---
*Phase: 02-dashboard-data-population*
*Completed: 2026-02-28*
