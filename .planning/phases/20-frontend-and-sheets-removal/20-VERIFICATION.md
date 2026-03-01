---
phase: 20-frontend-and-sheets-removal
verified: 2026-03-01T00:00:00Z
status: human_needed
score: 5/6 must-haves verified (SC5 needs human re-check of live Calendar sync)
re_verification: false
human_verification:
  - test: "Open the running app and navigate to the Dashboard page"
    expected: "Google Calendar widget displays upcoming events (not blank or error state)"
    why_human: "Calendar syncing depends on runtime environment (OAuth token, Convex cron firing), cannot be verified statically. The architecture is independent (reads googleCalendarConfig, not googleSheetsConfig), but the live sync state must be confirmed in the browser."
---

# Phase 20: Frontend and Sheets Removal — Verification Report

**Phase Goal:** The /clients page shows all clients in one unified list with enrollment-based role filtering; Google Sheets program sync is removed from all backend and frontend surfaces; the app is the sole source of truth for client and program data
**Verified:** 2026-03-01
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| #   | Truth                                                                                                   | Status      | Evidence                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| SC1 | Admin/staff/manager see all clients in one list regardless of program enrollment                        | VERIFIED  | `listWithPrograms` RBAC block only executes for `lawyer`/`psychologist` roles; admin/staff/manager fall through to full client list (clients.ts lines 68-88) |
| SC2 | Lawyer sees only clients with active legal enrollments; psychologist sees only co-parent enrollments    | VERIFIED  | `listWithPrograms` builds `legalProgramIds`/`coparentProgramIds` Sets from programs, then filters `allActiveEnrollments` (by_status index) to eligible clientIds, then filters clients array (clients.ts lines 69-88) |
| SC3 | Client detail page shows all enrollments across programs alongside intake forms                         | VERIFIED  | Enrollments card rendered at page.tsx line 717-765; `hasLegalEnrollment`/`hasCoparentEnrollment` gate intake sections at lines 768 and 828; `getByIdWithIntake` returns `enrollments` array enriched with `programName` and `programType` (clients.ts lines 277-299) |
| SC4 | Admin console no longer shows Google Sheets program config section; Sheets program sync cron no longer runs | VERIFIED  | `AdminTab` type has no `"google-sheets"` entry; TABS array has no google-sheets object; `renderTabContent` switch has no google-sheets case; `GoogleSheetsConfig.tsx` deleted; `runSync` only calls `syncGrantTracker`; `syncProgramData` function deleted from `googleSheetsActions.ts` |
| SC5 | Google Calendar data continues syncing correctly after Sheets removal                                   | HUMAN NEEDED | Architecture confirms independence (`googleCalendarSync.ts` reads `googleCalendarConfig` table, not `googleSheetsConfig`). Human approval recorded in 20-02-SUMMARY but cannot be re-verified statically. A live Calendar widget check is recommended. |
| SC6 | Proactive alerts panel no longer shows a Sheets staleness warning for program data                      | VERIFIED  | `alerts.ts` has no Section E, no `sync-sheets-stale` id, no `sheetsConfigs` query, no `latestSheetSync` variable. Sections jump from D (QB) to F (Calendar) — gap confirms Section E was deleted. `sheetsStalenessHours` remains in config load (intentional — avoids schema error; Phase 21 removes it per plan). |

**Score:** 5/6 success criteria verified (SC5 requires live human check)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Provides | Status | Details |
| -------- | -------- | ------ | ------- |
| `convex/clients.ts` | Enrollment-based RBAC in `listWithPrograms`, `getStats`, `getStatsByProgram`; enriched `getByIdWithIntake` | VERIFIED | File exists, substantive (127 lines added in commit 0627bb3). All four handlers use `enrollments` table with `by_status` index scan. `getByIdWithIntake` returns `enrollments: enrollmentsWithProgram` with `programName` and `programType`. |
| `src/app/(dashboard)/clients/[id]/page.tsx` | Enrollments card; enrollment-based intake section gating | VERIFIED | File exists, substantive (69 lines added in commit ac0f5fa). `hasLegalEnrollment`/`hasCoparentEnrollment` declared at line 408-409. Enrollments card at lines 717-765. Legal intake gated by `hasLegalEnrollment` at line 768. Co-parent intake gated by `hasCoparentEnrollment` at line 828. |

### Plan 02 Artifacts

| Artifact | Provides | Status | Details |
| -------- | -------- | ------ | ------- |
| `convex/googleSheetsSync.ts` | `runSync` calling only `syncGrantTracker` | VERIFIED | File is 22 lines. `runSync` contains one try/catch block calling `syncGrantTracker` only. No `syncProgramData` present. |
| `convex/googleSheetsActions.ts` | `triggerSync` grant-only; `syncProgramData` deleted | VERIFIED | `triggerSync` is 4-line handler calling only `syncGrantTracker`. `syncProgramData` not present anywhere in file. |
| `convex/alerts.ts` | `getAlerts` without Section E (Sheets staleness) | VERIFIED | Sections A-D-F present; Section E absent. No `sync-sheets-stale` alert id. No `sheetsConfigs` query. |
| `src/app/(dashboard)/admin/page.tsx` | Admin page without `google-sheets` tab | VERIFIED | `AdminTab` type union has 8 values, none is `"google-sheets"`. TABS array has 8 entries (users, quickbooks, constant-contact, google-calendar, knowledge-base, alerts, audit-log, ai-config). `renderTabContent` switch has no google-sheets case. `GoogleSheetsConfig` import removed. |
| `src/components/admin/GoogleSheetsConfig.tsx` | Component deleted | VERIFIED | File does not exist on disk. No imports reference it anywhere in `src/`. |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `convex/clients.ts:listWithPrograms` | enrollments table | `by_status` index scan | WIRED | Line 62-65: `.query("enrollments").withIndex("by_status", q => q.eq("status", "active")).collect()` — one fetch reused for both RBAC and programType filtering |
| `convex/clients.ts:getByIdWithIntake` | enrollments table | `by_clientId` index scan | WIRED | Line 278-281: `.query("enrollments").withIndex("by_clientId", q => q.eq("clientId", args.clientId)).collect()` |
| `src/app/(dashboard)/clients/[id]/page.tsx` | `convex/clients.ts:getByIdWithIntake` | `data.enrollments` | WIRED | Lines 408-409, 536-542, 589-591, 722-764: `data.enrollments` accessed in 5 distinct places — header subtitle, Client Info card, Enrollments card, hasLegalEnrollment, hasCoparentEnrollment |

