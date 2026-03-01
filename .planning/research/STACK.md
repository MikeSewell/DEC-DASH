# Stack Research

**Domain:** Convex data model refactor + data migration + export + analytics rewrite (DEC DASH v2.0 Data Foundation)
**Researched:** 2026-03-01
**Confidence:** HIGH

---

## Context: What Already Exists (Do Not Re-Research)

This is a subsequent milestone. The base stack is locked and fully operational.

| Already Installed | Version | Role in v2.0 |
|-------------------|---------|--------------|
| `convex` | 1.32.0 | Schema, queries, mutations — ALL new backend work happens here |
| `xlsx` | 0.18.5 | Already used by import scripts; covers Excel export + migration script reading |
| `googleapis` | 171.4.0 | Calendar + Sheets service account auth — service account credentials already unified |
| `date-fns` | 4.1.0 | Date formatting for export and analytics labels |
| `dotenv` | 17.3.1 | env loading for CLI migration scripts |
| `next` | 16.1.6 | App Router — export UI is a client component, no server route needed |
| `@convex-dev/auth` | 0.0.90 | Auth — no changes |

**Key finding: v2.0 adds zero new npm packages.** All five features are achievable within the existing installed stack.

---

## Feature 1: Client → Enrollment → Session Data Model

### No New Packages Required

This is pure Convex schema and backend work. The data model refactor involves:

1. **New `enrollments` table** — links client to program with status and dates
2. **Modified `sessions` table** — add `enrollmentId` foreign key and `by_sessionDate` index
3. **Modified `clients` table** — add `gender` field (currently only on `programDataCache`); remove `programId` after migration

### Schema Additions

**New table: `enrollments`**

```typescript
enrollments: defineTable({
  clientId: v.id("clients"),
  programId: v.id("programs"),
  enrollmentDate: v.optional(v.number()),
  status: v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("withdrawn")
  ),
  notes: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_clientId", ["clientId"])
  .index("by_programId", ["programId"])
  .index("by_clientId_programId", ["clientId", "programId"])
```

**Modified table: `sessions`** — add `enrollmentId`, add `by_sessionDate` index, add `attendanceStatus`

```typescript
sessions: defineTable({
  clientId: v.id("clients"),
  enrollmentId: v.optional(v.id("enrollments")),   // NEW — optional during migration
  programId: v.optional(v.id("programs")),
  sessionDate: v.number(),
  attendanceStatus: v.optional(v.union(             // NEW
    v.literal("attended"),
    v.literal("no_show"),
    v.literal("cancelled")
  )),
  sessionType: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.optional(v.id("users")),
})
  .index("by_clientId", ["clientId"])
  .index("by_enrollmentId", ["enrollmentId"])       // NEW
  .index("by_sessionDate", ["sessionDate"])          // NEW — fixes known full-table scan
```

**Modified table: `clients`** — add `gender`, keep `programId` as optional during migration

```typescript
clients: defineTable({
  firstName: v.string(),
  lastName: v.string(),
  programId: v.optional(v.id("programs")),     // Keep optional; remove in second deploy after migration
  enrollmentDate: v.optional(v.number()),       // Keep optional; remove after migration
  status: v.union(v.literal("active"), v.literal("completed"), v.literal("withdrawn")),
  zipCode: v.optional(v.string()),
  ageGroup: v.optional(v.string()),
  gender: v.optional(v.string()),              // NEW — currently only in programDataCache
  ethnicity: v.optional(v.string()),
  referralSource: v.optional(v.string()),      // NEW — currently only in programDataCache
  notes: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_programId", ["programId"])         // Keep during migration; remove after
```

### Migration Safety Pattern

**Rule: Make fields optional before migration, required after.** Convex requires all documents to conform to schema. The migration window where some clients have `enrollmentId` on their sessions and others don't requires `enrollmentId: v.optional(...)` during that window. After migration completes, make it required.

**Two-deploy approach:**
1. Deploy 1: Add new tables, add optional fields to existing tables → run migration script
2. Deploy 2: Remove old fields, tighten types → after verifying data integrity

---

## Feature 2: Unified Google OAuth for Calendar

### No New Packages Required — Credentials Already Unified

Both `googleCalendarActions.ts` and `googleSheetsActions.ts` currently read the same environment variables:

```typescript
// Already in both files — same service account credentials
credentials: {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}
```

The "unification" task is removing the **Sheets sync for program data** — not adding new auth infrastructure.

### What Changes (Deletion Work)

