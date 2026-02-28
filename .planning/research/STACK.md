# Stack Research

**Domain:** Nonprofit Executive Dashboard — v1.2 Intelligence (KB extraction, AI summaries, donation charts)
**Researched:** 2026-03-01
**Confidence:** HIGH for OpenAI path; HIGH for QB income-by-month path; MEDIUM for file content retrieval limitation

---

## Context: What Already Exists (Do Not Re-Research)

This is a subsequent milestone. The base stack is locked and fully operational:

| Already Installed | Version | Role in v1.2 |
|-------------------|---------|--------------|
| openai | ^6.22.0 | **Central to ALL three v1.2 features** — extend existing patterns |
| convex | ^1.32.0 | Backend, caching, real-time queries — extend existing tables |
| chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 | **Donation charts** — already registered and used in ProfitLoss.tsx, DonationPerformance.tsx |
| next | 16.1.6 | App Router, client components |
| tailwindcss | ^4 | Design system — no changes |
| date-fns | ^4.1.0 | Date formatting for chart labels |
| googleapis | ^171.4.0 | Existing QB/Sheets/Calendar — no role in v1.2 |

**Key insight: v1.2 adds zero new npm packages.** All three features are achievable within the existing openai SDK, Convex backend, and chart.js stack. The work is entirely new Convex actions and frontend components.

---

## Feature 1: KB-Powered KPI Cards (Structured Extraction from Documents)

### What needs to happen

The Knowledge Base (KB) files already live in Convex Storage (`knowledgeBase` table) and in the OpenAI vector store. The task is: read the stored documents and extract structured numbers (client counts, program stats, impact metrics) and surface them as dashboard KPI cards.

### The File Content Retrieval Constraint

**CRITICAL — HIGH confidence (verified via OpenAI community, multiple sources):**

Files uploaded with `purpose: "assistants"` **cannot be downloaded** via `openai.files.content()`. The API returns `400 - Not allowed to download files of purpose: assistants`. This is an explicit OpenAI restriction, not a bug.

This rules out: fetch the file → parse the text → send to GPT.

### Recommended Approach: Chat Completions + file_search Tool

Use the existing OpenAI Assistants API thread/run pattern (already working in `aiDirectorActions.ts`) to ask a structured extraction question, then parse the response as JSON.

**Why this approach (HIGH confidence):**
- The vector store already indexes all KB documents via file_search
- The existing `aiDirectorActions.ts` already does `openai.beta.threads.runs.createAndPoll()` with `assistant_id` and gets back text
- Structured Outputs (`response_format: { type: "json_object" }`) works with gpt-4o and gpt-4o-mini — both already in use
- No new authentication, no new API endpoints

**Structured extraction pattern using existing openai SDK v6:**

```typescript
// In a new convex/kbActions.ts — "use node" required
// Uses the existing vector store + assistant config

const thread = await openai.beta.threads.create({
  messages: [{
    role: "user",
    content: `Search the knowledge base documents and extract these metrics as JSON.
    Return ONLY valid JSON matching this structure:
    {
      "totalClientsServed": number | null,
      "activeProgramCount": number | null,
      "impactMetrics": [{ "label": string, "value": string }],
      "summaryText": string
    }
    Use null for any metric not found in the documents.`
  }]
});

const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
  assistant_id: config.assistantId,
  // response_format does NOT apply to Assistants API runs
});

// Parse the assistant's text response as JSON
const text = assistantMsg.content[0].text.value;
const extracted = JSON.parse(text); // wrap in try/catch
```

**Why NOT `response_format: json_schema` with the Assistants API:**
The Assistants API runs do NOT support `response_format` with `json_schema` type — that parameter applies to Chat Completions only, not thread runs. Instead, the system prompt instructs the model to return JSON, and the application parses the text response.

**Why NOT Chat Completions with `tool_resources`:**
The `file_search` tool resource is only available on the Assistants API, not on standalone `chat.completions.create()` calls. To search the vector store, you must use the Assistants API threads/runs path.

