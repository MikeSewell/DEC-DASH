# Phase 19: Analytics Backend Rewrite - Research

**Researched:** 2026-03-01
**Domain:** Convex query optimization, full-table-scan elimination, index-range queries
**Confidence:** HIGH

## Summary

Phase 19 is a targeted backend rewrite of three Convex queries in `convex/analytics.ts`. The goal is to replace Sheets-backed and full-scan implementations with direct, efficient reads from the Convex `clients`, `enrollments`, and `sessions` tables. No new tables, no schema changes, no frontend UI changes are needed — only query logic in `analytics.ts` changes, plus a one-line update to `DemographicsTab.tsx` to remove the Sheets config guard.

The current state after Phase 18 is that the `clients` table now has 350 records with demographics fields populated (gender, referralSource, ethnicity, zipCode, ageGroup from the migration backfill), the `enrollments` table has 350 records all indexed by `status`, and the `sessions` table has the `by_sessionDate` index already defined in the schema. The three broken/inefficient queries are:

1. `getAllDemographics` — reads from `programDataCache` (Sheets cache), gated by Sheets config presence. Must be rewritten to aggregate from `clients` table directly.
2. `getSessionTrends` + `getSessionVolume` — both call `ctx.db.query("sessions").collect()` (full table scan). Must use `by_sessionDate` index with range queries.
3. `getActiveClientCount` — reads `clients` table and filters by `c.status === "active"`. Must be rewritten to query `enrollments` table by `by_status` index with `status = "active"`.

**Primary recommendation:** Rewrite all three affected query handlers in `convex/analytics.ts` using index-range scans; remove the Sheets config guard from `DemographicsTab.tsx`. No schema changes, no new files.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLY-01 | Demographics tab queries Convex clients table instead of Sheets programDataCache | Rewrite `getAllDemographics` to scan `clients` table; remove `useSheetsConfig` guard from `DemographicsTab.tsx`; fields (gender, referralSource, ethnicity, ageGroup) are all present on `clients` per Phase 16 schema + Phase 18 backfill |
| ANLY-02 | Session analytics queries use by_sessionDate index instead of full table scan | `sessions` table already has `.index("by_sessionDate", ["sessionDate"])` in schema.ts; rewrite `getSessionTrends` and `getSessionVolume` to use `.withIndex("by_sessionDate", q => q.gte("sessionDate", start).lt("sessionDate", end))` range scan |
| ANLY-03 | Active client count derived from enrollments with status=active, not from clients table directly | `enrollments` table has `.index("by_status", ["status"])` in schema.ts; rewrite `getActiveClientCount` to use `.withIndex("by_status", q => q.eq("status", "active"))` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Convex `query` | project version | Define Convex query functions | Already in use throughout `analytics.ts` |
| `convex/values` `v` | project version | Type validation for query args | Required for all Convex query definitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `convex/_generated/server` `query` | auto-generated | Import query builder | All backend query functions |
| `convex/react` `useQuery` | project version | React hook to subscribe to Convex queries | Already wired in `useAnalytics.ts` — no hook changes needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ctx.db.query("sessions").collect()` full scan | `.withIndex("by_sessionDate", ...)` range scan | Index range is O(result set) vs O(table size); critical for performance as historical session data grows post-migration |
| Query `clients` for active count | Query `enrollments` by status | Enrollments model is the authoritative active/inactive state per ANLY-03; clients.status field is legacy and will be removed in Phase 21 |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
convex/
├── analytics.ts        # All three queries rewritten here
src/
├── components/analytics/
│   └── DemographicsTab.tsx   # Remove Sheets config guard (one change)
├── hooks/
│   └── useAnalytics.ts       # No changes needed — existing hooks wire correctly
```

### Pattern 1: Convex Index Range Scan on sessionDate
**What:** Use `.withIndex("by_sessionDate", q => q.gte("sessionDate", start).lt("sessionDate", end))` to scan only the records in a date window, avoiding a full `sessions` table scan.
**When to use:** Any time you need sessions filtered by date range — getSessionVolume (30-day window) and getSessionTrends (12 monthly buckets).
**Example:**
```typescript
// Source: schema.ts — sessions table has .index("by_sessionDate", ["sessionDate"])
// Rewrite getSessionVolume:
export const getSessionVolume = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("sessions")
      .withIndex("by_sessionDate", (q) => q.gte("sessionDate", thirtyDaysAgo))
      .collect();
    return { count: recent.length, periodLabel: "Last 30 days" };
  },
});
```

