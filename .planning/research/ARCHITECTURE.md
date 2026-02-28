# Architecture Research

**Domain:** KB Intelligence + Donation Charts integration into existing nonprofit dashboard
**Researched:** 2026-03-01
**Confidence:** HIGH — based on direct codebase inspection of all relevant files

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15 App Router)                │
├─────────────────────────────────────────────────────────────────────────┤
│  dashboard/page.tsx                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │ ExecutiveSnapshot│  │ DonationPerform. │  │  KBInsights (NEW)      │ │
│  │ useAccounts()    │  │  useDonations()  │  │  useKBSummary() (NEW)  │ │
│  │ useProfitAndLoss │  │  [currently null]│  │  useKBKPIs() (NEW)     │ │
│  └──────────────────┘  └──────────────────┘  └────────────────────────┘ │
│                                                                          │
│  hooks/useQuickBooks.ts        hooks/useKnowledgeBase.ts (NEW)          │
├─────────────────────────────────────────────────────────────────────────┤
│                         CONVEX BACKEND                                   │
├──────────────────────────┬──────────────────────┬───────────────────────┤
│  QUERIES (quickbooks.ts) │  ACTIONS (node)       │  QUERIES              │
│  getProfitAndLoss        │  fetchIncomeTrend(NEW)│  (kbInsights.ts, NEW) │
│  getTrends               │  generateKBSummary    │  getKBSummary         │
│  getDonations [null now] │   (NEW)               │  getKBKPIs            │
│  getIncomeTrend (NEW)    │  extractKBKPIs (NEW)  │                       │
├──────────────────────────┴──────────────────────┴───────────────────────┤
│                         DATA LAYER (Convex Tables)                       │
│  quickbooksCache (add reportType: "income_trend")                        │
│  kbSummaryCache (NEW table)                                              │
│  aiDirectorConfig (assistantId + vectorStoreId — reuse existing)         │
│  knowledgeBase (openaiFileId — reuse existing)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                         EXTERNAL SERVICES                                │
│  QuickBooks API               OpenAI Assistants API / file_search        │
│  (P&L with summarize_by=Month) (vector store: "DEC Knowledge Base")      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `quickbooks.getIncomeTrend` | Parse `income_trend` cache into `{ monthlyTotals, fetchedAt }` | NEW query in `quickbooks.ts` |
| `quickbooksActions.fetchIncomeTrend` | Fetch QB P&L with `summarize_column_by=Month`, parse and cache | NEW internalAction in `quickbooksActions.ts` |
| `kbInsightsActions.generateKBSummary` | Call OpenAI via existing `assistantId` + `vectorStoreId`, save summary | NEW action in new `kbInsightsActions.ts` |
| `kbInsightsActions.extractKBKPIs` | Prompt OpenAI for structured JSON metrics from KB, save result | NEW action in new `kbInsightsActions.ts` |
| `kbInsights.getKBSummary` | Query `kbSummaryCache` (cacheType: "summary"), return cached text + timestamp | NEW query in new `kbInsights.ts` |
| `kbInsights.getKBKPIs` | Query `kbSummaryCache` (cacheType: "kpis"), return cached KPI JSON | NEW query in new `kbInsights.ts` |
| `kbInsights.saveSummary` | Upsert (delete + insert) summary entry in `kbSummaryCache` | NEW mutation in new `kbInsights.ts` |
| `kbInsights.saveKPIs` | Upsert KPI JSON entry in `kbSummaryCache` | NEW mutation in new `kbInsights.ts` |
| `DonationPerformance.tsx` | Chart monthly income from QB — switch data source to `useIncomeTrend()` | MODIFY existing component |
| `KBInsights.tsx` | New dashboard section: AI summary + KPI cards + "Regenerate" button | NEW component |
| `hooks/useKnowledgeBase.ts` | `useKBSummary()`, `useKBKPIs()`, `useRefreshKBSummary()`, `useExtractKBKPIs()` | NEW hook file |
| `hooks/useQuickBooks.ts` | Add `useIncomeTrend()` | MODIFY existing file |
| `convex/schema.ts` | Add `kbSummaryCache` table | MODIFY existing file |
| `convex/quickbooksActions.ts` | Add `fetchIncomeTrend` + wire into `syncAllData` | MODIFY existing file |
| `src/lib/constants.ts` | Add "kb-insights" to `DEFAULT_DASHBOARD_SECTIONS` | MODIFY existing file |
| `src/types/index.ts` | Add "kb-insights" to `DashboardSectionId` union | MODIFY existing file |
| `src/app/(dashboard)/dashboard/page.tsx` | Register `KBInsights` in `SECTION_COMPONENTS` | MODIFY existing file |

