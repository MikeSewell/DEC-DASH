# Phase 17: Enrollment and Sessions Backend - Research

**Researched:** 2026-03-01
**Domain:** Convex mutations, RBAC, audit logging, internal batch mutations
**Confidence:** HIGH

## Summary

Phase 17 is a pure Convex backend task: create `convex/enrollments.ts` and extend `convex/sessions.ts` with new mutations that write to the `enrollments` and `sessions` tables deployed in Phase 16. The schema is already in place and deployed. This phase adds the CRUD mutations (create, update, list, getById, getByClientId), a sessions.logForEnrollment mutation, an `enrollments.importBatch` internalMutation, and optionally a `sessions.importBatch` internalMutation for Phase 18's migration script.

All patterns needed are established and already in use in this codebase. The create/update/audit pattern is copied from `clients.ts` and `programs.ts`. The importBatch pattern is copied from `grantsInternal.ts` (internalMutation, batch loop, insert without auth). No new libraries are needed. No frontend changes are in scope.

The main decision points are: what RBAC roles can create enrollments (staff/manager/admin, matching sessions.create), what fields are required vs optional in the mutations, and how to structure importBatch so the Phase 18 migration script can call it without auth. All of these have clear answers from existing patterns.

**Primary recommendation:** Create `convex/enrollments.ts` as a new file mirroring the `clients.ts`/`programs.ts` structure, then extend `convex/sessions.ts` to add the new fields (attendanceStatus, enrollmentId, duration) to `sessions.create` and add a `sessions.logForEnrollment` mutation. Add `enrollments.importBatch` as an `internalMutation`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLNT-04 | Staff can create a new enrollment for an existing client in any program | `enrollments.create` mutation with requireRole(ctx, "admin", "manager", "staff"), inserts into enrollments table, calls auditLog.log — mirrors programs.create and clients.create exactly |
| CLNT-05 | Staff can log individual sessions with date, attendance status, and notes per enrollment | Extend sessions.create args to accept attendanceStatus, enrollmentId, duration; or add sessions.logForEnrollment mutation; audit log call mirrors existing sessions.create pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex/values` (`v`) | Already installed | Argument validation for all mutations | Project standard — used in every Convex file |
| `convex/_generated/server` (`mutation`, `query`, `internalMutation`) | Already installed | Mutation and query wrappers | Project standard |
| `convex/_generated/api` (`internal`) | Already installed | Calling internal mutations cross-file | Used in every file that calls auditLog.log |
| `requireRole` from `./users` | Project utility | RBAC enforcement | Used in clients.ts, programs.ts, sessions.ts — project standard |
| `internal.auditLog.log` | Project utility | Audit trail for all data writes | Called in every public mutation that modifies data |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `getAuthUserId` from `@convex-dev/auth/server` | Already installed | Needed in queries that return role-filtered data | Use in list queries if role-based filtering is needed (see clients.ts listWithPrograms) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `internalMutation` for importBatch | `mutation` (no auth) | importBatch used by CLI scripts; internalMutation is safer — cannot be called from the frontend. This is the established pattern in grantsInternal.ts |
| Extending sessions.create | Adding sessions.logForEnrollment | Either works. Extending create is simpler (backward-compatible via optional args). Adding a dedicated mutation is more readable. See Code Examples section. |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
convex/
├── enrollments.ts       # NEW — CRUD mutations + importBatch internalMutation
├── sessions.ts          # EXTEND — add attendanceStatus/enrollmentId/duration to create
└── schema.ts            # ALREADY DONE in Phase 16 — do not touch
```

### Pattern 1: Standard Mutation with RBAC + Audit Log
**What:** Every public mutation that writes data follows this three-step structure: requireRole → db.insert/patch/delete → auditLog.log.
**When to use:** All public `mutation` functions in enrollments.ts and the updated sessions.ts.
**Example:**
```typescript
// Source: convex/clients.ts (create mutation), convex/programs.ts (create mutation)
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    programId: v.id("programs"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("completed"),
      v.literal("withdrawn")
    ),
    enrollmentDate: v.number(),
    exitDate: v.optional(v.number()),
    exitReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const enrollmentId = await ctx.db.insert("enrollments", {
      clientId: args.clientId,
      programId: args.programId,
      status: args.status,
      enrollmentDate: args.enrollmentDate,
      exitDate: args.exitDate,
      exitReason: args.exitReason,
      notes: args.notes,
      createdBy: currentUser._id,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "create_enrollment",
      entityType: "enrollments",
      entityId: enrollmentId,
      details: `Created enrollment for client ${args.clientId} in program ${args.programId}`,
    });

    return enrollmentId;
  },
});
```