### Pattern 2: Convex Index Equality Scan on enrollments.status
**What:** Use `.withIndex("by_status", q => q.eq("status", "active"))` to count only active enrollments directly, without loading all clients into memory.
**When to use:** Any KPI card that needs active client count.
**Example:**
```typescript
// Source: schema.ts — enrollments table has .index("by_status", ["status"])
export const getActiveClientCount = query({
  args: {},
  handler: async (ctx) => {
    const activeEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    return { count: activeEnrollments.length };
  },
});
```

### Pattern 3: Demographics Aggregation from clients Table
**What:** Replace `programDataCache` query with `clients` table query; aggregate gender, referralSource, ethnicity, ageGroup using the same `toSortedDistribution` pattern already in the code.
**When to use:** Demographics tab — all demographic breakdowns.
**Example:**
```typescript
// Source: convex/analytics.ts existing toSortedDistribution helper — reuse as-is
export const getAllDemographics = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const total = clients.length;
    // Derive active/completed from enrollments counts if needed, or keep from clients.status
    // for this phase (clients.status is not removed until Phase 21)
    const active = clients.filter((c) => c.status === "active").length;
    const completed = clients.filter((c) => c.status === "completed").length;

    const toSortedDistribution = (field: (c: typeof clients[0]) => string | undefined) => {
      const map: Record<string, number> = {};
      for (const c of clients) {
        const val = field(c) || "Unknown";
        map[val] = (map[val] ?? 0) + 1;
      }
      return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      total,
      active,
      completed,
      genderDistribution: toSortedDistribution((c) => c.gender),
      ethnicityDistribution: toSortedDistribution((c) => c.ethnicity),
      ageDistribution: toSortedDistribution((c) => c.ageGroup),
      outcomeDistribution: toSortedDistribution((c) => c.status),  // repurpose for enrollment status
      referralSource: toSortedDistribution((c) => c.referralSource).slice(0, 10),
    };
  },
});
```

### Pattern 4: Removing Sheets Config Guard from DemographicsTab
**What:** `DemographicsTab.tsx` currently gates chart rendering behind `if (sheetsConfig === null) { return <empty state> }`. Once demographics come from `clients` directly, this guard must be removed. The `useSheetsConfig()` import can be dropped entirely from this component.
**When to use:** After `getAllDemographics` is rewritten to read from `clients`.
**Example:**
```typescript
// Before: DemographicsTab.tsx
const demographics = useAllDemographics();
const sheetsConfig = useSheetsConfig();        // REMOVE
const zipCodeStats = useZipCodeStats();

if (demographics === undefined || sheetsConfig === undefined || ...) { ... }
if (sheetsConfig === null) { return <no-sheets-config empty state>; }  // REMOVE

// After: DemographicsTab.tsx
const demographics = useAllDemographics();
const zipCodeStats = useZipCodeStats();

if (demographics === undefined || zipCodeStats === undefined) { ... }
// No sheetsConfig guard needed
```

### Pattern 5: getSessionTrends — Per-Bucket Range Scans
**What:** Instead of collecting all sessions and filtering in-memory per bucket, use an index range scan per month bucket. This adds 12 index reads instead of 1 full-table scan, but each read is bounded by date range.
**When to use:** Whenever session trends are fetched — this is called from `ClientActivityTab.tsx`.
**Example:**
```typescript
// Rewrite getSessionTrends using by_sessionDate index per bucket
export const getSessionTrends = query({
  args: {},
  handler: async (ctx) => {
    const buckets = getLast12Months();
    const months = await Promise.all(
      buckets.map(async ({ label, start, end }) => {
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_sessionDate", (q) =>
            q.gte("sessionDate", start).lt("sessionDate", end)
          )
          .collect();
        return { label, count: sessions.length };
      })
    );
    return { months };
  },
});
```