---

## Recommended Project Structure (New Files Only)

```
convex/
├── kbInsightsActions.ts     # "use node" — OpenAI calls for KB extraction
├── kbInsights.ts            # queries + mutations for kbSummaryCache table

src/
├── components/dashboard/
│   └── KBInsights.tsx       # New dashboard section component
├── hooks/
│   └── useKnowledgeBase.ts  # Hooks: useKBSummary, useKBKPIs, useRefreshKBSummary
```

Modified files:

```
convex/schema.ts             # Add kbSummaryCache table
convex/quickbooks.ts         # Add getIncomeTrend query
convex/quickbooksActions.ts  # Add fetchIncomeTrend action + wire to syncAllData
src/hooks/useQuickBooks.ts   # Add useIncomeTrend hook
src/components/dashboard/DonationPerformance.tsx  # Switch data source
src/lib/constants.ts         # Add "kb-insights" to DEFAULT_DASHBOARD_SECTIONS
src/types/index.ts           # Add "kb-insights" to DashboardSectionId union
src/app/(dashboard)/dashboard/page.tsx  # Register KBInsights in SECTION_COMPONENTS
```

---

## Architectural Patterns

### Pattern 1: Cache-then-Query (already established — use for income trend + KB)

**What:** External service data (QB, OpenAI) is fetched in Convex actions, stored in Convex tables, then served via lightweight queries. React components query Convex tables — never external APIs directly.

**When to use:** All new external data. KB summaries and income trend data follow this same flow as QB and Google Sheets already do.

**Trade-offs:** Slight staleness (seconds on cron refresh, instant on manual trigger), but avoids latency in UI renders and prevents rate-limit spikes on every page load.

**Application to v1.2:**
```typescript
// convex/kbInsightsActions.ts ("use node")
export const generateKBSummary = action({
  handler: async (ctx) => {
    const config = await ctx.runQuery(api.aiDirector.getConfig);
    if (!config?.assistantId || !config?.vectorStoreId) {
      throw new Error("AI Director not configured");
    }
    const openai = new OpenAI({ apiKey: await getOpenAIApiKey(ctx) });
    const thread = await openai.beta.threads.create({
      messages: [{ role: "user", content: KB_SUMMARY_PROMPT }],
    });
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: config.assistantId,
    });
    // extract text, store via mutation
    await ctx.runMutation(api.kbInsights.saveSummary, {
      content: summaryText,
      generatedAt: Date.now(),
    });
  },
});

// convex/kbInsights.ts
export const getKBSummary = query({
  handler: async (ctx) => {
    return await ctx.db.query("kbSummaryCache")
      .withIndex("by_type", q => q.eq("cacheType", "summary"))
      .first();
  },
});
```

### Pattern 2: Three-State Loading (already established — maintain exactly)

**What:** `undefined` = loading, `null` = not configured / no data, `data` = ready. All dashboard components follow this. It is critical that new components match this exactly to avoid flash-of-wrong-state.

**When to use:** Every new `useQuery` call on dashboard components.

