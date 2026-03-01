# Phase 16: Schema Foundation - Research

**Researched:** 2026-03-01
**Domain:** Convex schema — additive table/field/index definitions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary:** Deploy the new Client → Enrollment → Session data model as additive optional schema changes in Convex. New enrollments table, demographic fields on clients, attendance status and enrollment link on sessions, and all new indexes. No CRUD mutations, no UI changes, no data migration — just table definitions and fields so Phases 17-21 can build on a stable schema. All existing code (clients page, sessions queries, analytics) must continue working unchanged.

**Enrollment Statuses:**
- Full 5-state lifecycle: pending / active / on_hold / completed / withdrawn
- Multiple enrollments per client per program are allowed (re-enrollment creates a new record, not reopening an old one)
- Add exitReason field (optional string) for completed/withdrawn enrollments — valuable for nonprofit outcome reporting
- Status tracking via createdBy + updatedAt on the enrollment record; detailed status change history handled by the existing auditLogs table

**Demographic Fields:**
- Add 5 new optional fields to clients table: gender, referralSource, dateOfBirth, phone, email
- dateOfBirth stored as ISO date string ("YYYY-MM-DD") — simpler migration from intake form string data
- Ethnicity and zipCode already exist on clients — no changes needed for those
- Only the 5 required fields; no additional demographic fields beyond what DMOD-02 specifies

**Attendance Tracking:**
- 4 attendance statuses: attended / missed / excused / cancelled
- attendanceStatus is optional at the schema level (additive change — existing sessions untouched; Phase 17 mutations will enforce it in logic)
- Add optional duration field (number, in minutes) for grant reporting on total service hours delivered
- No facilitatorId field — createdBy is sufficient for tracking who ran the session

**Session-Enrollment Link:**
- enrollmentId is optional on sessions — allows standalone ad-hoc sessions not tied to any enrollment (e.g., walk-in consultations)
- Keep both clientId and enrollmentId on sessions — backward compatibility for existing queries and no joins needed to find the client
- programId lives directly on the enrollment record (per DMOD-01)
- Add by_enrollmentId index to sessions for fast enrollment-scoped queries
- Add by_sessionDate index to sessions for date-range queries (critical for Phase 19 analytics rewrite)

### Claude's Discretion

- **gender field type:** string vs union type — decide based on existing intake form data patterns
- **referralSource field type:** string vs union type — decide based on intake form data variety

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DMOD-01 | Enrollments table exists with clientId, programId, status, enrollmentDate, exitDate, notes, createdBy | New `enrollments` defineTable() with all required fields + exitReason (decided in discussion) + updatedAt |
| DMOD-02 | Client records include gender, referralSource, dateOfBirth, phone, and email fields | Additive `v.optional()` patches to existing `clients` defineTable() in schema.ts |
| DMOD-03 | Sessions include attendanceStatus field (attended/missed/excused/cancelled) | Additive `v.optional(v.union(...))` on existing `sessions` defineTable() |
| DMOD-04 | Sessions link to enrollments via enrollmentId | Additive `v.optional(v.id("enrollments"))` on sessions + by_enrollmentId index |
| DMOD-05 | Enrollments indexed by clientId, programId, and status | Three `.index()` calls on the new enrollments table |

</phase_requirements>

---

## Summary

Phase 16 is a pure schema operation: edit `convex/schema.ts` to add one new table and extend two existing tables, then deploy with `npx convex dev --once`. No queries, no mutations, no frontend changes. The entire phase is a single file edit + one deploy command.

The key engineering constraint is **additive-only**: every new field must be wrapped in `v.optional()` so existing documents (which lack these fields) remain valid without a migration. Convex's schema validation is enforced at write time, so reads of old documents simply return `undefined` for the new optional fields — which is exactly what we want.

The existing codebase establishes clear patterns: status enums use `v.union(v.literal(...))`, timestamps use `v.number()` (Unix ms), date strings use `v.string()`, IDs use `v.id("tableName")`, and indexes follow the `by_fieldName` naming convention. This phase must follow all of these patterns exactly.