### Anti-Patterns to Avoid
- **Full table scan then in-memory filter:** `ctx.db.query("sessions").collect()` followed by `.filter(s => s.sessionDate >= X)` — this loads the entire table into memory on every query execution. Replace with index range queries.
- **Gating demographics on Sheets config:** The `if (sheetsConfig === null)` guard in `DemographicsTab.tsx` must be removed, otherwise the Demographics tab stays blank even after the rewrite.
- **Querying clients table for active count (ANLY-03):** The `clients.status` field is a legacy field that will be removed in Phase 21. ANLY-03 requires active count from `enrollments.status` to align with the v2.0 data model.
- **Keeping `outcomeDistribution` with programDataCache semantics:** The old `getAllDemographics` returned `outcomeDistribution` from `programOutcome` field which does not exist on clients. Either drop the chart or map it to `completionStatus` on enrollments (research recommends dropping or repurposing to client status breakdown for this phase).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range filtering on sessions | Custom iterator or secondary index | Convex `.withIndex("by_sessionDate", q => q.gte(...).lt(...))` | Index range scans are server-side; hand-rolled in-memory filtering does not scale with data growth |
| Status equality filter on enrollments | `enrollments.filter(e => e.status === "active")` after `.collect()` | `.withIndex("by_status", q => q.eq("status", "active"))` | Equality index scans on Convex are direct document lookups; collect-then-filter reads entire table |
| Distribution helpers | Custom reduce/sort | Existing `toSortedDistribution` closure in `analytics.ts` | Already written, tested in production — copy the pattern |

**Key insight:** All three required indexes already exist in schema.ts. This phase is purely about wiring query handlers to use them — zero schema changes needed.

## Common Pitfalls

### Pitfall 1: Forgetting to Remove Sheets Config Guard in DemographicsTab
**What goes wrong:** `getAllDemographics` returns real data from `clients` table, but `DemographicsTab.tsx` still shows the "Connect Google Sheets" empty state because `sheetsConfig === null`.
**Why it happens:** The guard was added when demographics required Sheets. It's easy to test the query in isolation and miss the UI-level gate.
**How to avoid:** Explicitly test the Demographics tab in the browser after rewriting the query. The success criterion ANLY-01 says the tab "shows gender, referralSource, and other breakdowns" — this requires removing the guard.
**Warning signs:** Demographics tab shows empty state with a "Configure Google Sheets" link even after query rewrite.

### Pitfall 2: outcomeDistribution Field Missing on clients
**What goes wrong:** The old `getAllDemographics` computed `outcomeDistribution` from `p.programOutcome` — a field on `programDataCache` that does NOT exist on the `clients` table.
**Why it happens:** Direct field mapping without checking the target schema.
**How to avoid:** Check `convex/schema.ts` — the `clients` table has no `programOutcome` field. Options: (a) drop the outcomeDistribution chart from `DemographicsTab.tsx` for this phase, (b) repurpose it to show enrollment completion breakdown, or (c) return empty array `[]` from the query for this field. The simplest correct option is returning `[]` and updating the UI to hide the chart when empty (which `DemographicsTab.tsx` already does with `{demographics.outcomeDistribution.length > 0 && ...}`).
**Warning signs:** TypeScript error accessing `.programOutcome` on a clients record; runtime "undefined" values in outcomeDistribution.

### Pitfall 3: getSessionTrends — Using Promise.all with 12 Index Scans
**What goes wrong:** Running 12 parallel index queries in `Promise.all` inside a Convex query is valid, but if not careful, the query will be slow if sessions are very sparse and buckets mostly empty. However, this is still better than a full table scan — the risk is 12 roundtrips becoming slow.
**Why it happens:** Pattern mismatch — the old code did one collect and filtered in-memory; the new code does 12 index reads.
**How to avoid:** Convex index scans on empty ranges return immediately. 12 parallel reads on the same node are fast. This pattern is already used in `getIntakeVolume` (which does 12 bucket reads on `legalIntakeForms` + `coparentIntakeForms` — 24 total reads) with no observed performance issues.
**Warning signs:** Query execution time significantly higher than `getIntakeVolume` — if so, investigate whether sessions data volume is unusually large for a specific bucket.

