# Phase 2: Dashboard Data Population - Research

**Researched:** 2026-02-28
**Domain:** Convex real-time queries, React loading states, QuickBooks OAuth token lifecycle, dashboard component architecture
**Confidence:** HIGH — all findings based on direct codebase inspection (no training-data assumptions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Loading & disconnected states**
- Skeleton shimmer loading — animated gray blocks matching content shape while data loads
- When QuickBooks isn't connected, show an inline "Connect QuickBooks" prompt inside the affected card area — non-disruptive, other sections still visible
- Subtle "Updated X min ago" timestamp per section header — builds data trust without clutter
- Empty state: friendly message + action hint (e.g., "No active grants yet" with link to relevant page)

**KPI cards & number formatting**
- Compact dollar formatting with hover detail — show "$45.2K" on card, full "$45,231.47" on hover tooltip
- Green/red color coding for positive/negative financial values — instant visual signal
- CMD-01 (Financial Snapshot) enhances the existing Executive Snapshot section rather than creating a separate one
- 3 main KPI cards at top of Executive Snapshot: Cash on Hand, Revenue YTD, Total Expenses

**"What Needs Attention" panel**
- Phase 2 builds the panel UI with basic, hardcoded-logic items: upcoming grant deadlines from grants table, QB connection status. Phase 4 replaces the logic with the full alert engine.
- Panel sits at top of dashboard, before all other sections — first thing Kareem sees, like a morning briefing
- Always visible — if nothing needs attention, panel says so (core "command center" element)
- Item count badge in panel header (e.g., "What Needs Attention (3)")

**Client activity section**
- Standalone dashboard section (reorderable/hideable like others)
- Metrics: total active clients, new clients this month, per-program breakdown (Legal vs Co-Parent) — matches CMD-02
- Default position: after financial sections (snapshot, P&L, grants), before demographics — money then people
- "View all clients" link in section header for navigation to /clients
- Per-program breakdown as inline badges below total — compact: "Total active: 47" with "Legal: 28 | Co-Parent: 19" as smaller text

### Claude's Discretion
- Exact skeleton shimmer animation style and timing
- Error state design and messaging when a data fetch fails
- Chart color palette adjustments (existing warm palette is established)
- Exact spacing, typography, and card sizing within sections
- How to handle the transition when Phase 4 replaces basic attention items with computed alerts

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | All KPI cards render live data from QuickBooks cache (cash on hand, revenue YTD, total expenses) | QB cache queries exist (`getAccounts`, `getProfitAndLoss`); ExecutiveSnapshot uses them but lacks Total Expenses KPI — needs adding |
| DASH-02 | All chart visualizations (P&L doughnut, expense breakdown, grant budget bars) render with real data | `ProfitLoss.tsx` and `GrantBudget.tsx` already wire to correct data — issue is skeleton/disconnected state gaps |
| DASH-03 | Dashboard handles 3-state loading correctly: skeleton while loading, "not connected" when integration missing, actual data when available | Current code uses Spinner + null check, but no true skeleton shimmer; disconnected state only in some components |
| DASH-04 | Grant tracking overview section displays active grants with status and deadlines | `GrantTracking.tsx` reads from `grantsCache` via `googleSheets.getActiveGrants` — correct source; needs `grants` table deadline data added |
| DASH-05 | Program demographics charts (co-parent + legal) render from Sheets-synced data | `ProgramsCoparent.tsx` / `ProgramsLegal.tsx` read from `programDataCache` via `googleSheets.getProgramDemographics` — correct wiring; needs proper disconnected state |
| CMD-01 | Financial snapshot section shows cash position, revenue YTD, and expense summary at a glance | `ExecutiveSnapshot.tsx` shows cash + revenue YTD but not total expenses; needs 3rd card added + hover tooltip for full dollar amount |
| CMD-02 | Client activity section shows total active clients, new clients this month, and per-program counts | No `ClientActivity` component exists; `clients.getStats` exists but lacks per-program breakdown; needs new component + enhanced query |
| CMD-03 | "What Needs Attention" panel surfaces actionable items (grant deadlines, budget warnings, sync failures) | No `WhatNeedsAttention` component exists; panel is net-new; uses `grants.getStats` (has `upcomingReports`) + QB config check |
| CMD-04 | Dashboard sections load independently so one failed integration doesn't break the entire page | Each section component makes its own `useQuery` calls — independent by design; just needs error boundary or try/catch in the section UI |
</phase_requirements>

---

## Summary

The dashboard already has working component architecture — `DashboardSection` wrapper, section ordering/hiding via `dashboardPrefs`, and seven data components (`ExecutiveSnapshot`, `ProfitLoss`, `GrantBudget`, `GrantTracking`, `DonationPerformance`, `ProgramsCoparent`, `ProgramsLegal`). The fundamental data wiring is correct in most components. The work in Phase 2 is primarily about (1) completing loading/empty/disconnected states across all sections, (2) adding two net-new components (`WhatNeedsAttention` and `ClientActivity`), and (3) filling specific data gaps in existing components.

The most important technical finding: Convex's `useQuery` returns `undefined` while loading and `null` (or empty result) when connected but no data. This three-state pattern (`undefined` = loading, `null` = no data/not connected, `data` = success) is already used correctly in `ProfitLoss.tsx` and `GrantBudget.tsx`, but `ExecutiveSnapshot.tsx` only shows a Spinner inline inside the card value without shape-matching skeletons, and `GrantTracking.tsx` / `ProgramsCoparent.tsx` / `ProgramsLegal.tsx` lack "not connected" distinguishment from "empty data". The shimmer skeleton pattern needs to be standardized across all components.

The "What Needs Attention" panel and "Client Activity" section are entirely new components. The backend Convex queries needed for both already exist (`grants.getStats`, `clients.getStats`) or are trivially addable (`clients.getStatsByProgram`). The panel and section must be registered in `DashboardSectionId` type, `DEFAULT_DASHBOARD_SECTIONS`, `SECTION_COMPONENTS`, and `SECTION_TITLES` in the dashboard page. The panel should be rendered outside the reorderable sections list (always first, always visible), while Client Activity goes into the reorderable section list.

The QB token refresh logic (`quickbooksActions.ts` line 452) checks `tokenExpiry < Date.now() + 60000` before refreshing — this is the right check. The `updateTokens` internal mutation correctly patches the existing config record with new `accessToken`, `refreshToken`, and `tokenExpiry`. The concern flagged in STATE.md is that `token.refresh_token` from the QB API response may sometimes be absent (QB rotates refresh tokens only when used; sometimes the response omits `refresh_token` meaning the old one is still valid). Persisting a blank `refresh_token` would break future refresh attempts.

**Primary recommendation:** Fix token persistence first (02-01), then standardize the skeleton/disconnected pattern as a reusable component (02-02), then wire data sources correctly (02-03), then build the two new sections (02-04).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex/react` | Already installed | `useQuery`, `useMutation` — real-time queries | Convex's own React bindings; reactive by default |
| React | 18+ (Next.js 15) | Component rendering | Already in use |
| Tailwind CSS v4 | Already installed | `animate-pulse` for skeleton shimmer | Project standard |
| `react-chartjs-2` / `chart.js` | Already installed | All chart rendering | Already registered in each chart component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cn` from `@/lib/utils` | Project util | Conditional class merging | All conditional Tailwind classes |
| `timeAgo`, `formatCurrency`, `formatDate` from `@/lib/utils` | Project util | Timestamp and currency display | KPI cards, section footers |

### No New Libraries Needed
All Phase 2 work uses existing project dependencies. No new `npm install` required.

**Installation:**
```bash
# No new packages — all dependencies already present
```

---

## Architecture Patterns

### Existing Pattern: Three-State Convex Query
Convex `useQuery` returns three distinct states that must be handled:
- `undefined` — query in flight (show skeleton)
- `null` — query resolved, data absent (not connected / no records)
- `T` — query resolved with data (render content)

This pattern is already used correctly in `ProfitLoss.tsx`:
```typescript
// Source: /src/components/dashboard/ProfitLoss.tsx
const plResult = useProfitAndLoss(); // useQuery(api.quickbooks.getProfitAndLoss)

if (plResult === undefined) {
  return <Spinner />;  // Loading — should become skeleton
}
if (plResult === null) {
  return <ConnectQBPrompt />;  // Not connected
}
// render with plResult.data
```

**What's missing:** The loading branch shows a plain `<Spinner>` instead of a shape-matching skeleton shimmer.

### Pattern 1: Skeleton Shimmer Loading
**What:** Replace spinner loading states with skeleton blocks that match the content shape.
**When to use:** Every dashboard section component's loading branch.

The project already uses Tailwind v4. `animate-pulse` from Tailwind produces the shimmer effect. Since Tailwind v4 is in the project, `animate-pulse` is available as a utility class.

```typescript
// Skeleton for a KPI card grid (matches 4-card layout in ExecutiveSnapshot)
function StatCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] animate-pulse">
      <div className="h-11 w-11 rounded-xl bg-border/50 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-7 w-24 rounded-md bg-border/50" />
        <div className="h-3 w-16 rounded-md bg-border/30" />
      </div>
    </div>
  );
}
```

### Pattern 2: Disconnected State (Integration-Specific)
**What:** When an integration (QB or Sheets) is not configured, show an inline prompt inside the card rather than a broken/empty state. Each component checks if the relevant integration is connected.

For QB-dependent components, use `useQuickBooksConfig()` to determine disconnected state:
```typescript
// Source: existing pattern in GrantBudget.tsx
const qbConfig = useQuickBooksConfig();
// null = query resolved, QB not connected
// { isExpired: true } = connected but token expired
const qbConnected = qbConfig !== undefined && qbConfig !== null && !qbConfig.isExpired;
```

For Sheets-dependent components (GrantTracking, ProgramsCoparent, ProgramsLegal), null data from `grantsCache` or `programDataCache` means either not connected or no data synced — the components currently show a generic "Connect Google Sheets" message but don't check `googleSheets.getConfig` first.

**Correct distinction pattern:**
```typescript
// query === undefined: still loading (skeleton)
// sheetsConfig === null && data === null: not connected (show connect prompt)
// sheetsConfig !== null && data.length === 0: connected but no data (show empty state)
// data.length > 0: render data
```

### Pattern 3: "Updated X min ago" Timestamp
**What:** Show last sync time per section header using the existing `timeAgo` utility.
**When to use:** Any section backed by a cached QB or Sheets data source.

`fetchedAt` is already returned by QB cache queries and `lastSyncAt` by Sheets cache records. `timeAgo(fetchedAt)` from `@/lib/utils` formats it.

```typescript
// Pattern: section footer with timestamp
{fetchedAt && (
  <p className="text-xs text-muted text-right mt-3">
    Updated {timeAgo(fetchedAt)}
  </p>
)}
```

### Pattern 4: Hover Tooltip for Full Dollar Amount
**What:** KPI cards show compact format (e.g., "$45.2K") in the main number; hovering reveals the full amount via the `title` attribute or a Tailwind tooltip.
**When to use:** All financial KPI values.

The existing `formatDollars` function in `ExecutiveSnapshot.tsx` already compacts amounts. Add a `title` attribute with `formatCurrency(rawAmount)` for the hover detail:
```typescript
// No new library needed — native HTML title attribute
<p className="text-2xl font-bold text-foreground cursor-help" title={formatCurrency(rawAmount)}>
  {formatDollars(rawAmount)}
</p>
```

### Pattern 5: What Needs Attention Panel (New Component)
**What:** An always-visible panel at the top of the dashboard (outside the reorderable section list) that shows actionable items.
**Implementation approach:** Rendered directly in `dashboard/page.tsx` before the `visibleSections.map(...)` loop, not inside a `DashboardSection` wrapper. Uses the same Card styling but with a distinct visual treatment.

Data sources:
- `grants.getStats` — provides `upcomingReports` count (grants with report dates in next 30 days)
- `grants.list()` — to extract specific upcoming deadlines for display
- `quickbooks.getConfig` — to detect QB connection status

```typescript
// Convex queries for the panel
const grantStats = useQuery(api.grants.getStats);          // upcomingReports count
const qbConfig = useQuery(api.quickbooks.getConfig);        // null = not connected
const allGrants = useQuery(api.grants.list, {});           // for deadline details
```

### Pattern 6: Client Activity Section (New Component)
**What:** A reorderable dashboard section showing active client totals with per-program breakdown.
**Backend gap:** `clients.getStats` returns `{ total, active, newThisMonth }` but no per-program breakdown. Need a new backend query `clients.getStatsByProgram` that returns per-type active counts.

```typescript
// New Convex query needed: clients.getStatsByProgram
// Returns: { legal: number, coparent: number, other: number }
```

Frontend component: `ClientActivity` section reads both `clients.getStats` (for total/active/new) and a new `clients.getStatsByProgram` (or enhanced `getStats`).

### Recommended Project Structure Changes

```
src/
├── components/dashboard/
│   ├── ClientActivity.tsx         # NEW — CMD-02
│   ├── WhatNeedsAttention.tsx     # NEW — CMD-03
│   ├── skeletons/                 # NEW — shared skeleton blocks
│   │   ├── StatCardSkeleton.tsx
│   │   ├── TableSkeleton.tsx
│   │   └── ChartSkeleton.tsx
│   ├── ExecutiveSnapshot.tsx      # MODIFY — add expenses KPI, hover tooltip, skeleton
│   ├── GrantTracking.tsx          # MODIFY — proper disconnected vs empty state, skeleton
│   ├── GrantBudget.tsx            # MODIFY — skeleton, update timestamp
│   ├── ProfitLoss.tsx             # MODIFY — skeleton (already has correct 3-state logic)
│   ├── ProgramsCoparent.tsx       # MODIFY — skeleton, proper disconnected state
│   └── ProgramsLegal.tsx          # MODIFY — skeleton, proper disconnected state
src/app/(dashboard)/dashboard/
│   └── page.tsx                   # MODIFY — add WhatNeedsAttention above sections, register ClientActivity
convex/
│   └── clients.ts                 # MODIFY — add getStatsByProgram query
src/types/index.ts                 # MODIFY — add new DashboardSectionId values
src/lib/constants.ts               # MODIFY — add ClientActivity to DEFAULT_DASHBOARD_SECTIONS
```

### Anti-Patterns to Avoid
- **Showing a full-page spinner while any section loads:** Each section component manages its own loading state — CMD-04 (independent loading) is already achieved by architecture. Do not add a global "dashboard loading" gate.
- **Using `undefined` checks with `!data`:** `!undefined` is `true` and `!null` is `true` — both collapse to the same falsy check, losing the three-state distinction. Always use `=== undefined` for loading check.
- **Treating `null` from QB cache queries as "disconnected":** QB cache queries return `null` for both "QB not configured" and "QB connected but never synced". Check `getConfig` separately to distinguish.
- **Hardcoding grant deadline data in the attention panel:** Phase 2 uses real-time `grants.list()` data for deadlines. The "hardcoded logic" means the query logic is simple (no AI/scoring), not that data is hardcoded.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shimmer skeleton animation | Custom keyframe animation | Tailwind `animate-pulse` | Already in project, consistent with design system |
| Currency formatting | Custom formatter | `formatCurrency` in `@/lib/utils` | Already handles edge cases (negative, zero, large numbers) |
| "Time ago" formatting | Custom date math | `timeAgo` in `@/lib/utils` | Already handles seconds/minutes/hours/days |
| Dollar compaction | Custom number formatter | `formatDollars` in `ExecutiveSnapshot.tsx` | Already handles K/M thresholds — extract to `@/lib/utils` |
| Hover tooltip for full dollar | Tooltip library | HTML `title` attribute | No library needed; native browser tooltip satisfies the use case |
| Data isolation between sections | Error boundaries or context | Convex `useQuery` per section | Convex already isolates queries — each `useQuery` fails independently |
| QB connection check in every component | Prop drilling | `useQuickBooksConfig()` hook | Each component calls it directly; Convex deduplicates the query |

**Key insight:** The three-state loading pattern (`undefined`/`null`/`data`) is built into Convex's design — don't build a wrapper abstraction for it. The planner's `02-02` task about `useQueryWithStatus` should implement a thin helper only if it genuinely reduces repetition across many components.

---

## Common Pitfalls

### Pitfall 1: QB Token Refresh — Blank Refresh Token Overwrite
**What goes wrong:** QuickBooks token refresh (`refreshTokens` in `quickbooksActions.ts`) unconditionally saves `token.refresh_token` from the API response. If QB's refresh endpoint omits `refresh_token` (which happens when the token hasn't been used yet or on some configurations), the stored `refreshToken` becomes an empty string. The next refresh call then fails because it sends a blank refresh token.