### Plan 02 Key Links

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `convex/googleSheetsSync.ts:runSync` | `convex/googleSheetsActions.ts:syncGrantTracker` | `ctx.runAction` internal call | WIRED | Line 16: `await ctx.runAction(internal.googleSheetsActions.syncGrantTracker, {})` — only call present |
| `convex/crons.ts` | `convex/googleSheetsSync.ts:runSync` | cron job (sheets-sync) | PRESUMED WIRED | Cron wiring not changed in Phase 20; grant sync still runs via existing cron schedule |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| CLNT-01 | 20-01-PLAN.md | All clients displayed in one unified list regardless of program type | SATISFIED | `listWithPrograms` does not filter admin/staff/manager; only lawyer/psychologist get enrollment-based RBAC |
| CLNT-02 | 20-01-PLAN.md | Lawyers see only clients with legal enrollments; psychologists see only co-parent | SATISFIED | Enrollment-based Set filter in `listWithPrograms`, `getStats`, `getStatsByProgram` using `by_status` index |
| CLNT-03 | 20-01-PLAN.md | Client detail page shows all enrollments across programs with intake forms | SATISFIED | Enrollments card present; `getByIdWithIntake` returns enriched enrollments; intake gating uses enrollment booleans |
| INFR-01 | 20-02-PLAN.md | Sheets program sync cron removed (grant sync preserved) | SATISFIED | `runSync` calls only `syncGrantTracker`; `syncProgramData` deleted entirely from all Convex files |
| INFR-04 | 20-02-PLAN.md | Google Sheets program config removed from admin UI | SATISFIED | Tab type, TABS entry, switch case, import all removed; component file deleted |
| INFR-05 | 20-02-PLAN.md | alerts.ts Sheets staleness check removed | SATISFIED | Section E deleted; no `sync-sheets-stale` id emitted; `sheetsStalenessHours` read but never used in alert logic (intentional per plan) |
| INFR-06 | 20-02-PLAN.md | Calendar auth verified working after Sheets config removal | NEEDS HUMAN | Architecture confirms independence; human-verified during plan execution (20-02-SUMMARY); recommend confirming live Calendar widget |

**Note on INFR-02 and INFR-03:** These are mapped to Phase 21 in REQUIREMENTS.md (`programDataCache` table removal, legacy `programId`/`enrollmentDate`/`status` field removal from clients schema). They are not Phase 20 requirements and are correctly not implemented here. INFR-02 and INFR-03 are tracked as pending in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `convex/googleSheetsInternal.ts` | 58 | `upsertProgramParticipant` internalMutation — dead code (no callers after `syncProgramData` deletion) | Info | No functional impact. Per plan decision: Phase 21 handles dead code cleanup. Not a blocker. |
| `convex/alerts.ts` | 24 | `sheetsStalenessHours` read from alertConfig but never used in any alert condition after Section E removal | Info | No functional impact. Field value is loaded but never referenced in a condition. Per plan decision: Phase 21 cleans schema. Not a blocker. |

No blocker or warning anti-patterns found. Both info-level findings are intentional per documented plan decisions.

---

## Human Verification Required

### 1. Google Calendar Widget Live Check

**Test:** Log into the running app in a browser and navigate to the Dashboard page.
**Expected:** The Google Calendar widget displays upcoming events (not blank, spinner, or error state).
**Why human:** Calendar syncing depends on runtime Convex cron execution and a valid OAuth token in the production environment. The static architecture confirms independence (reads `googleCalendarConfig`, not `googleSheetsConfig`) and human approval was recorded in 20-02-SUMMARY, but the live runtime state cannot be confirmed programmatically.

---

## Summary

Phase 20 goal is **substantially achieved**. All six success criteria pass automated verification except SC5 (Calendar live sync), which was human-approved during plan execution and has sound architectural independence.

**Plan 01 (CLNT-01/02/03):** The client queries were rewired cleanly. `listWithPrograms`, `getStats`, and `getStatsByProgram` all use `by_status` index scans on the enrollments table for RBAC, with the legacy `clients.programId` pattern fully replaced for role-based access. `getByIdWithIntake` returns an enriched `enrollments` array. The client detail page shows an Enrollments card with status dots, program name, dates, and badges. Intake form sections are gated by enrollment type booleans.

**Plan 02 (INFR-01/04/05/06):** The Sheets program sync infrastructure is completely removed — `syncProgramData` deleted from all Convex files, `runSync` trimmed to grant-only, `triggerSync` trimmed to grant-only, Section E excised from `alerts.ts`, the `google-sheets` admin tab removed at all three required locations (type, TABS array, switch case), and `GoogleSheetsConfig.tsx` deleted. No `syncProgramData` or `sync-sheets-stale` references remain anywhere in the codebase.

---

_Verified: 2026-03-01_
_Verifier: Claude (gsd-verifier)_
