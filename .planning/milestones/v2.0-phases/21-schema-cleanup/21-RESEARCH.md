# Phase 21: Schema Cleanup - Research

**Researched:** 2026-03-01
**Domain:** Convex schema migration — table removal, field removal, dead code cleanup
**Confidence:** HIGH

---

## Summary

Phase 21 is a surgical cleanup phase with a well-scoped blast radius: one table to delete (`programDataCache`), three fields to remove from `clients` (`programId`, `enrollmentDate`, `status`), and several co-located pieces of dead code that became orphaned during Phases 19–20. No new feature code is being written; this is purely removal work.

The dependency is satisfied: Phase 19 rewired analytics off `programDataCache` and onto the `clients` table; Phase 20 deleted the Sheets program sync action, removed the cron trigger for program sync, and gutted the admin UI entry point. The `programDataCache` table now receives no new writes. Removing it requires: (1) clearing the existing documents, (2) deleting dead backend code referencing it, and (3) removing its table definition from `schema.ts`.

The `clients` legacy field removal is more nuanced. The fields `programId`, `enrollmentDate`, and `status` are used by several currently-live queries, mutations, and UI forms — even though the enrollment-based data model supersedes them. All callers must be updated before the schema fields can be dropped, or Convex will reject the deploy. The clients schema `by_programId` index has seven call sites across four files: `clients.ts`, `programs.ts`, `analytics.ts`, and the migration import mutations. These must be rewritten before the schema push can succeed.

**Primary recommendation:** Sequence as two atomic tasks — (1) clear `programDataCache` documents + delete all code that writes/reads it + remove the table definition; (2) remove `programId`/`enrollmentDate`/`status` from clients schema by first auditing every caller, rewriting to enrollment-based equivalents, and then dropping the fields and `by_programId` index together in one `schema.ts` change.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-02 | programDataCache table cleared and removed from schema | Clear all documents via internalMutation, delete `upsertProgramParticipant` and `getProgramDemographics` dead code, remove `programDataCache` table definition from schema.ts |
| INFR-03 | Legacy programId, enrollmentDate, status fields removed from clients schema | Audit and rewrite all callers of `by_programId` index and `.status`/`.enrollmentDate` field reads on clients, remove `by_programId` index, drop fields from schema.ts clients definition |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Convex | (project-pinned) | Schema definition and mutation execution | The project's entire backend; schema changes deploy via `npx convex dev --once` |
| `convex/values` `v` | same | Schema validator types | Required for all defineTable field declarations |
| `convex/server` internalMutation | same | Document deletion and data clearing | Clearing documents must use internal (auth-free) mutations for CLI execution |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `npx convex dev --once` | (project CLI) | Deploy schema changes | After every schema.ts modification — always run this manually (cannot be automated per project constraint) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clearing documents via internalMutation + CLI run | Convex dashboard manual delete | CLI approach is repeatable, auditable, and safe; dashboard deletion is manual and error-prone for bulk documents |
| Removing `status` from clients table | Keeping it (optional) | Keeping it creates perpetual technical debt and blocks the requirement; must remove |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are confined to existing files:

```
convex/
├── schema.ts                  # Remove programDataCache table, clients legacy fields + index
├── googleSheets.ts            # Remove getProgramDemographics query
├── googleSheetsInternal.ts    # Remove upsertProgramParticipant internalMutation
├── clients.ts                 # Remove programId/enrollmentDate/status from create/update/list/internalCreate/importLegalBatch/importCoparentBatch
├── programs.ts                # Rewrite remove() and getStats() which use by_programId on clients
├── analytics.ts               # Rewrite getAllDemographics() which uses by_programId on clients
src/
├── app/(dashboard)/clients/page.tsx         # Remove programId/enrollmentDate/status from UI form and column
├── app/(dashboard)/clients/[id]/page.tsx    # Remove programId/enrollmentDate from client edit form; clean legacy program fallback
├── components/admin/AlertsConfig.tsx        # Remove sheetsStalenessHours field and state
├── hooks/useGrantTracker.ts                 # Remove useProgramDemographics hook
convex/
├── alertConfig.ts             # Remove sheetsStalenessHours from args and ALERT_DEFAULTS
├── alerts.ts                  # Remove sheetsStalenessHours from config load
```