### Pitfall 4: Active Client Count Double-Counting
**What goes wrong:** A client may have multiple active enrollments across different programs. `enrollments.by_status` equality scan returns ALL active enrollments, not unique clients — so `count` would overcount clients who are enrolled in 2 programs simultaneously.
**Why it happens:** Counting documents in an enrollments table vs counting unique clients.
**How to avoid:** Two options: (a) count unique `clientId` values after collecting active enrollments — `new Set(activeEnrollments.map(e => e.clientId)).size`, or (b) keep the semantics as "active enrollments" and update the label. For Phase 18 migration, every client got exactly one enrollment, so for now this is not an issue. The safe approach is to deduplicate by `clientId` to future-proof against multi-enrollment clients.
**Warning signs:** Active client count is higher than total clients count.

### Pitfall 5: Convex query() vs action() — No Node Runtime Needed
**What goes wrong:** Developer incorrectly adds `"use node"` directive thinking database queries need Node runtime.
**Why it happens:** Confusion about when `"use node"` is required.
**How to avoid:** `"use node"` is only required for npm package calls (openai, googleapis, intuit-oauth). Pure Convex database queries use the default Convex runtime. `analytics.ts` currently has no `"use node"` directive and should not get one.
**Warning signs:** TypeScript build error after adding `"use node"` to a query-only file.

## Code Examples

Verified patterns from codebase analysis:

### Index Range Scan (already used in analytics.ts for intake forms)
```typescript
// Source: convex/analytics.ts getIntakeVolume (lines 184-207)
// This pattern is already proven — mirror it for sessions
const legalForms = await ctx.db
  .query("legalIntakeForms")
  .withIndex("by_createdAt", (q) =>
    q.gte("createdAt", start).lt("createdAt", end)
  )
  .collect();
```

### Index Equality Scan (pattern from other files)
```typescript
// Source: convex/schema.ts — enrollments has .index("by_status", ["status"])
const activeEnrollments = await ctx.db
  .query("enrollments")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .collect();
```

### getSessionTrends rewrite (full pattern, ready to drop in)
```typescript
export const getSessionTrends = query({
  args: {},
  handler: async (ctx) => {
    const buckets = getLast12Months();
    const months = await Promise.all(
      buckets.map(async ({ label, start, end }) => {
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_sessionDate", (q) =>
            q.gte("sessionDate", start).lt("sessionDate", end)
          )
          .collect();
        return { label, count: sessions.length };
      })
    );
    return { months };
  },
});
```

### getSessionVolume rewrite
```typescript
export const getSessionVolume = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("sessions")
      .withIndex("by_sessionDate", (q) => q.gte("sessionDate", thirtyDaysAgo))
      .collect();
    return { count: recent.length, periodLabel: "Last 30 days" };
  },
});
```

### getActiveClientCount rewrite (with clientId dedup)
```typescript
export const getActiveClientCount = query({
  args: {},
  handler: async (ctx) => {
    const activeEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    // Deduplicate: a client may have active enrollments in multiple programs
    const uniqueClientIds = new Set(activeEnrollments.map((e) => e.clientId));
    return { count: uniqueClientIds.size };
  },
});
```