| What to Remove | Location | Why |
|----------------|----------|-----|
| `syncProgramData` action | `googleSheetsActions.ts` | App becomes source of truth; no longer needed |
| `sheets-sync` cron (program data) | `crons.ts` | Or narrow it to grant sync only |
| `programDataCache` table | `schema.ts` | After analytics rewrite is live |
| Sheets config for `program_legal`, `program_coparent` | Admin UI / `googleSheetsConfig` docs | Purpose-scoped configs no longer needed |

**Keep:**
- `syncGrantTracker` — Sheets still used for grant tracking cache
- `googleCalendarSync` — no change
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` env vars — still needed for both Calendar and Sheets (grants)

### Decision: Service Account is Correct

Do NOT add OAuth2 user-flow credentials (client_id + client_secret + refresh_token cycle) for Calendar. Service account is the right pattern for server-to-server read-only access where no user interaction is needed. This is already validated in the codebase and noted in PROJECT.md as a good decision.

---

## Feature 3: One-Time Data Migration from Cleaned Spreadsheet

### No New Packages Required

Follow the exact pattern of `scripts/importCoparent.ts`, which is already in the codebase:

| Technology | Version | Purpose | Already There? |
|------------|---------|---------|----------------|
| `xlsx` | 0.18.5 | Read Excel/CSV spreadsheet rows | Yes |
| `convex/browser` `ConvexHttpClient` | via `convex` 1.32.0 | Call Convex mutations from Node.js script | Yes — same as `importCoparent.ts` |
| `dotenv` | 17.3.1 | Load `.env.local` for `NEXT_PUBLIC_CONVEX_URL` | Yes |
| `tsx` (via `npx tsx`) | dev tool | Run TypeScript script without compile step | Yes — same invocation as existing scripts |

### Migration Script Pattern

```typescript
// scripts/importV2Data.ts — follows importCoparent.ts pattern exactly
import * as XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Read spreadsheet → normalize rows → deduplicate by firstName+lastName
// Call internalMutation in batches of 20-25 rows
// Each batch is idempotent (skip duplicates by name)
```

**Batching:** 20-25 rows per mutation call matches `importGrantMatrix.ts` pattern. Provides natural restart capability if interrupted mid-run.

### Internal Migration Mutation for Existing Data

A separate `internalMutation` in `convex/migrateToEnrollments.ts` handles migrating the existing `clients.programId` data into the new `enrollments` table:

```typescript
// convex/migrateToEnrollments.ts
export const run = internalMutation({
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    for (const client of clients) {
      if (!client.programId) continue;
      // Check if enrollment already exists (idempotent)
      const existing = await ctx.db.query("enrollments")
        .withIndex("by_clientId_programId", q =>
          q.eq("clientId", client._id).eq("programId", client.programId!)
        ).first();
      if (existing) continue;
      await ctx.db.insert("enrollments", {
        clientId: client._id,
        programId: client.programId,
        enrollmentDate: client.enrollmentDate,
        status: client.status,
        createdAt: client.createdAt,
      });
    }
  }
});
// Run: npx convex run migrateToEnrollments:run
```

**Why NOT `@convex-dev/migrations` 0.3.1:** This package adds a component system requiring `convex.config.ts` changes, a component install step, and infrastructure overhead. The dataset is hundreds of clients — not millions. The existing `npx convex run` pattern (used by `seedPrograms.ts` in this project) handles the same task with zero new dependencies. The `@convex-dev/migrations` component is appropriate at scale (100K+ documents needing paginated batching), not here.

---

## Feature 4: Data Export (CSV and Excel)

### No New Packages Required

**CSV export — native Blob API only.** Build a shared utility function:

```typescript
// src/lib/exportUtils.ts
export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) =>
    typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))
      ? `"${val.replace(/"/g, '""')}"` : String(val ?? "");

  const csvContent = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Excel export — existing `xlsx` 0.18.5.** Already in `package.json`, already used in import scripts. Use `XLSX.utils.json_to_sheet()` + `XLSX.writeFile()`:

```typescript
// src/lib/exportUtils.ts
import * as XLSX from "xlsx";

export function downloadXlsx(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
```

**Convex query for export data:** Add an `exportAll` query to `clients.ts` that returns a flat denormalized dataset (clients + enrollments joined). Role-gated to admin/manager. At current scale (hundreds of records), collecting the full table and joining in-memory is fine — no pagination needed.