---

### Pattern 1: Clearing All Documents from a Convex Table

**What:** Before a table definition can be removed from `schema.ts`, all existing documents must be deleted. Convex will reject a schema push that removes a table that still has documents.

**When to use:** Required before removing `programDataCache` table definition.

**Example:**
```typescript
// convex/someInternal.ts
import { internalMutation } from "./_generated/server";

export const clearProgramDataCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("programDataCache").collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: docs.length };
  },
});
```

Run via CLI: `npx convex run someInternal:clearProgramDataCache`

**Confidence:** HIGH — this is the standard Convex pattern. Once documents are cleared and code that writes to the table is removed, the table definition can safely be dropped from `schema.ts`.

---

### Pattern 2: Removing an Optional Field from schema.ts

**What:** When a field is `v.optional(...)` in the schema and all code that reads/writes it has been removed, the field definition can simply be deleted from `schema.ts`. Convex will accept documents that still have the old field data — existing document data for unknown fields is silently ignored. But if any existing code still reads `.field` on a document, TypeScript will error on the field access after the schema is narrowed.

**When to use:** For `programId` (optional), `enrollmentDate` (optional). These are `v.optional(...)` — documents with the old value stored are not a problem; only code references must be cleaned up first.

**Note on `status`:** The clients `status` field is NOT `v.optional` — it is required: `v.union(v.literal("active"), v.literal("completed"), v.literal("withdrawn"))`. This is the most dangerous removal. Dropping a required field from the schema means any document that does not have a fallback will fail validation. HOWEVER — the actual question is whether Convex validates existing documents on schema push or only on new writes. Convex does NOT retroactively validate existing documents when a schema is tightened — schema is only enforced on writes. So the field can be removed from schema.ts without migrating existing data, as long as all code referencing `client.status` is updated. But the field value will persist on existing documents until they are patched.

**Confidence:** HIGH (Convex schema behavior is deterministic and well-documented).

---

### Pattern 3: Removing a Required Field with Existing Documents

**What:** `clients.status` is currently `v.union(...)` (required, non-optional). 350 existing client records have this field set. The requirement says to remove it from the schema.

**Decision required:** Does "removing from schema" mean:
- (a) Simply dropping it from `schema.ts` so Convex's TypeScript layer no longer recognizes it (existing documents retain the data, but TypeScript code can't access it) — OR —
- (b) Also clearing the field from all 350 documents via a migration mutation

Option (a) is sufficient for the requirement as stated: "The clients schema definition no longer contains... status fields." The value persists in the database document as an unrecognized field, but that is harmless in Convex — the schema validator only enforces shape on new writes, not retroactively.

**Recommendation:** Drop from schema.ts and do NOT write a migration to clear the field from existing documents. This satisfies the requirement and avoids unnecessary work. Add a comment to the schema noting the historical context if needed.

**Confidence:** HIGH — Convex's validator enforcement model is insert/update only, not retroactive.

---

### Pattern 4: Index Removal — `by_programId` on clients

**What:** The `clients` table currently has `.index("by_programId", ["programId"])`. Once `programId` is removed from the schema, this index must also be removed. Several query/mutation handlers use this index:

| File | Function | Usage | What to do |
|------|----------|-------|------------|
| `convex/clients.ts` | `list()` | `withIndex("by_programId", ...)` to filter by programId | Rewrite: if programId filter still needed, do a full collect + filter, or drop the filter entirely |
| `convex/clients.ts` | `importLegalBatch()` | Dedup check via `by_programId` | Rewrite: deduplicate by firstName+lastName across all clients (no programId scope) |
| `convex/clients.ts` | `importCoparentBatch()` | Same dedup pattern | Same rewrite |
| `convex/clients.ts` | `getByProgram()` | Returns clients by programId index | Rewrite: use enrollment table (`listByProgram` in enrollments.ts) instead |
| `convex/clients.ts` | `internalCreate()` | Accepts programId arg | Remove arg |
| `convex/programs.ts` | `remove()` | Checks linked clients via `by_programId` | Rewrite: check linked enrollments instead |
| `convex/programs.ts` | `getStats()` | Counts active clients via `by_programId` | Rewrite: use enrollments table for active counts |
| `convex/analytics.ts` | `getAllDemographics()` | Filters clients by programId | Rewrite: filter via enrollments join |