**Why it happens:** The QB OAuth spec says the refresh token is rotated (new one returned on each use), but in practice the API sometimes returns a response without a `refresh_token` field, meaning the existing token should be retained.

**How to avoid:** Before saving, check if `token.refresh_token` is a non-empty string:
```typescript
// In quickbooksActions.ts refreshTokens handler
await ctx.runMutation(internal.quickbooksInternal.updateTokens, {
  configId: config._id,
  accessToken: token.access_token,
  // Only rotate refresh token if QB returned a new one
  refreshToken: token.refresh_token || config.refreshToken,
  tokenExpiry: Date.now() + token.expires_in * 1000,
});
```

**Warning signs:** QB sync starts failing silently after the first token refresh; `console.error` in `quickbooksSync.ts` fires but catch block swallows the error.

### Pitfall 2: grants Table vs grantsCache Table Confusion
**What goes wrong:** There are two grants-related tables: `grants` (Excel-imported, rich 22-field data with quarterly report dates) and `grantsCache` (Google Sheets sync, simpler schema with `grantName`, `funder`, `totalAmount`, `status`). Components must use the right source.

**The mapping:**
- `GrantTracking.tsx` — correctly uses `grantsCache` via `useActiveGrants()` / `useGrantDeadlines()` — for Sheets-synced grant status/deadlines
- `GrantBudget.tsx` — correctly uses `grantsCache` via `useGrants()` — for grant names and totalAmounts for chart
- `WhatNeedsAttention` (new) — should use `grants` table via `grants.getStats` — for quarterly report deadlines (Q1-Q4 report dates)
- Grants page (`/grants`) — uses `grants` table — the rich Excel-imported data