**Application to v1.2:**
```typescript
// KBInsights.tsx
export default function KBInsights() {
  const summary = useKBSummary();   // returns undefined | null | { content, generatedAt }
  const kpis = useKBKPIs();         // returns undefined | null | { content, generatedAt }

  // Loading: any query still undefined
  if (summary === undefined || kpis === undefined) {
    return <KBInsightsSkeleton />;
  }

  // Empty state: no KB files uploaded or no summary generated yet
  if (summary === null) {
    return (
      <EmptyState
        message="No KB summary generated yet."
        action={{ label: "Go to Admin > Knowledge Base", href: "/admin" }}
      />
    );
  }

  // Render summary + KPI cards
}
```

### Pattern 3: Trigger-on-Demand Action (already established by triggerSync)

**What:** Long-running operations (OpenAI calls, ~5-30 seconds) are triggered via `useAction`, not `useQuery`. The result is persisted to a Convex table, and the UI re-renders reactively when that table updates.

**When to use:** KB summary regeneration. User clicks "Regenerate" in `KBInsights.tsx` → `useAction(api.kbInsightsActions.generateKBSummary)` → action writes to `kbSummaryCache` → `useQuery(api.kbInsights.getKBSummary)` reactively re-renders.

**Trade-offs:** User sees stale cached data until action completes. Show a spinner on the "Regenerate" button with local `useState` during the action call. Do not disable the entire section.

```typescript
// hooks/useKnowledgeBase.ts
export function useRefreshKBSummary() {
  return useAction(api.kbInsightsActions.generateKBSummary);
}

// KBInsights.tsx — regenerate handler
const refreshSummary = useRefreshKBSummary();
const extractKPIs = useExtractKBKPIs();
const [isGenerating, setIsGenerating] = useState(false);

const handleRegenerate = async () => {
  setIsGenerating(true);
  try {
    // Run both in parallel
    await Promise.all([refreshSummary({}), extractKPIs({})]);
  } finally {
    setIsGenerating(false);
  }
};
```

### Pattern 4: Singleton Cache with cacheType Index

**What:** `kbSummaryCache` stores two cache types (summary text, KPI JSON) in a single table, discriminated by a `cacheType` field with an index. This mirrors the singleton pattern used by `aiDirectorConfig`, `alertConfig`, and `quickbooksConfig` (all queried with `.first()`).

**When to use:** Small number of cache entries that are replaced wholesale on regeneration. There is one org-wide summary and one org-wide KPI set.

**Trade-offs:** Simple to query. No complex key management. The upsert requires a delete-then-insert pattern since Convex does not have an upsert primitive.

```typescript
// convex/schema.ts addition:
kbSummaryCache: defineTable({
  cacheType: v.union(v.literal("summary"), v.literal("kpis")),
  content: v.string(),          // summary text OR JSON-stringified KPI object
  generatedAt: v.number(),
  fileCount: v.optional(v.number()),  // how many KB files were in scope
}).index("by_type", ["cacheType"]),

// convex/kbInsights.ts — upsert mutation pattern:
export const saveSummary = mutation({
  args: { content: v.string(), generatedAt: v.number(), fileCount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache")
      .withIndex("by_type", q => q.eq("cacheType", "summary"))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("kbSummaryCache", { cacheType: "summary", ...args });
  },
});
```

### Pattern 5: Reuse Existing OpenAI Assistant for New Query Types

**What:** `aiDirectorConfig` already stores `assistantId` and `vectorStoreId`. KB extraction actions call `ctx.runQuery(api.aiDirector.getConfig)` to get these — the exact same pattern used by `aiDirectorActions.sendMessage`.

**Why this is correct:** The existing assistant already has `file_search` enabled against the "DEC Knowledge Base" vector store. Creating a new assistant for KB extraction would waste OpenAI quota and add schema complexity with zero benefit.

**Critical implementation detail:** Override the assistant's default behavior via a specific user message rather than relying on the system prompt. Each extraction thread is ephemeral and standalone.

---

## Data Flow

### Flow 1: KB Summary Generation (On-Demand)