**Confidence:** HIGH — every call site was verified by static analysis.

---

### Pattern 5: sheetsStalenessHours Cleanup

**What:** `sheetsStalenessHours` was intentionally left in the `alertConfig` schema (and read in `alerts.ts` + `alertConfig.ts`) in Phase 20 to prevent a schema error while the Sheets program sync was removed. Phase 21 removes it.

**Affected files:**
- `convex/schema.ts` — `alertConfig` table: remove `sheetsStalenessHours: v.number()` field
- `convex/alertConfig.ts` — remove from `ALERT_DEFAULTS`, `get` query return, `update` mutation args
- `convex/alerts.ts` — remove from the config object read (line 24)
- `src/components/admin/AlertsConfig.tsx` — remove the "Google Sheets Staleness" UI input and state variable
- `src/hooks/useGrantTracker.ts` — remove `useProgramDemographics` hook export

**Caution:** `alertConfig` already has a document in the database with `sheetsStalenessHours` stored. Removing the field from the schema and from the `update` mutation args means the stored value will persist but not be accessible. This is acceptable (see Pattern 3). When the admin next saves alert config, the `update` mutation will patch the document with the new fields only, leaving the orphaned `sheetsStalenessHours` value silently in the document. This is harmless.

**Confidence:** HIGH.

---

### Anti-Patterns to Avoid

- **Removing schema fields before removing code callers:** TypeScript will fail the build if code accesses `.programId` or `.status` on a `clients` document after those fields are removed from the schema definition. Always update code first, then remove from schema.
- **Deploying schema without clearing programDataCache documents:** Convex will reject table removal if documents exist. Always clear documents, deploy schema, verify.
- **Doing all changes in one mega-commit:** These are logically separate operations. Better to batch as two atomic commits: (1) programDataCache removal, (2) clients legacy field removal + all callers.
- **Forgetting UI code:** Several UI forms (`clients/page.tsx`, `clients/[id]/page.tsx`) still pass `programId` and `enrollmentDate` to the `create`/`update` mutations. These must be removed from the frontend forms at the same time the mutation args are trimmed.
- **Running `npx convex deploy` instead of `npx convex dev --once`:** Project constraint — only use `npx convex dev --once`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clearing all programDataCache documents | Manual dashboard delete | `internalMutation` + `npx convex run` | Repeatable, auditable, safe for bulk operations |
| Counting enrollments per program | Re-query clients by programId | Query `enrollments` table by `by_programId` index | Enrollments is now the source of truth |
| Deduplicating clients in importLegalBatch/importCoparentBatch after removing by_programId | Full table scan | Scope dedup to firstName+lastName across ALL clients | Removing programId scoping makes dedup safer — no more silently allowing duplicates in different programs |

**Key insight:** After `programId` is removed from `clients`, any logic that previously scoped queries to a specific program via the client record must be re-expressed through the `enrollments` table.

---

## Common Pitfalls

### Pitfall 1: Schema Push Rejected — Documents Still Exist
**What goes wrong:** `npx convex dev --once` fails with a validation error about `programDataCache` still having documents.
**Why it happens:** Convex rejects schema changes that remove a table if documents remain.
**How to avoid:** Run the clear mutation BEFORE removing the table from schema.ts. Verify the count returns 0. Then modify schema.ts and deploy.
**Warning signs:** Error message from Convex mentioning table name and document count.

### Pitfall 2: TypeScript Build Fails After Schema Narrowing
**What goes wrong:** Next.js build fails because code accesses `.programId`, `.enrollmentDate`, or `.status` on a `clients` document type that no longer has those fields.
**Why it happens:** `_generated/dataModel.ts` is regenerated by `npx convex dev --once` based on the new schema, and TypeScript sees missing properties.
**How to avoid:** Update ALL code that reads or writes these fields before running schema deploy. Use `grep` / static analysis to find every reference.
**Warning signs:** TS2339 "Property 'programId' does not exist on type '...'" errors.