**Primary recommendation:** Edit `convex/schema.ts` in a single focused change — add the `enrollments` table, patch the `clients` table with 5 new optional fields, patch the `sessions` table with 3 new optional fields and 2 new indexes — then deploy once. Verify by querying each new table/field via Convex dashboard.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex/values` (`v`) | Already installed | Schema type validators | Only way to define Convex schema types |
| `convex/server` (`defineSchema`, `defineTable`) | Already installed | Schema structure | Only way to define Convex tables |

No new packages are needed. This phase is entirely within `convex/schema.ts` using already-installed Convex primitives.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

This phase touches exactly one file:

```
convex/
└── schema.ts    # The only file to edit in this phase
```

No new files are created. No other files need modification.

### Pattern 1: Additive Optional Fields on Existing Tables

**What:** Add new fields to an existing `defineTable()` wrapped in `v.optional()` so existing documents remain valid.

**When to use:** Always, when extending an existing table with new data requirements without backfilling old documents.

**Example (clients table extension):**
```typescript
// Source: existing schema.ts pattern + Convex docs on optional validators
clients: defineTable({
  // --- EXISTING FIELDS (unchanged) ---
  firstName: v.string(),
  lastName: v.string(),
  programId: v.optional(v.id("programs")),
  enrollmentDate: v.optional(v.number()),
  status: v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("withdrawn")
  ),
  zipCode: v.optional(v.string()),
  ageGroup: v.optional(v.string()),
  ethnicity: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  // --- NEW FIELDS (Phase 16 additions) ---
  gender: v.optional(v.string()),           // Discretion: string (see findings)
  referralSource: v.optional(v.string()),   // Discretion: string (see findings)
  dateOfBirth: v.optional(v.string()),      // ISO "YYYY-MM-DD" per decision
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
}).index("by_programId", ["programId"]),    // existing index preserved
```

### Pattern 2: Additive Optional Fields + New Indexes on Existing Tables

**What:** Add fields AND new index declarations to an existing table. Convex builds the index after deploy.

**When to use:** When new query patterns are needed (Phase 19 will use by_sessionDate for range queries).

**Example (sessions table extension):**
```typescript
// Source: existing schema.ts pattern
sessions: defineTable({
  // --- EXISTING FIELDS (unchanged) ---
  clientId: v.id("clients"),
  programId: v.optional(v.id("programs")),
  sessionDate: v.number(),
  sessionType: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.optional(v.id("users")),
  // --- NEW FIELDS (Phase 16 additions) ---
  attendanceStatus: v.optional(v.union(
    v.literal("attended"),
    v.literal("missed"),
    v.literal("excused"),
    v.literal("cancelled")
  )),
  enrollmentId: v.optional(v.id("enrollments")),
  duration: v.optional(v.number()),         // minutes
})
  .index("by_clientId", ["clientId"])       // existing index preserved
  .index("by_enrollmentId", ["enrollmentId"]) // new
  .index("by_sessionDate", ["sessionDate"]),  // new
```

### Pattern 3: New Table with Full Field Set

**What:** Add a completely new `defineTable()` to the schema object.

**When to use:** When introducing a new entity (enrollments) that doesn't exist yet.

**Example (enrollments table — new):**
```typescript
// Source: Convex schema patterns, consistent with existing tables
enrollments: defineTable({
  clientId: v.id("clients"),
  programId: v.id("programs"),
  status: v.union(
    v.literal("pending"),
    v.literal("active"),
    v.literal("on_hold"),
    v.literal("completed"),
    v.literal("withdrawn")
  ),
  enrollmentDate: v.number(),             // Unix ms timestamp (project standard)
  exitDate: v.optional(v.number()),       // Unix ms timestamp
  exitReason: v.optional(v.string()),     // for completed/withdrawn reporting
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  updatedAt: v.number(),                  // Unix ms timestamp
})
  .index("by_clientId", ["clientId"])
  .index("by_programId", ["programId"])
  .index("by_status", ["status"]),
```

### Anti-Patterns to Avoid

- **Making new fields required (non-optional):** Any non-optional field added to an existing table requires all existing documents to have that field. Since we're not doing a data migration, all new fields on `clients` and `sessions` MUST be `v.optional()`.
- **Missing indexes:** The sessions table currently has `by_clientId` only. Phase 19 needs `by_sessionDate` to avoid full-table scans. Add both new indexes now — Convex does not support adding indexes outside of a schema redeploy.
- **Non-standard index naming:** The project uses `by_fieldName` convention consistently. Do not deviate (e.g., don't name it `sessionDate_idx` or `idx_sessionDate`).
- **Placing new table before referenced tables:** The `enrollments` table references `clients`, `programs`, and `users`. In JavaScript, the schema object order doesn't matter for Convex (it's not sequential SQL DDL), but placing it near `sessions` for logical grouping is cleaner.
- **Forgetting to preserve existing indexes:** When editing `sessions` or `clients` `defineTable()` definitions, the existing `.index()` chains must be preserved. Removing an existing index would break existing queries that use `withIndex()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom TypeScript type guards | `v.union(v.literal(...))` in schema | Convex enforces at write time; TS types auto-generated |
| Index management | Manual query filters | `.index()` on `defineTable()` | Convex builds and maintains indexes; withIndex() queries are O(log n) |
| Type generation | Manual `DataModel` interfaces | Auto-generated `_generated/dataModel.d.ts` | Run `npx convex dev --once` — types regenerate automatically |