```
User clicks "Regenerate Summary" button in KBInsights dashboard section
    ↓
KBInsights.tsx → useAction(api.kbInsightsActions.generateKBSummary)
    ↓
kbInsightsActions.generateKBSummary (Convex action, "use node")
    ↓ ctx.runQuery(api.aiDirector.getConfig) → { assistantId, vectorStoreId }
    ↓
OpenAI Assistants API — creates new thread with KB_SUMMARY_PROMPT
Runs against existing assistant → file_search retrieves relevant KB docs automatically
OpenAI returns summary text (bullet points)
    ↓ ctx.runMutation(api.kbInsights.saveSummary, { content, generatedAt })
kbSummaryCache table (cacheType: "summary") — delete existing, insert new
    ↓ Convex reactive query subscription fires automatically
useQuery(api.kbInsights.getKBSummary) in KBInsights.tsx re-renders with new summary
```

### Flow 2: KB KPI Extraction (On-Demand, same trigger)

```
Same "Regenerate" button triggers both generateKBSummary AND extractKBKPIs via Promise.all
    ↓
kbInsightsActions.extractKBKPIs (Convex action, "use node")
    ↓ Same assistantId + vectorStoreId
    ↓ Prompt: "Extract structured metrics as JSON: { activeClients, ... }"
OpenAI returns JSON string
    ↓ Validate JSON parseable (catch parse errors, store raw if invalid)
    ↓ ctx.runMutation(api.kbInsights.saveKPIs, { content: jsonStr, generatedAt })
kbSummaryCache table (cacheType: "kpis") — delete existing, insert new
    ↓ reactive re-render
KBInsights.tsx parses JSON, renders individual KPI stat cards
```

### Flow 3: Income Trend Chart (Automated via 15-min Cron)

```
QB cron fires every 15 min → quickbooksActions.syncAllData (internal action)
    ↓ Add: ctx.runAction(internal.quickbooksActions.fetchIncomeTrend, {})
fetchIncomeTrend (new internalAction)
    ↓ QB API: ProfitAndLoss?summarize_column_by=Month&start_date=YYYY-01-01&end_date=YYYY-12-31
QB returns month-column P&L report (columns are month labels, rows are account groups)
    ↓ Parse income rows across month columns → { "YYYY-MM": totalIncome } map
    ↓ ctx.runMutation(internal.quickbooksInternal.cacheReport,
        { reportType: "income_trend", data: JSON.stringify(monthlyMap) })
quickbooksCache table (reportType: "income_trend")
    ↓ reactive re-render
DonationPerformance.tsx ← useIncomeTrend() ← api.quickbooks.getIncomeTrend
    ↓ Renders line chart with real monthly QB income data
```

### Flow 4: Dashboard Section Registration

```
1. constants.ts — add "kb-insights" to DEFAULT_DASHBOARD_SECTIONS array
   (with title: "KB Insights", description: "AI-generated summary from knowledge base")
2. types/index.ts — add "kb-insights" to DashboardSectionId union
3. dashboard/page.tsx — add KBInsights component to SECTION_COMPONENTS map
4. DashboardSection wraps KBInsights with existing move-up/move-down/hide controls (zero new code)
```

---

## Integration Points — New vs. Modified

### New Convex Files

| File | Type | Purpose |
|------|------|---------|
| `convex/kbInsightsActions.ts` | Action file ("use node") | OpenAI calls for summary and KPI extraction |
| `convex/kbInsights.ts` | Query/mutation file | CRUD for `kbSummaryCache` table |

### Modified Convex Files

| File | Change | Reason |
|------|--------|--------|
| `convex/schema.ts` | Add `kbSummaryCache` table | Persist generated summaries and KPI JSON |
| `convex/quickbooks.ts` | Add `getIncomeTrend` query | Read `income_trend` cache for frontend |
| `convex/quickbooksActions.ts` | Add `fetchIncomeTrend` internalAction | Fetch monthly P&L from QB API |
| `convex/quickbooksActions.ts` | Add `fetchIncomeTrend` call to `syncAllData` | Include in existing 15-min cron |

### New Frontend Files