### Pitfall 3: programs.remove() Breaks After Index Removal
**What goes wrong:** The `programs.remove()` mutation currently checks for linked clients via `by_programId` index on clients. If the index is removed without updating this check, the mutation fails at runtime.
**Why it happens:** The guard is there to prevent orphaning clients when a program is deleted. After field removal, this guard needs to check `enrollments` table instead.
**How to avoid:** Rewrite `programs.remove()` to query `enrollments` by `by_programId` (the enrollments `by_programId` index is separate and stays). The enrollments table DOES keep `programId` as a required field.
**Warning signs:** `programs.remove()` throwing "index not found" error at runtime.

### Pitfall 4: getStats() in programs.ts Returns Wrong Active Count
**What goes wrong:** `programs.getStats()` currently counts active clients by querying `clients` via `by_programId` and checking `status === "active"`. After removing `status` from clients schema, this returns 0 or errors.
**Why it happens:** The function relies on `client.status` and the `by_programId` index, both of which will be gone.
**How to avoid:** Rewrite `getStats()` to count active enrollments from the `enrollments` table using `by_programId` (which remains on enrollments).
**Warning signs:** Programs stats showing 0 active clients everywhere.

### Pitfall 5: clients.list() / getByProgram() Still Used by Frontend
**What goes wrong:** The `clients.list()` query accepts `programId` and `status` args. If the mutation args are trimmed without checking all callers, the TypeScript-compiled API client will drift from the actual server handler.
**Why it happens:** Convex generates API types from mutation/query signatures. Changing args means regenerated types that may clash with existing frontend calls.
**How to avoid:** After trimming args from `clients.list()`, search the frontend for any `api.clients.list` calls and remove the `programId`/`status` args from those call sites.
**Warning signs:** TypeScript errors at call sites after `_generated/api.d.ts` regeneration.

### Pitfall 6: client detail page still reads data.enrollmentDate
**What goes wrong:** `clients/[id]/page.tsx` line 603 reads `data.enrollmentDate` to display the "Enrolled" date field.
**Why it happens:** The "Enrolled" display field was previously populated from the legacy `clients.enrollmentDate` field. After removal, this renders `—`.
**How to avoid:** Update the display to read `data.enrollments?.[0]?.enrollmentDate` or the active enrollment date. This is shown in the Enrollments card below, but the Client Information card still shows the legacy value.
**Warning signs:** "Enrolled" field shows `—` for all clients after the schema change.

---

## Code Examples

### Clear programDataCache Documents

```typescript
// Add to convex/googleSheetsInternal.ts (or a separate cleanup file)
export const clearProgramDataCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("programDataCache").collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: docs.length };
  },
});
```

CLI: `npx convex run googleSheetsInternal:clearProgramDataCache`

---

### Remove programDataCache from schema.ts

```typescript
// BEFORE (lines 115-132 in schema.ts):
  programDataCache: defineTable({
    sheetRowId: v.string(),
    // ... all fields ...
  }).index("by_sheetRowId", ["sheetRowId"])
    .index("by_programType", ["programType"]),

// AFTER: Delete those 17 lines entirely.
```

---

### Remove programId, enrollmentDate, status from clients schema

```typescript
// BEFORE:
  clients: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    programId: v.optional(v.id("programs")),    // REMOVE
    enrollmentDate: v.optional(v.number()),      // REMOVE
    status: v.union(                             // REMOVE (entire union block)
      v.literal("active"),
      v.literal("completed"),
      v.literal("withdrawn")
    ),
    zipCode: v.optional(v.string()),
    // ... rest stays ...
  }).index("by_programId", ["programId"]),        // REMOVE this index

// AFTER:
  clients: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    zipCode: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    // v2.0 demographic fields (Phase 16)
    gender: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
```

---

### Rewrite programs.remove() to use enrollments

```typescript
// BEFORE (programs.ts remove handler):
const linkedClients = await ctx.db
  .query("clients")
  .withIndex("by_programId", (q) => q.eq("programId", args.programId))
  .first();

if (linkedClients) {
  throw new Error("Cannot delete program with linked clients...");
}

// AFTER:
const linkedEnrollment = await ctx.db
  .query("enrollments")
  .withIndex("by_programId", (q) => q.eq("programId", args.programId))
  .first();

if (linkedEnrollment) {
  throw new Error("Cannot delete program with linked enrollments. Remove enrollments first.");
}
```

---

### Rewrite programs.getStats() to use enrollments

