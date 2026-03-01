---
phase: 08-kb-kpi-extraction
plan: 02
subsystem: frontend
tags: [react, convex, dashboard, kpi-cards, role-gating, ai-extraction]

# Dependency graph
requires:
  - phase: 08-kb-kpi-extraction
    plan: 01
    provides: kbSummaryCache table, getCache query, extractMetrics action
provides:
  - KBInsights.tsx dashboard section component (Organizational Metrics)
  - kb-insights registered in DashboardSectionId, DEFAULT_DASHBOARD_SECTIONS, SECTION_COMPONENTS
affects:
  - Dashboard layout (new section at position 1, after Executive Snapshot)
  - Users with admin/manager roles (Extract Metrics button visible)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Combined local + server extracting state: local useState OR cache.extracting for responsive UX"
    - "Dynamic card count: filter(m => m.value !== null) — only render cards for extracted metrics"
    - "Role gate via useQuery(api.users.getCurrentUser): canExtract = role === admin || manager"
    - "Visually distinct AI cards: gradient bg from-surface to-primary/[0.03], AI badge badge, border-primary/20"
    - "Conflict indicator: amber warning icon with hover tooltip showing alternate value + source"

key-files:
  created:
    - src/components/dashboard/KBInsights.tsx
  modified:
    - src/types/index.ts
    - src/lib/constants.ts
    - src/app/(dashboard)/dashboard/page.tsx

key-decisions:
  - "StatCardSkeleton reused for loading state (4 placeholder cards in grid during cache === undefined)"
  - "MetricCard is an inline component (not exported) — simple enough to not warrant a separate file"
  - "extractAction({}) called with empty args object — Convex useAction requires args even when schema is empty"
  - "visibleMetrics type narrowed with predicate filter (value: string) to avoid null in JSX"

# Metrics
duration: ~2 min
completed: 2026-03-01
---

# Phase 8 Plan 02: KB KPI Extraction Frontend Summary

**KBInsights dashboard section with AI MetricCards, role-gated extraction trigger, source attribution, and conflict indicators wired to Convex kbSummaryCache**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T02:15:50Z
- **Completed:** 2026-03-01T02:17:55Z
- **Tasks:** 2/2
- **Files modified:** 4 (types, constants, page.tsx updated; KBInsights.tsx created)

## Accomplishments

- Added `"kb-insights"` to `DashboardSectionId` union type in `src/types/index.ts`
- Inserted "Organizational Metrics" section at position 1 in `DEFAULT_DASHBOARD_SECTIONS` (after Executive Snapshot)
- Registered `KBInsights` component in `SECTION_COMPONENTS` map in `dashboard/page.tsx`
- Created `src/components/dashboard/KBInsights.tsx` (215 lines):
  - `MetricCard` inline component with AI badge (sparkle SVG), gradient background, tinted border — visually distinct from QB-sourced StatCards
  - Source document attribution line below metric label
  - Amber conflict indicator (triangle warning SVG) with `title` tooltip showing alternate value and source
  - `handleExtract` async handler wiring `useAction(api.kbInsightsActions.extractMetrics)`
  - Combined `isExtracting` derived from local state OR `cache.extracting` for responsive loading UX
  - Role gate: `canExtract = role === "admin" || role === "manager"`
  - `visibleMetrics` filtered to non-null values only (dynamic card count)
  - Loading skeleton (4 `StatCardSkeleton` components), empty state with prompt, and metric cards grid
  - "Last extracted X ago · N documents" timestamp from `kbSummaryCache.extractedAt`

## Task Commits

Each task committed atomically:

1. **Task 1: Register kb-insights section in types, constants, and dashboard page** — `704e1af` (feat)
2. **Task 2: Create KBInsights.tsx dashboard component** — `38057a7` (feat)

## Files Created/Modified

- `src/types/index.ts` — Added `"kb-insights"` to DashboardSectionId union (after executive-snapshot)
- `src/lib/constants.ts` — Inserted `{ id: "kb-insights", title: "Organizational Metrics", ... }` at index 1
- `src/app/(dashboard)/dashboard/page.tsx` — Import KBInsights; add `"kb-insights": KBInsights` to SECTION_COMPONENTS
- `src/components/dashboard/KBInsights.tsx` — New component: MetricCard + KBInsights export (215 lines)

## Decisions Made

- **MetricCard as inline component**: Simple enough to not warrant a separate file; co-located in KBInsights.tsx
- **Combined extracting state**: `isExtracting = extracting || (cache?.extracting ?? false)` — local state gives immediate response; server flag keeps sync across sessions
- **StatCardSkeleton reuse**: Loading state uses existing `StatCardSkeleton` (4 cards) rather than a custom skeleton — consistent with dashboard skeleton pattern
- **extractAction({})**: Convex `useAction` requires arguments object even for empty-args actions

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `allocationActions.ts`, `constantContactActions.ts`, `grants.ts`, and other unrelated files were out of scope and not touched.

## Self-Check: PASSED

- [x] `src/components/dashboard/KBInsights.tsx` — FOUND (215 lines, min_lines: 80)
- [x] `src/types/index.ts` — contains `"kb-insights"` (line 41)
- [x] `src/lib/constants.ts` — contains `"kb-insights"` at position 1 in DEFAULT_DASHBOARD_SECTIONS (line 18)
- [x] `src/app/(dashboard)/dashboard/page.tsx` — contains `"kb-insights": KBInsights` (line 26), KBInsights import (line 11)
- [x] `api.kbInsights.getCache` pattern — FOUND in KBInsights.tsx (line 87)
- [x] `api.kbInsightsActions.extractMetrics` pattern — FOUND in KBInsights.tsx (line 89)
- [x] Commit `704e1af` — FOUND (feat: register kb-insights)
- [x] Commit `38057a7` — FOUND (feat: KBInsights.tsx component)

---
*Phase: 08-kb-kpi-extraction*
*Completed: 2026-03-01*
