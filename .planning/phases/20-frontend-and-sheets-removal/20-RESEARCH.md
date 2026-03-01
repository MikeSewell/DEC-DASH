# Phase 20: Frontend and Sheets Removal — Research

**Researched:** 2026-03-01
**Domain:** Convex cron/backend cleanup, Next.js frontend refactor, enrollment-based RBAC
**Confidence:** HIGH — all findings sourced directly from the live codebase

---

## Summary

Phase 20 is a surgical cleanup phase. The goal is to make the `/clients` page enrollment-aware (CLNT-01, CLNT-02, CLNT-03), remove the Google Sheets program sync infrastructure (INFR-01, INFR-04, INFR-05), and verify Google Calendar still works after those removals (INFR-06).

There is no new data model work needed — the `enrollments` table was built in Phase 16 and populated in Phase 18. The work is wiring the existing `enrollments.listByClient` query into the client detail page, rewriting the `listWithPrograms`/`getStats`/`getStatsByProgram` queries to join through enrollments instead of `clients.programId`, removing three surfaces that reference program-scoped Sheets config (admin UI tab, cron job step, alerts.ts Section E), and verifying the Calendar cron is fully independent.

The biggest risk is that `clients.listWithPrograms`, `clients.getStats`, and `clients.getStatsByProgram` currently filter by `programId` on the `clients` table. Phase 21 will eventually remove that legacy field, but for Phase 20, the RBAC filter must be re-expressed via a join: for each client, look up their enrollments, find whether any active enrollment links to a program of the required type. The correct approach is to query enrollments grouped by clientId, not to touch the clients table's `programId` field.

The second risk is that `googleSheetsSync.runSync` calls both `syncGrantTracker` AND `syncProgramData`. Removing the program sync must NOT disturb the grant sync. The cron itself does not need to be removed — only the two `syncProgramData` calls inside `googleSheetsSync.runSync` should be deleted, and the `triggerSync` action in `googleSheetsActions.ts` similarly trimmed.

Google Calendar is confirmed fully independent: `googleCalendarSync.runSync` reads `googleCalendarConfig` (a separate table), not `googleSheetsConfig`. Removing the Sheets program config cannot break Calendar.

**Primary recommendation:** Execute in four small, sequentially deployable changes: (1) backend query rewrite for RBAC via enrollments, (2) client detail page enrollment section, (3) cron/action cleanup for Sheets program sync, (4) admin UI Sheets tab removal and alerts.ts Section E deletion.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLNT-01 | All clients displayed in one unified list regardless of program type | `clients.listWithPrograms` already returns all clients; the tab-based program-type filter can stay as a UI convenience. The key change is that admin/staff/manager see ALL clients regardless of programId. |
| CLNT-02 | Lawyers see only clients with active legal enrollments; psychologists see only co-parent enrollments | Currently filtered by `clients.programId` → must be rewritten to join through `enrollments` table using `by_clientId` index, then check `enrollment.status === "active"` and join to `programs` for type check. |
| CLNT-03 | Client detail page shows all enrollments across programs with intake forms | `clients.getByIdWithIntake` currently fetches `client.programId` for one program. Must add `enrollments.listByClient` call and surface all enrollments in the UI alongside the existing intake sections. |
| INFR-01 | Sheets program sync cron removed (grant sync preserved) | `crons.ts` → `googleSheetsSync.runSync` → two `syncProgramData` calls. Remove those calls from `runSync`; the `syncGrantTracker` call stays. The cron entry "sheets-sync" stays (grant tracker still uses it). |
| INFR-04 | Google Sheets program config removed from admin UI | Admin page has a "Google Sheets" tab (id: `"google-sheets"`) that renders `GoogleSheetsConfig` component. Remove the tab entry from `TABS` array and remove the `case "google-sheets"` from `renderTabContent()`. Also remove the "Google Sheets Sync Interval" static line in `SettingsPanel`. |
| INFR-05 | alerts.ts Sheets staleness check removed | Section E in `convex/alerts.ts` (lines 154-177) checks `googleSheetsConfig` for `lastSyncAt`. Delete Section E entirely. The `sheetsStalenessHours` field on `alertConfig` table becomes an unused dead field (leave it — schema cleanup is Phase 21). |
| INFR-06 | Calendar auth verified working after Sheets config removal | `googleCalendarSync.runSync` reads `googleCalendarConfig` table directly, not `googleSheetsConfig`. No code path links Calendar to Sheets config. Verification is manual: confirm the Calendar cron still fires and the Calendar widget still displays events after deployment. |
</phase_requirements>

