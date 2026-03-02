# Phase 18: Data Migration - Research

**Researched:** 2026-03-01
**Domain:** CLI import scripts, Convex internalMutation, dry-run migration pattern, name deduplication
**Confidence:** HIGH

## Summary

Phase 18 is a one-time data migration: write a TypeScript CLI script (run via `npx tsx`) that reads the existing clients table, legalIntakeForms, and coparentIntakeForms in Convex and creates corresponding enrollment records. The migration also backfills demographics fields (gender, referralSource, phone, email, dateOfBirth) onto client records from their linked intake forms. The script must support a `--dry-run` mode that reports counts without writing data.

All the machinery needed for this phase already exists in the project. The migration pattern is a direct extension of `scripts/seedClients.ts`, `scripts/importGrantMatrix.ts`, and the `internalMutation` pattern in `convex/enrollments.ts` (deployed in Phase 17). The Convex side exposes `enrollments.importBatch` (internalMutation) for writing; the CLI side uses `ConvexHttpClient` with `client.mutation(internal.enrollments.importBatch, ...)` — except that `internal` is not callable via `ConvexHttpClient`. This is the single most important constraint to understand: **internalMutations cannot be called via HTTP client from CLI scripts**. The solution is to add a dedicated `internalMutation` in Convex callable via `npx convex run` OR wrap enrollment creation in a public mutation with no auth guard that the CLI can reach.

The project has already resolved this tension in prior work: `importLegalBatch` and `importCoparentBatch` in `clients.ts` are public `mutation` (no auth) — they can be called from CLI via `ConvexHttpClient`. Per CLAUDE.md, these are meant to become `internalMutation` after migration (Phase 18/21). For Phase 18 enrollment migration, the safest path is to write a Convex `internalMutation` (e.g. `convex/migration.ts`) and call it via `npx convex run migration:migrateEnrollments` — the same way `seedPrograms.ts` is run. This avoids the HTTP client vs. internalMutation tension entirely.

