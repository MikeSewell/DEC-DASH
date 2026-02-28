---
phase: 01-newsletter-template-fix
plan: 01
subsystem: ui
tags: [email, newsletter, html, juice, convex, constant-contact]

# Dependency graph
requires: []
provides:
  - Email-safe table-based newsletter HTML template (no box-shadow/opacity/overflow:hidden)
  - juice CSS inlining safety pass in generateEmailHtml pipeline
  - [[trackingImage]] Constant Contact open rate tracking token
affects: [02-newsletter-size-check]

# Tech tracking
tech-stack:
  added: [juice@11.1.1]
  patterns:
    - Table-based email layout with bgcolor attributes as Outlook fallbacks
    - Nested tables for padding+border support in Outlook Word renderer
    - Dynamic import pattern for CommonJS modules in Convex node runtime (juiceMod.default ?? juiceMod)
    - Dual juice pass: pre-AI and post-AI for guaranteed CSS inlining

key-files:
  created: []
  modified:
    - convex/newsletterTemplate.ts
    - convex/newsletterActions.ts
    - package.json

key-decisions:
  - "Use bgcolor HTML attribute alongside background-color CSS on <td> for Outlook fallback compatibility"
  - "Keep border-radius on header/footer for progressive enhancement — Apple Mail/Gmail render it, Outlook ignores safely"
  - "Two juice passes (pre-AI and post-AI) ensure stored generatedEmailHtml is fully inlined regardless of AI output"
  - "Use (juiceMod.default ?? juiceMod) cast pattern for juice CJS/ESM interop in Convex node runtime"

patterns-established:
  - "Email-safe colored blocks: nested tables with bgcolor + border-left instead of divs"
  - "Testimonial blocks: outer table with border, inner table with bgcolor + border-left"
  - "CJS module dynamic import in Convex: const mod: any = await import('pkg'); const fn = mod.default ?? mod"

requirements-completed: [NEWS-01, NEWS-02]

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 1 Plan 01: Newsletter Template Fix Summary

**Table-based email template rewrite removing box-shadow/opacity/overflow:hidden, plus juice dual CSS inlining pass in generateEmailHtml for Gmail/Outlook/Apple Mail compatibility**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T09:51:36Z
- **Completed:** 2026-02-28T09:55:50Z
- **Tasks:** 2
- **Files modified:** 3 (newsletterTemplate.ts, newsletterActions.ts, package.json)

## Accomplishments

- Converted all div-based colored blocks (milestones, program highlights, testimonials, community events, partnerships, volunteer box) to table-based equivalents with bgcolor Outlook fallbacks
- Removed all unsupported CSS: box-shadow (main container), opacity (header subtext, fatherhood stats), overflow:hidden (Dad of Month table)
- Added [[trackingImage]] token before closing footer table for Constant Contact open rate tracking
- Installed juice v11.1.1 and integrated dual CSS inlining passes (pre-AI and post-AI) in generateEmailHtml pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite newsletterTemplate.ts with table-based layout and email-safe CSS** - `5a40b76` (feat)
2. **Task 2: Install juice and add CSS inlining pass to generateEmailHtml** - `fcb4fea` (feat)

## Files Created/Modified

- `convex/newsletterTemplate.ts` - Fully table-based email HTML builder; removed box-shadow, opacity, overflow:hidden; converted 7 div-based blocks to tables with bgcolor; added [[trackingImage]] token
- `convex/newsletterActions.ts` - Added juice import and two CSS inlining passes (pre-AI step 1.5, post-AI after fence stripping) in generateEmailHtml action
- `package.json` - Added juice@^11.1.1 dependency

## Decisions Made

- Used `bgcolor` HTML attribute alongside `background-color` inline CSS on `<td>` elements — Outlook Word renderer reads the HTML attribute when it ignores CSS
- Kept `border-radius` on header and footer for progressive enhancement (Apple Mail and Gmail render it; Outlook ignores it harmlessly)
- Used nested tables for `border-left` + background color combinations — Outlook cannot apply padding and border correctly on the same `<td>`, requiring a wrapping outer `<td>` for the border and inner `<td>` for padding
- Removed `border-radius` from testimonial div blocks (previously `border-radius:6px` and `border-radius:4px`) since these were div-based and couldn't survive the table conversion cleanly
- Used `(juiceMod.default ?? juiceMod)` with `any` cast for juice CJS/ESM interop since juice exports itself as a function directly with no `.default` property at runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed juice dynamic import — .default does not exist on juice CJS module**
- **Found during:** Task 2 (Install juice and add CSS inlining pass)
- **Issue:** Plan specified `(await import("juice")).default` but juice exports itself as a plain CJS function with no `.default` property. TypeScript compile error: `Property 'default' does not exist on type 'typeof juice'`.
- **Fix:** Changed to `const juiceMod: any = await import("juice"); const juice = juiceMod.default ?? juiceMod;` to handle both CJS and ESM interop patterns safely in Convex node runtime
- **Files modified:** convex/newsletterActions.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck convex/newsletterActions.ts` returns no errors; `node -e "const j = require('juice'); console.log(typeof j)"` confirms juice is a function
- **Committed in:** `fcb4fea` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix essential for correct runtime behavior. No scope creep. juice still works as designed.

## Issues Encountered

- Convex deployment (`npx convex dev --once`) requires authenticated Convex session not available in this environment. Used TypeScript type-checking (`npx tsc --noEmit --skipLibCheck`) as compilation verification alternative — all project-level type errors confirmed as pre-existing (auth.ts, grants.ts, quickbooksActions.ts), zero new errors introduced.

## User Setup Required

None - no external service configuration required. Changes are backend-only Convex functions. The next newsletter generation will automatically use the new template and juice inlining.

## Next Phase Readiness

- Newsletter template is now email-client safe for Gmail, Outlook (Word renderer), and Apple Mail
- juice inlining pipeline ensures no style blocks survive into sent emails
- Ready for Plan 02: HTML size check (400KB warning logic for Constant Contact limit)

---
*Phase: 01-newsletter-template-fix*
*Completed: 2026-02-28*