**Key insight:** The Convex schema is the single source of truth. After deploying `schema.ts`, the `_generated/dataModel.d.ts` is regenerated with TypeScript types for every table including the new `enrollments` table and new fields on `clients`/`sessions`. No manual type work is needed.

---

## Common Pitfalls

### Pitfall 1: Breaking Existing Indexes When Extending Tables

**What goes wrong:** Developer rewrites the `defineTable()` call and accidentally drops `.index("by_clientId", ["clientId"])` from sessions or `by_programId` from clients.

**Why it happens:** When touching a table definition, it's easy to focus on the new fields and accidentally remove existing index declarations in the chained method calls.

**How to avoid:** Start from the existing schema definition verbatim, then append new fields and chain new indexes. Don't restructure the existing call.

**Warning signs:** After deploy, `sessions.list` with a `clientId` filter would throw a runtime error like "Index by_clientId not found" — would break the clients detail page immediately.

### Pitfall 2: Circular Reference Between `enrollments` and `sessions`

**What goes wrong:** `sessions` references `v.id("enrollments")`, and if `enrollments` is declared after `sessions` in the schema, TypeScript/Convex may show type errors during codegen.

**Why it happens:** Convex schema is a JavaScript object literal — forward references in `v.id()` string literals are resolved at runtime by Convex, not at TypeScript parse time. This is NOT actually a problem in Convex (string-based table names, not runtime object references), but developers sometimes worry unnecessarily.

**How to avoid:** Simply declare `enrollments` in the schema object. Convex resolves `v.id("enrollments")` by table name string at runtime, not by object reference. Order doesn't matter for correctness — use logical grouping (e.g., place `enrollments` between `clients` and `sessions` for readability).

**Warning signs:** Not a real issue — no warning signs because it won't happen. Document to prevent unnecessary restructuring.

### Pitfall 3: Forgetting `updatedAt` on Enrollments

**What goes wrong:** The `enrollments` table is created without `updatedAt`, then Phase 17 (CRUD mutations) needs to set it on status changes but it's not in the schema.

**Why it happens:** `updatedAt` was decided in the discussion but is not in DMOD-01's field list (which only specifies enrollmentDate, exitDate, notes, createdBy).

**How to avoid:** The CONTEXT.md explicitly states: "Status tracking via createdBy + updatedAt on the enrollment record." Include `updatedAt: v.number()` in the enrollments table. DMOD-01 says "createdBy" — infer that updatedAt is also required per the decision.

**Warning signs:** Phase 17 mutations will fail TypeScript validation when trying to patch `updatedAt` on an enrollment if not in schema.

### Pitfall 4: Deploy Command Confusion

**What goes wrong:** Developer runs `npx convex deploy` instead of `npx convex dev --once`, pushing to the wrong deployment or triggering a full production deploy.

**Why it happens:** `npx convex deploy` is the "intuitive" command for deploying. But this project uses dev deployment for everything.

**How to avoid:** ALWAYS use `npx convex dev --once`. This is documented in CLAUDE.md and MEMORY.md. The project has no separate prod Convex deployment — `aware-finch-86` is both dev and prod.

**Warning signs:** The output of `npx convex deploy` will try to create a new deployment or fail with auth errors if run from the project directory.

### Pitfall 5: Non-Interactive Deploy Requirement

**What goes wrong:** Trying to automate the schema deploy in a script or CI step.

**Why it happens:** `npx convex dev --once` sometimes prompts for confirmation when schema changes are destructive. For additive-only changes, it should not prompt, but the runner must be available to respond.

**How to avoid:** Run `npx convex dev --once` in an interactive terminal. The STATE.md documents this as a known concern: "npx convex dev --once must be run interactively — schema deploys cannot be automated."

**Warning signs:** Process hangs waiting for stdin in a non-interactive environment.

---

## Code Examples

Verified patterns from the existing codebase:

### Complete enrollments Table Definition

```typescript
// Placement: after `clients` table, before `sessions` table in schema.ts
// Source: consistent with existing table patterns in convex/schema.ts
enrollments: defineTable({
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
  updatedAt: v.number(),
})
  .index("by_clientId", ["clientId"])
  .index("by_programId", ["programId"])
  .index("by_status", ["status"]),
```