| File | Purpose |
|------|---------|
| `src/components/dashboard/KBInsights.tsx` | Dashboard section: AI summary + KB KPI cards + Regenerate button |
| `src/hooks/useKnowledgeBase.ts` | `useKBSummary()`, `useKBKPIs()`, `useRefreshKBSummary()`, `useExtractKBKPIs()` |

### Modified Frontend Files

| File | Change | Reason |
|------|--------|--------|
| `src/hooks/useQuickBooks.ts` | Add `useIncomeTrend()` | Hook for new QB monthly income data |
| `src/components/dashboard/DonationPerformance.tsx` | Switch `useDonations()` → `useIncomeTrend()` | `getDonations` always returns null; income trend is the real data source |
| `src/lib/constants.ts` | Add "kb-insights" to `DEFAULT_DASHBOARD_SECTIONS` | Register for dashboard layout |
| `src/types/index.ts` | Add "kb-insights" to `DashboardSectionId` union | TypeScript type coverage |
| `src/app/(dashboard)/dashboard/page.tsx` | Add `KBInsights` to `SECTION_COMPONENTS` | Wire component to section registry |

---

## Donation Chart: The Correct Data Source

The existing `getDonations` query **always returns `null`** — it looks for a `"donations"` reportType cache entry that is never populated. The comment in `convex/quickbooks.ts` (lines 323-327) explicitly states this required a defunct PayPal integration. The `DonationPerformance` component already handles `null` gracefully with an empty state message.

**Solution:** Do not build a separate donations endpoint. Use the QB **P&L report with monthly columns** to produce monthly income totals. This is the same P&L data QB already fetches in `fetchProfitAndLoss`, requested with an additional `summarize_column_by=Month` parameter.

**QB API call for `fetchIncomeTrend`:**
```
GET /v3/company/{realmId}/reports/ProfitAndLoss
  ?start_date={YYYY}-01-01
  &end_date={YYYY}-12-31
  &summarize_column_by=Month
  &minorversion=65
```

The response has monthly columns instead of a single total column. Parse the Income section rows across each month column to produce a `Record<string, number>` keyed as `"YYYY-MM"`.

**Shape stored in `quickbooksCache` as `reportType: "income_trend"`:**
```typescript
// JSON-stringified, same pattern as all other QB cache entries
{
  "2025-01": 12500,
  "2025-02": 9800,
  "2025-03": 14200,
  // ... up to 12 months
}
```

**`getIncomeTrend` query return shape:**
```typescript
{
  monthlyTotals: Record<string, number>;  // "YYYY-MM" -> total income amount
  fetchedAt: number;
}
```

`DonationPerformance.tsx` already has the line chart rendering logic for `monthlyTotals` — it reads `data.monthlyTotals` and renders the last 12 months. The only required changes to the component are:
1. Replace `useDonations()` import and call with `useIncomeTrend()` from `useQuickBooks.ts`
2. Update chart label from "Monthly Donations" to "Monthly Income" (QB income includes grants + other revenue, not just donations)
3. Keep all existing chart rendering code — the data shape is compatible

---

## KB Extraction: Prompt Design

### Summary Prompt (for `generateKBSummary`)

```
You are summarizing the DEC (Dads Evoking Change) knowledge base for the Executive Director.
Review all uploaded documents and write a concise executive summary using 3-5 bullet points.
Cover: key programs and their status, recent milestones, strategic priorities, impact highlights.
Format: Start each line with "•". Be specific and factual. Only include information found in the documents.
Do not fabricate data. If no relevant documents are found, say so.
```

### KPI Extraction Prompt (for `extractKBKPIs`)

```
Search the knowledge base documents and extract organizational metrics.
Return ONLY a valid JSON object with these exact keys (use null for any metric not found):

{
  "activeClients": <number or null>,
  "programsOffered": <number or null>,
  "sessionsCompleted": <number or null>,
  "familiesServed": <number or null>,
  "staffCount": <number or null>,
  "volunteerCount": <number or null>,
  "customMetric1Label": <string or null>,
  "customMetric1Value": <string or null>,
  "customMetric2Label": <string or null>,
  "customMetric2Value": <string or null>,
  "sourceDocs": [<document names where data was found>]
}

Do not fabricate numbers. Return null for any metric not present in the documents.
```