**Why it happens:** Both tables exist for different purposes and are easy to conflate. The `grants.getStats` query already computes `upcomingReports` count using Q1-Q4 report dates — use this for the attention panel deadline items.

**How to avoid:** The attention panel needs grant-specific details (funder name, deadline date) for display. Enhance `grants.getStats` or add a `grants.getUpcomingDeadlines` query that returns grants with report dates within 30 days, with their `fundingSource` and deadline date.

### Pitfall 3: Sections Registered in 4 Places
**What goes wrong:** Adding a new dashboard section (like `ClientActivity`) requires updating 4 separate files, and missing any one causes a runtime error or missing section.

**The 4 places:**
1. `src/types/index.ts` — add to `DashboardSectionId` union type
2. `src/lib/constants.ts` — add to `DEFAULT_DASHBOARD_SECTIONS` array (with id, title, description)
3. `src/app/(dashboard)/dashboard/page.tsx` — add to `SECTION_COMPONENTS` record
4. Create the actual component file

**Warning signs:** TypeScript errors on `SECTION_COMPONENTS` record if ID added to type but not to map; missing section in the hidden panel list if not added to `DEFAULT_DASHBOARD_SECTIONS`.

Note: `WhatNeedsAttention` does NOT go into this system — it is rendered outside the reorderable sections list as an always-visible panel.