### Pattern 2: Update Mutation with Sparse Patch
**What:** Update mutations accept all fields as optional, build an updates object, then patch. This is the established project pattern.
**When to use:** `enrollments.update` mutation.
**Example:**
```typescript
// Source: convex/clients.ts (update mutation), convex/programs.ts (update mutation)
export const update = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("completed"),
      v.literal("withdrawn")
    )),
    exitDate: v.optional(v.number()),
    exitReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) throw new Error("Enrollment not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status !== undefined) updates.status = args.status;
    if (args.exitDate !== undefined) updates.exitDate = args.exitDate;
    if (args.exitReason !== undefined) updates.exitReason = args.exitReason;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.enrollmentId, updates);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "update_enrollment",
      entityType: "enrollments",
      entityId: args.enrollmentId,
      details: `Updated enrollment status to ${args.status ?? existing.status}`,
    });
  },
});
```

### Pattern 3: List Query with Index
**What:** Query a table filtered by a foreign key using withIndex.
**When to use:** `enrollments.listByClient`, `enrollments.listByProgram`.
**Example:**
```typescript
// Source: convex/sessions.ts (list query), convex/clients.ts (getByProgram query)
export const listByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enrollments")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});
```

### Pattern 4: internalMutation for importBatch
**What:** An `internalMutation` (no auth check, not callable from frontend) that loops over a batch of records and inserts them. Returns `{ created, skipped }`. Can use `ctx.db.insert` directly without requireRole.
**When to use:** `enrollments.importBatch` — called by the Phase 18 migration script via `ctx.runMutation(internal.enrollments.importBatch, ...)`.
**Example:**
```typescript
// Source: convex/grantsInternal.ts (batchUpsert), convex/clients.ts (importLegalBatch pattern)
import { internalMutation } from "./_generated/server";

export const importBatch = internalMutation({
  args: {
    enrollments: v.array(v.object({
      clientId: v.id("clients"),
      programId: v.id("programs"),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("on_hold"),
        v.literal("completed"),
        v.literal("withdrawn")
      ),
      enrollmentDate: v.number(),
      exitDate: v.optional(v.number()),
      exitReason: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.id("users"),
    })),
  },
  handler: async (ctx, args) => {
    let created = 0;

    for (const enrollment of args.enrollments) {
      await ctx.db.insert("enrollments", {
        ...enrollment,
        updatedAt: Date.now(),
      });
      created++;
    }

    return { created };
  },
});
```

### Pattern 5: sessions.create Extension
**What:** The existing sessions.create mutation must be extended to accept the three new optional fields (attendanceStatus, enrollmentId, duration) so the frontend can log sessions linked to enrollments.
**When to use:** Extend the existing sessions.ts create mutation — do not break backward compatibility.
**Example:**
```typescript
// Extends: convex/sessions.ts (create mutation — currently missing new fields)
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    programId: v.optional(v.id("programs")),
    sessionDate: v.number(),
    sessionType: v.optional(v.string()),
    notes: v.optional(v.string()),
    // New v2.0 fields (Phase 17)
    attendanceStatus: v.optional(v.union(
      v.literal("attended"),
      v.literal("missed"),
      v.literal("excused"),
      v.literal("cancelled")
    )),
    enrollmentId: v.optional(v.id("enrollments")),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const sessionId = await ctx.db.insert("sessions", {
      clientId: args.clientId,
      programId: args.programId,
      sessionDate: args.sessionDate,
      sessionType: args.sessionType,
      notes: args.notes,
      createdBy: currentUser._id,
      attendanceStatus: args.attendanceStatus,
      enrollmentId: args.enrollmentId,
      duration: args.duration,
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "create_session",
      entityType: "sessions",
      entityId: sessionId,
      details: `Created session for client ${args.clientId}${args.enrollmentId ? ` (enrollment ${args.enrollmentId})` : ""}`,
    });

    return sessionId;
  },
});
```

### Anti-Patterns to Avoid
- **Skipping requireRole in public mutations:** Every `mutation` (not `internalMutation`) that writes data must call `requireRole`. Only `internalMutation` skips auth — and only because it cannot be called from the frontend.
- **Forgetting auditLog.log:** All data-mutating public mutations call `ctx.runMutation(internal.auditLog.log, ...)`. The audit log is the project's change history. Not calling it means the action is invisible to admins.
- **Using `mutation` for importBatch:** The importBatch is called by a CLI script (Phase 18), not by an authenticated user. It must be `internalMutation`. Using `mutation` would expose it to the frontend and require auth that CLI scripts don't have.
- **Naming the new file `enrollment.ts` (singular):** All existing files are plural (`clients.ts`, `sessions.ts`, `programs.ts`, `grants.ts`). Use `enrollments.ts`.
- **Modifying schema.ts:** The schema was fully deployed in Phase 16. Phase 17 is mutations only — do not touch `convex/schema.ts`.
- **Adding `"use node"` directive:** This file uses only Convex DB operations, no npm packages (no intuit-oauth, googleapis, openai). Do not add `"use node"`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth check | Custom userId lookup | `requireRole(ctx, ...)` from `./users` | Already handles getAuthUserId + role check + error throwing |
| Audit trail | Custom log table writes | `ctx.runMutation(internal.auditLog.log, ...)` | Already set up, already used by all mutations |
| Type-safe table IDs | String IDs | `v.id("enrollments")` / `v.id("clients")` | Convex enforces referential type safety at the validator level |