**Why NOT Zod for schema enforcement:**
Zod (`zodResponseFormat`) adds a runtime dependency and only works with `chat.completions.parse()`, not the Assistants API runs path. Since the extraction prompt instructs JSON output and we validate with try/catch + null fallbacks, Zod is unnecessary overhead.

### Caching Pattern

Store extracted KB metrics in a new `kbInsights` Convex table to avoid redundant OpenAI API calls on every page load.

```typescript
// Schema addition in convex/schema.ts
kbInsights: defineTable({
  extractedAt: v.number(),
  totalClientsServed: v.optional(v.number()),
  activeProgramCount: v.optional(v.number()),
  impactMetrics: v.string(),   // JSON array of { label, value }
  summaryText: v.optional(v.string()),
  triggeredBy: v.id("users"),
}),
```

**Trigger:** Manual button ("Refresh KB Insights") in the dashboard panel — NOT a cron. Document content changes infrequently; automatic polling would waste OpenAI API credits.

---

## Feature 2: AI Summary Panel

### What needs to happen

A dashboard panel that shows 3-5 key organizational takeaways ("AI Summary") derived from KB documents. Manually regenerated by the admin. Stored in Convex so it loads instantly on subsequent visits.

### Approach: Same Assistants API Thread Pattern

This is a simpler variant of Feature 1 — same OpenAI call, different prompt asking for narrative takeaways rather than structured numbers.

**Prompt strategy:**
```
Search the knowledge base and write 3-5 bullet point takeaways about
organizational health, program impact, or notable trends. Be specific.
Use numbers from the documents where available. Return as plain text.
```

**Why same pattern as Feature 1 (HIGH confidence):**
- The vector store file_search is the only way to query KB document contents programmatically
- The response is plain text (no JSON needed), so no structured output formatting required
- Same `aiDirectorActions.ts` pattern — create thread, run with assistant_id, read message

**Storage:** Reuse the `kbInsights` table — add `summaryText v.string()` column (included above).

**Display:** A card on the dashboard with a "Regenerate" button (calls the Convex action), showing last-generated timestamp. The card is read from `useQuery(api.kbInsights.getLatest)`.

---

## Feature 3: Donation Performance Charts from QB Income Accounts

### Current State

`DonationPerformance.tsx` exists but shows an empty state because `quickbooks.getDonations` always returns `null` — the `"donations"` cache key is never populated. The comment in `quickbooks.ts` confirms: "QB doesn't have a dedicated donations entity."

### Recommended Approach: QB P&L Income by Month

Use the existing QuickBooks `ProfitAndLoss` report API with `summarize_column_by=Month` to get monthly income broken down by income account category (donations, grants, program revenue, etc.).

**API call (MEDIUM confidence — confirmed via multiple QB developer community sources):**
```
GET /v3/company/{realmId}/reports/ProfitAndLoss
  ?start_date=2025-01-01
  &end_date=2025-12-31
  &summarize_column_by=Month
  &minorversion=65
```

**Response structure:** The `Columns.Column` array contains one entry per month. Income rows under the `Income` group section contain `ColData` arrays where each index maps to a month column. The existing `extractCategories()` helper in `quickbooks.ts` works on the row structure — it needs to be extended to handle multi-column (monthly) data instead of the single-column (YTD total) format.

**Why this over separate-month queries (HIGH confidence):**
- One API call returns 12 months of data vs. 12 separate calls — avoids hitting QB rate limits
- The `quickbooksActions.ts` already calls `fetchProfitAndLoss` with start/end dates — extend it with a new `fetchProfitAndLossByMonth` variant
- The `profit_loss_by_month` cache key follows the existing `profit_loss` / `profit_loss_prior_year` naming pattern