### Pitfall 4: `getStats` on `clients` Table Lacks Per-Program Breakdown
**What goes wrong:** `clients.getStats` returns `{ total, active, newThisMonth }` but not a per-program type breakdown. Building `ClientActivity` to show "Legal: 28 | Co-Parent: 19" requires joining with `programs` table.

**How to avoid:** Add a new Convex query `clients.getStatsByProgram` (or enhance `clients.getStats` to include `perProgram`). The programs table has a `type` field (`legal`, `coparent`, etc.). The query should:
1. Fetch all programs, build a map of `programId → type`
2. Fetch all active clients
3. Group active client counts by program type
4. Return `{ legal: N, coparent: N, other: N }`

This query should respect role-based filtering the same way `clients.getStats` does (lawyers only see legal, psychologists only see coparent).

### Pitfall 5: `DonationPerformance` Will Remain in Null State
**What goes wrong:** `getDonations` in `quickbooks.ts` returns `null` because there is no `donations` reportType in the QB cache (only the PayPal integration would populate it, which is not in scope). The component already handles null correctly with an empty state message — but the plan task `02-03` should not attempt to wire QB data to this component as there is none.

**How to avoid:** `DonationPerformance` stays in its current null/empty state. Phase 2 should verify it shows a clean empty state (not broken) and leave it as-is. Do not mark DASH-02 as blocked by this — the other charts (P&L doughnut, expense breakdown, grant budget bars) have data.

