---
phase: 09-ai-summary-panel
plan: 01
subsystem: api
tags: [openai, convex, chat-completions, kpi, schema]

# Dependency graph
requires:
  - phase: 08-kb-kpi-extraction
    provides: kbSummaryCache singleton table with metrics, kbInsightsActions.extractMetrics action
provides:
  - kbSummaryCache schema extended with summaryBullets, summaryGeneratedAt, summaryGenerating fields
  - setSummaryGenerating internalMutation (patch-based, independent from extracting flag)
  - saveSummary internalMutation (patch-based, preserves metrics row)
  - generateSummary action (Chat Completions, plain text, temperature 0.3, KPI context injection)
affects: [09-02-frontend, KBInsights.tsx dashboard section]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Patch-based singleton updates: saveSummary uses ctx.db.patch() not delete-insert, preserving all other row fields"
    - "Independent state flags: summaryGenerating and extracting are separate fields, never cross-contaminating"
    - "KPI context injection: generateSummary reads existing metrics and passes them as reference to avoid AI contradiction"
    - "Plain-text Chat Completions: summary uses text output (not json_schema) at temperature 0.3 for natural prose"

key-files:
  created: []
  modified:
    - convex/schema.ts
    - convex/kbInsights.ts
    - convex/kbInsightsActions.ts

key-decisions:
  - "saveSummary uses ctx.db.patch() (not delete-then-insert) to preserve existing metric data during regeneration (SUM-04)"
  - "summaryGenerating is independent from extracting — separate Convex flag, no cross-contamination between pipelines"
  - "generateSummary injects extracted KPI metrics as LLM context to prevent summary bullets contradicting stat cards"
  - "Plain text Chat Completions at temperature 0.3 chosen over json_schema — bullets do not need structured schema"
  - "Hard cap of 5 bullets via .slice(0, 5) enforced client-side after parsing to honor system prompt constraint"

patterns-established:
  - "Pattern: Convex singleton patch pattern — use ctx.db.patch() for field-specific updates, never delete-then-insert when preserving other fields"
  - "Pattern: LLM context injection — pass already-extracted structured data as user message context to avoid contradiction"

requirements-completed: [SUM-01, SUM-03, SUM-04]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 9 Plan 01: AI Summary Backend Summary

**generateSummary Convex action with Chat Completions, patch-based persistence, and KPI context injection added to kbSummaryCache singleton**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T03:14:56Z
- **Completed:** 2026-03-01T03:17:54Z
- **Tasks:** 2 auto tasks complete, 1 checkpoint (human-action: schema deploy)
- **Files modified:** 3

## Accomplishments
- Extended kbSummaryCache schema with 3 optional AI summary fields (summaryBullets, summaryGeneratedAt, summaryGenerating)
- Added setSummaryGenerating and saveSummary internal mutations — patch-based, preserving existing metric row data (SUM-04 critical)
- Added SUMMARY_SYSTEM_PROMPT for boardroom-ready executive bullets (3-5 per prompt instructions)
- Added generateSummary Convex action: loads KB docs, injects extracted KPI metrics as reference, calls Chat Completions at temperature 0.3, parses and caps bullets at 5, persists via patch
- summaryGenerating flag is fully independent from extracting flag — separate pipelines cannot interfere

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend kbSummaryCache schema with summary fields** - `80f981c` (feat)
2. **Task 2: Add summary mutations and generateSummary action** - `874f7da` (feat)
3. **Task 3: Deploy schema to Convex** - checkpoint:human-action (awaiting user)

## Files Created/Modified
- `convex/schema.ts` - Added summaryBullets, summaryGeneratedAt, summaryGenerating optional fields to kbSummaryCache table
- `convex/kbInsights.ts` - Added setSummaryGenerating and saveSummary internal mutations
- `convex/kbInsightsActions.ts` - Added SUMMARY_SYSTEM_PROMPT constant and generateSummary action

## Decisions Made
- saveSummary uses ctx.db.patch() not delete-insert: preserving the row ensures metric data survives summary regeneration (SUM-04 requirement)
- summaryGenerating is a separate field from extracting: the two pipelines are decoupled — generating a summary while extraction runs is a valid state
- KPI context injection: metrics already extracted are passed to the LLM as a reference string to prevent generated bullets from contradicting stat card values
- temperature 0.3 chosen for natural prose while remaining grounded in source documents
- Markdown bold stripping in bullet parser: the system prompt instructs bold keywords, but the frontend handles its own styling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript check via `npx tsc --noEmit` showed pre-existing errors in node_modules/@auth/core and convex/_generated/api.d.ts. None are from Plan 09-01 changes — these are known pre-existing issues in the project.

## User Setup Required

**Schema deployment required before mutations work.**

Run in project directory (interactive terminal required — not a background process):

```bash
npx convex dev --once
```

This deploys the extended kbSummaryCache schema with the 3 new summary fields. Convex will reject `setSummaryGenerating`, `saveSummary`, and `generateSummary` calls until deployed.

## Next Phase Readiness
- Backend complete: generateSummary action callable from any Convex client
- Schema must be deployed (npx convex dev --once) before frontend wiring in 09-02
- 09-02 frontend can use: `api.kbInsights.getCache` (returns summaryBullets, summaryGeneratedAt, summaryGenerating), `api.kbInsightsActions.generateSummary` (no args)

## Self-Check: PASSED

- convex/schema.ts: FOUND, contains summaryBullets field
- convex/kbInsights.ts: FOUND, contains setSummaryGenerating and saveSummary mutations, 4 instances of ctx.db.patch
- convex/kbInsightsActions.ts: FOUND, contains generateSummary action
- 09-01-SUMMARY.md: FOUND
- Commit 80f981c: FOUND (schema extension)
- Commit 874f7da: FOUND (mutations and action)

---
*Phase: 09-ai-summary-panel*
*Completed: 2026-03-01*
