---
phase: 23-ui-data-cleanup
verified: 2026-03-02T13:00:00Z
status: human_needed
score: 6/6 must-haves verified
human_verification:
  - test: "Open /clients in the browser and confirm the Programs link in the sidebar shows a 2x2 grid of blocks icon, not a people/silhouette icon"
    expected: "Four rounded square blocks arranged in a 2x2 grid are visible as the sidebar icon for Programs"
    why_human: "SVG rendering is visual — automated checks confirm the SVG case exists with four <rect> elements but cannot confirm it renders without visual glitch or clipping in the browser"
  - test: "Click Programs in the sidebar, then click the Programs tab, then click Add Program. Confirm the modal has no Active checkbox"
    expected: "The Add Program modal contains only Name, Type, and Description fields — no Active toggle or checkbox"
    why_human: "Form UI structure must be verified visually since the checkbox DOM may exist elsewhere on the page"
  - test: "Confirm at least 3 real client names from the master spreadsheet appear on the /clients page under the correct program tab"
    expected: "The /clients page shows 428 clients (or close to it), with real names visible and program tabs reflecting correct enrollment counts"
    why_human: "Client data in Convex was written by a CLI script — the automated code check cannot query live Convex state to confirm 428 clients exist"
---

# Phase 23: UI & Data Cleanup — Verification Report

