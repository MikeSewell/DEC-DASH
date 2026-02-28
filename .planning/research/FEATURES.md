# Feature Research

**Domain:** Nonprofit Executive Dashboard — v1.2 Intelligence Milestone
**Researched:** 2026-03-01
**Confidence:** HIGH (existing codebase patterns), MEDIUM (KB extraction behavior)

---

## Context: What This Milestone Is

v1.2 Intelligence adds three new dashboard capabilities to an already-working app:

1. **KB-powered KPI cards** — extract client/program stats and impact metrics from uploaded documents in the OpenAI vector store
2. **AI summary panel** — organizational highlights auto-generated from KB documents, manually re-triggerable
3. **Donation performance charts** — income trend visualization from QB revenue data

**What already exists that this builds on:**

| Existing Infrastructure | Relevance to v1.2 |
|-------------------------|-------------------|
| OpenAI Assistants API (aiDirectorActions.ts) | KB extraction reuses the same vector store + file_search pattern |
| Vector store + knowledgeBase table | Files already live in OpenAI vector store — can be queried |
| `quickbooks.getProfitAndLoss` → `revenueByCategory` | Income by category already parsed in getProfitAndLoss; fetchProfitAndLoss action already handles multi-period data |
| `DonationPerformance.tsx` component (exists but always null) | Shell chart component + getDonations query exist; getDonations returns null (no PayPal) |
| `quickbooks.getTrends` (current vs. prior year) | Single month comparison exists; multi-month trend requires new QB fetch action |
| Dashboard section system (DashboardSection + SECTION_COMPONENTS map) | New sections slot into existing reorderable framework |
| `appSettings` key-value table | KB summary cache can be stored here or in a dedicated table |
| Three-state loading pattern (undefined/null/data) | All new components must follow: undefined=loading, null=unconfigured, data=ready |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the Executive Director assumes exist once the milestone is announced. Missing = milestone feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **KB KPI cards actually extract real numbers** | If KB contains "150 clients served" in a report, users expect the card to show 150, not a placeholder | HIGH | OpenAI file_search returns text passages; number extraction requires a targeted prompt + parse pass. The AI can hallucinate numbers — needs explicit grounding instructions |
| **Graceful empty/not-configured states** | All existing dashboard sections handle null/undefined with helpful messages + admin link. KB cards must do the same when no files are uploaded | LOW | Follow existing ExecutiveSnapshot null pattern exactly. `knowledgeBase.listFiles` returns [] when empty, not null |
| **"Last extracted" timestamp on KB cards** | Every other dashboard section shows "Updated X ago". KB cards without a freshness indicator feel stale or unreliable | LOW | Store `extractedAt` timestamp alongside the extracted values in Convex |
| **Manual re-trigger for KB summary** | AI summaries go stale as new documents are uploaded. User needs a "Regenerate" button — passive auto-generation alone is insufficient | MEDIUM | Button → Convex action → OpenAI call → save result. Loading state during generation is required |
| **Donation chart uses actual QB income data** | `DonationPerformance.tsx` already exists but always shows null. Users who see it expect it to show something from QB | MEDIUM | QB P&L `revenueByCategory` has income line items (grants, donations, program fees). Income trend over multiple months requires fetching prior months' P&L from QB API |
| **Skeleton loading states** | All other sections use `ChartSkeleton` / `StatCardSkeleton`. New sections without loading skeletons flash incorrectly | LOW | Reuse existing skeleton components from `src/components/dashboard/skeletons/` |

### Differentiators (Competitive Advantage)