---

## Architecture Patterns

### Current RBAC Implementation (WRONG for Phase 20)

The existing `listWithPrograms` and `getStats` use `clients.programId` to filter:

```typescript
// convex/clients.ts — current (Phase 20 must replace this pattern)
if (user.role === "lawyer") {
  const legalProgramIds = new Set(
    programs.filter((p) => p.type === "legal").map((p) => p._id)
  );
  clients = clients.filter((c) => c.programId && legalProgramIds.has(c.programId));
}
```

This is wrong post-migration because a client's authoritative program membership is now in the `enrollments` table, not `clients.programId`.

### Target RBAC Pattern (Enrollment Join)

For role-filtered queries (lawyer/psychologist), the correct approach is:

```typescript
// Pseudocode for enrollment-based RBAC filter
const enrollments = await ctx.db.query("enrollments").collect();

// Build a map: clientId -> Set<programId> for active enrollments
const clientActivePrograms = new Map<string, Set<string>>();
for (const e of enrollments) {
  if (e.status !== "active") continue;
  if (!clientActivePrograms.has(e.clientId)) {
    clientActivePrograms.set(e.clientId, new Set());
  }
  clientActivePrograms.get(e.clientId)!.add(e.programId);
}

// Filter clients: keep those with at least one active enrollment
// in a program of the required type
if (user.role === "lawyer") {
  const legalProgramIds = new Set(
    programs.filter((p) => p.type === "legal").map((p) => p._id)
  );
  clients = clients.filter((c) => {
    const progIds = clientActivePrograms.get(c._id);
    if (!progIds) return false;
    return [...progIds].some((pid) => legalProgramIds.has(pid));
  });
}
```

For the list page, this approach is correct. However, collecting ALL enrollments is expensive at scale. The better approach uses a two-step index scan:

```typescript
// Step 1: For each qualifying programId, get enrollments via by_programId index
// Step 2: Collect unique clientIds from those enrollments
// Step 3: Filter clients to that set
```

For 350 clients and a small number of programs, collecting all enrollments (~350 records) and building a map is acceptable and avoids N+1 queries.

### Client Detail Page — Enrollment Section

Currently `getByIdWithIntake` fetches `client.programId` for one program. Phase 20 adds:
1. A new query or an enriched version of `getByIdWithIntake` that also fetches all enrollments via `enrollments.listByClient`
2. The UI renders an "Enrollments" card listing all enrollments (program name, status, date) before or after the Client Information card
3. The existing legal/co-parent intake section logic (currently gated on `programType === "legal"` from the single linked program) needs to be broadened: show legal intake if ANY enrollment links to a legal program; show co-parent intake if ANY enrollment links to a co-parent program

The cleanest approach: add an `enrollments` field to `getByIdWithIntake`'s return value. No new Convex query function needed.

### Cron Cleanup

`convex/googleSheetsSync.ts` currently calls three things:
1. `syncGrantTracker` — KEEP
2. `syncProgramData` (coparent) — REMOVE
3. `syncProgramData` (legal) — REMOVE

`convex/googleSheetsActions.ts` `triggerSync` action calls the same three; remove the two `syncProgramData` calls from `triggerSync` as well.

The `syncProgramData` function itself can be left in place (Phase 21 removes dead code) or deleted — deleting is cleaner and prevents future confusion. Since `googleSheetsInternal.upsertProgramParticipant` would also become dead code, it can be deleted too, but leave `programDataCache` table in schema (Phase 21 removes it after clearing documents).

### Admin UI Tab Removal

In `/src/app/(dashboard)/admin/page.tsx`:
1. Remove `{ id: "google-sheets", label: "Google Sheets", icon: ... }` from `TABS` array
2. Remove `case "google-sheets": return <GoogleSheetsConfig />;` from `renderTabContent()`
3. Remove the `import GoogleSheetsConfig from "@/components/admin/GoogleSheetsConfig"` import
4. Remove the "Google Sheets Sync Interval" `<div>` block from `SettingsPanel` component
5. The `GoogleSheetsConfig.tsx` component file can be deleted (or left as dead code — Phase 21)
6. The `useSheetsConfig` and `useSheetsSync` functions in `useGrantTracker.ts` become unused by admin UI — can be left (used nowhere else) or deleted

### Alerts Section E Removal