**Phase Goal:** The app is visually polished, the programs schema is clean, and real client data is loaded from the master spreadsheet
**Verified:** 2026-03-02T13:00:00Z
**Status:** human_needed (all automated checks passed; 3 items need browser/live-data confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Programs sidebar icon renders cleanly without visual glitch | ? HUMAN | `constants.ts` line 76: `icon: "Grid"`; `Sidebar.tsx` line 53: `case "Grid"` with 4x `<rect>` elements (2x2 layout, correct `viewBox`, `strokeWidth={1.75}`). Visual rendering needs browser confirm. |
| 2 | Programs have no "active" toggle — absent from schema, admin forms, and program cards | ✓ VERIFIED | Schema: no `isActive` in `programs` table definition. Backend: `create`/`update` mutations have no `isActive` args. Frontend: `ProgramFormData` interface has only `name`, `type`, `description`; `emptyProgramForm` has no `isActive`; `handleAddProgram` passes no `isActive`; program cards render `{capitalize(p.type)}` with no badge. |
| 3 | Client and enrollment data from master spreadsheet is populated in the app | ? HUMAN | Import script `scripts/importMaster.ts` exists, is substantive (422 lines), calls `api.clients.importLegalBatch`, `api.clients.importCoparentBatch`, `api.enrollments.importEnrollmentBatch`. Commit `8f0090f` confirms script ran (74 legal + 4 coparent new clients, 428 total). Live Convex DB cannot be queried programmatically — needs human spot-check. |

**Automated score:** 4/4 plan must-haves verified; 6/6 plan truths verified. 2/3 ROADMAP success criteria fully confirmable without browser.

---

### Plan 01 Must-Haves (UI-01 / UI-02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Programs sidebar icon is Grid, not Users | ✓ VERIFIED | `src/lib/constants.ts:76` — `icon: "Grid"` |
| 2 | Programs have no active/inactive concept | ✓ VERIFIED | Zero functional `isActive` in schema, mutations, form, or card display |
| 3 | Add Program modal has no isActive checkbox | ✓ VERIFIED | `ProgramFormData` has 3 fields; `handleAddProgram` passes 3 args; no checkbox element referencing `isActive` |
| 4 | Program cards show type without "(Inactive)" | ✓ VERIFIED | `clients/page.tsx:581` — `{capitalize(p.type)}` only; grep for "Inactive" returns zero results |

### Plan 02 Must-Haves (DATA-01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Client and enrollment data from master spreadsheet is populated | ? HUMAN | Script ran (commit `8f0090f`); live data not queryable programmatically |
| 2 | Imported clients visible on /clients page with correct names and demographics | ? HUMAN | Depends on Convex live state |
| 3 | Imported clients enrolled in correct programs | ✓ VERIFIED (code path) | Script routes "Father Intake" → `legal`, "Co-parenting Session" → `coparent`; calls `importEnrollmentBatch` for both |
| 4 | No duplicate clients from repeated imports | ✓ VERIFIED (code path) | Script deduplicates by `firstName+lastName` (case-insensitive) before batching; `importEnrollmentBatch` deduplicates by `clientId+programId` pair |

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/constants.ts` | ✓ VERIFIED | Line 76: `icon: "Grid"` for Programs nav item |
| `src/components/layout/Sidebar.tsx` | ✓ VERIFIED | Lines 53-61: `case "Grid"` with four `<rect>` elements, correct SVG attributes |
| `convex/schema.ts` | ✓ VERIFIED | `programs` table: `name`, `type`, `description` (optional), `createdAt` — no `isActive` |
| `convex/programs.ts` | ✓ VERIFIED | `create` and `update` mutations have no `isActive` in args or inserts; `getStats` and `ensureSeeded` clean; only remaining `isActive` reference is a comment on migration helper |
| `convex/seedPrograms.ts` | ✓ VERIFIED | Zero occurrences of `isActive` |
| `src/app/(dashboard)/clients/page.tsx` | ✓ VERIFIED | `ProgramFormData` = `{name, type, description}`; no `isActive` in form state, mutation call, or card display |
| `scripts/importMaster.ts` | ✓ VERIFIED | 422-line substantive script; `ConvexHttpClient` pattern; reads xlsx; deduplicates; calls `api.programs.ensureSeeded`, `api.clients.importLegalBatch`, `api.clients.importCoparentBatch`, `api.enrollments.importEnrollmentBatch` |
| `convex/enrollments.ts` (`importEnrollmentBatch`) | ✓ VERIFIED | Lines 172-230: public mutation; deduplicates by `clientId+programId`; inserts with `status: "active"` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/constants.ts` | `src/components/layout/Sidebar.tsx` | `icon: "Grid"` → `case "Grid"` in NavIcon switch | ✓ WIRED | `constants.ts:76` produces `"Grid"` string; `Sidebar.tsx:53` consumes it via switch case |
| `convex/schema.ts` | `convex/programs.ts` | Programs table shape drives mutation args | ✓ WIRED | Schema has no `isActive`; `create` mutation insert at line 45 matches: `{name, type, description, createdAt}` — no stray fields |
| `scripts/importMaster.ts` | `convex/clients.ts` | `ConvexHttpClient` mutation calls | ✓ WIRED | `api.clients.importLegalBatch` (line 268), `api.clients.importCoparentBatch` (line 361), `api.clients.list` (lines 285, 374, 405) |
| `scripts/importMaster.ts` | `convex/programs.ts` | `api.programs.ensureSeeded` for program IDs | ✓ WIRED | Line 179: `await client.mutation(api.programs.ensureSeeded, {})` with result used to route clients at lines 223, 321 |
| `scripts/importMaster.ts` | `convex/enrollments.ts` | `api.enrollments.importEnrollmentBatch` | ✓ WIRED | Lines 308, 394: both legal and coparent enrollment batches call `importEnrollmentBatch` with `{clientId, programId}` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UI-01 | 23-01-PLAN.md | Programs sidebar icon renders correctly without visual glitches | ? HUMAN (code verified) | `icon: "Grid"` in constants; `case "Grid"` SVG in Sidebar; visual rendering needs browser confirm |
| UI-02 | 23-01-PLAN.md | Programs `isActive` field removed from schema, backend, and frontend | ✓ SATISFIED | Zero functional `isActive` occurrences across schema, mutations, form, and card display |
| DATA-01 | 23-02-PLAN.md | Master spreadsheet imported into app with client/enrollment data populated | ? HUMAN (code verified) | Import script is complete and ran (commit `8f0090f`); live data state needs spot-check |

No orphaned requirements found — all three Phase 23 requirements (UI-01, UI-02, DATA-01) appear in plan frontmatter.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `convex/programs.ts` | 213 | Comment: "Internal migration: remove deprecated isActive field" | Info | Comment documents completed migration — not a stub or placeholder; harmless |

No blocking or warning-level anti-patterns found. The `removeIsActive` mutation is a legitimate migration helper, not a stub.

---

### Human Verification Required

**1. Programs sidebar icon renders correctly in browser**

**Test:** Open the app in the browser, navigate to any page, and observe the sidebar. Look at the "Programs" link icon.

**Expected:** A 2x2 grid of four rounded square blocks is visible as the Programs sidebar icon. The icon is white/light on the dark sidebar background and matches the visual style of other sidebar icons.

**Why human:** SVG rendering must be confirmed visually. The code has four `<rect>` elements with correct attributes, but browser rendering quirks (scaling, stroke clipping) are only observable in the UI.

---

**2. Add Program modal has no Active checkbox**

**Test:** Navigate to `/clients`, click the Programs tab, click "Add Program". Inspect the modal form fields.

**Expected:** The form shows only: Program Name, Type (dropdown), Description (textarea). No Active/Inactive checkbox, no toggle, no status field of any kind.

**Why human:** While grep confirms zero `isActive` in the file, the full modal markup should be confirmed live to rule out any conditional rendering paths.

---

**3. Real client data is visible on /clients page**

**Test:** Navigate to `/clients`. Check the client count badge (expected ~428). Click a few clients to see their names and program enrollments. Click the "Legal Aid Program" and "Co-Parent Counseling" tabs.

**Expected:** Real client names are listed (not placeholder names like "John Doe" or "Test Client"). Legal and coparent tabs show meaningful counts. Individual client records show ethnicity, zip code, and other demographics from the master spreadsheet where populated.

**Why human:** The import script ran and committed successfully, but the live Convex database state cannot be queried from this verification context. Only a browser check can confirm the data is actually visible.

---

### Gaps Summary

No gaps found. All automated must-haves pass at all three levels (exists, substantive, wired). The three human verification items above are confirmatory checks, not suspected failures — the code evidence strongly supports all three will pass when verified in the browser.

---

_Verified: 2026-03-02T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