Features that justify the milestone's existence beyond "we added more stuff."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **KB-grounded KPI extraction (not hallucinated)** | Generic dashboards show financial KPIs only. KB-powered cards surface program-level impact — "families served this quarter," "court dates resolved" — data that only lives in uploaded reports, not QB | HIGH | Key design: prompt must instruct GPT to return "NOT_FOUND" when a metric is absent, not invent a number. Store raw extracted text alongside the parsed value for auditability |
| **Multi-metric extraction in single pass** | Extract active clients, total sessions, key outcomes, demographic highlights all in one OpenAI call — not 5 separate calls | MEDIUM | Structured JSON response format (function calling or response_format) ensures parseable output. Batch extraction is cheaper and faster than sequential |
| **AI summary grounded in KB, not hallucination** | "AI summary" is only valuable if it synthesizes actual uploaded documents. The summary panel should cite document names, not fabricate narrative | HIGH | Pass document titles as context in the prompt. Instruct: "only summarize what documents explicitly state." Response should be 3-5 bullet highlights, not a paragraph |
| **Income breakdown by source, not just total** | Most QB dashboards show total revenue. QB `revenueByCategory` already has grant income vs. program fees vs. individual donations separated — showing this breakdown is a differentiator | MEDIUM | Reuse the `revenueByCategory` data already parsed in `getProfitAndLoss`. Stack or grouped bar chart by income category over time is more informative than a single line |
| **Donor/income trend over rolling 6 months** | Single-month YoY comparison exists in KPI cards. A 6-month rolling chart reveals seasonal patterns and grant receipt timing | HIGH | Requires fetching 5 additional prior-month P&L reports from QB API. New action: `fetchMonthlyIncomeTrend`. Adds QB API calls but provides context no single-month view can |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Auto-regenerate KB summary on every document upload** | "Keep it always fresh" | OpenAI API call on every upload adds latency to the upload flow, increases costs, and may run on partial document sets during multi-file upload sessions | Manual "Regenerate" button triggered by the user when they're done uploading. Store `extractedAt` so staleness is visible |
| **Real-time KB extraction (streaming)** | Streaming looks responsive | Convex actions don't support streaming responses to the client. The existing `sendMessage` in aiDirectorActions.ts runs to completion and stores the result. Streaming would require a different architecture (SSE, WebSockets) that doesn't fit the current Convex pattern | Show loading spinner during extraction (same as AI Director chat's loading state). Typical extraction takes 3-8 seconds — acceptable without streaming |
| **PayPal/GoFundMe donation platform integration for donation chart** | "Real donation data" | Explicitly out of scope per PROJECT.md. QB already receives donation income via journal entries. The donation chart should read QB income categories, not external platforms | Parse QB `revenueByCategory` for income lines matching "donation" or "contribution." If QB has no such categories, show a "no income data matching donations" message |
| **LLM-generated narrative for every KPI card** | "Explain this number" | Adds an AI call per card, dramatically increases cost and latency. The existing AI Director chat already supports "explain this" queries | Show the raw extracted value and its source document name. Let the user ask AI Director for narrative context |
| **Scheduled weekly summary emails** | "Automate reporting" | Requires email infrastructure, scheduling complexity, and content review workflow. Newsletter system already handles email. Kareem opens the dashboard daily | Dashboard summary panel with timestamp covers this. Email digest is v2+ |
| **KB extraction from QB data (not documents)** | "Analyze financials too" | QB financial analysis is already covered by AI Insights tab in expenses section. Mixing KB document extraction with QB data in the same panel creates confused data provenance | Keep KB extraction strictly for uploaded documents. QB financial analysis stays in the Expenses → AI Insights tab |

---

## Feature Dependencies

```
[KB-Powered KPI Cards]
    └──requires──> [knowledgeBase table with uploaded files] (already exists)
    └──requires──> [OpenAI vector store ID in aiDirectorConfig] (already exists)
    └──requires──> [new Convex action: extractKbMetrics] (new)
    └──requires──> [new Convex table or appSettings keys for cached extracted values] (new)
    └──renders via──> [new dashboard section: KbInsights or similar] (new)
    └──independent of──> [QB connection]

[AI Summary Panel]
    └──requires──> [knowledgeBase table with files] (already exists)
    └──requires──> [OpenAI vector store] (already exists)
    └──shares action infrastructure with──> [KB-Powered KPI Cards] (can be same action, different prompt)
    └──requires──> [stored summary text in Convex] (new field or appSettings key)
    └──requires──> [manual regenerate trigger UI] (new)
    └──independent of──> [QB connection]

[Donation Performance Charts]
    └──requires──> [QB connected] (already gated, follows existing pattern)
    └──requires──> [QB income data: revenueByCategory from getProfitAndLoss] (already exists for current month)
    └──requires──> [multi-month income trend: new fetchMonthlyIncomeTrend action] (new — biggest new backend work)
    └──requires──> [new quickbooksCache reportType: "income_trend"] (new cache entry)
    └──renders in──> [existing DonationPerformance.tsx component] (extend, don't replace)
    └──independent of──> [KB features]

[KB KPI Cards] ──independent of──> [Donation Charts]
[AI Summary Panel] ──shares infra with──> [KB KPI Cards]
```

### Dependency Notes

- **KB KPI Cards and AI Summary share the same infrastructure:** Both call OpenAI with the vector store, both cache results in Convex. Build one Convex action that handles both extraction types (metrics + summary) to avoid two separate OpenAI round-trips.
- **Donation chart is fully independent of KB:** QB connection is the only dependency. Can be built or shipped separately.
- **Multi-month income trend is the hardest new backend piece:** The existing `fetchPriorYearPnl` action fetches a single prior month. Fetching 5 prior months for a rolling 6-month view means 5 additional QB API calls. This should be a single new action that loops, not 5 separate actions. Cache as a single `income_trend` entry (JSON array of month objects).
- **No new auth or integrations required:** Everything reuses existing OpenAI API key and QB OAuth tokens.

---

## MVP Definition

This is a targeted milestone on a working app. MVP means "what makes v1.2 shippable."

### Launch With (v1.2)

- [ ] **KB KPI extraction** — Convex action queries vector store for 3-5 configurable impact metrics (active clients, sessions, key outcomes). Results cached in Convex with timestamp. New dashboard section renders them as stat cards.
- [ ] **AI summary panel** — Same action (or companion action) generates 3-5 bullet highlights from KB documents. Cached, with manual Regenerate button. Empty state when no KB files exist.
- [ ] **Donation/income chart** — Replace the always-null `getDonations` path with real QB income data. Read from existing `revenueByCategory` for current-month breakdown. Add rolling 6-month income trend via new action + cache.

### Add After Validation (v1.x)

- [ ] **Configurable KB extraction fields** — Admin UI to specify which metrics to extract (instead of hardcoded). Trigger: Kareem wants metrics beyond the initial 3-5.
- [ ] **KB summary history** — Store last N summaries with timestamps so Kareem can compare. Trigger: "Can you show me last week's summary?"
- [ ] **Income breakdown by category as stacked chart** — Show grant income vs. program fees vs. contributions separately over time. Trigger: QB income data proves rich enough to warrant breakdown.

### Future Consideration (v2+)

- [ ] **Automated KB re-extraction on document upload** — Adds API cost but removes manual friction. Defer until usage patterns are clear.
- [ ] **KB extraction confidence scores** — Show "extracted from: [document name]" per metric. Needs citation parsing from OpenAI response.
- [ ] **Multi-month income forecast** — Project next 3 months based on historical pattern. Requires more months of data than DEC currently has in QB.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| KB KPI extraction (backend action + cache) | HIGH | MEDIUM (new Convex action, OpenAI call, storage schema) | P1 |
| KB stat cards (frontend component) | HIGH | LOW (follows existing StatCard pattern exactly) | P1 |
| AI summary panel with regenerate | HIGH | MEDIUM (companion to KB extraction, needs UI for regenerate + loading state) | P1 |
| Donation chart from QB income data (current month) | HIGH | LOW (revenueByCategory already parsed, just wire into DonationPerformance.tsx) | P1 |
| Rolling 6-month income trend (new QB action + cache) | MEDIUM | HIGH (5 additional QB API calls, new cache structure, date math) | P2 |
| Income breakdown by source (stacked chart) | MEDIUM | MEDIUM (data exists, charting library supports it) | P2 |
| Configurable KB extraction fields (admin UI) | LOW | HIGH | P3 |

**Priority key:**
- P1: Must ship for v1.2 milestone
- P2: Ship if P1 lands cleanly and time permits
- P3: Future milestone

---

## Implementation Behavior Notes by Feature

### KB Metric Extraction — Expected Behavior

The standard pattern for RAG-based metric extraction from organizational documents:

1. **Prompt structure matters:** The extraction prompt must be specific. "What is the current number of active clients?" outperforms "summarize client data." Specificity reduces hallucination.
2. **JSON response format:** Use `response_format: { type: "json_object" }` or OpenAI function calling to get structured output. Free-text responses require regex parsing which is brittle.
3. **NOT_FOUND sentinel:** Instruct the model to return `"value": null, "source": null` when a metric is not found in the documents. Never return a fabricated number. The prompt: "If you cannot find this metric explicitly stated in the documents, return null — do not estimate."
4. **Source attribution:** Request the document name or passage as part of the response. This allows showing "from: Q4 Program Report.pdf" under the stat card, which builds trust.
5. **Staleness model:** KB extraction should be explicitly user-triggered (Regenerate button) plus auto-triggered when new files are added to the KB (optional v1.x). Do not run on every dashboard load — that would cost $0.01-0.10 per page view.
6. **Storage:** Cache extracted values in a new Convex table `kbInsightsCache` with fields: `{ metricKey, value, sourceDocument, extractedAt }` or simpler as `appSettings` keys like `kb_metric_active_clients`. The appSettings approach is lower friction since the table already exists.

### AI Summary Panel — Expected Behavior

1. **Summary scope:** Should synthesize across ALL KB documents, not just the most recent one. Vector store file_search handles this.
2. **Output format:** 3-5 bullet points, each 1-2 sentences. Not a paragraph — bullets are scannable for a busy Executive Director.
3. **Tone:** Factual, not promotional. "Q3 report shows 87 families served" not "DEC is making great strides."
4. **Prompt constraint:** "Summarize only what is explicitly stated in the uploaded documents. Do not add interpretation or context not present in the source material."
5. **Regenerate UX:** Button shows spinner during generation (typically 5-15 seconds for file_search + response). Button is disabled during generation to prevent double-submission. Same pattern as AI Director's send button.
6. **Timestamp:** "Generated [X ago] — Regenerate" provides the right mental model. Kareem knows the summary reflects KB contents as of the last regeneration.

### Donation/Income Chart — Expected Behavior

The existing `DonationPerformance.tsx` component was built for a PayPal integration that never happened. QB is the right data source, but the data model differs from the original `DonationsData` interface:

1. **Current-month approach (P1):** `getProfitAndLoss` already returns `revenueByCategory` — a Record<string, number> of income line items. Wire this directly into the chart as a pie/bar breakdown. The `DonationPerformance` component can be refactored to consume `getProfitAndLoss` instead of `getDonations`.
2. **6-month rolling approach (P2):** Requires a new QB action `fetchMonthlyIncomeTrend` that loops over 6 months and fetches a P&L for each. Cache as `income_trend` reportType with data: `[{ month: "2025-09", income: 45000, byCategory: {...} }, ...]`.
3. **Chart type recommendation:** Line chart (existing in DonationPerformance.tsx) for total income trend. Stacked bar chart for income-by-category breakdown. Both can live in the same component — show whichever data is available.
4. **Label mapping:** QB account names like "Government Grants Income" or "Program Service Revenue" are not user-friendly. A mapping layer (constants object or admin-configurable) should translate QB category names to display labels. Example: `{ "Government Grants Income": "Grants", "Individual Contributions": "Donations" }`.
5. **Empty state:** If QB is connected but has no income categories in the P&L (new org, no transactions yet), show "No income recorded in QuickBooks for this period" rather than a broken chart.

---

## Sources

- Existing codebase analysis: `convex/aiDirectorActions.ts`, `convex/quickbooks.ts`, `src/components/dashboard/DonationPerformance.tsx`, `src/components/dashboard/ExecutiveSnapshot.tsx` — HIGH confidence (direct code inspection)
- OpenAI Assistants API file_search behavior: HIGH confidence (established in v1.0 via `aiDirectorActions.ts` implementation which uses the same pattern)
- QB P&L income parsing: HIGH confidence (`parsePnlTotals` and `extractCategories` in `quickbooks.ts` already handle income row extraction correctly — `revenueByCategory` is populated)
- Dashboard section framework: HIGH confidence (existing `SECTION_COMPONENTS` map and `DashboardSection` wrapper show the integration pattern clearly)

---

*Feature research for: DEC DASH 2.0 — v1.2 Intelligence Milestone*
*Researched: 2026-03-01*