### Complete clients Table Definition (with new fields)

```typescript
// Source: existing clients definition (schema.ts:147) + 5 new optional fields
clients: defineTable({
  // Existing fields — DO NOT MODIFY
  firstName: v.string(),
  lastName: v.string(),
  programId: v.optional(v.id("programs")),
  enrollmentDate: v.optional(v.number()),
  status: v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("withdrawn")
  ),
  zipCode: v.optional(v.string()),
  ageGroup: v.optional(v.string()),
  ethnicity: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  // New fields — Phase 16 additions
  gender: v.optional(v.string()),
  referralSource: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
}).index("by_programId", ["programId"]),
```

### Complete sessions Table Definition (with new fields + indexes)

```typescript
// Source: existing sessions definition (schema.ts:164) + 3 new fields + 2 new indexes
sessions: defineTable({
  // Existing fields — DO NOT MODIFY
  clientId: v.id("clients"),
  programId: v.optional(v.id("programs")),
  sessionDate: v.number(),
  sessionType: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.optional(v.id("users")),
  // New fields — Phase 16 additions
  attendanceStatus: v.optional(v.union(
    v.literal("attended"),
    v.literal("missed"),
    v.literal("excused"),
    v.literal("cancelled")
  )),
  enrollmentId: v.optional(v.id("enrollments")),
  duration: v.optional(v.number()),
})
  .index("by_clientId", ["clientId"])         // existing — PRESERVE
  .index("by_enrollmentId", ["enrollmentId"]) // new
  .index("by_sessionDate", ["sessionDate"]),  // new
```

### Deploy Command

```bash
# From project root (note: directory has a space — already in terminal as cwd)
npx convex dev --once
```

### Verifying the Schema After Deploy

```bash
# Check the generated types include the new table
grep -n "enrollments\|attendanceStatus\|enrollmentId\|by_sessionDate" \
  "convex/_generated/dataModel.d.ts"
```

---

## Discretion Findings: gender and referralSource Field Types

The CONTEXT.md delegates the choice of `v.string()` vs `v.union(v.literal(...))` for `gender` and `referralSource` to Claude's discretion, based on intake form data patterns.

**Evidence from codebase:**

1. **programDataCache** (schema.ts:120, 126): Both `gender` and `referralSource` are `v.optional(v.string())` — free-form strings from Google Sheets.

2. **legalIntakeForms** (schema.ts:281): `referralSource: v.optional(v.string())` — free-form.

3. **coparentIntakeForms** (schema.ts:311): `referralSource: v.optional(v.string())` — free-form.

4. **Import scripts** (`importIntake.ts`, `importCoparent.ts`, `seedClients.ts`): Referral source question text varies ("How did you find out about the program?", "How did you hear about this program?", "How did they find us?") — strongly suggesting free-form answers, not a controlled vocabulary.

5. **Google Sheets sync** (`googleSheetsActions.ts:114`): `gender` pulled directly from spreadsheet column as raw string — no normalization.

6. **Analytics** (`analytics.ts:125, 129`): `genderDistribution` and `referralSource` are computed via `toSortedDistribution()` which groups by whatever string value exists — treats them as open enumerations.

**Recommendation:** Use `v.optional(v.string())` for both `gender` and `referralSource` on the `clients` table.

**Rationale:** The data comes from free-form intake forms and spreadsheets with inconsistent terminology. Enforcing a union type at the schema level would break Phase 18 data migration if any imported value doesn't match the enum. A string type is flexible enough for Phase 18 to populate these fields from existing intake form data (which already stores strings), and Phase 19 analytics can group/normalize at query time. If controlled vocabulary becomes a requirement, it can be enforced at the mutation layer (Phase 17) without changing the schema.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Convex v1 schema with `s.` validators | Convex v2+ schema with `v.` validators | ~2023 | Project already uses `v.` — no change needed |
| `defineTable` with no chaining | `.index()` chained on `defineTable()` | Project start | Already the pattern used throughout |

**Deprecated/outdated:**
- `s.id()`, `s.string()`, `s.number()` validators: Replaced by `v.id()`, `v.string()`, `v.number()`. The project already uses `v.` throughout — confirm no `s.` usage before editing.

---

## Open Questions