```typescript
// AFTER:
const stats = await Promise.all(
  programs.map(async (program) => {
    const programEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_programId", (q) => q.eq("programId", program._id))
      .collect();

    const activeClients = new Set(
      programEnrollments
        .filter((e) => e.status === "active")
        .map((e) => e.clientId)
    ).size;

    const sessions = await ctx.db
      .query("sessions")
      .collect();
    const programSessions = sessions.filter((s) => s.programId === program._id);

    return {
      _id: program._id,
      name: program.name,
      type: program.type,
      isActive: program.isActive,
      activeClients,
      totalSessions: programSessions.length,
    };
  })
);
```

---

### Rewrite getAllDemographics() to not use by_programId

```typescript
// BEFORE (analytics.ts):
const clients = programId
  ? await ctx.db
      .query("clients")
      .withIndex("by_programId", (q) => q.eq("programId", programId))
      .collect()
  : await ctx.db.query("clients").collect();

// AFTER:
let clients = await ctx.db.query("clients").collect();
if (programId) {
  // Get clientIds enrolled in this program
  const enrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_programId", (q) => q.eq("programId", programId))
    .collect();
  const enrolledClientIds = new Set(enrollments.map((e) => e.clientId));
  clients = clients.filter((c) => enrolledClientIds.has(c._id));
}
```

Note: `active`/`completed` counts in `getAllDemographics` also read `c.status` — these must be replaced. After removing `status` from clients, active count should come from enrollments:

```typescript
// BEFORE:
const active = clients.filter((c) => c.status === "active").length;
const completed = clients.filter((c) => c.status === "completed").length;

// AFTER (get from enrollments table):
const activeEnrollments = await ctx.db
  .query("enrollments")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .collect();
const activeClientIds = new Set(activeEnrollments.map((e) => e.clientId));
const completedEnrollments = await ctx.db
  .query("enrollments")
  .withIndex("by_status", (q) => q.eq("status", "completed"))
  .collect();
const completedClientIds = new Set(completedEnrollments.map((e) => e.clientId));
// Then filter the relevant client subset
const active = clients.filter((c) => activeClientIds.has(c._id)).length;
const completed = clients.filter((c) => completedClientIds.has(c._id)).length;
```

---

### clients.ts: Remove legacy fields from create mutation

```typescript
// BEFORE:
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    programId: v.optional(v.id("programs")),    // REMOVE
    enrollmentDate: v.optional(v.number()),      // REMOVE
    status: v.union(...),                        // REMOVE
    // ...
  },
  handler: async (ctx, args) => {
    const clientId = await ctx.db.insert("clients", {
      firstName: args.firstName,
      lastName: args.lastName,
      programId: args.programId,                 // REMOVE
      enrollmentDate: args.enrollmentDate,        // REMOVE
      status: args.status,                        // REMOVE
      // ...
    });
  },
});

// AFTER: Strip the three args and their usage in insert.
// Frontend callers (clients/page.tsx handleAddClient) must also be updated
// to not pass programId, enrollmentDate, or status.
```

---

### Remove sheetsStalenessHours from alertConfig.ts

```typescript
// BEFORE (ALERT_DEFAULTS):
export const ALERT_DEFAULTS = {
  deadlineWindowDays: 30,
  budgetVariancePct: 90,
  qbStalenessHours: 1,
  sheetsStalenessHours: 2,       // REMOVE
  calendarStalenessHours: 2,
} as const;

// BEFORE (get query return):
return {
  deadlineWindowDays: config.deadlineWindowDays,
  budgetVariancePct: config.budgetVariancePct,
  qbStalenessHours: config.qbStalenessHours,
  sheetsStalenessHours: config.sheetsStalenessHours,  // REMOVE
  calendarStalenessHours: config.calendarStalenessHours,
};

// BEFORE (update mutation args):
args: {
  deadlineWindowDays: v.number(),
  budgetVariancePct: v.number(),
  qbStalenessHours: v.number(),
  sheetsStalenessHours: v.number(),   // REMOVE
  calendarStalenessHours: v.number(),
},
```

---

### Remove from alertConfig schema