**New Convex internalAction:**
```typescript
// In convex/quickbooksActions.ts — add alongside existing fetchProfitAndLoss
export const fetchProfitAndLossByMonth = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const startDate = `${new Date().getFullYear()}-01-01`;
    const endDate = getToday();

    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/reports/ProfitAndLoss` +
      `?start_date=${startDate}&end_date=${endDate}` +
      `&summarize_column_by=Month&minorversion=65`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
    );

    const data = await response.json();
    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "profit_loss_by_month",
      data: JSON.stringify(data),
      periodStart: startDate,
      periodEnd: endDate,
    });
  },
});
```

**Frontend chart (HIGH confidence — already using Chart.js):**
The existing `DonationPerformance.tsx` already registers `Line`, `CategoryScale`, `LinearScale`, etc. from chart.js. The donation chart needs the same chart type (Line, already implemented) with month labels on X-axis and income category amounts on Y-axis. The existing chart configuration patterns from `ProfitLoss.tsx` and `DonationPerformance.tsx` are directly reusable.

**Income category filtering:** The monthly P&L response groups income rows under the `Income` section. Parse the row names to find donation-relevant categories (e.g., rows named "Donations", "Contributions", "Individual Giving") vs. grant income. This filtering uses the existing `extractCategories` helper logic.

---

## New Convex Tables Required

| Table | Purpose | When Populated |
|-------|---------|----------------|
| `kbInsights` | Cache KB extraction results + AI summary | Manual trigger (user clicks "Refresh") |

No other schema additions needed. The QB monthly data uses the existing `quickbooksCache` table with a new `profit_loss_by_month` report type key.

---

## New Convex Functions Required

| File | Function | Type | Purpose |
|------|----------|------|---------|
| `convex/kbActions.ts` (new) | `extractKbInsights` | action | Queries vector store, extracts structured metrics + summary |
| `convex/kbInsights.ts` (new) | `saveInsights`, `getLatest` | mutation + query | Persist and read KB extraction results |
| `convex/quickbooksActions.ts` (extend) | `fetchProfitAndLossByMonth` | internalAction | Fetch QB P&L with summarize_column_by=Month |
| `convex/quickbooks.ts` (extend) | `getProfitAndLossByMonth` | query | Read and parse monthly income data from cache |

---

## Installation

```bash
# No new packages needed.
# All v1.2 features use existing: openai ^6.22.0, convex ^1.32.0, chart.js ^4.5.1
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Assistants API thread + file_search | `openai.files.content()` then parse | Files uploaded with purpose "assistants" cannot be downloaded — API returns 400 error. Confirmed by multiple community sources. |
| Assistants API thread + file_search | Chat Completions with `file_ids` in messages | `file_ids` in message content only works for "vision" purpose files (images), not assistants-purpose documents |
| QB `summarize_column_by=Month` (one call) | 12 separate P&L calls, one per month | Rate limit risk, slower sync, more complex caching — one call is cleaner |
| `response_format: { type: "json_object" }` in prompt | `zodResponseFormat` with Zod schema | Assistants API runs don't support response_format parameter; Zod not needed when parsing text response with try/catch + null fallbacks |
| Manual trigger for KB refresh | Cron-based automatic KB extraction | KB documents change infrequently (admin uploads them); polling wastes OpenAI credits; manual trigger is explicit and auditable |
| Convex `kbInsights` table | `appSettings` KV store | Structured table allows future multiple snapshots, timestamps, user attribution; KV would serialize as a JSON blob |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `pdf-parse`, `pdfjs-dist`, or similar PDF parsing libraries | Cannot access KB files directly — they're in OpenAI's vector store, not readable via Convex Storage download | Assistants API file_search which already has them indexed |
| LangChain or LlamaIndex | Full RAG frameworks — massive overhead for a single-purpose extraction action already using OpenAI SDK directly | Raw openai SDK calls (already installed, already used) |
| Separate vector store or embedding pipeline | OpenAI vector store already indexes KB files automatically on upload | Reuse existing `vectorStoreId` from `aiDirectorConfig` table |
| `zod` package | Optional but adds a new runtime dependency; not needed for the Assistants API path | Prompt engineering for JSON output + try/catch parsing |
| Recharts or D3.js | Adding a second charting library when chart.js is already registered and used | chart.js + react-chartjs-2 (existing) |
| GoFundMe / PayPal API | Out of scope per PROJECT.md; QB income accounts capture donation totals adequately | QB ProfitAndLoss with summarize_column_by=Month |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| openai ^6.22.0 | Assistants API v2 (beta) | `openai.beta.threads`, `openai.beta.threads.runs.createAndPoll` — all used in existing `aiDirectorActions.ts` |
| openai ^6.22.0 | `json_object` response_format | Works with gpt-4o and gpt-4o-mini for Chat Completions; NOT applicable to Assistants API runs |
| chart.js ^4.5.1 + react-chartjs-2 ^5.3.1 | Monthly income line/bar charts | Same component pattern as existing `ProfitLoss.tsx` and `DonationPerformance.tsx` |
| convex ^1.32.0 | New `kbInsights` table schema | Schema addition via `npx convex dev --once` |
| date-fns ^4.1.0 | Month label formatting for charts | `format(new Date(year, month - 1), 'MMM yy')` for chart X-axis labels |

