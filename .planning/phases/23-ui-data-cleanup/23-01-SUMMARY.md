---
phase: 23-ui-data-cleanup
plan: "01"
subsystem: frontend-nav, convex-schema
tags: [ui-cleanup, schema, sidebar, programs]
dependency_graph:
  requires: []
  provides: [programs-grid-icon, programs-no-isactive]
  affects: [src/lib/constants.ts, src/components/layout/Sidebar.tsx, convex/schema.ts, convex/programs.ts, convex/seedPrograms.ts, src/app/(dashboard)/clients/page.tsx]
tech_stack:
  added: []
  patterns: [inline-svg-icon, schema-field-removal]
key_files:
  created: []
  modified:
    - src/lib/constants.ts
    - src/components/layout/Sidebar.tsx
    - convex/schema.ts
    - convex/programs.ts
    - convex/seedPrograms.ts
    - src/app/(dashboard)/clients/page.tsx
decisions:
  - Programs sidebar icon changed from Users (people) to Grid (2x2 blocks) — better semantic match for programs-as-categories
  - isActive field removed from programs entirely: programs just exist or get deleted, no active/inactive concept needed
metrics:
  duration_seconds: 131
  completed_date: "2026-03-02"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
---

# Phase 23 Plan 01: Programs Icon + isActive Cleanup Summary

**One-liner:** Replaced Programs sidebar icon with 2x2 Grid SVG and fully purged the meaningless `isActive` boolean from programs schema, mutations, seed scripts, and UI.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace Programs sidebar icon and remove isActive from schema and backend | 5a10fe2 | constants.ts, Sidebar.tsx, schema.ts, programs.ts, seedPrograms.ts |
| 2 | Remove isActive from the clients page form and display | a316f10 | clients/page.tsx |

## What Was Built

**Sidebar icon:** The Programs nav item in `constants.ts` now uses `icon: "Grid"`. The `Sidebar.tsx` NavIcon switch has a new `case "Grid"` rendering four rounded `<rect>` elements in a 2x2 layout — consistent with existing icon style (`fill="none"`, `strokeWidth={1.75}`, `viewBox="0 0 24 24"`). The old `case "Users"` (people/silhouette icon) was replaced.

**Schema cleanup:** `isActive: v.boolean()` removed from the `programs` table definition in `convex/schema.ts`. The programs table now has only: `name`, `type`, `description` (optional), `createdAt`.

**Backend cleanup:** All six `isActive` references removed from `convex/programs.ts`:
- `create` mutation: removed from args validator and insert object
- `update` mutation: removed from args validator and patch handler
- `getStats` query: removed from return object
- `ensureSeeded` mutation: removed from insert object
- `seed` internalMutation: removed from args validator and insert object

**Seed script:** `convex/seedPrograms.ts` updated — both `internal.programs.seed` calls no longer pass `isActive: true`.

**Frontend cleanup:** `src/app/(dashboard)/clients/page.tsx`:
- `ProgramFormData` interface: `isActive: boolean` removed
- `emptyProgramForm` constant: `isActive: true` removed
- `handleAddProgram`: `isActive: programForm.isActive` removed from mutation call
- Program cards: `{!p.isActive && " (Inactive)"}` badge removed; type label now renders alone
- Add Program modal: entire Active checkbox `<label>` block removed

## Verification

- `grep -rn "isActive" convex/ src/` — zero results outside Sidebar.tsx's unrelated nav-link active state variable
- `npm run build` — compiled successfully, no TypeScript errors, 18 static pages generated

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/lib/constants.ts` modified — `icon: "Grid"` confirmed
- [x] `src/components/layout/Sidebar.tsx` modified — `case "Grid"` with 2x2 SVG confirmed
- [x] `convex/schema.ts` modified — `isActive` removed
- [x] `convex/programs.ts` modified — all 6 isActive references removed
- [x] `convex/seedPrograms.ts` modified — isActive removed from both seed calls
- [x] `src/app/(dashboard)/clients/page.tsx` modified — interface, form, card, checkbox all cleaned
- [x] Commit 5a10fe2 exists
- [x] Commit a316f10 exists

## Self-Check: PASSED