**KPI JSON parsing in frontend:** Wrap `JSON.parse(kpis.content)` in a try/catch. If parsing fails (OpenAI returned non-JSON), display the raw content as text rather than crashing.

---

## Schema Addition

```typescript
// convex/schema.ts — add inside defineSchema({...}), after knowledgeBase table

kbSummaryCache: defineTable({
  cacheType: v.union(v.literal("summary"), v.literal("kpis")),
  content: v.string(),          // summary text OR JSON-stringified KPI object
  generatedAt: v.number(),
  fileCount: v.optional(v.number()),
}).index("by_type", ["cacheType"]),
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Calling OpenAI from a Convex Query

**What people do:** Call OpenAI API inside a Convex `query` to generate fresh summaries on every page load.

**Why it's wrong:** Convex queries run in a deterministic read-only context — they cannot make network calls. This will throw a runtime error. Additionally, OpenAI file_search runs take 5-30 seconds, which cannot block a dashboard render.

**Do this instead:** Actions only for OpenAI calls. Queries only read from Convex tables. The trigger-on-demand action pattern (Pattern 3 above) is correct.

### Anti-Pattern 2: Creating a New OpenAI Assistant for KB Extraction

**What people do:** Create a separate assistant for KB summary/KPI extraction with its own `assistantId` stored in a new config table.

**Why it's wrong:** The existing `aiDirectorConfig.assistantId` already has `file_search` enabled and the "DEC Knowledge Base" vector store attached. A new assistant would duplicate setup, waste OpenAI quota (assistant storage costs), and add schema/config complexity.

**Do this instead:** Reuse `assistantId` and `vectorStoreId` from `aiDirector.getConfig`. Override per-request behavior with specific extraction prompts in the thread message.

### Anti-Pattern 3: Storing KPIs as Individual Table Rows

**What people do:** Create a `kbKPIs` table with one row per metric: `{ metricName: "activeClients", value: "150", generatedAt: number }`.

**Why it's wrong:** Adds schema complexity, requires collecting multiple rows per render, and makes atomic regeneration fragile (partial update leaves stale KPIs mixed with new ones). KB KPIs are regenerated as a set.

**Do this instead:** Store KPI JSON as a single `content` string in `kbSummaryCache` (cacheType: "kpis"). This mirrors how `quickbooksCache.data` stores entire QB reports as JSON strings. Parse in the frontend component.

### Anti-Pattern 4: Adding KB Insights as a New Route

**What people do:** Create a `/kb-insights` page to display the KB summary and KPIs.

**Why it's wrong:** The dashboard uses a reorderable section system — `SECTION_COMPONENTS` map, `DEFAULT_DASHBOARD_SECTIONS` array, `DashboardSection` wrapper. A new route fragments the "single-pane-of-glass" command center model and bypasses the existing hide/reorder user preferences system.

**Do this instead:** Register `KBInsights` as a new entry in `SECTION_COMPONENTS` and `DEFAULT_DASHBOARD_SECTIONS`. It renders inside the existing dashboard with move/hide controls automatically provided by `DashboardSection`.

### Anti-Pattern 5: Auto-Regenerating KB Summary on Every QB Cron Cycle

**What people do:** Add KB summary generation to the 15-minute QB sync cron in `crons.ts`.

**Why it's wrong:** OpenAI file_search threads are slow (5-30 seconds) and cost tokens. KB documents change rarely — typically only when an admin uploads a new file via Admin > Knowledge Base. Running regeneration every 15 minutes wastes OpenAI quota with redundant identical results.

**Do this instead:** Manual trigger only ("Regenerate" button in `KBInsights.tsx`). Optionally, trigger automatically when a new file is uploaded by extending `knowledgeBaseActions.uploadToOpenAI` to call `ctx.runAction(api.kbInsightsActions.generateKBSummary, {})` after the upload completes. This is the correct event boundary: KB changes → summary invalidated → regenerate.

---

## Build Order (Dependencies First)

```
Step 1: Schema change — Add kbSummaryCache table (schema.ts)
        Deploy: npx convex dev --once
        [Required before any kbInsights queries/mutations can be registered]