```typescript
// schema.ts alertConfig table — BEFORE:
  alertConfig: defineTable({
    deadlineWindowDays: v.number(),
    budgetVariancePct: v.number(),
    qbStalenessHours: v.number(),
    sheetsStalenessHours: v.number(),   // REMOVE
    calendarStalenessHours: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }),
```

---

## Complete File-by-File Change Inventory

### INFR-02: programDataCache removal

| File | Change |
|------|--------|
| `convex/googleSheetsInternal.ts` | Add `clearProgramDataCache` internalMutation; DELETE `upsertProgramParticipant` internalMutation |
| `convex/googleSheets.ts` | DELETE `getProgramDemographics` query function |
| `convex/schema.ts` | DELETE `programDataCache` table definition (lines ~115–132) |
| `src/hooks/useGrantTracker.ts` | DELETE `useProgramDemographics` export |

**Sequence:** Add clear mutation → run CLI to clear docs → delete dead code → remove from schema → deploy.

---

### INFR-03: clients legacy field removal

| File | Change |
|------|--------|
| `convex/schema.ts` | Remove `programId`, `enrollmentDate`, `status` from clients table; remove `.index("by_programId", ...)` |
| `convex/clients.ts` | `list()`: remove `programId`/`status` args and by_programId usage; `create()`: remove `programId`/`enrollmentDate`/`status`; `update()`: remove same three; `internalCreate()`: remove `programId`/`enrollmentDate`/`status`; `importLegalBatch()`: rewrite dedup without by_programId, remove `programId` from insert; `importCoparentBatch()`: same; `getByProgram()`: rewrite using enrollments.listByProgram or remove if unused |
| `convex/programs.ts` | `remove()`: rewrite guard to use enrollments by_programId; `getStats()`: rewrite active client count using enrollments |
| `convex/analytics.ts` | `getAllDemographics()`: rewrite programId filter via enrollments join; remove `c.status` references — replace with enrollment-based counts |
| `convex/alertConfig.ts` | Remove `sheetsStalenessHours` from ALERT_DEFAULTS, get query, update args |
| `convex/alerts.ts` | Remove `sheetsStalenessHours` from config load object (line 24) |
| `convex/schema.ts` | Remove `sheetsStalenessHours` from alertConfig table |
| `src/app/(dashboard)/clients/page.tsx` | Remove `programId`/`status`/`enrollmentDate` from `ClientFormData`, `emptyClientForm`, `columns`, and `handleAddClient()` call |
| `src/app/(dashboard)/clients/[id]/page.tsx` | Remove `programId`/`status`/`enrollmentDate` from edit form state and `handleSaveClient()` call; update "Enrolled" display to use enrollments; remove `data.program?.name` fallbacks |
| `src/components/admin/AlertsConfig.tsx` | Remove `sheetsStalenessHours` state variable, useEffect population, UI input field, and `handleSave` arg |
| `src/hooks/useGrantTracker.ts` | Already addressed in INFR-02 (remove `useProgramDemographics`) |

---

### Special Cases and Decisions

**clients.list() `status` filter:** The `list()` query accepts a `status` arg which filters `clients.status`. After schema removal, this filter logic must be removed. Any frontend calling `api.clients.list({ status: ... })` must be updated. Grep shows only internal references in `clients.ts` itself — no external frontend callers of `api.clients.list` were found (the frontend uses `listWithPrograms` instead). Safe to simplify `list()`.

**clients.getStats() `status` usage:** `getStats()` counts `clients.filter((c) => c.status === "active")`. This must be rewritten to count from `enrollments.by_status`.

**listWithPrograms `status` filter:** `listWithPrograms()` accepts a `status` arg and filters `c.status === args.status`. Remove the status filter — enrollment status (`enrollments.status`) is the new source of truth. The frontend `clients/page.tsx` passes `status: undefined` currently (no status filter shown in UI), so removing this arg has no visible user impact.

**getStatsByProgram `status` usage:** `getStatsByProgram()` reads `c.status === "active"` to build `activeClients`. Rewrite to use enrollment status.

**importLegalBatch / importCoparentBatch dedup:** These mutations currently scope duplicate detection to clients with the same `programId`. After removing `programId`, dedup must be done across ALL clients by firstName+lastName. This is actually stricter and safer — it prevents creating a "duplicate" client record in a second program. The mutation inserts the new client without `programId` or `status` — the caller (Phase 18 migration script) should separately create an enrollment record.

