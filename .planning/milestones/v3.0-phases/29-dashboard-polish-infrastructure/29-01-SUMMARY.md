---
phase: 29-dashboard-polish-infrastructure
plan: "01"
subsystem: ui
tags: [tailwind, css, dashboard, react, layout]

# Dependency graph
requires:
  - phase: 28-visual-elements
    provides: Dashboard components (FundingThermometer, ExecutiveSnapshot, ProgramsLegal, ProgramsCoparent, DonationPerformance, CalendarWidget) and card/section chrome established in Phase 28
provides:
  - Tighter dashboard vertical spacing (space-y-4, py-3/py-2.5)
  - Gradient top-border hover accent on all .hover-lift cards (3px teal-to-green)
  - ExecutiveSnapshot rendered as always-visible unwrapped row at top of dashboard
  - Single consolidated Programs section with Legal/Co-Parent tabs (replaces two separate sections)
  - Updated DashboardSectionId union and DEFAULT_DASHBOARD_SECTIONS constants
affects: [dashboard layout, card interaction, section management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS pseudo-element gradient accent on .hover-lift via ::before with opacity transition"
    - "Inline function components (ProgramsConsolidated) in page files for tab-switching wrappers"
    - "Always-visible unwrapped components rendered before DashboardSection loop"

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/dashboard/DashboardSection.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/lib/constants.ts
    - src/types/index.ts

key-decisions:
  - "ExecutiveSnapshot rendered directly (no DashboardSection wrapper) — always visible, cannot be hidden/reordered/collapsed"
  - "ProgramsConsolidated is an inline function component in page.tsx — tab state is local, only active tab's data loads"
  - "executive-snapshot, programs-coparent, programs-legal removed from DashboardSectionId — users with stale prefs silently ignore unknown IDs"

patterns-established:
  - "Unwrapped always-visible components: render directly in page JSX above the DashboardSection loop"
  - "Tab consolidation pattern: ProgramsConsolidated with useState tab toggle conditionally renders one of two existing components"

requirements-completed: [POLISH-01, POLISH-02, POLISH-03, POLISH-04]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 29 Plan 01: Dashboard Polish — Layout Tightening, Hover Accents, Programs Consolidation Summary

**Reduced dashboard vertical whitespace to space-y-4/py-3, added teal-to-green gradient top-border hover accent via CSS pseudo-element, pulled ExecutiveSnapshot out as always-visible unwrapped row, and consolidated two program sections into one tabbed section.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T14:11:24Z
- **Completed:** 2026-03-02T14:14:05Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- DashboardSection chrome uses tighter padding: header py-3.5 → py-2.5, content py-4 → py-3; page-level spacing space-y-6 → space-y-4
- All .hover-lift cards now show a 3px gradient bar (--primary to --accent) that fades in on hover, clipped by overflow:hidden to respect border-radius
- ExecutiveSnapshot is always visible at the top of the dashboard, outside any DashboardSection wrapper — no collapse/hide/reorder controls
- "Programs -- Legal" and "Programs -- Co-Parent" sections consolidated into a single "Programs" DashboardSection with Legal/Co-Parent tab switcher

## Task Commits

Each task was committed atomically:

1. **Task 1: Tighten dashboard vertical spacing** - `a193748` (feat)
2. **Task 2: Add gradient top-border hover accent to cards** - `3c23f11` (feat)
3. **Task 3+4: Pull ExecutiveSnapshot out + consolidate programs** - `654d186` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/app/globals.css` - Updated .hover-lift with ::before pseudo-element gradient top-border
- `src/components/dashboard/DashboardSection.tsx` - Reduced header (py-3.5 → py-2.5) and content (py-4 → py-3) padding
- `src/app/(dashboard)/dashboard/page.tsx` - Added ProgramsConsolidated component, removed executive-snapshot from SECTION_COMPONENTS, added ExecutiveSnapshot direct render, updated spacing, added cn import
- `src/lib/constants.ts` - Removed executive-snapshot entry, replaced programs-coparent/programs-legal with single programs entry
- `src/types/index.ts` - Updated DashboardSectionId union: removed executive-snapshot/programs-coparent/programs-legal, added programs

## Decisions Made
- ExecutiveSnapshot rendered directly above the DashboardSection loop without any wrapper — always visible, always first, cannot be reordered or hidden. This is intentional: it's the financial summary Kareem sees every morning.
- ProgramsConsolidated is an inline function component (not extracted to its own file) — the tab state is local and the consolidation is purely a display concern limited to the dashboard page.
- Users with stale saved prefs containing "executive-snapshot", "programs-coparent", or "programs-legal" are silently handled by the existing `if (!SectionComponent) return null` guard — no migration needed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Dashboard polish complete: tighter layout, hover accents, ExecutiveSnapshot always visible, Programs consolidated
- Phase 29 Plan 02 (infrastructure) can proceed — calendar cron sync and other infra improvements
- No blockers

## Self-Check: PASSED

- FOUND: src/app/globals.css
- FOUND: src/components/dashboard/DashboardSection.tsx
- FOUND: src/app/(dashboard)/dashboard/page.tsx
- FOUND: src/lib/constants.ts
- FOUND: src/types/index.ts
- FOUND: .planning/phases/29-dashboard-polish-infrastructure/29-01-SUMMARY.md
- FOUND: commit a193748 (T1 spacing)
- FOUND: commit 3c23f11 (T2 hover accent)
- FOUND: commit 654d186 (T3+T4 executive snapshot + programs)
- Build passed: npm run build succeeded with no TypeScript errors

---
*Phase: 29-dashboard-polish-infrastructure*
*Completed: 2026-03-02*