Step 2: Convex backend for KB (independent of Step 3)
        convex/kbInsights.ts — queries + mutations for kbSummaryCache
        convex/kbInsightsActions.ts — generateKBSummary + extractKBKPIs actions
        [Depends on Step 1]

Step 3: Convex backend for income trend (independent of Steps 1-2, can be parallel)
        convex/quickbooks.ts — add getIncomeTrend query
        convex/quickbooksActions.ts — add fetchIncomeTrend internalAction
        convex/quickbooksActions.ts — wire fetchIncomeTrend into syncAllData
        [Self-contained; no schema changes needed]

Step 4: Frontend hooks (depends on Steps 2 and 3)
        src/hooks/useKnowledgeBase.ts — new hook file
        src/hooks/useQuickBooks.ts — add useIncomeTrend()

Step 5: KBInsights component (depends on Step 4)
        src/components/dashboard/KBInsights.tsx

Step 6: DonationPerformance update (depends on Step 4, independent of Step 5)
        Switch useDonations() to useIncomeTrend()
        Update chart title and label copy

Step 7: Dashboard registration (depends on Steps 5 and 6)
        src/lib/constants.ts — add kb-insights section metadata
        src/types/index.ts — add kb-insights to DashboardSectionId
        src/app/(dashboard)/dashboard/page.tsx — add KBInsights to SECTION_COMPONENTS
```

---

## Scaling Considerations

This system serves a single nonprofit with single-digit concurrent users. Scaling is not a near-term concern.

| Concern | Current Scale | Notes |
|---------|---------------|-------|
| OpenAI API calls | On-demand only (manual trigger) | No rate-limit risk at this usage level |
| KB document count | ~5-20 files expected | File_search works well under 100 files; no change needed |
| kbSummaryCache rows | 2 rows maximum | One summary entry, one KPI entry |
| QB income_trend fetch | Added to 15-min cron | One extra API call per sync; QB rate limits are generous |
| OpenAI cost | Charged per thread token | One thread per regeneration; infrequent = negligible cost |

---

## Sources

- Direct inspection: `convex/schema.ts` (26 tables, all reviewed — kbSummaryCache does not yet exist)
- Direct inspection: `convex/quickbooks.ts` — `getDonations` comment on lines 323-327 confirms always-null state and reason
- Direct inspection: `convex/quickbooksActions.ts` — `fetchProfitAndLoss` shows QB API call pattern; `summarize_column_by=Month` is a standard QB Reports API parameter (HIGH confidence from QB API docs + confirmed by existing P&L date param pattern)
- Direct inspection: `convex/aiDirectorActions.ts` — confirms `assistantId` + `vectorStoreId` reuse pattern in `sendMessage`
- Direct inspection: `convex/knowledgeBaseActions.ts` — confirms upload pipeline and existing vectorStoreId attachment
- Direct inspection: `src/components/dashboard/DonationPerformance.tsx` — confirms `monthlyTotals: Record<string, number>` is the expected data shape, chart rendering already implemented
- Direct inspection: `src/app/(dashboard)/dashboard/page.tsx` — confirms `SECTION_COMPONENTS` map and `DEFAULT_DASHBOARD_SECTIONS` registration pattern
- Direct inspection: `convex/crons.ts` — confirms 15-min QB sync schedule, `syncAllData` is the entrypoint to extend
- Direct inspection: `src/hooks/useQuickBooks.ts` — confirms hook pattern for new `useIncomeTrend` addition

---

*Architecture research for: DEC DASH 2.0 v1.2 Intelligence milestone*
*Researched: 2026-03-01*
