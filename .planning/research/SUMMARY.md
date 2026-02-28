# Project Research Summary

**Project:** DEC DASH 2.0 — v1.2 Intelligence Milestone
**Domain:** Nonprofit Executive Dashboard — KB extraction, AI summary, donation/income charts
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

DEC DASH 2.0 v1.2 is a targeted enhancement milestone adding three intelligence features to an already-working nonprofit dashboard: KB-powered KPI cards that extract real program metrics from uploaded documents, an AI summary panel grounded in knowledge base contents, and donation/income performance charts sourced from QuickBooks monthly P&L data. The existing stack (Next.js 15, Convex, OpenAI SDK v6, Chart.js) covers all three features with zero new npm packages. All implementation work is new Convex actions, new schema tables, and new/modified frontend components following patterns already established in the codebase.

The recommended approach is strictly cache-then-query: external service calls (OpenAI, QuickBooks) happen only in Convex actions and store results into Convex tables; React components read exclusively from those tables via `useQuery`. KB extraction must use Chat Completions with `response_format: json_schema` — NOT the Assistants API file_search path, which is non-deterministic and does not support structured output formatting. The QB monthly income chart should use `summarize_column_by=Month` on the existing P&L endpoint — one API call for 12 months of data rather than 12 separate calls.

The dominant risks are hallucinated KPI values (OpenAI filling in required schema fields with fabricated numbers when documents don't contain the data), runaway OpenAI API costs (auto-triggering summary generation on dashboard load instead of manual-only), and silent data mismatch in QB income account parsing (QB nonprofit-mode uses different row label strings than the current parser expects). All three risks are avoidable with specific, well-understood mitigations identified in research. Build order matters: schema changes deploy first, KB backend before KB frontend, income trend backend is independent and can be built in parallel.

---

## Key Findings

### Recommended Stack

The v1.2 milestone adds no new npm packages. Everything builds on what already exists.

**Core technologies:**
- **openai ^6.22.0** — Chat Completions with `response_format: json_schema` for deterministic KPI extraction; Assistants API (existing `aiDirectorActions.ts` pattern) for the narrative AI summary only; already installed and in production use
- **Convex ^1.32.0** — new `kbSummaryCache` table, new `kbInsights.ts` and `kbInsightsActions.ts` files, extended `quickbooksCache` with `income_trend` reportType; all patterns follow existing Convex module conventions
- **chart.js ^4.5.1 + react-chartjs-2 ^5.3.1** — monthly income line chart in `DonationPerformance.tsx`; already registered and rendering in `ProfitLoss.tsx`; only the data source changes (from always-null `getDonations` to new `getIncomeTrend` query)
- **date-fns ^4.1.0** — month label formatting for chart X-axis; already installed

**Critical version constraint:** The Assistants API runs (`openai.beta.threads.runs.createAndPoll`) do NOT support `response_format: json_schema` — that parameter is Chat Completions only. KB KPI extraction must use `chat.completions.create()` with a structured output schema, not the Assistants thread path.

See: `.planning/research/STACK.md`

### Expected Features

**Must have — table stakes for v1.2:**
- KB KPI cards extract real numbers from uploaded documents with source document attribution and extraction timestamp — not placeholders or hallucinated values
- Graceful empty/not-configured states on all new sections following the existing `undefined`/`null`/`data` three-state pattern
- Manual "Regenerate" button on AI summary panel — passive display without user-triggered refresh is insufficient for a point-in-time document snapshot
- Donation/income chart reads actual QB income data — `DonationPerformance.tsx` already exists but the `getDonations` query always returns null (confirmed by codebase comment); must be wired to real monthly P&L data
- Skeleton loading states matching existing `ChartSkeleton` / `StatCardSkeleton` components; no flash-of-wrong-state

**Should have — differentiators that justify the milestone:**
- KB extraction grounded strictly in documents — explicit "return null if not found" prompt constraint prevents hallucination; source document name displayed under each KPI card builds user trust
- Multi-metric extraction in a single OpenAI call — batch extraction is cheaper and faster than one call per metric
- Income breakdown by QB source category (grants vs. program fees vs. contributions) — more informative than a single total line
- Rolling 6-12 month income trend via `summarize_column_by=Month` — reveals seasonal patterns and grant receipt timing

**Defer to v1.x/v2+:**
- Automated KB re-extraction on every document upload (cost and latency not warranted until usage patterns are clear)
- KB summary history with compare-over-time capability
- Multi-month income forecast / projection
- Configurable KB extraction fields via admin UI (admin specifies which metrics to extract)
- Scheduled weekly summary emails

**Anti-features to reject:**
- Streaming KB summary generation — Convex actions do not support streaming to client; 5-30 second extraction time is acceptable with a loading spinner
- Per-card AI narrative explanations — adds cost per card; AI Director chat already handles "explain this" queries
- PayPal/GoFundMe API integration for donation data — out of scope per PROJECT.md; QB income accounts capture donation totals adequately

See: `.planning/research/FEATURES.md`

### Architecture Approach

The milestone integrates two independent subsystems — KB Intelligence and Income Trend — into the existing dashboard section framework. Both follow the established cache-then-query pattern. KB intelligence uses two new Convex files (`kbInsightsActions.ts` for OpenAI calls, `kbInsights.ts` for table CRUD) and one new schema table (`kbSummaryCache`). Income trend adds a new `fetchIncomeTrend` internalAction to the existing `quickbooksActions.ts` and wires it into the 15-minute cron via `syncAllData`. The new `KBInsights` dashboard section registers via the existing `SECTION_COMPONENTS` map and `DEFAULT_DASHBOARD_SECTIONS` array — the reorderable section framework requires zero new infrastructure.

**Major components:**
1. `convex/kbInsightsActions.ts` ("use node") — Chat Completions for structured KPI extraction; Assistants API for narrative summary; reads `assistantId`/`vectorStoreId` from existing `aiDirectorConfig` (no new AI config needed)
2. `convex/kbInsights.ts` — queries and mutations for `kbSummaryCache` table using `cacheType: "summary" | "kpis"` discriminator; singleton upsert via delete-then-insert pattern matching existing `aiDirectorConfig`/`alertConfig` singletons
3. `convex/quickbooksActions.ts` (extended) — adds `fetchIncomeTrend` internalAction using `summarize_column_by=Month`; wired into existing `syncAllData` so it runs on every 15-minute QB cron automatically
4. `src/components/dashboard/KBInsights.tsx` — new dashboard section: AI summary bullets + KB KPI stat cards + Regenerate button; uses `status` field ("idle" | "generating" | "ready" | "failed") to prevent duplicate generation triggers and show stale data during regeneration
5. `src/hooks/useKnowledgeBase.ts` — `useKBSummary()`, `useKBKPIs()`, `useRefreshKBSummary()`, `useExtractKBKPIs()` following existing hook file patterns
6. `src/components/dashboard/DonationPerformance.tsx` (modified) — replace `useDonations()` call with `useIncomeTrend()`; update chart title copy; all rendering logic unchanged

**Build order (strict dependencies):**
1. Schema: add `kbSummaryCache` table to `convex/schema.ts` → deploy with `npx convex dev --once`
2. KB backend: `kbInsights.ts` + `kbInsightsActions.ts` (depends on step 1)
3. Income trend backend: `quickbooks.ts` + `quickbooksActions.ts` extensions (independent of steps 1-2, can be parallel)
4. Frontend hooks: `useKnowledgeBase.ts` + add `useIncomeTrend()` to `useQuickBooks.ts` (depends on steps 2-3)
5. `KBInsights.tsx` component (depends on step 4)
6. `DonationPerformance.tsx` update (depends on step 4, independent of step 5)
7. Dashboard registration: `constants.ts`, `types/index.ts`, `dashboard/page.tsx` (depends on steps 5-6)

See: `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

1. **OpenAI hallucination on required schema fields** — When extraction schema fields are marked required, the model invents plausible values rather than returning null when source documents don't contain that data. Prevention: make all KPI schema fields optional/nullable; include explicit prompt instruction "return null for any metric not explicitly stated in the documents"; post-validate extracted values against plausible ranges; show source document name under each KPI card for auditability.

2. **Using Assistants API file_search for structured extraction** — `file_search` threads return non-deterministic conversational text; `response_format: json_schema` is not supported in Assistants API runs. Prevention: use `chat.completions.create()` with `response_format: { type: "json_schema" }` for KPI extraction; reserve the Assistants API exclusively for the narrative summary feature where conversational output is appropriate.

3. **AI summary cost runaway from auto-triggering** — Each generation call can consume 50,000–100,000 input tokens ($0.50–$1.00/call at gpt-4o rates) if triggered on dashboard load or via a fixed-interval cron. Prevention: manual-only "Regenerate" button gated behind `requireRole(["admin", "manager"])`; store result in `kbSummaryCache` with `status` field; disable button during generation to prevent duplicate requests.

4. **QB income account names are org-specific and unfilterable by type** — There is no "donations" QB account type; account names like "Individual Contributions," "Unrestricted Gifts," or "Donor Revenue" vary entirely by how DEC's bookkeeper configured their chart of accounts. The existing `revenueByCategory` map already contains the right data but requires knowing which key names represent donation income. Prevention: surface all `revenueByCategory` account names in the admin panel; let admin designate which accounts represent donation/income categories; store designation in `appSettings`.

5. **QB nonprofit-mode changes P&L row group labels silently** — DEC's QB may use nonprofit accounting mode where "Income" rows are labeled "Revenue" or "Support & Revenue," causing the existing parser (which matches on `"income"`) to return `$0` with no error. Prevention: log one real QB P&L JSON response from DEC's environment before writing the monthly income parser; broaden label matching to include "revenue" and "support" variants.

6. **KB extraction results go stale when documents are added or deleted** — The `kbSummaryCache` table has no relationship to `knowledgeBase` table mutations. Prevention: store `kbSnapshotIds` (list of `knowledgeBase._id` values at extraction time) alongside results; compare against current KB in the display query; show "Data may be outdated — regenerate?" badge when the sets differ. Manual regeneration plus a staleness indicator keeps it simple and auditable.

See: `.planning/research/PITFALLS.md`

---

## Implications for Roadmap

Based on combined research, suggested three-phase structure for v1.2:

### Phase 1: KB KPI Extraction Backend + Cards

**Rationale:** KB features share infrastructure — the `kbSummaryCache` schema, `kbInsightsActions.ts`, `kbInsights.ts`. Building backend and schema first unblocks both KB KPI cards and the AI summary panel. This phase also requires locking in the hardest design decision (Chat Completions vs. Assistants API for extraction) before any UI is built, preventing a costly implementation reversal.

**Delivers:** `kbSummaryCache` schema deployed; `extractKBKPIs` Chat Completions action working; `KBInsights.tsx` dashboard section visible with real stat cards; source document name + extraction timestamp shown under each KPI value; staleness badge when KB documents have changed since last extraction.

**Features addressed (from FEATURES.md):** KB KPI extraction (P1), KB stat card frontend (P1), staleness detection, source provenance display.

**Pitfalls to avoid:** Hallucination on required fields (nullable schema + explicit null-return prompt instruction), Assistants API misuse for extraction (Chat Completions only), PII exposure (filter KB to aggregate reports, not individual intake forms), missing `DashboardSectionId` type update (add to union before first render).

**Research flag:** Standard patterns — follows existing Convex action + cache pattern with code examples available directly in research files. No additional research-phase needed.

---

### Phase 2: AI Summary Panel

**Rationale:** Shares the `kbSummaryCache` table and `aiDirectorConfig` credentials established in Phase 1. The Assistants API thread pattern (already working in `aiDirectorActions.ts`) is the correct choice here — the summary is a narrative, not structured extraction. The key design challenge is the generation state model (`status` field, duplicate-trigger prevention) which builds directly on Phase 1 infrastructure.

**Delivers:** Dashboard panel showing 3-5 bullet highlights from KB documents; manual Regenerate button with disabled state during generation; "Generated X ago" timestamp; stale cached summary shown during regeneration (not a blank screen); role-gated action preventing runaway cost.

**Features addressed (from FEATURES.md):** AI summary panel with regenerate (P1).

**Pitfalls to avoid:** Cost runaway (manual trigger only, role-gated action), race condition from multiple rapid clicks (`status: "generating"` guard before triggering action), layout congestion from additional dashboard section (verify default section ordering, verify hideable).

**Research flag:** Standard patterns — Assistants API thread + action-on-demand + Convex reactive query is the exact pattern used by `aiDirectorActions.ts` today. No additional research-phase needed.

---

### Phase 3: Donation/Income Performance Charts

**Rationale:** Fully independent of Phases 1-2 — no shared code, different Convex files, different QB data path. Can be built in parallel with Phase 1 or sequentially after Phase 2. Highest backend complexity of the three features due to QB API monthly column parsing, but the `DonationPerformance.tsx` frontend change is minimal (data source swap + label copy update only).

**Delivers:** `DonationPerformance.tsx` shows real QB monthly income data instead of always-null empty state; line chart with 12-month trend via `summarize_column_by=Month` single API call; income breakdown by QB account category when admin has designated accounts in `appSettings`.

**Features addressed (from FEATURES.md):** Donation chart from QB income data (P1), rolling 12-month income trend (P2), income breakdown by source (P2).

**Pitfalls to avoid:** QB account name fragility (build admin account designation before the chart, not after), QB nonprofit-mode label mismatch (log real QB P&L response first — 10 minutes of validation that eliminates the highest-risk parsing failure), monthly fetch strategy (`summarize_column_by=Month` not 12 separate calls), empty state when no accounts have been designated (show "Configure donation accounts in Admin" with link, not a broken chart).

**Research flag:** Moderate uncertainty on QB monthly P&L JSON shape (confirmed via community sources, not official Intuit docs). Recommended validation: before writing the monthly income parser, trigger a real QB P&L API call in DEC's environment and inspect the raw JSON column structure. This is a 10-minute validation step, not a full research phase.

---

### Phase Ordering Rationale

- Phases 1 and 2 share the same Convex table (`kbSummaryCache`) and action file (`kbInsightsActions.ts`) — build sequentially to avoid write conflicts.
- Phase 3 (QB income) touches entirely different files (`quickbooks.ts`, `quickbooksActions.ts`, `DonationPerformance.tsx`) — it can run in parallel with Phase 1 if two developers are available, or be built sequentially after Phase 2 with no dependency penalty.
- Schema deployment must precede any KB backend work — Convex rejects queries against tables that don't exist in the deployed schema.
- Dashboard registration (constants, types, page.tsx) is always the final step — it depends on component files existing and the schema being deployed.

### Research Flags

**Phases needing targeted validation during execution:**
- **Phase 3:** Capture and inspect a real DEC QB P&L JSON response (with `summarize_column_by=Month`) before writing the monthly income parser. The column-to-month mapping structure is confirmed to exist from community sources but not verified against DEC's specific QB configuration. This validation prevents the highest-confidence parse-failure pitfall.

**Phases with well-documented standard patterns (no additional research needed):**
- **Phase 1:** Convex action + cache + Chat Completions `json_schema` — all established with working code examples in STACK.md and ARCHITECTURE.md research files.
- **Phase 2:** Assistants API thread + action-on-demand + Convex reactive query — the exact pattern `aiDirectorActions.ts` uses in production today.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages; all patterns verified via direct codebase inspection. OpenAI file download restriction confirmed by multiple independent community sources. QB `summarize_column_by=Month` confirmed via developer community (not official Intuit docs — exact JSON column shape is MEDIUM confidence). |
| Features | HIGH | P1 features derive directly from documented codebase gaps (`getDonations` always null per source comment, no KB extraction mechanism exists today). P2 features are well-understood extensions of the same infrastructure. |
| Architecture | HIGH | Based on direct inspection of all relevant Convex files, component files, hooks, and the dashboard section registration pattern. Build order is dependency-derived, not speculative. |
| Pitfalls | HIGH | Hallucination on required schema fields is verified OpenAI model behavior. Assistants API structured output limitation is confirmed via official docs. QB label mismatch is verified via codebase comment and QB nonprofit-mode documentation. Cost runaway math ($0.50–$1.00/call) is calculated from current gpt-4o pricing. |

**Overall confidence:** HIGH

### Gaps to Address

- **QB monthly P&L JSON shape:** The `summarize_column_by=Month` parameter is confirmed to exist, but the exact column-to-row ColData index mapping is from community sources, not official Intuit docs. Validate with one real API call before writing the parser. Fallback if shape differs: 12 separate monthly P&L calls (slower but guaranteed to work with existing single-period fetch logic).

- **DEC's QB income account names:** Research cannot determine how DEC's bookkeeper named their income accounts. The admin account-designation UI (stored in `appSettings`) is the designed mitigation, but it adds a one-time setup step before the donation chart shows real data. Factor this into rollout communication with the Executive Director.

- **KB document content format:** Research assumes KB documents are PDF/text aggregate program reports. If any documents are image-only PDFs or non-OCR spreadsheets, Chat Completions extraction will return null for all metrics (not an error). No code mitigation needed now — document this as a known limitation if extraction returns consistently empty for specific files.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `convex/aiDirectorActions.ts`, `convex/quickbooks.ts`, `convex/quickbooksActions.ts`, `convex/schema.ts`, `convex/kbInsights.ts` (planned), `src/components/dashboard/DonationPerformance.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/hooks/useQuickBooks.ts`, `convex/crons.ts` — all patterns verified directly against working production code
- OpenAI file download restriction — https://community.openai.com/t/not-allowed-to-download-files-of-purpose-assistants/528220 (multiple independent community reports)
- OpenAI Structured Outputs guide — https://platform.openai.com/docs/guides/structured-outputs
- react-chartjs-2 v5.3.1 docs — https://react-chartjs-2.js.org/

### Secondary (MEDIUM confidence)
- QB `ProfitAndLoss` API `summarize_column_by=Month` parameter — multiple QB developer community sources confirm the parameter exists and returns monthly columns; exact JSON column structure unverified against DEC's QB
- QB nonprofit-mode label changes — QB Online Help + developer community; codebase `parsePnlTotals` function confirms reliance on "income" string matching which would silently fail in nonprofit mode
- OpenAI hallucination on required schema fields — OpenAI documented model behavior for Structured Outputs strict mode

### Tertiary (LOW confidence — validate during execution)
- Exact JSON column structure of QB monthly P&L response (ColData index-to-month mapping) — developer community discussions; validate with real DEC QB API call before writing the monthly income parser

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