```typescript
// convex/clients.ts — add export query
export const exportAll = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin", "manager");
    const clients = await ctx.db.query("clients").collect();
    const enrollments = await ctx.db.query("enrollments").collect();
    const programs = await ctx.db.query("programs").collect();
    const programMap = new Map(programs.map(p => [p._id, p.name]));
    const enrollmentsByClient = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const k = e.clientId as string;
      enrollmentsByClient.set(k, [...(enrollmentsByClient.get(k) ?? []), e]);
    }
    return clients.map(c => ({
      firstName: c.firstName,
      lastName: c.lastName,
      gender: c.gender ?? "",
      ageGroup: c.ageGroup ?? "",
      ethnicity: c.ethnicity ?? "",
      zipCode: c.zipCode ?? "",
      referralSource: c.referralSource ?? "",
      programs: enrollmentsByClient.get(c._id as string)
        ?.map(e => programMap.get(e.programId) ?? "")
        .join("; ") ?? "",
      status: c.status,
    }));
  }
});
```

### What NOT to Add

- Do NOT add `react-csv` or `papaparse` — native Blob API and `xlsx` cover all export needs without extra bundle size
- Do NOT upgrade `xlsx` to CDN version 0.20.x — SheetJS moved off npm after 0.18.5; changing the install source adds risk; 0.18.5 fully supports `json_to_sheet` and `writeFile`

---

## Feature 5: Analytics Rewrite (Sheets → Convex)

### No New Packages Required

The `getAllDemographics` query in `analytics.ts` currently reads from `programDataCache` (Google Sheets data). After the data model refactor, it reads from `clients` + `enrollments`.

### Key Gap: `gender` Field

`programDataCache` has a `gender` field. The current `clients` table does not. Adding `gender: v.optional(v.string())` to `clients` schema (covered in Feature 1 above) fills this gap during data migration.

### Rewritten Analytics Query Pattern

```typescript
// convex/analytics.ts — replace getAllDemographics
export const getAllDemographics = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const enrollments = await ctx.db.query("enrollments").collect();

    // Determine active status: client is "active" if any enrollment is active
    const activeClientIds = new Set(
      enrollments.filter(e => e.status === "active").map(e => e.clientId as string)
    );
    const completedClientIds = new Set(
      enrollments.filter(e => e.status === "completed").map(e => e.clientId as string)
    );

    const total = clients.length;
    const active = clients.filter(c => activeClientIds.has(c._id as string)).length;
    const completed = clients.filter(c => completedClientIds.has(c._id as string)).length;

    const toSortedDistribution = (field: (c: typeof clients[0]) => string | undefined) => {
      const map: Record<string, number> = {};
      for (const c of clients) {
        const val = field(c) ?? "Unknown";
        map[val] = (map[val] ?? 0) + 1;
      }
      return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      total, active, completed,
      genderDistribution: toSortedDistribution(c => c.gender),
      ethnicityDistribution: toSortedDistribution(c => c.ethnicity),
      ageDistribution: toSortedDistribution(c => c.ageGroup),
      referralSource: toSortedDistribution(c => c.referralSource).slice(0, 10),
      // outcomeDistribution requires a new field or enrollment-level outcome tracking
    };
  }
});
```

### `by_sessionDate` Index Fixes Known Full-Table Scan

PROJECT.md notes: "`getSessionVolume` does a full-table scan on sessions (no by_sessionDate index) — works at current scale." Adding the index in Feature 1 schema changes eliminates this. The `getSessionTrends` and `getSessionVolume` queries in `analytics.ts` can then use:

```typescript
const recent = await ctx.db
  .query("sessions")
  .withIndex("by_sessionDate", q => q.gte("sessionDate", thirtyDaysAgo))
  .collect();
```

---

## Summary: New Packages

**None required for v2.0.** All features use only what is already installed.