**Primary recommendation:** Write the migration as a Convex `internalMutation` in `convex/migration.ts` run via `npx convex run`, not as a CLI script calling HTTP. Dry-run mode is handled by passing a `dryRun: boolean` arg to the mutation. The migration reads all clients, creates enrollments from their `programId`, and backfills demographics from linked intake forms — all inside one Convex transaction per batch.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIGR-01 | Import script reads cleaned spreadsheet and creates client + enrollment records in Convex | Two implementation paths: (A) Convex internalMutation run via `npx convex run` — uses existing `enrollments.importBatch`, reads all clients + intake forms, creates enrollments. (B) CLI script via ConvexHttpClient calling a public (no-auth) migration mutation. Path A is recommended — aligns with seedPrograms.ts pattern and avoids CLI/internalMutation calling constraint |
| MIGR-02 | Import deduplicates by normalized name to prevent duplicate client records | `enrollments.importBatch` already deduplicates by clientId+programId (skips if enrollment exists for that pair). Client-level dedup uses `firstName.toLowerCase() + lastName.toLowerCase()` key — pattern already in `clients.importLegalBatch` and `scripts/seedClients.ts`. Migration must match by normalized name across existing clients to avoid duplicate client creation |
| MIGR-03 | Import supports dry-run mode reporting what would be created/updated/skipped | Dry-run: pass `dryRun: v.boolean()` arg to migration mutation. When true, collect counts and return report without calling `ctx.db.insert`. This is a simple conditional around each write operation. Works in both Convex mutation and CLI approaches |
| MIGR-04 | Demographics data (gender, ethnicity, zip, referralSource) populated from spreadsheet | Client records already have these fields (Phase 16 schema). Migration reads from legalIntakeForms (referralSource, ethnicity, zipCode, dateOfBirth) and coparentIntakeForms (referralSource, ethnicity, zipCode, dateOfBirth, phone, email) via `clientId` link. Uses `ctx.db.patch` to backfill only missing fields (don't overwrite already-populated values) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex/values` (`v`) | Already installed | Arg validation for migration mutation | Project standard — every Convex file uses it |
| `internalMutation` from `convex/_generated/server` | Already installed | Migration mutation — not callable from frontend | Established pattern: seedPrograms.ts, grantsInternal.ts |
| `npx convex run` | Convex CLI | Execute internalMutation from terminal | Same as `npx convex run seedPrograms` already documented in codebase |
| `xlsx` | Already in package.json (used by existing import scripts) | If migration reads from Excel rather than Convex tables | Only needed if migration source is a new spreadsheet, not existing Convex data |
| `ConvexHttpClient` from `convex/browser` | Already installed | Used in existing CLI scripts | Only needed if taking CLI-HTTP approach (not recommended) |
| `dotenv` | Already in project | Load `.env.local` for CONVEX_URL | Used by all existing import scripts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | Already in devDependencies | Run TypeScript scripts directly | Used by all scripts in `scripts/` — `npx tsx scripts/migrate.ts` |
| `@types/node` | Already installed | Node.js types for fs, path, process | Needed for any CLI script using file system |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npx convex run` (internalMutation) | CLI + ConvexHttpClient calling public mutation | `npx convex run` is simpler, more secure (no public mutation exposed), but requires interactive terminal. CLI approach allows more complex pre-processing (Excel parsing) before calling Convex — relevant if source is a spreadsheet, not existing Convex data |
| Convex internalMutation for migration | Standalone `npx tsx` CLI script | internalMutation keeps all logic server-side. CLI gives more control over progress output and allows aborting mid-batch. For MIGR-03 (dry-run), internalMutation with `dryRun: boolean` arg is simpler than managing state in CLI |
| `ctx.db.patch` for demographics backfill | Re-creating client records | Patch is correct — never delete/recreate existing records. The client `_id` must remain stable because it is referenced by legalIntakeForms.clientId and coparentIntakeForms.clientId |

**Installation:** No new packages needed — `xlsx`, `tsx`, `ConvexHttpClient`, `dotenv` are all already available.

## Architecture Patterns

### Recommended Project Structure
```
convex/
├── migration.ts          # NEW — internalMutation migrateEnrollments (Phase 18)
└── enrollments.ts        # EXISTING — importBatch internalMutation (Phase 17, deployed)
scripts/
└── (no new script needed if using npx convex run approach)
```

If CLI approach is chosen instead:
```
scripts/
└── migrateData.ts        # NEW — CLI script using ConvexHttpClient
convex/
└── migration.ts          # NEW — public (no-auth) migration mutation callable by CLI
```

### Pattern 1: internalMutation with dry-run flag (RECOMMENDED)
**What:** Single Convex internalMutation that accepts `dryRun: boolean`. When `dryRun` is true, it collects would-be-created/updated/skipped counts and returns them without writing. When false, it executes the writes and returns actual counts.
**When to use:** Phase 18 migration — run via `npx convex run migration:migrateEnrollments` or `npx convex run migration:migrateEnrollments '{"dryRun":true}'`
**Example:**
```typescript
// convex/migration.ts
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const migrateEnrollments = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const counts = { wouldCreate: 0, wouldUpdate: 0, wouldSkip: 0 };

    // 1. Fetch all clients
    const clients = await ctx.db.query("clients").collect();

    // 2. Fetch admin user ID for createdBy field
    const adminUser = await ctx.db.query("users")
      .filter(q => q.eq(q.field("role"), "admin"))
      .first();
    if (!adminUser) throw new Error("No admin user found — cannot set createdBy on enrollments");

    for (const client of clients) {
      if (!client.programId) {
        counts.wouldSkip++;
        continue;
      }

      // Check if enrollment already exists for this client+program pair
      const existing = await ctx.db
        .query("enrollments")
        .withIndex("by_clientId", q => q.eq("clientId", client._id))
        .collect();
      const alreadyEnrolled = existing.some(e => e.programId === client.programId);

      if (alreadyEnrolled) {
        counts.wouldSkip++;
        continue;
      }

      counts.wouldCreate++;
      if (!dryRun) {
        await ctx.db.insert("enrollments", {
          clientId: client._id,
          programId: client.programId,
          status: client.status === "active" ? "active"
            : client.status === "completed" ? "completed"
            : "withdrawn",
          enrollmentDate: client.enrollmentDate ?? client.createdAt,
          createdBy: adminUser._id,
          updatedAt: Date.now(),
        });
      }
    }

    return {
      mode: dryRun ? "dry-run" : "executed",
      ...counts,
    };
  },
});
```

### Pattern 2: Demographics backfill from intake forms
**What:** For each client, fetch their linked legalIntakeForm or coparentIntakeForm and patch any demographics fields that are missing on the client record.
**When to use:** MIGR-04 — populating gender, referralSource, phone, email, dateOfBirth, ethnicity from intake data.
**Example:**
```typescript
// Within migrateEnrollments handler (or separate internalMutation migrateDemographics)
const legalIntake = await ctx.db
  .query("legalIntakeForms")
  .withIndex("by_clientId", q => q.eq("clientId", client._id))
  .first();