---

## Integration Points with Existing Code

| New Code | Existing Code It Touches | How |
|----------|--------------------------|-----|
| `kbActions.ts` | `aiDirectorConfig` table | Reads `assistantId` + `vectorStoreId` via `api.aiDirector.getConfig` |
| `kbActions.ts` | `openaiHelpers.ts` | Reuses `getOpenAIApiKey(ctx)` — exact same helper |
| `fetchProfitAndLossByMonth` | `quickbooksInternal.cacheReport` | Stores into `quickbooksCache` with new report type key |
| `fetchProfitAndLossByMonth` | `getAuthenticatedConfig()` | Uses existing private helper already in `quickbooksActions.ts` |
| `getProfitAndLossByMonth` query | `quickbooksCache` table | Reads `by_reportType` index with key `"profit_loss_by_month"` |
| `syncAllData` in `quickbooksActions.ts` | Add `fetchProfitAndLossByMonth` call | Add to the existing sequential sync chain — runs on 15-min cron automatically |
| `DonationPerformance.tsx` | Convex `useQuery(api.quickbooks.getProfitAndLossByMonth)` | Replace the non-functional `useDonations()` hook |
| New KB dashboard panel | `dashboardPrefs` section order | Add `"kb-insights"` as a new section ID in `DEFAULT_DASHBOARD_SECTIONS` |

---

## Sources

- **OpenAI community: "Not allowed to download files of purpose: assistants"** — https://community.openai.com/t/not-allowed-to-download-files-of-purpose-assistants/528220 — file download restriction confirmed (HIGH confidence — multiple independent community reports + portkey.ai error library)
- **OpenAI Structured Outputs guide** — https://platform.openai.com/docs/guides/structured-outputs — `json_schema` response_format for Chat Completions; Assistants API runs use prompt engineering (HIGH confidence)
- **OpenAI Node SDK DeepWiki: Structured Outputs** — https://deepwiki.com/openai/openai-node/5.4-structured-outputs-and-parsing — Zod is optional peer dep; raw JSON schema passable (MEDIUM confidence)
- **QB ProfitAndLoss API `summarize_column_by` parameter** — Multiple QB community sources confirm `summarize_column_by=Month` is a valid API parameter returning monthly columns in the report structure (MEDIUM confidence — Intuit dev docs not directly fetchable; confirmed via multiple third-party developer discussions)
- **react-chartjs-2 v5.3.1 docs** — https://react-chartjs-2.js.org/ — version confirmed, ESM/CJS both supported, compatible with chart.js v4 (HIGH confidence)
- **Existing codebase read** — `convex/aiDirectorActions.ts`, `convex/knowledgeBase.ts`, `convex/quickbooks.ts`, `convex/schema.ts`, `src/components/dashboard/DonationPerformance.tsx` — pattern verification (HIGH confidence — read directly)
- **WebSearch: "QuickBooks API summarize_column_by Month income"** — confirmed parameter exists; response has Column array with month entries and Row ColData indexed by month (MEDIUM confidence — WebSearch only, not official doc)

---

*Stack research for: DEC DASH 2.0 v1.2 Intelligence — KB data extraction, AI summary, donation charts*
*Researched: 2026-03-01*