1. **enrollmentDate field on clients table — keep or ignore?**
   - What we know: The `clients` table currently has `enrollmentDate: v.optional(v.number())` — a legacy field from before the Enrollment model was designed. DMOD-01 says the enrollments table has `enrollmentDate`. INFR-03 (Phase 21) says "Legacy programId, enrollmentDate, status fields removed from clients schema."
   - What's unclear: Should we note in a comment that `clients.enrollmentDate` is a legacy field slated for removal in Phase 21, to avoid confusion when Phase 17 developers see both?
   - Recommendation: Add an inline comment `// Legacy field — removal planned in Phase 21 (INFR-03)` next to `enrollmentDate` on the clients table. This is a documentation concern only; no schema change needed in Phase 16.

2. **createdBy on enrollments — required or optional?**
   - What we know: DMOD-01 lists `createdBy` as a field. The context decisions say "Status tracking via createdBy + updatedAt on the enrollment record." Other tables (clients.create, sessions.create) use `currentUser._id` from `requireRole()` and set `createdBy` as the logged-in user.
   - What's unclear: Should it be `v.id("users")` (required) or `v.optional(v.id("users"))` (optional, for CLI import scripts)?
   - Recommendation: Make it `v.id("users")` (required, non-optional) since enrollments will always be created by an authenticated user in Phase 17. Phase 18 (data migration) will use an internalMutation that can use a system/admin user ID. This matches how `auditLogs.userId` is `v.id("users")` (required).

3. **by_status index — composite or single field?**
   - What we know: DMOD-05 says "Enrollments indexed by clientId, programId, and status." Phase 19 will need to count active clients derived from enrollments with `status=active`. For ANLY-03: count by status across all enrollments.
   - What's unclear: Would a compound index `by_clientId_status` on `["clientId", "status"]` be more useful than separate `by_clientId` and `by_status` indexes?
   - Recommendation: Create three separate single-field indexes (`by_clientId`, `by_programId`, `by_status`) matching DMOD-05 exactly. Compound indexes can be added in Phase 19 if the analytics rewrite reveals they're needed. Adding indexes is always possible in a future deploy; avoid premature optimization.

---

## Validation Architecture

`workflow.nyquist_validation` is not present in `.planning/config.json` (confirmed from prior research on this project). The project has no automated test infrastructure (no jest.config, vitest.config, or test files). All verification is manual.

**Manual verification checklist for this phase:**
- [ ] `npx convex dev --once` completes without errors
- [ ] Convex dashboard shows `enrollments` table (initially empty)
- [ ] Convex dashboard shows new fields on `clients` and `sessions` schemas
- [ ] Existing clients page loads without errors (no schema validation failures)
- [ ] Existing sessions list loads without errors
- [ ] Existing analytics page loads without errors (programDataCache queries unchanged)
- [ ] `convex/_generated/dataModel.d.ts` contains `enrollments`, `attendanceStatus`, `enrollmentId`, `by_sessionDate`

---

## Sources

### Primary (HIGH confidence)

- **Existing `convex/schema.ts`** (read in full) — establishes all naming conventions, field types, and index patterns used in this project
- **Existing `convex/clients.ts`** (read in full) — confirms which queries use `by_programId` index (must be preserved)
- **Existing `convex/sessions.ts`** (read in full) — confirms only `by_clientId` index exists on sessions (new ones safe to add)
- **Existing `convex/analytics.ts`** (read in full) — confirms getSessionVolume/getSessionTrends do full-table scans (why by_sessionDate is needed; also confirms these queries won't break after schema add)
- **`.planning/phases/16-schema-foundation/16-CONTEXT.md`** (read in full) — all locked decisions and discretion areas
- **CLAUDE.md** (via system context) — deploy process, Convex deployment model, project conventions

### Secondary (MEDIUM confidence)

- **Existing import scripts** (`importCoparent.ts`, `importIntake.ts`, `seedClients.ts`) — confirmed that gender/referralSource are free-form strings with no controlled vocabulary; supports string type recommendation
- **Existing `convex/googleSheetsActions.ts`** — confirmed gender is pulled as raw string from spreadsheet

### Tertiary (LOW confidence)

- None — all claims are verified from project source code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages, pure Convex schema primitives already in use
- Architecture: HIGH — patterns directly observed in existing schema.ts; no speculation
- Pitfalls: HIGH — index preservation and deploy command pitfalls verified from project docs and code; updatedAt pitfall identified from CONTEXT.md vs DMOD-01 discrepancy
- Discretion findings: HIGH — string vs union type recommendation based on direct evidence from 6+ code locations

**Research date:** 2026-03-01
**Valid until:** Stable indefinitely — Convex schema API has not changed in this area; project source code is the ground truth