const coparentIntake = await ctx.db
  .query("coparentIntakeForms")
  .withIndex("by_clientId", q => q.eq("clientId", client._id))
  .first();

const intake = legalIntake ?? coparentIntake;
const demographicPatch: Record<string, unknown> = {};

// Only backfill if field is currently empty on client
if (!client.referralSource && intake?.referralSource)
  demographicPatch.referralSource = intake.referralSource;
if (!client.dateOfBirth && intake?.dateOfBirth)
  demographicPatch.dateOfBirth = intake.dateOfBirth;
if (!client.ethnicity && intake?.ethnicity)
  demographicPatch.ethnicity = intake.ethnicity;
if (!client.zipCode && intake?.zipCode)
  demographicPatch.zipCode = intake.zipCode;
// coparentIntake has phone/email fields; legalIntake has email only
if (!client.phone && coparentIntake?.phone)
  demographicPatch.phone = coparentIntake.phone;
if (!client.email && (intake as any)?.email)
  demographicPatch.email = (intake as any).email;

if (Object.keys(demographicPatch).length > 0 && !dryRun) {
  await ctx.db.patch(client._id, demographicPatch);
  counts.wouldUpdate++;
}
```

### Pattern 3: Name-based deduplication for clients
**What:** When creating new client records (if migration also imports new spreadsheet data), dedup by `${firstName.toLowerCase()}|${lastName.toLowerCase()}`. This is the established pattern in `clients.importLegalBatch` and `scripts/seedClients.ts`.
**When to use:** Only if Phase 18 introduces new client creation from a master spreadsheet (MIGR-01 mentions "cleaned spreadsheet"). If the migration only works on existing Convex data, dedup is handled by `enrollments.importBatch` (clientId+programId pair check).
**Example:**
```typescript
// From scripts/seedClients.ts (line 182-189) — VERIFIED PATTERN
const legalDeduped = new Map<string, Record<string, string>>();
for (const raw of legalRawRows) {
  const mapped = mapRow(raw, LEGAL_COLUMN_MAP);
  if (!mapped.firstName || !mapped.lastName) continue;
  const key = `${mapped.firstName.toLowerCase()}|${mapped.lastName.toLowerCase()}`;
  legalDeduped.set(key, mapped); // last occurrence wins
}
```

### Pattern 4: Admin user lookup for createdBy field
**What:** `enrollments.createdBy` is `v.id("users")` (required, per Phase 16 decision in STATE.md). Migration must supply a real user ID. The solution is to query for the first admin user.
**When to use:** Any internalMutation that creates enrollment records — including the migration.
**Example:**
```typescript
// Pattern from seedPrograms.ts and legalIntake.internalMigrateToClients approach
const adminUser = await ctx.db.query("users")
  .filter(q => q.eq(q.field("role"), "admin"))
  .first();
if (!adminUser) throw new Error("No admin user found");
// Use adminUser._id as createdBy
```

### Pattern 5: Calling internalMutation via npx convex run
**What:** `npx convex run` can execute any exported internalMutation by its Convex function path.
**When to use:** Running the migration and dry-run from the terminal.
**Example:**
```bash
# Dry-run first — no data written
npx convex run migration:migrateEnrollments '{"dryRun":true}'

# Real execution
npx convex run migration:migrateEnrollments '{"dryRun":false}'