### Pitfall 6: `formatDollars` Is Local to ExecutiveSnapshot
**What goes wrong:** The compact dollar formatter (`formatDollars`) in `ExecutiveSnapshot.tsx` is a local function. The `ClientActivity` component may also need compact formatting. Copying it creates drift.

**How to avoid:** Move `formatDollars` to `@/lib/utils` during task 02-01 or 02-03, then import from there. Update `ExecutiveSnapshot` to use the shared version.

---

## Code Examples

Verified patterns from codebase inspection:

### Correct Three-State Pattern
```typescript
// Source: /src/components/dashboard/ProfitLoss.tsx (already correct)
const plResult = useProfitAndLoss(); // undefined | null | { data, fetchedAt }

if (plResult === undefined) {
  // Loading — replace spinner with skeleton
  return <ProfitLossSkeleton />;
}
if (plResult === null) {
  // No data / QB not connected
  return <ConnectQBPrompt />;
}
// Data available
const data = plResult.data as ProfitLossData;
```

### WhatNeedsAttention Data Assembly
```typescript
// Source pattern: convex/grants.ts getStats + quickbooks.ts getConfig
const grantStats = useQuery(api.grants.getStats);
// grantStats.upcomingReports = count of grants with Q1-Q4 report dates in next 30 days
const qbConfig = useQuery(api.quickbooks.getConfig);
// qbConfig === null = QB not connected

const items: AttentionItem[] = [];
if (qbConfig === null) {
  items.push({ type: 'integration', severity: 'warning', text: 'QuickBooks not connected', action: '/admin' });
}
if (grantStats?.upcomingReports > 0) {
  items.push({ type: 'deadline', severity: 'info', text: `${grantStats.upcomingReports} grant reports due soon`, action: '/grants' });
}
```