### DemographicsTab.tsx — Sheets config guard removal
```typescript
// Remove these lines from DemographicsTab.tsx:
// import { useSheetsConfig } from "@/hooks/useGrantTracker";    ← DELETE
// const sheetsConfig = useSheetsConfig();                        ← DELETE
// if (... || sheetsConfig === undefined ...) { ... }             ← REMOVE sheetsConfig check
// if (sheetsConfig === null) { return <empty state>; }           ← DELETE entire block
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Demographics from `programDataCache` (Sheets sync) | Demographics from `clients` table (Convex-native) | Phase 19 | Removes Sheets dependency for program analytics; data is always fresh |
| Full `sessions.collect()` + in-memory filter | Index range scan via `by_sessionDate` | Phase 19 | Query is O(result set) not O(table); critical after 350-client migration adds sessions |
| Active clients from `clients.status` field | Active clients from `enrollments.status=active` | Phase 19 | Aligns KPI with v2.0 data model; `clients.status` is legacy per Phase 21 plan |

**Deprecated/outdated:**
- `programDataCache` as demographics source: Sheets sync was the only data source before Phase 16-18 migration. Now `clients` table is the authoritative source. `programDataCache` table will be fully removed in Phase 21.
- `clients.status` as active indicator for KPI: Still present in schema but is a legacy field from the original data model. Enrollments-based count is the v2.0 standard.

## Open Questions

1. **outcomeDistribution field in DemographicsTab**
   - What we know: `getAllDemographics` currently returns `outcomeDistribution` computed from `programDataCache.programOutcome`. The `clients` table has no `programOutcome` field. `DemographicsTab.tsx` renders this as a "Program Outcomes" doughnut chart.
   - What's unclear: Should Phase 19 (a) return `[]` for `outcomeDistribution` (chart auto-hides due to existing `length > 0` guard), (b) repurpose it to show enrollments.status distribution, or (c) drop the field from the return type entirely.
   - Recommendation: Return `[]` from `getAllDemographics` for `outcomeDistribution`. The existing UI guard `{demographics.outcomeDistribution.length > 0 && ...}` means the chart simply won't render. This is the least-invasive change. Document as a known gap; Phase 20/21 can revisit if a meaningful replacement exists.

2. **programDataCache still holds data during Phase 19**
   - What we know: Phase 19 rewrites queries to NOT use `programDataCache`. Phase 20 removes the Sheets program sync cron. Phase 21 clears and removes the `programDataCache` table from schema.
   - What's unclear: Should Phase 19 add any guard to prevent `getAllDemographics` from accidentally re-reading `programDataCache` in the future?
   - Recommendation: No guard needed. Simply replacing the query body makes it read from `clients` instead. The Sheets cron continues to sync `programDataCache` until Phase 20 — this is fine because Phase 19 queries no longer read from it.

3. **Gender field population**
   - What we know: Phase 18 verification notes that `gender` was NOT backfilled (neither `legalIntakeForms` nor `coparentIntakeForms` has a gender column). The `clients.gender` field exists per Phase 16 schema.
   - What's unclear: Will `genderDistribution` return mostly "Unknown" entries after the rewrite?
   - Recommendation: Yes — expect `genderDistribution` to show mostly "Unknown" until gender data is manually entered on client records. This is expected behavior and should be noted in implementation verification. The chart will render (since Unknown count > 0) but won't be very meaningful. This is correct behavior — it surfaced data availability accurately.

## Sources

### Primary (HIGH confidence)
- `convex/analytics.ts` — Direct inspection of current query implementations (full table scans confirmed at lines 39, 153)
- `convex/schema.ts` — Index definitions verified: `sessions.by_sessionDate` (line 210), `enrollments.by_status` (line 189), `clients` fields gender/referralSource/ethnicity/ageGroup (lines 158-167)
- `src/components/analytics/DemographicsTab.tsx` — Sheets config guard at lines 127-153 confirmed; `useSheetsConfig` import at line 15
- `src/hooks/useAnalytics.ts` — Hook wiring verified; no hook changes needed for Phase 19
- `convex/analytics.ts` `getIntakeVolume` (lines 184-207) — Existing `Promise.all` + per-bucket index scan pattern already proven in codebase

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — "Analytics rewrite (Phase 19) and Sheets removal (Phase 20) are co-dependent — must deploy together" decision recorded
- `.planning/phases/18-data-migration/18-VERIFICATION.md` — Confirms 350 enrollments created, demographics backfilled on 345/350 clients; gender field NOT backfilled (Phase 18 verification note)

### Tertiary (LOW confidence)
- None — all claims above are directly verified from codebase files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns are already used in the codebase
- Architecture: HIGH — all three query rewrites are straightforward; indexes already exist; patterns proven by `getIntakeVolume`
- Pitfalls: HIGH — all pitfalls identified from direct codebase inspection (not speculation); outcomeDistribution gap is concrete and observable

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain — Convex query patterns don't change rapidly)