# Or omit dryRun (defaults to false per arg definition)
npx convex run migration:migrateEnrollments
```

### Anti-Patterns to Avoid
- **Calling `internal.*` from ConvexHttpClient:** `ConvexHttpClient` can only call `api.*` (public mutations/queries), not `internal.*`. CLI scripts using `ConvexHttpClient` cannot reach internalMutations. The `npx convex run` approach bypasses this.
- **Deleting and recreating clients:** The migration must never delete existing client records. The client `_id` is a stable foreign key referenced by intake forms. Always `ctx.db.patch` for demographics, never delete+re-insert.
- **Overwriting populated demographics fields:** Only patch client fields that are currently null/undefined. Don't overwrite data that staff may have manually corrected after import.
- **Single giant mutation timing out:** Convex mutations have a runtime limit. If there are hundreds of clients, the migration may need to process in batches or use pagination. For typical DEC data volumes (< 500 clients based on existing import scripts), a single mutation is safe.
- **Skipping the dry-run review:** Per STATE.md: "Phase 18 (Data Migration): dry-run output must be reviewed before write execution — highest-risk phase." Always run dry-run first.
- **Using `mutation` instead of `internalMutation`:** The migration should not be callable from the frontend — it's a one-time operation that bypasses RBAC. Always `internalMutation`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enrollment dedup check | Custom duplicate check logic | `enrollments.importBatch` (Phase 17) already deduplicates by clientId+programId | Already tested and deployed |
| Client name dedup | Custom similarity algorithm | Exact normalized string match: `firstName.toLowerCase() + lastName.toLowerCase()` | Project standard — used in importLegalBatch and seedClients.ts |
| Admin user lookup | Hardcoded user ID | `ctx.db.query("users").filter(q => q.eq(q.field("role"), "admin")).first()` | Portable — works across dev/prod without hardcoding IDs |
| Migration CLI runner | Custom shell script | `npx convex run migration:migrateEnrollments` | Convex CLI already supports this — same as seedPrograms pattern |

**Key insight:** This phase is 90% composition of already-proven pieces. The enrollment table exists. The importBatch internalMutation exists. The client records with programId exist. The intake forms are linked via clientId. The migration is primarily: for each client with a programId, check for enrollment, create if missing, backfill demographics if needed.

## Common Pitfalls

### Pitfall 1: internalMutation not callable from ConvexHttpClient
**What goes wrong:** Developer writes migration as a CLI script using `ConvexHttpClient` and tries to call `client.mutation(internal.migration.migrateEnrollments, ...)` — fails with a type error because `internal` is only available within Convex server context, not in client-side scripts.
**Why it happens:** `ConvexHttpClient` only exposes the `api.*` namespace (public queries/mutations). The `internal.*` namespace exists only for server-side cross-mutation calls via `ctx.runMutation(internal.*, ...)`.
**How to avoid:** Use `npx convex run migration:migrateEnrollments` instead of a CLI HTTP client. This is the same pattern used for `npx convex run seedPrograms`.
**Warning signs:** TypeScript error: "Argument of type 'FunctionReference<...>' is not assignable to 'PublicMutation'" when trying to call internal function from HTTP client.

### Pitfall 2: Missing `createdBy` field on enrollment insert
**What goes wrong:** The `enrollments.createdBy` field is `v.id("users")` (NOT optional — per Phase 16 schema decision). Migration that doesn't supply this throws a Convex schema validation error.
**Why it happens:** The schema was designed with the assumption that a human always creates enrollments. The migration must simulate this by using an admin user's ID.
**How to avoid:** Always query for admin user first. If no admin user exists (shouldn't happen in production), throw with a clear error message before attempting any inserts.
**Warning signs:** Convex error: "Property 'createdBy' is missing from value" during migration.

### Pitfall 3: Status mapping mismatch between clients and enrollments
**What goes wrong:** The `clients.status` field has values `"active" | "completed" | "withdrawn"`. The `enrollments.status` field has values `"pending" | "active" | "on_hold" | "completed" | "withdrawn"`. If the migration directly assigns client status to enrollment status, `"pending"` and `"on_hold"` clients can't be mapped (they don't exist in client status).
**Why it happens:** The client status enum and enrollment status enum are slightly different (enrollment has `pending` and `on_hold` as additional states).
**How to avoid:** Map client status → enrollment status explicitly:
- `"active"` → `"active"`
- `"completed"` → `"completed"`
- `"withdrawn"` → `"withdrawn"`
- Default for any unmapped value → `"active"` (or make it configurable)
**Warning signs:** TypeScript type error when assigning client.status to enrollment status field.

### Pitfall 4: enrollmentDate fallback logic
**What goes wrong:** The `enrollments.enrollmentDate` is `v.number()` (required, Unix timestamp). Many existing client records may have `enrollmentDate` as `undefined` (it's `v.optional(v.number())` on clients). The migration must handle this.
**Why it happens:** The clients table stores enrollmentDate as optional — it was not always collected. Legacy imports may have left it undefined.
**How to avoid:** Fall back to `client.createdAt` when `client.enrollmentDate` is undefined. This is the same pattern used in `legalIntake.internalMigrateToClients` (line 114: `enrollmentDate: form.createdAt`).
**Warning signs:** Convex error: "Property 'enrollmentDate' is missing from value" — or passing `undefined` where `v.number()` is required.

### Pitfall 5: Clients without programId
**What goes wrong:** The `clients.programId` field is `v.optional(v.id("programs"))`. If a client has no programId, there is no program to create an enrollment for. These clients should be counted as "skipped" in the dry-run report and not cause errors.
**Why it happens:** Some clients may have been created without being assigned to a program (e.g., walk-ins, incomplete records).
**How to avoid:** Check `if (!client.programId)` at the top of the per-client loop and increment `skipped` count. Log a warning with the client name in the dry-run report.
**Warning signs:** TypeScript error passing `undefined` as `v.id("programs")` to enrollment insert.

### Pitfall 6: Running migration twice creates duplicate enrollments
**What goes wrong:** If the migration is run a second time (e.g., after fixing a bug), it might create duplicate enrollment records for clients that already received enrollments in the first run.
**Why it happens:** If the mutation doesn't check for existing enrollments before inserting.
**How to avoid:** The enrollment check is already in `enrollments.importBatch` (checks clientId+programId pair). The migration's own handler must also check before inserting. The `enrollments.importBatch` internalMutation from Phase 17 already handles this — calling it from the migration is the safest approach.
**Warning signs:** Duplicate enrollment records in the database, inflating enrollment counts.

### Pitfall 7: Demographics patch overwrites manually corrected data
**What goes wrong:** Staff manually corrected a client's demographics (e.g., fixed a misspelled referral source). Running migration with `ctx.db.patch` overwrites the correction with the original intake form value.
**Why it happens:** Unconditional patch does not check if field already has a value.
**How to avoid:** Only patch fields where the current client value is null/undefined. Pattern: `if (!client.referralSource && intake?.referralSource) patch.referralSource = intake.referralSource`.
**Warning signs:** Reports from staff that their corrections were overwritten after migration.

## Code Examples

Verified patterns from project codebase:

### Full migration mutation skeleton
```typescript
// convex/migration.ts
// Source: patterns from convex/seedPrograms.ts, convex/legalIntake.ts (internalMigrateToClients),
//         convex/enrollments.ts (importBatch)
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const migrateEnrollments = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    let wouldCreate = 0;
    let wouldUpdate = 0;
    let wouldSkip = 0;
    const warnings: string[] = [];

    // Lookup admin user for createdBy
    const adminUser = await ctx.db.query("users")
      .filter(q => q.eq(q.field("role"), "admin"))
      .first();
    if (!adminUser) throw new Error("No admin user found — run user seeding first");

    const clients = await ctx.db.query("clients").collect();

    for (const client of clients) {
      if (!client.programId) {
        wouldSkip++;
        warnings.push(`Skip: ${client.firstName} ${client.lastName} — no programId`);
        continue;
      }

      // Check existing enrollment for this client+program pair
      const existingEnrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_clientId", q => q.eq("clientId", client._id))
        .collect();
      const alreadyEnrolled = existingEnrollments.some(e => e.programId === client.programId);

      if (!alreadyEnrolled) {
        wouldCreate++;
        if (!dryRun) {
          const statusMap: Record<string, "active" | "completed" | "withdrawn"> = {
            active: "active",
            completed: "completed",
            withdrawn: "withdrawn",
          };
          await ctx.db.insert("enrollments", {
            clientId: client._id,
            programId: client.programId,
            status: statusMap[client.status] ?? "active",
            enrollmentDate: client.enrollmentDate ?? client.createdAt,
            createdBy: adminUser._id,
            updatedAt: Date.now(),
          });
        }
      }

      // Backfill demographics
      const legalIntake = await ctx.db
        .query("legalIntakeForms")
        .withIndex("by_clientId", q => q.eq("clientId", client._id))
        .first();
      const coparentIntake = await ctx.db
        .query("coparentIntakeForms")
        .withIndex("by_clientId", q => q.eq("clientId", client._id))
        .first();

      const patch: Record<string, string> = {};
      const intake = legalIntake ?? coparentIntake;
      if (!client.referralSource && intake?.referralSource)
        patch.referralSource = intake.referralSource;
      if (!client.dateOfBirth && intake?.dateOfBirth)
        patch.dateOfBirth = intake.dateOfBirth;
      if (!client.ethnicity && intake?.ethnicity)
        patch.ethnicity = intake.ethnicity;
      if (!client.zipCode && intake?.zipCode)
        patch.zipCode = intake.zipCode;
      if (!client.email && (legalIntake?.email ?? coparentIntake?.email))
        patch.email = (legalIntake?.email ?? coparentIntake?.email)!;
      if (!client.phone && coparentIntake?.phone)
        patch.phone = coparentIntake.phone;

      if (Object.keys(patch).length > 0) {
        wouldUpdate++;
        if (!dryRun) await ctx.db.patch(client._id, patch);
      }
    }

    return {
      mode: dryRun ? "dry-run" : "executed",
      wouldCreate,
      wouldUpdate,
      wouldSkip,
      warnings,
    };
  },
});
```

### Running from terminal
```bash
# Dry-run (review before writing)
npx convex run migration:migrateEnrollments '{"dryRun":true}'