### ClientActivity Backend Query Needed
```typescript
// New query to add in convex/clients.ts
export const getStatsByProgram = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const programs = await ctx.db.query("programs").collect();
    const programMap = new Map(programs.map((p) => [p._id, p.type]));

    let clients = await ctx.db.query("clients").collect();
    const activeClients = clients.filter((c) => c.status === "active");

    // Role-based filtering (same as getStats)
    // ... (omitted for brevity — mirror getStats role logic)

    const byType: Record<string, number> = {};
    for (const client of activeClients) {
      const type = client.programId ? (programMap.get(client.programId) ?? "other") : "other";
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return {
      legal: byType.legal ?? 0,
      coparent: byType.coparent ?? 0,
      other: byType.other ?? 0,
    };
  },
});
```

### Skeleton Block Pattern
```typescript
// Pattern for skeleton that matches StatCard shape
function StatCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] animate-pulse">
      <div className="h-11 w-11 rounded-xl bg-border/50 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-7 w-28 rounded-md bg-border/50" />
        <div className="h-3 w-20 rounded-md bg-border/30" />
      </div>
    </div>
  );
}
```

### KPI Card with Hover Tooltip
```typescript
// Compact display + full amount on hover (no new library)
<p
  className="text-2xl font-bold text-foreground cursor-help"
  title={`$${rawAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
>
  {formatDollars(rawAmount)}
</p>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spinner for loading | Skeleton shimmer | Industry standard for 2024+ | Better perceived performance — user sees layout shape |
| Full-page loading gate | Per-section loading | CMD-04 requires | Each section fails/loads independently |
| Simple spinner in StatCard | Inline Spinner | Current codebase | Should be replaced with skeleton |

**Deprecated/outdated in this codebase:**
- `isLoading` boolean flags: The three-state `undefined`/`null`/`data` pattern from Convex is more precise and eliminates the loading flag anti-pattern.

---

## Open Questions

1. **`grants.getUpcomingDeadlines` query vs using `getStats`**
   - What we know: `grants.getStats` returns `upcomingReports` count. The WhatNeedsAttention panel needs to display individual grant names and specific deadline dates.
   - What's unclear: Should we add a new `grants.getUpcomingDeadlines` query (returns `{ fundingSource, deadlineDate, type }[]`) or call `grants.list()` and filter client-side?
   - Recommendation: Add a lightweight `grants.getUpcomingDeadlines` query in `convex/grants.ts` that returns grants where any Q1-Q4 report date is within 30 days. Avoids over-fetching all 46 grants on the dashboard.

2. **`DashboardSectionId` expansion for `client-activity`**
   - What we know: `WhatNeedsAttention` should NOT be in the reorderable section list. `ClientActivity` should be.
   - What's unclear: The `SECTION_COMPONENTS` record in `dashboard/page.tsx` uses `DashboardSectionId` as key. Adding `"client-activity"` to the union type is straightforward. `WhatNeedsAttention` needs no ID registration since it's rendered outside the section loop.
   - Recommendation: Add `"client-activity"` to `DashboardSectionId` in `types/index.ts` and to `DEFAULT_DASHBOARD_SECTIONS` after `"profit-loss"` entry.

3. **Sheets disconnected vs empty data distinction**
   - What we know: `useProgramDemographics("legal")` returns `{ total: 0, ... }` whether Sheets is disconnected or genuinely has no data. The components show "Configure the Google Sheet to see demographics."
   - What's unclear: Whether to add `googleSheets.getConfig` check in demographic components to show a different message ("Connect Google Sheets" vs "No legal program data yet").
   - Recommendation: Add `useSheetsConfig()` check in each demographic component. If `sheetsConfig === null`, show "Connect Google Sheets" prompt. If `sheetsConfig !== null && total === 0`, show "No data synced yet."

---

## Validation Architecture

The `workflow` config does not have `nyquist_validation` set — skipping formal test framework section. The project has no test infrastructure (no jest.config, vitest.config, or test files detected). All verification is manual/visual.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `/src/components/dashboard/*.tsx` — all 7 existing dashboard components read
- Direct codebase inspection: `/convex/quickbooks*.ts` — QB token refresh and cache query architecture
- Direct codebase inspection: `/convex/clients.ts` — `getStats` query signature and return shape
- Direct codebase inspection: `/convex/grants.ts` — `getStats` return shape and `upcomingReports` field
- Direct codebase inspection: `/src/types/index.ts` — `DashboardSectionId` union type (7 values)
- Direct codebase inspection: `/src/lib/constants.ts` — `DEFAULT_DASHBOARD_SECTIONS` (7 entries)
- Direct codebase inspection: `/convex/schema.ts` — `grants` vs `grantsCache` table schemas confirmed distinct
- Direct codebase inspection: `/src/app/(dashboard)/dashboard/page.tsx` — section registration pattern

### Secondary (MEDIUM confidence)
- Convex docs pattern (from CLAUDE.md): `useQuery` returns `undefined` while loading, `null` when not found — confirmed by existing component code
- Tailwind v4 `animate-pulse` availability: confirmed by project using `@import "tailwindcss"` in globals.css

### Tertiary (LOW confidence)
- QB API behavior re: optional `refresh_token` field in refresh response: based on known OAuth2 patterns; should be validated against actual QB API response in testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies needed
- Architecture: HIGH — full component and backend code read; patterns directly derived from existing code
- Pitfalls: HIGH (most) / MEDIUM (QB refresh_token rotation) — codebase issues confirmed directly; QB API behavior based on pattern knowledge

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable codebase; Convex API is stable)
