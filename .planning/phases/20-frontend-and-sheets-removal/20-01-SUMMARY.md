---
phase: 20-frontend-and-sheets-removal
plan: "01"
subsystem: clients
tags: [rbac, enrollments, client-detail, backend, frontend]
dependency_graph:
  requires: [phase-18-data-migration, enrollments-table]
  provides: [enrollment-based-rbac, client-detail-enrollments-card]
  affects: [clients-page, client-detail-page, lawyer-role, psychologist-role]
tech_stack:
  added: []
  patterns: [enrollment-join-rbac, index-scan-by-status, enriched-return-type]
key_files:
  created: []
  modified:
    - convex/clients.ts
    - src/app/(dashboard)/clients/[id]/page.tsx
decisions:
  - "Fetch all active enrollments once per handler and reuse for both RBAC and programType filtering — avoids duplicate DB reads"
  - "getStatsByProgram counts clients per enrollment type (client may appear in legal + coparent counts if enrolled in both)"
  - "getStatsByProgram falls back to legacy clients.programId for active clients with no active enrollments"
  - "getByIdWithIntake keeps legacy program field alongside new enrollments array for backward compatibility (removed Phase 21)"
  - "Enrollment Badge status uses existing statusVariant map with ?? default fallback for pending/on_hold states"
metrics:
  duration_seconds: 180
  completed_date: "2026-03-01"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 20 Plan 01: Enrollment-Based RBAC and Client Detail Enrollments Summary

**One-liner:** Rewired four client queries from legacy `clients.programId` RBAC to enrollment table joins, and added an Enrollments card to the client detail page with enrollment-aware intake form gating.

## What Was Built

**Task 1 — Backend: Enrollment-Based RBAC (`convex/clients.ts`)**

Rewrote four query handlers to use the `enrollments` table instead of `clients.programId` for role filtering and program type assignment:

- **`listWithPrograms`**: Fetches all active enrollments once via `by_status` index scan. Lawyer/psychologist role filter builds a Set of eligible clientIds from active enrollments in qualifying programs. The `programType` UI filter also uses enrollment-based clientId sets. One enrollment fetch reused for both passes.
- **`getStats`**: Lawyer/psychologist roles fetch active enrollments via `by_status` index, filter to qualifying program type, build eligible clientId Set. Other roles see all clients.
- **`getStatsByProgram`**: Fetches active enrollments once. Builds `clientEnrollmentTypes` map (clientId → Set of program types). Active clients counted by enrollment type, not `clients.programId`. Falls back to legacy `programId` for clients with no active enrollments.
- **`getByIdWithIntake`**: Fetches all enrollments for the client via `by_clientId` index, enriches each with `programName` and `programType` from a programs map. Returns `enrollments` array alongside legacy `program` field (backward compat).

**Task 2 — Frontend: Enrollments Card and Intake Gating (`src/app/(dashboard)/clients/[id]/page.tsx`)**

- Added `cn` import from `@/lib/utils`
- Replaced `const programType = data.program?.type` with `hasLegalEnrollment` and `hasCoparentEnrollment` booleans derived from `data.enrollments?.some()`
- Legal intake section gated by `hasLegalEnrollment` (not legacy `programType === "legal"`)
- Co-parent intake section gated by `hasCoparentEnrollment`
- Added **Enrollments card** between Client Information and intake sections: colored status dot (green/blue/red/yellow), program name, enrollment/exit dates, Badge with status
- Header subtitle shows active enrollment program name (fallback chain: first active → first enrollment → legacy program name → "No program")
- Program field in Client Info card shows comma-joined list of all enrollment program names, falling back to legacy `data.program?.name`

## Verification

- `npx convex dev --once` — deployed cleanly
- `npx next build` — compiled without errors or warnings
- All four query handlers use `by_status` index scan for enrollments (no full-table scans)
- `data.enrollments` is the source of truth for intake form visibility

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Met

- CLNT-01: Admin/staff/manager see all clients (RBAC filter only applies to lawyer/psychologist)
- CLNT-02: Lawyer sees only clients with active legal enrollments; psychologist sees only co-parent enrollment clients
- CLNT-03: Client detail page shows all enrollments across programs with intake forms gated by enrollment type

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | `0627bb3` | `convex/clients.ts` |
| 2 | `ac0f5fa` | `src/app/(dashboard)/clients/[id]/page.tsx` |

## Self-Check: PASSED

- FOUND: `.planning/phases/20-frontend-and-sheets-removal/20-01-SUMMARY.md`
- FOUND: `convex/clients.ts`
- FOUND: `src/app/(dashboard)/clients/[id]/page.tsx`
- FOUND commit: `0627bb3`
- FOUND commit: `ac0f5fa`