# Execute (after reviewing dry-run output)
npx convex run migration:migrateEnrollments '{"dryRun":false}'
```

### Status mapping (clients → enrollments)
```typescript
// Source: clients.ts status union vs enrollments.ts status union
// clients: "active" | "completed" | "withdrawn"
// enrollments: "pending" | "active" | "on_hold" | "completed" | "withdrawn"
const statusMap: Record<string, "active" | "completed" | "withdrawn"> = {
  active: "active",
  completed: "completed",
  withdrawn: "withdrawn",
};
const enrollmentStatus = statusMap[client.status] ?? "active";
```

### Demographics backfill (don't overwrite existing)
```typescript
// Source: Pattern from legalIntake.internalMigrateToClients (conditional patch pattern)
const patch: Record<string, string> = {};
// Only set if currently empty on client
if (!client.referralSource && intake?.referralSource)
  patch.referralSource = intake.referralSource;
// Patch only if non-empty
if (Object.keys(patch).length > 0 && !dryRun) {
  await ctx.db.patch(client._id, patch);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CLI script via ConvexHttpClient calling public mutation | `npx convex run` calling internalMutation | Phase 17 added `enrollments.importBatch` as internalMutation | Phase 18 can use `npx convex run` — no need to expose a public migration endpoint |
| No dry-run mode (old import scripts) | Explicit `dryRun: boolean` arg | Phase 18 design decision | Dry-run output reviewed before write — safest for one-time migrations |
| Separate scripts for legal and coparent (importIntake.ts, importCoparent.ts) | Unified migration (one mutation handles all client types) | Phase 18 consolidation | All clients are in the same `clients` table; migration iterates them uniformly |

**Deprecated/outdated:**
- `importLegalBatch` and `importCoparentBatch` as public `mutation` in `clients.ts`: Per CLAUDE.md, these should become `internalMutation` after migration is complete (Phase 21 cleanup). Phase 18 does not touch them — they remain as-is until Phase 21.

## Open Questions

1. **Does MIGR-01 "reads cleaned spreadsheet" imply new client creation from Excel, or only enrollment creation from existing Convex data?**
   - What we know: STATE.md pending todo says "Inspect cleaned master spreadsheet before writing Phase 18 import script (column names, row count, name format)." The spreadsheet may be the source of new client records that aren't yet in Convex, or it may be used only for demographics enrichment.
   - What's unclear: Whether the cleaned master spreadsheet is intended to be the source of truth for clients (replacing/augmenting existing Convex data), or just used to verify what's already been imported.
   - Recommendation: Before implementing, Kareem (or project owner) should clarify whether the cleaned spreadsheet introduces new clients not yet in Convex, or just provides a canonical reference. If new clients: the migration needs both Excel parsing (XLSX) + client dedup + enrollment creation. If existing data only: the migration only creates enrollments + backfills demographics from linked intake forms.

2. **Should `migrateDemographics` be a separate internalMutation from `migrateEnrollments`?**
   - What we know: MIGR-04 (demographics) and MIGR-01 (enrollment creation) are separate requirements but related. Running them together in one mutation reduces complexity. Separating them allows targeted re-runs (e.g., re-run demographics backfill without re-running enrollment creation).
   - What's unclear: Whether the migration will need to be re-run partially in practice.
   - Recommendation: Start with both in a single `migrateEnrollments` mutation (simpler). If there are errors mid-migration, the dry-run + idempotent design means it's safe to re-run in full. Separate only if the combined mutation times out or becomes unwieldy.

3. **What if enrollment creation races with existing `importLegalBatch`/`importCoparentBatch` calls?**
   - What we know: `importLegalBatch` and `importCoparentBatch` in `clients.ts` create clients but do NOT create enrollment records — that gap is precisely what Phase 18 fills.
   - What's unclear: If someone runs `scripts/seedClients.ts` concurrently with the migration, could there be duplicate clients?
   - Recommendation: Run the migration after all seeding is complete and the spreadsheet is finalized. Document this in the migration script's header comment. The enrollment dedup (clientId+programId check) handles the case where enrollment creation is retried.

## Sources

### Primary (HIGH confidence)
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/schema.ts` — confirmed clients, enrollments, legalIntakeForms, coparentIntakeForms table schemas and field names
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/enrollments.ts` — verified `importBatch` internalMutation signature (Phase 17, deployed); dedup pattern by clientId+programId
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/clients.ts` — verified `importLegalBatch`/`importCoparentBatch` public mutation pattern; `internalCreate` pattern; name dedup logic
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/legalIntake.ts` — verified `internalMigrateToClients` pattern (internalMutation + conditional clientId check + patch)
- `/Users/mastermac/Desktop/DEC-DASH 2.0/convex/seedPrograms.ts` — verified `npx convex run` pattern for internalMutation; confirmed `ctx.runMutation(internal.*)` cross-file call pattern
- `/Users/mastermac/Desktop/DEC-DASH 2.0/scripts/seedClients.ts` — verified name dedup pattern, ConvexHttpClient usage, batch-size pattern (BATCH_SIZE=20), programId lookup flow
- `/Users/mastermac/Desktop/DEC-DASH 2.0/scripts/importGrantMatrix.ts` — verified XLSX reading, batch upsert, result counting pattern
- `/Users/mastermac/Desktop/DEC-DASH 2.0/.planning/STATE.md` — confirmed Phase 16 locked decisions: `enrollments.createdBy` is required `v.id("users")`; `dateOfBirth` stored as ISO string; `enrollments.importBatch` is internalMutation
- `/Users/mastermac/Desktop/DEC-DASH 2.0/.planning/REQUIREMENTS.md` — confirmed MIGR-01 through MIGR-04 requirement text

### Secondary (MEDIUM confidence)
- `.planning/phases/17-enrollment-sessions-backend/17-RESEARCH.md` — confirmed `enrollments.importBatch` is internalMutation with `{ created, skipped }` return; confirmed admin user ID needed for createdBy
- `.planning/phases/17-enrollment-sessions-backend/17-01-PLAN.md` — confirmed Phase 17 deliverables include `enrollments.importBatch` internalMutation

### Tertiary (LOW confidence)
- None — all critical claims verified from project source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in-use (xlsx, tsx, ConvexHttpClient, dotenv); no new dependencies needed
- Architecture patterns: HIGH — internalMutation + `npx convex run` pattern directly confirmed from seedPrograms.ts; all Convex API patterns confirmed from existing mutations
- Pitfalls: HIGH — internalMutation/HTTP client distinction verified from Convex architecture; status enum mismatch verified from schema.ts; enrollmentDate optional on clients verified from schema; createdBy required verified from STATE.md Phase 16 decision

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — schema deployed in Phase 16, mutations deployed in Phase 17; no moving targets)
