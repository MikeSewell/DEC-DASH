---
phase: 01-newsletter-template-fix
plan: 02
subsystem: ui
tags: [newsletter, constant-contact, email, preview, size-indicator, tailwind]

# Dependency graph
requires:
  - phase: 01-newsletter-template-fix/01-01
    provides: table-based email-safe newsletter template with juice inlining
provides:
  - Content size indicator pill in newsletter editor header (TextEncoder byte measurement, green/yellow/red thresholds)
  - Preview accuracy disclaimer in NewsletterPreview (Gmail/Apple Mail rendering note, hidden during edit mode)
affects:
  - Any future newsletter UI work (editor page, preview component)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TextEncoder().encode().length for accurate byte measurement of HTML strings"
    - "Conditional pill badge with three-threshold color states (green/yellow/red)"
    - "Info note hidden during contentEditable edit mode to reduce clutter"

key-files:
  created: []
  modified:
    - src/app/(dashboard)/newsletter/[id]/page.tsx
    - src/components/newsletter/NewsletterPreview.tsx

key-decisions:
  - "Size indicator is informational only — does not block sending (per CONTEXT.md decision)"
  - "Three thresholds: green < 350KB, yellow 350-389KB, red 390KB+ (87.5%/97.5% of 400KB limit)"
  - "Preview accuracy note hidden during edit mode to avoid UI clutter while editing"

patterns-established:
  - "Size indicator pattern: TextEncoder byte count with rounded-full pill badge at three color thresholds"
  - "Preview disclaimer pattern: blue info box with SVG info icon, hidden when isEditing is true"

requirements-completed: [NEWS-03, NEWS-04]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 1 Plan 02: Newsletter Size Indicator + Preview Accuracy Label Summary

**Content size pill (TextEncoder, green/yellow/red thresholds) and rendering disclaimer added to newsletter editor and preview — Kareem now sees 400KB limit status and understands browser vs. Outlook rendering gap.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-28T10:00:00Z
- **Completed:** 2026-02-28T10:04:26Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint — approved)
- **Files modified:** 2

## Accomplishments
- Size indicator pill added to newsletter editor header: shows current KB vs 400KB limit, green below 350KB, yellow 350-389KB, red 390KB+, only visible after HTML is generated
- Preview accuracy disclaimer added to NewsletterPreview: blue info note explains Gmail/Apple Mail rendering fidelity and recommends test email for definitive check; hidden during edit mode
- All existing preview features (desktop/mobile toggle, contentEditable edit mode, save/cancel) remain unchanged
- Human verification checkpoint approved by Kareem

## Task Commits

Each task was committed atomically:

1. **Task 1: Add content size indicator to newsletter editor page** - `b1618bc` (feat)
2. **Task 2: Add preview accuracy label and rendering note to NewsletterPreview** - `3776bf8` (feat)
3. **Task 3: Verify newsletter template, size warning, and preview end-to-end** - checkpoint approved by user (no code commit)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified
- `src/app/(dashboard)/newsletter/[id]/page.tsx` - Added TextEncoder-based size computation and conditional pill badge with three color thresholds
- `src/components/newsletter/NewsletterPreview.tsx` - Added blue info disclaimer note between toolbar and iframe, hidden during edit mode

## Decisions Made
- Size indicator is purely informational — does not block sending (per prior CONTEXT.md decision, validated against user intent)
- Three thresholds chosen at 87.5% (350KB warning) and 97.5% (390KB urgent) of the 400KB CC limit to give Kareem early warning
- Accuracy note hidden during edit mode to reduce clutter while making direct HTML edits

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 01 (newsletter template fix) is fully complete — template rewrite, juice inlining, size awareness, and preview labeling all done
- Phase 02 (dashboard data fix) is ready to begin — QB refresh token audit should be first task per existing blocker note
- No blockers from this plan

## Self-Check: PASSED

- FOUND: src/app/(dashboard)/newsletter/[id]/page.tsx
- FOUND: src/components/newsletter/NewsletterPreview.tsx
- FOUND: .planning/phases/01-newsletter-template-fix/01-02-SUMMARY.md
- FOUND commit: b1618bc (Task 1)
- FOUND commit: 3776bf8 (Task 2)

---
*Phase: 01-newsletter-template-fix*
*Completed: 2026-02-28*
