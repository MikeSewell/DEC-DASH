---
phase: 21-schema-cleanup
verified: 2026-03-02T01:05:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Open Admin > Alerts Configuration and confirm there is no Google Sheets Staleness input field"
    expected: "The Alerts Config panel shows only: Deadline Window, Budget Variance, QB Staleness, Calendar Staleness — no Sheets field"
    why_human: "UI field presence cannot be verified via static analysis alone; depends on rendered component state"
  - test: "Open the dashboard Programs sections (Legal Aid, Co-Parent Counseling) and confirm demographics charts render from client data (not a placeholder)"
    expected: "Charts show gender, age, ethnicity, zip distribution data drawn from clients table"
    why_human: "Requires runtime data in Convex — chart rendering cannot be verified statically"
---

# Phase 21: Schema Cleanup Verification Report

**Phase Goal:** The Convex schema accurately reflects only the new data model — legacy fields and deprecated tables are fully removed after their documents have been cleared
**Verified:** 2026-03-02T01:05:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | programDataCache table no longer exists in schema | VERIFIED | `grep "programDataCache" convex/schema.ts` returns zero results; table absent from all 427 lines |
| 2 | No backend or frontend code references programDataCache (as a table), getProgramDemographics, or upsertProgramParticipant | VERIFIED | Full codebase grep finds only `clearProgramDataCache` mutation body (expected cleanup artifact) and a Phase 18 migration script reading historical client fields |
| 3 | sheetsStalenessHours removed from alertConfig schema, backend code, and admin UI | VERIFIED | Zero results for `sheetsStalenessHours` in both `convex/` and `src/` directories |
| 4 | ProgramsLegal and ProgramsCoparent render data from clients table via getAllDemographics | VERIFIED | Both components use `useQuery(api.analytics.getAllDemographics, { programId: ... })` with program lookup via `api.programs.list` |
| 5 | clients schema definition no longer contains programId, enrollmentDate, or status fields | VERIFIED | clients table in schema.ts (lines 128-142) contains only: firstName, lastName, zipCode, ageGroup, ethnicity, notes, createdAt, gender, referralSource, dateOfBirth, phone, email |
| 6 | by_programId index removed from clients table | VERIFIED | clients table definition has no `.index()` calls; enrollments table retains its own by_programId index |
| 7 | programs.remove() checks enrollments table instead of clients.by_programId | VERIFIED | `convex/programs.ts` remove() queries `enrollments.withIndex("by_programId")` |
| 8 | analytics.getAllDemographics() filters via enrollments join, not clients.by_programId | VERIFIED | `convex/analytics.ts` uses `enrollments.withIndex("by_programId")` to build enrolled client ID set |
| 9 | npx convex dev --once deploys without schema validation errors | VERIFIED | Ran `npx convex dev --once` — completed successfully: "Convex functions ready! (6.37s)" |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/schema.ts` | Schema without programDataCache table and without sheetsStalenessHours in alertConfig | VERIFIED | programDataCache absent; alertConfig has 4 fields (deadlineWindowDays, budgetVariancePct, qbStalenessHours, calendarStalenessHours); clients table has no programId/enrollmentDate/status/by_programId |
| `convex/googleSheetsInternal.ts` | clearProgramDataCache internalMutation present; upsertProgramParticipant deleted | VERIFIED | clearProgramDataCache at lines 58-67; upsertProgramParticipant absent |
| `convex/googleSheets.ts` | getProgramDemographics deleted | VERIFIED | Function absent; confirmed via grep |
| `src/hooks/useGrantTracker.ts` | useProgramDemographics deleted | VERIFIED | Function absent; confirmed via grep |
| `src/components/dashboard/ProgramsLegal.tsx` | Legal demographics from getAllDemographics | VERIFIED | Lines 71-76: `useQuery(api.analytics.getAllDemographics, legalProgram ? { programId: legalProgram._id } : "skip")` |
| `src/components/dashboard/ProgramsCoparent.tsx` | Co-parent demographics from getAllDemographics | VERIFIED | Lines 71-76: `useQuery(api.analytics.getAllDemographics, coparentProgram ? { programId: coparentProgram._id } : "skip")` |
| `convex/clients.ts` | All 11 functions rewritten without programId/enrollmentDate/status args | VERIFIED | create() has only firstName/lastName/zipCode/ageGroup/ethnicity/notes; getStats() and getStatsByProgram() use enrollments.by_status; getByProgram() uses enrollments.by_programId |
| `convex/programs.ts` | remove() and getStats() use enrollments table | VERIFIED | remove() queries enrollments.by_programId; getStats() queries enrollments.by_programId per program |
| `convex/analytics.ts` | getAllDemographics uses enrollment join | VERIFIED | Lines 186-211: programId filter via enrollments join; active/completed counts via enrollment status |
| `src/app/(dashboard)/clients/page.tsx` | Add Client form has no programId, enrollmentDate, or status fields | VERIFIED | ClientFormData interface has only firstName/lastName/zipCode/ageGroup/ethnicity/notes; no programId in emptyClientForm or handleAddClient |
| `src/app/(dashboard)/clients/[id]/page.tsx` | Client detail derives status and enrolled date from enrollments | VERIFIED | Lines 589-596: status derived from enrollments array; lines 604-606: enrolled date from enrollments[0].enrollmentDate |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `convex/googleSheetsInternal.ts clearProgramDataCache` | programDataCache documents | `ctx.db.query("programDataCache").collect()` | WIRED | Function exists and queries the table (table is now empty; schema removal already deployed) |
| `src/components/dashboard/ProgramsLegal.tsx` | `convex/analytics.ts getAllDemographics` | `useQuery(api.analytics.getAllDemographics)` | WIRED | Pattern confirmed at lines 73-76 |
| `src/components/dashboard/ProgramsCoparent.tsx` | `convex/analytics.ts getAllDemographics` | `useQuery(api.analytics.getAllDemographics)` | WIRED | Pattern confirmed at lines 73-76 |
| `convex/programs.ts remove()` | enrollments table by_programId index | `ctx.db.query("enrollments").withIndex("by_programId")` | WIRED | Lines 119-126 |
| `convex/analytics.ts getAllDemographics()` | enrollments table | `ctx.db.query("enrollments").withIndex("by_programId")` | WIRED | Lines 186-195 for client filter; lines 200-211 for active/completed counts |
| `convex/clients.ts getStats()` | enrollments table by_status index | `ctx.db.query("enrollments").withIndex("by_status")` | WIRED | Lines 127-130 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFR-02 | 21-01-PLAN.md | programDataCache table cleared and removed from schema | SATISFIED | programDataCache absent from schema.ts; dead code (upsertProgramParticipant, getProgramDemographics, useProgramDemographics) deleted; clearProgramDataCache confirms table was drained before removal |
| INFR-03 | 21-02-PLAN.md | Legacy programId, enrollmentDate, status fields removed from clients schema | SATISFIED | clients table definition confirmed clean; all 11 callers in clients.ts rewritten; frontend forms updated; schema deploys cleanly |

Both INFR-02 and INFR-03 are satisfied. No orphaned requirements found for Phase 21 in REQUIREMENTS.md.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `convex/googleSheetsInternal.ts` | 57-67 | `clearProgramDataCache` queries a table (`programDataCache`) that no longer exists in schema | INFO | The Convex deploy succeeds because Convex tolerates function bodies referencing tables that don't exist in schema (it only validates at runtime when the function is called). The function is now dead code — the table is gone. Low risk: function is internal, not called by any cron or frontend. |
| `convex/migration.ts` | 52, 67, 75, 79 | Reads `client.programId` and `client.status` | INFO | Phase 18 one-time migration script, not active runtime code. Reads historical document fields that may still exist on older documents even after schema field removal (Convex allows this). Not a blocker. |

No blocker anti-patterns found.

---

### Human Verification Required

#### 1. Alerts Config UI — No Sheets Staleness Field

**Test:** Open Admin > Alerts Configuration in the running app
**Expected:** The panel shows exactly 4 threshold inputs: Deadline Window, Budget Variance, QB Data Staleness, Calendar Data Staleness — with no "Google Sheets Staleness" field
**Why human:** AlertsConfig.tsx was modified to remove the field; static analysis confirms the removal, but rendering must be verified in browser

#### 2. Dashboard Demographics Charts — Data from Clients Table

**Test:** Open the dashboard and find the "Legal Aid Program" and "Co-Parent Counseling" sections
**Expected:** Demographics charts (gender, age, ethnicity, zip distribution) render with real data — not a "Connect Google Sheets" placeholder or empty state
**Why human:** Requires actual enrollment and client data in Convex to render; chart rendering cannot be statically verified

---

### Gaps Summary

No gaps. All 9 observable truths verified, all artifacts substantive and wired, all key links confirmed, both requirements satisfied, schema deploys cleanly.

The only notable items are two INFO-level observations:
1. `clearProgramDataCache` in `googleSheetsInternal.ts` references the now-removed `programDataCache` table. This is harmless dead code — the function will only fail if called (which it won't be, since it's no longer referenced anywhere), and Convex validates table existence at call time, not deploy time.
2. `convex/migration.ts` (Phase 18 one-time script) reads historical `client.programId` and `client.status` fields. This is expected — migration scripts read documents as they exist on disk regardless of schema definition.

Neither item affects the goal achievement of Phase 21.

---

_Verified: 2026-03-02T01:05:00Z_
_Verifier: Claude (gsd-verifier)_