In `convex/alerts.ts`, Section E (lines 154-177) reads `googleSheetsConfig` to check staleness:

```typescript
// ─── Section E: ALRT-03 — Google Sheets sync staleness ───────────────────
try {
  const sheetsConfigs = await ctx.db.query("googleSheetsConfig").collect();
  if (sheetsConfigs.length > 0) {
    const latestSheetSync = Math.max(...sheetsConfigs.map((c) => c.lastSyncAt ?? 0));
    if (latestSheetSync > 0 && now - latestSheetSync > config.sheetsStalenessHours * 60 * 60 * 1000) {
      alerts.push({ id: "sync-sheets-stale", ... });
    }
  }
} catch { }
```

Delete this entire try/catch block. Leave `sheetsStalenessHours` in `alertConfig` table schema and in `alertConfig` collection query at top of handler (Phase 21 cleans schema). The `config.sheetsStalenessHours` reference in the deleted section is the only usage.

---

## Common Pitfalls

### Pitfall 1: Breaking Admin UI with orphaned TabType
**What goes wrong:** TypeScript `AdminTab` union type includes `"google-sheets"`. If the tab entry is removed from the array but the type is not updated, or vice versa, `switch` `case` statements will have dead arms that TypeScript may warn about.
**How to avoid:** Remove `"google-sheets"` from both the `AdminTab` type union AND the `TABS` array AND the `switch` case simultaneously.

### Pitfall 2: Intake form display logic breaks after enrollment change
**What goes wrong:** Client detail page currently gates legal/co-parent intake sections on `data.program?.type === "legal"`. After Phase 20, a client may have zero `programId` on the clients row but have active enrollments. The gate condition would always be false, hiding valid intakes.
**How to avoid:** Change the gate to check whether any enrollment in `data.enrollments` links to a legal/co-parent program, not `data.program.type`.

### Pitfall 3: Deleting `syncProgramData` breaks `triggerSync` action
**What goes wrong:** `googleSheetsActions.triggerSync` (a public `action`) calls `syncProgramData`. If the function is removed from the file without updating `triggerSync`, the Convex build will fail.
**How to avoid:** Update `triggerSync` to only call `syncGrantTracker` before or simultaneously with deleting `syncProgramData`.

### Pitfall 4: `useProgramDemographics` hook still used somewhere
**What goes wrong:** `useGrantTracker.ts` exports `useProgramDemographics` which calls `googleSheets.getProgramDemographics` (reads `programDataCache`). If any component still imports this after Phase 20, the query will return data but there's nothing wrong with that — however it's dead code that might confuse future developers.
**How to avoid:** Search for usages of `useProgramDemographics` before Phase 20 completion. As of Phase 19, `DemographicsTab` was refactored to use `useAllDemographics` from `useAnalytics.ts`, NOT `useProgramDemographics`. Confirmed no current callers.

### Pitfall 5: Calendar continues using Sheets `googleSheetsConfig` table
**What goes wrong:** Developer assumes Calendar reads from Sheets config and worries about breaking it.
**What's actually true:** `googleCalendarSync.runSync` reads from `googleCalendarConfig` table (confirmed in `googleCalendarInternal.ts` line 5: `ctx.db.query("googleCalendarConfig")`). The two tables are completely separate. Sheets config removal has zero effect on Calendar.
**Verification:** After deploy, check that the Calendar widget on dashboard still shows events and that the `google-calendar-sync` cron shows activity in Convex logs.

### Pitfall 6: `listWithPrograms` N+1 query issue
**What goes wrong:** Naive rewrite fetches all enrollments per client in a loop (N+1).
**How to avoid:** Fetch all enrollments at once, then build a Map from clientId to list of enrollments in memory. With ~350 clients, this is one query returning ~350 documents — fine.

### Pitfall 7: CLNT-01 misinterpreted — "all clients in one list"
**What goes wrong:** Developer interprets CLNT-01 as requiring removal of program-type tabs from the `/clients` page.
**What's actually true:** CLNT-01 means admin/staff/manager can see all clients (not siloed by programId). The tab-based filter (Legal, Co-Parent, All) is a UI convenience filter and stays. The change is that admin/staff/manager tab "All" shows every client, not just those with `clients.programId` in a particular set.
**Current state:** The existing query already works this way for admin/staff/manager — the `listWithPrograms` handler skips the role filter for non-lawyer/non-psychologist roles. CLNT-01 may already be satisfied. Verify and confirm before implementing.

