---
phase: 27-theme-toggle
plan: 01
subsystem: ui
tags: [dark-mode, theme, css-variables, localStorage, flash-prevention]

# Dependency graph
requires: []
provides:
  - Dark palette CSS variables updated to old-app-inspired near-black/teal values
  - Flash-prevention inline script in layout.tsx applied before first paint
  - useTheme hook initializes from localStorage with SSR-safe helpers
affects: [all dashboard pages, sidebar, header, chart styling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Flash-prevention pattern: synchronous inline script in <head> reads localStorage before first paint
    - Theme hook initialization: useState(getStoredTheme) initializer matches pre-applied class
    - CSS variable override pattern: .dark selector overrides :root variables, Tailwind @theme inline reads them

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/hooks/useTheme.ts

key-decisions:
  - "Dark palette uses #0F0F0F bg, #1E1E1E surface, #26A69A teal primary, #404040 border, #FFFFFF foreground — matching old desktop app"
  - "Flash-prevention uses IIFE in <head> with dangerouslySetInnerHTML — runs synchronously before body parse"
  - "useTheme hook initialized from localStorage via useState initializer to eliminate state/class mismatch on mount"

patterns-established:
  - "Theme init pattern: flash-prevention script and useState initializer both call same getStoredTheme logic to stay in sync"
  - "CSS dark palette: .dark selector overrides --background, --surface, --primary etc; no Tailwind config changes needed"

requirements-completed: [THEME-01, THEME-02, THEME-03, THEME-04]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 27 Plan 01: Theme Toggle Summary

**Dark palette updated to near-black/teal old-app values (#0F0F0F, #1E1E1E, #26A69A), with flash-prevention script and localStorage-initialized useTheme hook**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T11:19:41Z
- **Completed:** 2026-03-02T11:21:10Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Replaced green-tinted dark palette (#141F16/#1A2E1E) with near-black/teal old desktop app palette (#0F0F0F/#1E1E1E/#26A69A)
- Added synchronous IIFE flash-prevention script in layout.tsx `<head>` that applies `.dark` class before first paint
- Refined useTheme hook to initialize from localStorage in useState initializer, eliminating state/class mismatch on mount

## Task Commits

Each task was committed atomically:

1. **Task 1: Update dark palette in globals.css** - `9786858` (feat)
2. **Task 2: Add flash-prevention script to root layout** - `00e3a8b` (feat)
3. **Task 3: Refine useTheme hook** - `011977d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/globals.css` - .dark block updated to old-app-inspired near-black/teal values; noise-texture opacity reduced to 0.02; light palette unchanged
- `src/app/layout.tsx` - Added `<head>` with inline IIFE script reading dec-theme from localStorage, applies .dark class before paint
- `src/hooks/useTheme.ts` - Refactored with getStoredTheme/resolveTheme helpers, SSR guards, try-catch on localStorage, localStorage-initialized useState

## Decisions Made
- Dark palette maps old desktop app dads-dashboard.css vars to existing DEC DASH CSS variable names — no new CSS variables added
- Noise texture opacity reduced from 0.03 to 0.02 on dark theme since near-black background makes noise more prominent
- useTheme hook preserved same external API (theme, resolvedTheme, setTheme) — no consumers need updating

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all three tasks implemented cleanly. Build passed with zero errors.

## User Setup Required

None - no external service configuration required. Theme toggle already exists in Header.tsx and works immediately with these changes.

## Next Phase Readiness

- All THEME-01 through THEME-04 requirements fulfilled
- Phase 27 has only one plan (27-01) — phase is complete
- Dark mode theme is fully functional: near-black palette, flash-prevention, persistent localStorage preference

---
*Phase: 27-theme-toggle*
*Completed: 2026-03-02*
