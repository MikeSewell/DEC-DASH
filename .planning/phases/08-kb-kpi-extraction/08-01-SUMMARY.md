---
phase: 08-kb-kpi-extraction
plan: 01
subsystem: database
tags: [convex, openai, gpt-4o, json-schema, knowledge-base, kpi-extraction]

# Dependency graph
requires:
  - phase: 08-kb-kpi-extraction
    provides: knowledge base file storage (knowledgeBase table, openaiHelpers, knowledgeBaseActions)
provides:
  - kbSummaryCache singleton table in Convex schema with nullable metric fields
  - getCache query returning full extraction result or null
  - getExtracting query for real-time loading state
  - saveCache internalMutation (delete-then-insert singleton pattern)
  - setExtracting internalMutation for pre/post extraction state management
  - extractMetrics action: downloads KB files, calls OpenAI Chat Completions with json_schema strict mode, persists cache
affects:
  - 08-02 (frontend dashboard wires to getCache and extractMetrics)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton cache table pattern: delete-then-insert via internalMutation"
    - "Nullable metric schema: v.union(v.string(), v.null()) for all metric values"
    - "Binary content detection: check non-printable char ratio > 30% in first 500 chars"
    - "Extraction state management: setExtracting flag wraps action try/catch"
    - "json_schema strict mode: additionalProperties: false + all fields in required at every level"

key-files:
  created:
    - convex/kbInsights.ts
    - convex/kbInsightsActions.ts
  modified:
    - convex/schema.ts

key-decisions:
  - "Use v.null() not v.null_() — this version of Convex uses v.null() for nullable validators"
  - "kbSummaryCache has no index — singleton table queried with .first()"
  - "conflictValue and conflictDocument are v.optional(v.string()) in Convex schema but type: ['string', 'null'] in KPI_SCHEMA JSON schema (OpenAI json_schema strict mode requires all fields in required array)"
  - "METRIC_DEFINITIONS exported for reuse by frontend (08-02)"

patterns-established:
  - "Singleton table pattern: query with .first(), delete then insert to replace"
  - "Extraction flag pattern: setExtracting(true) before, saveCache resets to false, catch block resets to false"

requirements-completed: [KB-01, KB-03, KB-04]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 8 Plan 01: KB KPI Extraction Backend Summary

**Convex backend for KB metric extraction: kbSummaryCache table, getCache/saveCache/setExtracting mutations, and gpt-4o Chat Completions action with json_schema strict mode for 8 DEC-specific KPIs**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-01T02:02:42Z
- **Completed:** 2026-03-01T02:05:10Z
- **Tasks:** 2/3 complete (Task 3 awaiting user action: `npx convex dev --once`)
- **Files modified:** 3 (schema.ts updated, kbInsights.ts created, kbInsightsActions.ts created)

## Accomplishments
- Added `kbSummaryCache` singleton table to Convex schema with nullable `value`, `unit`, and `sourceDocument` fields using `v.union(v.string(), v.null())`
- Created `convex/kbInsights.ts` with `getCache` query, `getExtracting` query, `saveCache` internalMutation (delete-then-insert), and `setExtracting` internalMutation
- Created `convex/kbInsightsActions.ts` with `extractMetrics` action: downloads all KB files, skips binary content, calls gpt-4o with `json_schema` strict mode, persists results via `saveCache`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add kbSummaryCache table + kbInsights queries/mutations** - `2e53c8c` (feat)
2. **Task 2: Create kbInsightsActions.ts extraction action** - `291b0ee` (feat)
3. **Task 3: Deploy Convex schema** - PENDING (requires user to run `npx convex dev --once`)

## Files Created/Modified
- `convex/schema.ts` - Added `kbSummaryCache` table definition (metrics array with nullable fields)
- `convex/kbInsights.ts` - `getCache`, `getExtracting` queries + `saveCache`, `setExtracting` internalMutations
- `convex/kbInsightsActions.ts` - `extractMetrics` action with OpenAI Chat Completions, binary detection, 8 DEC metric keys

## Decisions Made
- **v.null() not v.null_()**: This version of Convex uses `v.null()` — the plan specified `v.null_()` which is a newer API. Auto-fixed during Task 1 verification.
- **No index on kbSummaryCache**: Singleton table queried with `.first()` — no index required (follows `quickbooksConfig` pattern).
- **conflictValue/conflictDocument as v.optional in Convex but required in KPI_SCHEMA**: OpenAI json_schema strict mode requires all fields in `required` array; `type: ["string", "null"]` handles nullability. On the Convex side, `v.optional(v.string())` is used (not `v.union(v.string(), v.null())`) since the field may be absent when there's no conflict.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed v.null_() → v.null() in schema and kbInsights.ts**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** Plan used `v.null_()` which does not exist in this version of Convex. Correct method is `v.null()`
- **Fix:** Replaced all `v.null_()` calls with `v.null()` in both `convex/schema.ts` and `convex/kbInsights.ts`
- **Files modified:** convex/schema.ts, convex/kbInsights.ts
- **Verification:** `npx tsc --noEmit` shows zero errors on new files
- **Committed in:** `2e53c8c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Required for correct operation. No scope creep.

## Issues Encountered
- Convex uses `v.null()` not `v.null_()` — plan's API reference was for a newer version. Fixed immediately via TypeScript error detection.

## User Setup Required
Task 3 requires manual execution: run `npx convex dev --once` in the project root to deploy the schema and regenerate `_generated/api.d.ts` with `kbInsights` and `kbInsightsActions` module exports.

Verification:
1. Terminal output mentions deploying `kbInsights` and `kbInsightsActions`
2. `convex/_generated/api.d.ts` contains `kbInsights`

## Next Phase Readiness
- After `npx convex dev --once` runs: `kbSummaryCache` table will be live in Convex
- Plan 08-02 can wire the frontend dashboard to `getCache` query and `extractMetrics` action
- `METRIC_DEFINITIONS` exported from `kbInsightsActions.ts` for frontend label/unit display

---
*Phase: 08-kb-kpi-extraction*
*Completed: 2026-03-01 (partial — Task 3 pending user action)*