---

## Code Examples

### Enrollment-Based `listWithPrograms` Rewrite

```typescript
// convex/clients.ts — updated listWithPrograms handler
export const listWithPrograms = query({
  args: {
    programType: v.optional(v.string()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const programs = await ctx.db.query("programs").collect();
    const programMap = new Map(programs.map((p) => [p._id, p]));

    let clients = await ctx.db.query("clients").collect();

    // Enrollment-based RBAC for lawyer/psychologist
    if (user.role === "lawyer" || user.role === "psychologist") {
      const requiredType = user.role === "lawyer" ? "legal" : "coparent";
      const qualifyingProgramIds = new Set(
        programs.filter((p) => p.type === requiredType).map((p) => p._id)
      );

      // Fetch all active enrollments in qualifying programs
      const activeEnrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();

      const eligibleClientIds = new Set(
        activeEnrollments
          .filter((e) => qualifyingProgramIds.has(e.programId))
          .map((e) => e.clientId)
      );

      clients = clients.filter((c) => eligibleClientIds.has(c._id));
    }

    // ... rest of filters (programType, status, search) unchanged
  },
});
```

### Updated `getByIdWithIntake` with Enrollments

```typescript
// convex/clients.ts — updated getByIdWithIntake
export const getByIdWithIntake = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;

    const program = client.programId ? await ctx.db.get(client.programId) : null;

    // Fetch ALL enrollments for this client
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();

    // Enrich enrollments with program names
    const allPrograms = await ctx.db.query("programs").collect();
    const programMap = new Map(allPrograms.map((p) => [p._id, p]));
    const enrollmentsWithProgram = enrollments.map((e) => ({
      ...e,
      programName: programMap.get(e.programId)?.name ?? "—",
      programType: programMap.get(e.programId)?.type ?? "other",
    }));

    const legalIntake = await ctx.db
      .query("legalIntakeForms")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    const coparentIntake = await ctx.db
      .query("coparentIntakeForms")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    return {
      ...client,
      program,
      enrollments: enrollmentsWithProgram,
      legalIntake,
      coparentIntake,
    };
  },
});
```

### Client Detail Page — Intake Gate Fix

```typescript
// src/app/(dashboard)/clients/[id]/page.tsx
// BEFORE (Phase 19):
const programType = data.program?.type;
{programType === "legal" && ( <LegalIntakeSection /> )}
{programType === "coparent" && ( <CoparentIntakeSection /> )}

// AFTER (Phase 20):
const hasLegalEnrollment = data.enrollments?.some((e) => e.programType === "legal");
const hasCoparentEnrollment = data.enrollments?.some((e) => e.programType === "coparent");
{hasLegalEnrollment && ( <LegalIntakeSection /> )}
{hasCoparentEnrollment && ( <CoparentIntakeSection /> )}
```

### Cron Cleanup — `googleSheetsSync.ts`

```typescript
// convex/googleSheetsSync.ts — AFTER Phase 20
export const runSync = internalAction({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.googleSheetsInternal.getFullConfig);
    if (!config) {
      console.log("Google Sheets not configured, skipping sync");
      return;
    }

    try {
      await ctx.runAction(internal.googleSheetsActions.syncGrantTracker, {});
      console.log("Google Sheets grant sync completed");
    } catch (error) {
      console.error("Google Sheets grant sync failed:", error);
    }

    // REMOVED: syncProgramData calls — program data now sourced from Convex clients table
  },
});
```

### `triggerSync` Action Cleanup

```typescript
// convex/googleSheetsActions.ts — AFTER Phase 20
export const triggerSync = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.googleSheetsActions.syncGrantTracker, {});
    // REMOVED: syncProgramData coparent and legal calls
  },
});
```

### Admin Tab Removal

```typescript
// src/app/(dashboard)/admin/page.tsx — AFTER Phase 20
type AdminTab =
  | "users"
  | "quickbooks"
  | "constant-contact"
  // "google-sheets"  <-- REMOVED
  | "google-calendar"
  | "knowledge-base"
  | "audit-log"
  | "ai-config"
  | "alerts";

const TABS = [
  // ... other tabs unchanged
  // REMOVED: { id: "google-sheets", label: "Google Sheets", icon: ... }
];

// In renderTabContent():
// REMOVED: case "google-sheets": return <GoogleSheetsConfig />;

// In SettingsPanel component, remove:
// <div>
//   <p className="text-sm font-medium text-foreground">Google Sheets Sync Interval</p>
//   <p className="text-sm text-muted mt-1">Every 30 minutes</p>
// </div>
```