**Key insight:** This phase is mostly copy-paste of existing patterns. The risk is not in complexity but in omissions — skipping audit log, wrong RBAC roles, or not wiring up the internal import function correctly.

## Common Pitfalls

### Pitfall 1: requireRole argument mismatch
**What goes wrong:** Using the wrong set of roles for enrollment mutations. If lawyers and psychologists cannot create enrollments but the mutation allows them, or vice versa, RBAC is broken.
**Why it happens:** The sessions.create currently allows `"admin", "manager", "staff"`. For enrollment creation, the question is whether lawyers and psychologists should create enrollments for their clients or only staff/admin can.
**How to avoid:** Mirror the sessions.create pattern: `requireRole(ctx, "admin", "manager", "staff")`. Lawyers and psychologists are read-only on system data by design — the ROLE_NAV_MAP in constants.ts shows they only access `/clients` and `/settings`. They do not create enrollments.
**Warning signs:** If a lawyer/psychologist tries to create an enrollment and hits "Insufficient permissions" in the UI — that's correct behavior per the design.

### Pitfall 2: Missing updatedAt on enrollment inserts
**What goes wrong:** The enrollments table has a required (non-optional) `updatedAt: v.number()` field. Forgetting to set it on insert causes a Convex schema validation error.
**Why it happens:** Unlike `createdAt` on other tables, `updatedAt` on enrollments is required by schema design (not optional). It was set this way in Phase 16 for status-tracking purposes.
**How to avoid:** Always include `updatedAt: Date.now()` in both the create insert and the update patch.
**Warning signs:** Convex will throw a validation error at runtime: "Property 'updatedAt' is missing from value."

### Pitfall 3: importBatch not registered in _generated/api.ts as internal
**What goes wrong:** An `internalMutation` in `enrollments.ts` can only be referenced as `internal.enrollments.importBatch` — but `_generated/api.ts` only reflects what has been deployed. If `npx convex dev --once` hasn't been run after adding the file, the internal reference won't compile.
**Why it happens:** `_generated/api.ts` is auto-generated on deploy — it doesn't exist until after deploy.
**How to avoid:** After writing `enrollments.ts`, run `npx convex dev --once` interactively before referencing `internal.enrollments.importBatch` in Phase 18's migration script.
**Warning signs:** TypeScript compile error: "Property 'enrollments' does not exist on type 'typeof internal'."

### Pitfall 4: sessions.ts backward compatibility break
**What goes wrong:** If the existing sessions.ts create mutation is replaced rather than extended, existing callers in the frontend (clients detail page, any UI that logs sessions) will break if their args don't match the new signature.
**Why it happens:** All new fields (attendanceStatus, enrollmentId, duration) are optional. Adding them to args doesn't break existing callers.
**How to avoid:** Add new fields as `v.optional(...)` args. Never remove existing args. Verify with `grep -r "sessions.create\|api.sessions.create" src/` after the change.
**Warning signs:** TypeScript errors in frontend files that call sessions.create.

### Pitfall 5: entityId type in auditLog.log
**What goes wrong:** `auditLog.log` expects `entityId: v.optional(v.string())` but `ctx.db.insert` returns `Id<"enrollments">` (an opaque ID type). Passing the ID directly causes a TypeScript error.
**Why it happens:** The auditLogs table stores entityId as a plain string, not a typed ID.
**How to avoid:** Pass the ID as-is — Convex `Id` types are assignable to `string` in practice, but TypeScript may flag it. Look at how existing mutations handle this: `clients.ts` passes `clientId` directly as `entityId`. The pattern works because Convex IDs are strings at runtime.
**Warning signs:** TypeScript error on `entityId: enrollmentId` — if this happens, cast to string: `entityId: enrollmentId as string`.

## Code Examples

Verified patterns from project codebase:

### Complete enrollments.ts file structure
```typescript
// convex/enrollments.ts
// Source: convex/clients.ts, convex/programs.ts, convex/grantsInternal.ts patterns
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("on_hold"),
  v.literal("completed"),
  v.literal("withdrawn")
);

// Queries
export const listByClient = query({ ... });     // by_clientId index
export const listByProgram = query({ ... });    // by_programId index
export const getById = query({ ... });          // ctx.db.get

// Mutations
export const create = mutation({ ... });        // requireRole + insert + auditLog
export const update = mutation({ ... });        // requireRole + patch + auditLog
export const remove = mutation({ ... });        // requireRole("admin") + delete + auditLog

// Internal (for Phase 18 migration)
export const importBatch = internalMutation({ ... }); // no auth, loop insert
```