| Package | Already Installed | Used For in v2.0 |
|---------|-------------------|------------------|
| `convex` 1.32.0 | Yes | New schema tables, queries, internalMutations |
| `xlsx` 0.18.5 | Yes | Migration script reading + Excel export |
| `googleapis` 171.4.0 | Yes | No new usage — Calendar stays, Sheets program sync removed |
| `dotenv` 17.3.1 | Yes | Migration CLI scripts |
| `date-fns` 4.1.0 | Yes | Date formatting in export labels |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@convex-dev/migrations` 0.3.1 | Component overhead, `convex.config.ts` changes — overkill for hundreds of records | `internalMutation` + `npx convex run` (already proven by `seedPrograms.ts`) |
| `react-csv` or `papaparse` | Unnecessary bundle weight; native Blob API + `xlsx` covers all export cases | Native `Blob` + `URL.createObjectURL` for CSV; `xlsx` for Excel |
| `@convex-dev/aggregate` | Pre-computed aggregates for millions of documents — overkill at nonprofit scale | In-memory aggregation in Convex queries (same pattern as existing analytics) |
| `xlsx` CDN upgrade to 0.20.x | SheetJS moved off npm after 0.18.5; changing install source adds deployment risk | Stay on 0.18.5 — fully supports all write operations needed |
| OAuth2 user-flow for Calendar | Adds client_id/secret/refresh cycle; service account already works and is validated | Existing service account pattern (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`) |
| Separate BI tool or analytics DB | Overkill; Convex in-memory joins are sufficient at hundreds-to-low-thousands scale | Convex queries in `analytics.ts` with in-memory join |
| Next.js API route for export | Unnecessary server hop; Blob API generates files entirely client-side | Client-side `downloadCsv` / `downloadXlsx` utility functions |

---

## Stack Patterns by Scenario

**If migrating existing `clients.programId` data:**
- Deploy schema with `enrollments` table and all new optional fields first
- Run `npx convex run migrateToEnrollments:run` to create enrollment records
- Verify in admin UI that all clients have enrollments
- Deploy schema again to remove `programId` + `enrollmentDate` from `clients` and tighten `enrollmentId` on `sessions`

**If the cleaned spreadsheet has new clients not yet in Convex:**
- Use `scripts/importV2Data.ts` (new CLI script, same pattern as `importCoparent.ts`)
- Deduplication by `firstName+lastName` makes the script idempotent — safe to re-run

**If removing Sheets program data sync:**
- Delete `syncProgramData` from `googleSheetsActions.ts`
- Keep or narrow the `sheets-sync` cron to only call `syncGrantTracker`
- Keep `googleSheetsConfig` table and grant sync infrastructure intact
- Delete `programDataCache` table from schema after `getAllDemographics` is fully rewritten

**If `programDataCache` has data `clients` table is missing:**
- Check what fields exist in `programDataCache` but not `clients` before deleting
- The known gap is `gender` and `referralSource` — add both to `clients` schema
- `programOutcome` in `programDataCache` has no equivalent — needs a design decision (add to clients? add to enrollments? skip?)

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `convex` | 1.32.0 | `@convex-dev/auth` 0.0.90 | Tested in production |
| `xlsx` | 0.18.5 | Node.js 20+ (scripts) + browser (export) | `json_to_sheet` + `writeFile` both confirmed working |
| `googleapis` | 171.4.0 | Convex actions with `"use node"` | Existing pattern — no change |
| `date-fns` | 4.1.0 | TypeScript 5.x | No breaking changes expected |

---

## Sources

- Convex index docs — https://docs.convex.dev/database/reading-data/indexes/ — `by_sessionDate` index pattern; optional field migration strategy (HIGH confidence — official docs)
- Convex migration patterns — https://stack.convex.dev/intro-to-migrations — batch internalMutation vs `@convex-dev/migrations` component tradeoffs (HIGH confidence — official Convex blog)
- `@convex-dev/migrations` npm — https://www.npmjs.com/package/@convex-dev/migrations — v0.3.1 confirmed; component install overhead confirmed (HIGH confidence)
- SheetJS CSV/XLSX write docs — https://docs.sheetjs.com/docs/solutions/output/ — `json_to_sheet`, `writeFile`, `sheet_to_csv` all confirmed in 0.18.5 (HIGH confidence — official docs)
- SheetJS npm page — https://www.npmjs.com/package/xlsx — 0.18.5 confirmed as last public npm release; CDN note verified (HIGH confidence)
- Google OAuth2 service account docs — https://developers.google.com/identity/protocols/oauth2/service-account — service account is correct for server-to-server Calendar read (HIGH confidence — official Google docs)
- Codebase read — `convex/schema.ts`, `convex/analytics.ts`, `convex/clients.ts`, `convex/googleCalendarActions.ts`, `convex/googleSheetsActions.ts`, `convex/crons.ts`, `scripts/importCoparent.ts`, `PROJECT.md` — all patterns verified directly in code (HIGH confidence)

---

*Stack research for: DEC DASH 2.0 v2.0 Data Foundation — Client/Enrollment/Session model, Google OAuth cleanup, data migration, export, analytics rewrite*
*Researched: 2026-03-01*