**programs.ts getStats() `c.status` read:** The `filter((c) => c.status === "active")` pattern appears here. Replace with enrollment-based count (see code example above).

---

## Open Questions

1. **What is the current document count in programDataCache?**
   - What we know: The table has been receiving no new writes since Phase 20 (syncProgramData deleted). The table existed for Sheets program sync data.
   - What's unclear: The exact document count. It could be 0 (if Sheets was never configured or last sync was a long time ago) or could have historical data.
   - Recommendation: Run `npx convex run googleSheetsInternal:clearProgramDataCache` after adding the clear mutation. If it returns `{ deleted: 0 }`, the table was already empty and schema removal proceeds immediately.

2. **Is `clients.list()` called from any frontend component?**
   - What we know: `listWithPrograms` is the primary frontend query. `list()` is used in `clients.ts` internally and may be called from scripts.
   - What's unclear: Whether any import scripts still invoke `api.clients.list`.
   - Recommendation: After trimming `list()` args, search for `api.clients.list` and `clients.list` in `/src` before deploying.

3. **Should `clients.create()` be updated to also auto-create an enrollment?**
   - What we know: After removing `programId` from `clients.create()`, the "Add Client" modal in the frontend currently lets staff pick a program. That program selection will have no effect after the schema change unless we wire it to create an enrollment.
   - What's unclear: Whether Phase 21 should also wire the "Add Client" flow to create an enrollment record, or simply leave that as a separate future step.
   - Recommendation: Phase 21 should NOT add enrollment creation to `clients.create()` — this is feature work. Simply remove the `programId` field from the form and let staff add enrollments separately via the existing enrollment UI. Document this as a UX limitation.

4. **getByIdWithIntake() `program` field backward compat comment:**
   - The code comment says "Keep for backward compat (legacy, removed Phase 21)". The `program` field returned by `getByIdWithIntake()` includes `const program = client.programId ? await ctx.db.get(client.programId) : null`. After removing `programId`, `program` will always be `null`. The `data.program?.name` fallbacks in the client detail page use it.
   - Recommendation: Remove the `program` fetch and return from `getByIdWithIntake()`, and update the two frontend fallback sites to use only `data.enrollments`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sheets-synced `programDataCache` for demographics | `clients` table queried directly | Phase 19 | programDataCache has no readers; safe to remove |
| `clients.programId` for program assignment | `enrollments.programId` as source of truth | Phase 16–20 | Legacy field unused by RBAC/analytics |
| `clients.status` for activity filtering | `enrollments.status` for activity | Phase 16–20 | Legacy field still read by 4+ functions |
| `clients.enrollmentDate` for enrollment display | `enrollments.enrollmentDate` | Phase 16–20 | Legacy field still displayed in one UI card |

**Dead code confirmed present:**
- `upsertProgramParticipant` in `googleSheetsInternal.ts` — no callers since syncProgramData was deleted
- `getProgramDemographics` in `googleSheets.ts` — no callers after Phase 19 analytics rewrite
- `useProgramDemographics` in `src/hooks/useGrantTracker.ts` — no component imports it

---

## Sources

### Primary (HIGH confidence)
- Direct static analysis of project source files — all findings verified by reading actual code
- `convex/schema.ts` — current schema state confirmed by reading file
- `convex/clients.ts` — all callers of programId/enrollmentDate/status audited
- `convex/programs.ts` — by_programId usage confirmed
- `convex/analytics.ts` — getAllDemographics programId and status usage confirmed
- `.planning/phases/20-frontend-and-sheets-removal/20-02-SUMMARY.md` — documents exactly what was left as intentional dead code for Phase 21
- `.planning/STATE.md` — decision log confirming Phase 21 cleanup scope

### Secondary (MEDIUM confidence)
- Convex schema enforcement model (validates on write, not retroactively on existing documents) — from project behavior observation and general Convex documentation patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, pure Convex schema operations
- Architecture: HIGH — all callers identified by static analysis; blast radius fully mapped
- Pitfalls: HIGH — based on direct code reading, not speculation

**Research date:** 2026-03-01
**Valid until:** Stable (2026-06-01) — schema cleanup is deterministic once callers are known