### Calling an internalMutation from a migration script
```typescript
// Source: scripts/importGrantMatrix.ts pattern
// Phase 18 migration script will call:
await convex.mutation(internal.enrollments.importBatch, {
  enrollments: batch,
});
// OR via npx convex run if using internalMutation with ctx.runMutation
```

### sessions.listByEnrollment query (needed by Phase 20 client detail page)
```typescript
// Source: convex/sessions.ts list query + by_enrollmentId index (Phase 16)
export const listByEnrollment = query({
  args: { enrollmentId: v.id("enrollments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline auth check (getAuthUserId + role check) | `requireRole()` helper from `./users` | Phase 1-5 of this project | All mutations use the helper — no duplicate auth code |
| No audit trail | `internal.auditLog.log` called after every write | Existing project | All data changes are logged with userId, action, entityType |
| Public mutation for CLI imports | `internalMutation` for internal-only writes | Established via grantsInternal.ts | Migration scripts can call batch inserts without exposing them to the frontend |

**Deprecated/outdated:**
- Public mutations with no auth (`importLegalBatch` on clients.ts): The CLAUDE.md notes "importLegalBatch and importCoparentBatch should become internalMutation after migration (Phase 18/21)" — Phase 17's `importBatch` should be `internalMutation` from the start, not repeat this mistake.

## Open Questions

1. **Should `sessions.listByEnrollment` be added in Phase 17 or deferred to Phase 20?**
   - What we know: Phase 17's success criteria only requires create/log mutations and importBatch. The `by_enrollmentId` index was added in Phase 16 but no query uses it yet.
   - What's unclear: Phase 20 (client detail page) will need this query. Adding it in Phase 17 is low cost since we're already writing sessions.ts.
   - Recommendation: Add `sessions.listByEnrollment` query in Phase 17 as a zero-cost addition — it's one function, uses an existing index, and prevents a context-switch in Phase 20.

2. **Should `enrollments.update` allow status transitions to be validated (e.g., withdrawn → active is forbidden)?**
   - What we know: The schema accepts any status value. The STATE.md decisions say "5-state status lifecycle: pending / active / on_hold / completed / withdrawn." No transition rules are documented.
   - What's unclear: Whether invalid status transitions (re-activating a withdrawn enrollment) should be blocked at the mutation level.
   - Recommendation: Do NOT add transition validation in Phase 17. Keep it simple — accept any valid status string. Business rules about re-enrollment are handled by creating a new enrollment record (per the STATE.md decision: "re-enrollment creates a new record, not reopening an old one"). Mutation just patches what the caller provides.

3. **Does importBatch need deduplication logic?**
   - What we know: Phase 18 (MIGR-02) requires deduplication by normalized name for clients. The enrollment importBatch is called after clients are created, so clientIds are already resolved.
   - What's unclear: Whether the same client could accidentally get two enrollment records for the same program if the import script is run twice.
   - Recommendation: Add a simple check in importBatch: query existing enrollments by clientId+programId before inserting. If one exists, skip (return `{ created, skipped }`). This mirrors the importLegalBatch dedup pattern in clients.ts and makes the migration idempotent.

## Sources

### Primary (HIGH confidence)
- Project source: `convex/clients.ts` — create, update, remove, importLegalBatch, internalCreate patterns
- Project source: `convex/programs.ts` — create, update, remove, getStats patterns
- Project source: `convex/sessions.ts` — create mutation pattern with requireRole and auditLog
- Project source: `convex/grantsInternal.ts` — internalMutation batchUpsert pattern
- Project source: `convex/auditLog.ts` — internal.auditLog.log signature and usage
- Project source: `convex/users.ts` — requireRole helper signature
- Project source: `convex/schema.ts` — confirmed enrollments table, all field names, index names from Phase 16 deploy

### Secondary (MEDIUM confidence)
- `.planning/phases/16-schema-foundation/16-CONTEXT.md` — locked decisions on status enum, createdBy required, updatedAt required, enrollmentId optional on sessions
- `.planning/STATE.md` — accumulated decisions on re-enrollment model, internalMutation intent for importBatch

### Tertiary (LOW confidence)
- None — all findings verified from project source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed and in use; no new dependencies
- Architecture patterns: HIGH — all patterns copied from existing files in this codebase; nothing theoretical
- Pitfalls: HIGH — pitfalls identified from reading actual schema constraints (updatedAt required), existing mutation signatures (entityId as string), and established project conventions

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — Convex API and project patterns change slowly)