### Alerts Section E Deletion

```typescript
// convex/alerts.ts — AFTER Phase 20 (Section E deleted entirely)
// Lines 154-177 removed:
// ─── Section E: ALRT-03 — Google Sheets sync staleness ───────────────────
// try { ... } catch { }
// Jump directly from Section D to Section F (Google Calendar staleness)
```

---

## Dependency Map

Understanding what depends on what prevents accidental breakage:

| Component Removed | Used By | Safe to Remove? |
|---|---|---|
| `syncProgramData` calls in `runSync` | `googleSheetsSync.runSync` cron | Yes — cron still fires for grant sync |
| `syncProgramData` calls in `triggerSync` | `GoogleSheetsConfig` UI "Sync Now" button (which is also being removed) | Yes |
| `syncProgramData` function itself | Only called by the two callers above | Yes, after removing callers |
| `upsertProgramParticipant` in `googleSheetsInternal.ts` | Only called by `syncProgramData` | Yes, after `syncProgramData` removed |
| `GoogleSheetsConfig` component | Admin page `case "google-sheets"` | Yes |
| `useSheetsSync` hook | `GoogleSheetsConfig` component only | Yes, after component removed |
| `useSheetsConfig` hook | `GoogleSheetsConfig` component only | Yes, after component removed |
| `getProgramDemographics` query in `googleSheets.ts` | `useProgramDemographics` hook only | Yes (confirmed: DemographicsTab uses `useAllDemographics` post-Phase 19) |
| Section E in `alerts.ts` | Nothing depends on the alert it emits | Yes |

**Do NOT remove:**
- `getConfig` from `googleSheets.ts` — may still be referenced (used by `useSheetsConfig` hook; hook can stay or be cleaned)
- `grantsCache` table and `syncGrantTracker` — grant sync must be preserved
- `googleSheetsConfig` table from schema — may still have documents; Phase 21 clears and removes
- `sheetsStalenessHours` from `alertConfig` table — schema cleanup is Phase 21

---

## Standard Stack

No new libraries or packages are needed for this phase. All changes are pure TypeScript/Convex/React edits to existing files.

| Task | Technology | Approach |
|------|-----------|----------|
| RBAC rewrite | Convex query (TypeScript) | Enrollment join via by_status + by_programId indexes |
| Client detail enrollment section | React/Next.js (TSX) | Add UI section to existing page component |
| Cron cleanup | Convex internalAction | Delete 6 lines from `googleSheetsSync.ts` |
| Admin UI tab removal | Next.js/React | Delete tab entry + case + import |
| Alerts cleanup | Convex query | Delete one try/catch block |
| Calendar verification | Manual testing | Check Convex logs + dashboard widget |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Checking if client has active legal enrollment | Custom recursive logic | Simple `.some()` on the enriched enrollments array already returned by `getByIdWithIntake` |
| Filtering clients by enrollment type | Complex join query | Collect all active enrollments once, build Set of clientIds, filter clients array against Set |

---

## Scope Boundary — What Phase 20 Does NOT Touch

Per REQUIREMENTS.md traceability table, these are explicitly deferred:

| Item | Phase | Reason |
|------|-------|--------|
| Remove `programDataCache` from schema | Phase 21 | Must clear documents first |
| Remove `programId`, `enrollmentDate`, `status` from `clients` table schema | Phase 21 | Legacy fields needed until full migration verified |
| Remove `syncProgramData` function body and `upsertProgramParticipant` from internal | Phase 21 (or Phase 20 — planner's call) | Low risk to delete now, but schema cleanup milestone owns dead code |

The planner should decide whether to delete `syncProgramData` and `upsertProgramParticipant` function bodies in Phase 20 (since callers are being removed) or defer to Phase 21. Deleting them in Phase 20 is safe and cleaner.

---

## Open Questions

1. **CLNT-01 already satisfied?**
   - What we know: `listWithPrograms` for admin/manager/staff roles does not apply any programId filter — it returns all clients already.
   - What's unclear: Is the requirement to verify this is still true after the RBAC rewrite, or does something need to change?
   - Recommendation: Confirm in implementation notes that CLNT-01 is satisfied by the existing code path and the Phase 20 work is primarily CLNT-02 (enrollment-based RBAC for lawyer/psychologist) and CLNT-03 (detail page enrollment section).

2. **`clients.getStats` and `clients.getStatsByProgram` rewrite**
   - What we know: Both functions use `clients.programId` for role-based filtering. Both are currently called from the `/clients` page and potentially the dashboard.
   - What's unclear: Do these need the same enrollment-join rewrite, or is it acceptable to leave them using `clients.programId` (legacy field) since Phase 21 will rewrite them?
   - Recommendation: Rewrite `getStats` to use the enrollment join (matches CLNT-02 spirit). `getStatsByProgram` is used by `ProgramsLegal`/`ProgramsCoparent` dashboard components — check whether those need updating too.

3. **`handleAddClient` in clients page still writes to `clients.programId`**
   - What we know: The "Add Client" modal sets `programId` on the client record but does NOT create an enrollment.
   - What's unclear: Should Phase 20 fix this too, or is it Phase 17 work (Phase 17 added enrollment creation UI)?
   - Recommendation: Check whether Phase 17 already added enrollment creation. The CLNT-04 requirement (staff can create enrollment for existing client) is marked complete, so the modal should already create an enrollment. If the modal ALSO writes `programId` to the client record as a legacy field, that's acceptable — Phase 21 removes it.

---

## Validation Architecture

> Note: `workflow.nyquist_validation` not present in `.planning/config.json` — field is absent, treated as disabled. Skipping formal test map.

Manual verification checklist for INFR-06 and overall:
- [ ] Log in as admin — `/clients` shows all clients
- [ ] Log in as lawyer — `/clients` shows only clients with active legal enrollments
- [ ] Log in as psychologist — `/clients` shows only clients with active co-parent enrollments
- [ ] Client detail page shows "Enrollments" section with all program enrollments
- [ ] Legal intake section shows for clients with legal enrollments
- [ ] Co-parent intake section shows for clients with co-parent enrollments
- [ ] Admin console no longer shows "Google Sheets" tab
- [ ] Alerts panel no longer shows Sheets staleness warning
- [ ] Google Calendar widget on dashboard still shows events
- [ ] Convex cron logs show `google-calendar-sync` still firing normally

---

## Sources

### Primary (HIGH confidence)
All findings verified directly from codebase:

- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/crons.ts` — cron job definitions, confirms three crons: quickbooks-sync, sheets-sync, google-calendar-sync
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/googleSheetsSync.ts` — confirms `runSync` calls both `syncGrantTracker` AND `syncProgramData`; grant sync must be preserved
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/googleCalendarSync.ts` + `googleCalendarInternal.ts` — confirms Calendar reads `googleCalendarConfig`, fully independent of Sheets
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/alerts.ts` — Section E (lines 154-177) confirmed as the Sheets staleness check to remove
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/clients.ts` — confirmed current RBAC uses `clients.programId`; must be rewritten to enrollment join
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/enrollments.ts` — `listByClient`, `by_clientId` index, `by_status` index all available
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/schema.ts` — `enrollments` table confirmed with correct indexes; `programDataCache` still in schema (Phase 21 removes)
- `/Users/mastermac/Desktop/DEC-DASH 2.0/src/app/(dashboard)/admin/page.tsx` — confirmed `google-sheets` tab in `TABS` array and `AdminTab` type; import of `GoogleSheetsConfig`
- `/Users/mastermac/Desktop/DEC-DASH 2.0/src/app/(dashboard)/clients/[id]/page.tsx` — confirmed intake gate uses `data.program?.type`; needs enrollment-aware gate
- `/Users/mastermac/Desktop/DEC-DASH 2.0/src/components/analytics/DemographicsTab.tsx` — confirmed uses `useAllDemographics` (not `useProgramDemographics`); Phase 19 decoupling complete
- `/Users/mastermac/Desktop/DEC-DASH 2.0/src/hooks/useGrantTracker.ts` — `useProgramDemographics` exported but confirmed no callers after Phase 19

---

## Metadata

**Confidence breakdown:**
- RBAC rewrite approach: HIGH — enrollments table and indexes confirmed present, current filter logic confirmed
- Cron/sync cleanup: HIGH — all call sites mapped, grant sync isolation confirmed
- Admin UI removal: HIGH — exact file and code location identified
- Alerts removal: HIGH — exact line range identified
- Calendar independence: HIGH — read directly from `googleCalendarInternal.ts`

**Research date:** 2026-03-01
**Valid until:** Stable indefinitely (no external dependencies; all from project codebase)
