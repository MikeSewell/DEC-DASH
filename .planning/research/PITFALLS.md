# Pitfalls Research

**Domain:** Nonprofit executive dashboard — Next.js 15 + Convex + Google Calendar integration + dashboard data population + proactive alerts + HTML email templates + KB-powered KPI extraction + AI summary panel + QB income/donation charts
**Researched:** 2026-03-01 (v1.2 Intelligence update; v1.0–v1.1 pitfalls preserved below)
**Confidence:** HIGH (codebase inspected directly; external API pitfalls verified with official docs and community sources)

---

# v1.2 Intelligence Milestone — New Pitfalls

These pitfalls are specific to adding KB-powered KPI cards, an AI summary panel, and donation/income charts from QuickBooks to the existing dashboard.

---

## Critical Pitfalls

### Pitfall 1: OpenAI Structured Extraction Invents Values for Missing Fields

**What goes wrong:**
You pass a Zod/JSON schema to OpenAI and ask it to extract KPIs (e.g., "clients served", "sessions completed", "success rate") from uploaded KB documents. OpenAI returns a fully-populated JSON object even when the document does not contain those fields. KPI cards display confident-looking numbers that are fabricated.

**Why it happens:**
When `strict: true` is used with Structured Outputs, the model must conform to the schema — it cannot return an empty response. If the schema makes fields required but the source document does not contain those values, the model fills them in plausibly (hallucination), rather than leaving them null. This is a known behavior: the model "tries to adhere to the provided schema" and will invent values to satisfy required fields. The existing KB files in this system (PDFs of program reports, intake data) may have inconsistent structure across uploads — one document may have "112 clients served" and another may not mention client counts at all.

**How to avoid:**
1. Make all extracted fields `optional` (nullable) in the schema. Prompt explicitly: "Return null for any field not directly stated in the document. Do not estimate or infer values."
2. Post-validate extracted values against plausible ranges (e.g., client counts > 0 and < 10,000; reject negative values).
3. Store the source document name and a `confidence` field alongside each extracted KPI in Convex so the UI can show provenance ("From: Q3 2025 Program Report").
4. Do not use Assistants API file_search for structured extraction — it retrieves relevant chunks but cannot guarantee the extracted field came from an actual chunk. Use direct Chat Completions with the document text injected into the prompt for deterministic extraction.

**Warning signs:**
- Extracted KPI values are suspiciously round numbers (100, 500) when real program data has irregular counts
- The same metric returns different values on consecutive extractions from the same document
- KPI cards show values for metrics that do not exist in any uploaded document

**Phase to address:**
Phase 1 (KB KPI extraction) — before any KPI card renders extracted data to Kareem.

---

### Pitfall 2: AI Summary Generation Runs on Every Dashboard Load, Burning API Credits

**What goes wrong:**
A Convex action fetches all KB files, sends them to OpenAI to generate a "key takeaways" summary, and saves the result. This action is triggered on dashboard load or on a cron schedule without checking if the KB has changed. Result: OpenAI API costs spike. With 10 documents averaging 50 KB each, a single summary generation call can consume 50,000–100,000 input tokens at gpt-4o rates (~$0.50–$1.00 per call). If triggered every dashboard load, this is $15–$30/day for a light user — prohibitive for a nonprofit.

**Why it happens:**
The natural implementation pattern is: "user opens dashboard → fetch summary → display." This triggers an OpenAI call on every page load. Even if wrapped in a cron, a 15-minute cron firing independently of whether any document changed still wastes tokens when the KB is unchanged. The existing codebase's Sheets and QB syncs run on fixed cron intervals regardless of source changes, which is fine for API polling but is not appropriate for expensive LLM generation.

**How to avoid:**
1. Store the generated summary in Convex (`aiSummary` table with `generatedAt`, `kbFingerprint`, `content` fields).
2. Compute a fingerprint of the KB state: hash of all `knowledgeBase` document IDs + `uploadedAt` timestamps. Only regenerate if the fingerprint changes.
3. Expose manual regeneration only (a "Regenerate Summary" button), not automatic. The summary is a point-in-time snapshot of organizational highlights — it does not need to auto-update.
4. Cap maximum document content passed to OpenAI: if total KB size exceeds 100,000 tokens, summarize only the 5 most recently uploaded documents, or use a pre-extraction step to pull relevant sections.

**Warning signs:**
- OpenAI usage dashboard shows large spikes coinciding with dashboard open events
- Convex action logs show repeated `generateSummary` calls within minutes
- OpenAI API bill increases unexpectedly after shipping the AI summary feature

**Phase to address:**
Phase 2 (AI summary panel) — the trigger and caching strategy must be designed before the action is written.

---

### Pitfall 3: QuickBooks Has No "Donations" Entity — Income Account Mapping Is Org-Specific and Fragile

**What goes wrong:**
The DonationPerformance component already exists in the codebase and reads from a `donations` cache entry in `quickbooksCache`. The `quickbooks.ts` comment confirms: "QB doesn't have a dedicated donations entity. This will return null until a PayPal or other donation-platform integration is implemented." If you attempt to extract "donations" from the QB P&L report by looking for accounts named "Donations" or "Contributions," you will fail silently when DEC's chart of accounts uses different naming (e.g., "Individual Contributions," "Unrestricted Gifts," "Donor Revenue"). The account names are set by whoever configured QB and are not standardized.

**Why it happens:**
QuickBooks Online does not have a "donation" account type — contributions are classified under Income accounts with user-defined names. There is no API field that flags an account as "donation-related." The P&L report's `revenueByCategory` (already parsed in `getProfitAndLoss`) has the right data, but the key names are whatever DEC's bookkeeper named them in QB. The `revenueByCategory` from the existing `parsePnlTotals`/`extractCategories` functions returns a flat map of `{ accountName: amount }` — useful, but requires knowing which account names represent donation income vs. grant income vs. program fees.

**How to avoid:**
1. Do not hardcode account name strings like "Donations". Instead, expose all Income sub-accounts from `revenueByCategory` in the admin panel and let admin designate which accounts are "donation-type" income.
2. Store that designation in `appSettings` (e.g., `donation_income_accounts: ["Individual Contributions", "GoFundMe Transfers"]` as a JSON array).
3. The donation chart then sums only accounts matching that list, not all income.
4. For the monthly trend chart specifically: the current QB sync only fetches YTD P&L — it does not store month-by-month breakdowns. A monthly donations chart requires either: (a) fetching 12 separate monthly P&L reports (expensive: 12 QB API calls per sync), or (b) using the QB CustomerSales or TransactionList reports filtered by account. Option (b) is more surgical.

**Warning signs:**
- `DonationPerformance` component always shows the "no donation data" empty state even when QB is connected and has data
- QB income categories in the dashboard don't include any line that looks like "donations"
- Chart shows $0 donation history for months where grant income clearly flowed

**Phase to address:**
Phase 3 (donation performance charts) — the account mapping admin UI must be built before the chart fetches data, or the chart will show wrong values with no error.

---

### Pitfall 4: Monthly Donation Trend Chart Requires Per-Month P&L Fetches That Inflate the QB Sync Cost

**What goes wrong:**
The DonationPerformance chart expects `monthlyTotals: Record<string, number>` — a dictionary of `"2025-01": 1200, "2025-02": 3400, ...` for the last 12 months. The existing QB sync fetches only YTD aggregate P&L. Getting per-month data requires 12 separate QB API calls (one per month), each counting against the QB API rate limit (500 requests/minute for production apps, lower for sandbox). Adding 12 calls to the existing sync of ~10 calls means the cron could approach timeout limits, and any one failing call would leave a gap in the chart.

**Why it happens:**
The QuickBooks Reporting API's `ProfitAndLoss` endpoint returns data for a single date range per call. There is no "group by month" parameter that returns monthly subtotals in one call. Developers assume the existing P&L data structure is sufficient and try to infer monthly breakdowns from it — which is impossible since the YTD P&L only contains totals.

**How to avoid:**
1. Use QB's `ProfitAndLossDetail` report (not the summary) with a narrow date range and `summarize_column_by=Month` parameter — this returns a single report with monthly columns. This is one API call instead of 12.
2. Cache this as a separate `reportType: "profit_loss_monthly"` entry in `quickbooksCache`.
3. Parse the column structure: QB monthly P&L has one column per month in `Header.ColData`, making parsing more complex than the existing single-column parser — factor this into the implementation time estimate.
4. Only fetch the last 12 months, not all-time history.

**Warning signs:**
- QB sync duration increases noticeably after adding donation chart support
- Convex action logs show repeated `fetchProfitAndLoss` calls with different date params
- QB API returns 429 (rate limit) during sync

**Phase to address:**
Phase 3 (donation performance charts) — design the QB fetch strategy before writing the parser.

---

### Pitfall 5: KB Extraction Stored Results Go Stale When Documents Are Added or Deleted

**What goes wrong:**
Admin uploads a new impact report to the KB on Tuesday. The KPI cards on the dashboard still show values from the Monday extraction run. Admin deletes an outdated document. The extraction includes data from that deleted document. The dashboard shows KPIs that no longer reflect the current KB state.

**Why it happens:**
The existing KB system (`knowledgeBase.ts`) stores document metadata in Convex and syncs files to the OpenAI vector store — but there is no mechanism to trigger re-extraction when the KB changes. If extraction results are cached in a separate table, that cache has no relationship to the `knowledgeBase` table mutations (inserts/deletes). The OpenAI vector store may still contain deleted files' embeddings until explicitly removed (the `removeFromOpenAI` action exists, but there is no downstream trigger to invalidate KPI cache).

**How to avoid:**
1. Store extracted KPIs with a `kbSnapshotIds` array: the list of `knowledgeBase._id` values that were present when extraction ran.
2. In the KPI display query, compare `kbSnapshotIds` against the current `knowledgeBase` table contents. If they differ, show a "Data may be outdated — regenerate?" badge on the KPI cards.
3. Alternatively, trigger a re-extraction action from `knowledgeBase.saveFile` and `knowledgeBase.deleteFile` mutations (via `ctx.scheduler.runAfter`). This is simpler but can cause extraction to run on every document upload, which is expensive.
4. Recommended: manual regeneration + stale-state badge. Keep it simple — the KB does not change hourly.

**Warning signs:**
- KPI cards show data from a document that admin knows was deleted
- After uploading a new document with updated metrics, KPI cards don't change
- No visible indication to admin that KPI data predates the latest document upload

**Phase to address:**
Phase 1 (KB KPI extraction) — define the staleness model before building the cache.

---

### Pitfall 6: Adding Three New Dashboard Sections Creates Layout Congestion and Loading State Race Conditions

**What goes wrong:**
The dashboard already has 9 sections (ExecutiveSnapshot, GrantBudget, GrantTracking, DonationPerformance, ProfitLoss, ClientActivity, ProgramsCoparent, ProgramsLegal, CalendarWidget). Adding a KBI Cards section and an AI Summary Panel brings this to 11. The reorderable dashboard becomes visually dense; the summary panel — which requires an async Convex action, not a simple reactive query — cannot use the existing three-state loading pattern cleanly. The AI summary may take 3–8 seconds to generate on first load. Without proper handling, the dashboard appears frozen or shows a confusing spinner with no progress indication.

**Why it happens:**
The existing dashboard loading pattern (`undefined` = loading, `null` = not-configured, `data` = ready) works because all existing sections use `useQuery` from Convex, which resolves quickly once data is cached. AI summary generation is an async action, not a query — it cannot be polled with `useQuery` alone. If the summary is stored in a Convex table (the right approach), the query returns the cached value immediately, but the UI must also handle "cached but being regenerated" as a fourth state.

**How to avoid:**
1. Store AI summary as a Convex table row with a `status` field: `"idle" | "generating" | "ready" | "failed"`. The `useQuery` for the summary reads the current row including its status. The UI shows the last known summary while `status === "generating"`, with a subtle progress indicator.
2. Prevent more than one generation from running simultaneously: check `status === "generating"` before triggering the action; if already generating, show a "Regenerating..." state, not a second trigger.
3. For new KBI Cards section: add it to the `DashboardSectionId` type and `SECTION_COMPONENTS` map following the existing pattern. Keep it hideable like other sections.
4. Consider placing the AI Summary Panel outside the reorderable section list — it is qualitatively different (AI-generated narrative vs. data visualization) and Kareem may prefer it pinned above the data sections.

**Warning signs:**
- Multiple "Regenerate" clicks trigger multiple parallel OpenAI requests (duplicate cost, race condition in persisted result)
- Dashboard shows spinner indefinitely when summary generation fails (no error state)
- Adding new dashboard section ID breaks TypeScript without updating `DashboardSectionId` union type

**Phase to address:**
Phase 2 (AI summary panel) and Phase 1 (KBI Cards) — design the state model before building the components.

---

### Pitfall 7: OpenAI Assistants File Search Is Not Suitable for Deterministic KPI Extraction

**What goes wrong:**
The existing KB system uses the OpenAI Assistants API with `file_search` for the AI Director chat feature. You reuse this pattern for KPI extraction: create a thread, ask "what is the total number of clients served?", and parse the response. The answer varies on every run even from the same documents. Sometimes it returns a number. Sometimes it returns a narrative. Sometimes it returns a refusal. You cannot reliably parse structured data from Assistants API responses.

**Why it happens:**
The Assistants API with `file_search` is optimized for conversational retrieval — it retrieves relevant chunks and generates a natural-language response. It is not a structured extraction pipeline. The model's response format is not constrained to JSON, the chunk retrieval is non-deterministic (depends on embedding similarity at query time), and the same question may retrieve different chunks on consecutive calls. Structured Outputs (`response_format: { type: "json_schema" }`) is not supported in the Assistants API runs — it is only available in Chat Completions.

**How to avoid:**
Use a separate extraction pipeline from the AI Director: fetch document content directly from Convex storage (already stored as `storageId`), pass the raw text to Chat Completions with `response_format: { type: "json_schema" }`, and extract KPIs deterministically. Keep the Assistants API exclusively for the conversational AI Director feature. Do not mix use cases.

**Warning signs:**
- KPI extraction returns different numbers on back-to-back runs with no document changes
- Extraction response is narrative text instead of parseable JSON
- Extraction succeeds for some documents but fails (refusal) for others with no clear pattern

**Phase to address:**
Phase 1 (KB KPI extraction) — the extraction mechanism must be chosen before implementation begins.

---

### Pitfall 8: DEC's QB Configuration May Be "Nonprofit" Type, Changing P&L Report Naming

**What goes wrong:**
The existing `parsePnlTotals` function looks for rows where `group.includes("income")` and `group.includes("expense")`. If DEC's QuickBooks company type is set to "Nonprofit," QB generates a "Statement of Activity" instead of a "Profit and Loss" report — and the row group labels change. The "Income" section may be labeled "Revenue" or "Support & Revenue," and "Net Income" may become "Change in Net Assets." The existing parser silently returns `totalRevenue: 0` because none of the string matches fire.

**Why it happens:**
QuickBooks Online's nonprofit mode uses nonprofit accounting terminology (Statement of Activity, Support & Revenue, Change in Net Assets) rather than the standard business terminology (P&L, Income, Net Income). The API endpoint is the same (`/reports/ProfitAndLoss`), but the JSON structure's group label strings change. The codebase was written and tested against a standard QB setup, not explicitly against a nonprofit-mode QB account. DEC is a nonprofit — it is plausible their QB is configured this way.

**How to avoid:**
1. Before shipping v1.2: inspect the actual QB P&L JSON structure by logging the raw response from `fetchProfitAndLoss` in the sandbox environment. Confirm the group label strings match what the parser expects.
2. Make the group label matching more permissive: in addition to `"income"`, also match `"revenue"`, `"support"`. For `"netincome"`, also match `"change in net assets"`, `"net assets"`.
3. Add a logged warning when `totalRevenue === 0` after parsing a non-empty P&L response — this indicates a parsing miss.

**Warning signs:**
- `ExecutiveSnapshot` shows `$0` Revenue YTD even when QB has income transactions
- `revenueByCategory` is empty but QB shows income in the P&L when viewed in the QB UI
- The raw QB JSON response contains group labels that don't include the word "income"

**Phase to address:**
Phase 3 (donation charts) — any attempt to extract income account data will hit this before donation-specific parsing even starts. Audit the parser against real QB data first.

---

## Technical Debt Patterns (v1.2 additions)

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing KB extraction results as a single JSON blob in `appSettings` | No schema change needed | No queryability, no per-document provenance, hard to diff | Never for production; use a proper `kbExtraction` table |
| Triggering AI summary generation on every KB document upload | Summary always fresh | Each upload triggers an expensive OpenAI call; cost compounds with frequent uploads | Never acceptable; use manual trigger + staleness badge |
| Hardcoding donation account names (e.g., "Donations") in the parser | Quick to ship | Breaks when QB chart of accounts changes; wrong data with no error | Never acceptable; use admin-configurable account designation |
| Using monthly P&L fetches (12 separate API calls) instead of `summarize_column_by=Month` | Reuses existing fetch logic | 12x QB API load per sync; harder to keep in sync | Acceptable for quick prototype only; replace before launch |

---

## Integration Gotchas (v1.2 additions)

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI Chat Completions + Structured Outputs | Making extracted fields `required` in schema | Make all fields `optional`/nullable; include prompt instruction to return null for absent fields |
| OpenAI Assistants API | Using `file_search` threads for structured KPI extraction | Use Chat Completions with `response_format: json_schema`; keep Assistants API for conversational use only |
| QuickBooks P&L API | Assuming "income" row group labels match across all QB configurations | Test against real DEC QB data; handle nonprofit-mode label variants ("Revenue", "Support & Revenue") |
| QuickBooks P&L API | Trying to get monthly donation totals from a YTD P&L response | Use `summarize_column_by=Month` parameter on `ProfitAndLoss` endpoint for a single multi-column response |
| Convex action vs. query | Using a Convex action for AI summary and polling it with `useQuery` | Store summary in a Convex table with a `status` field; the query reads from the table reactively |

---

## Performance Traps (v1.2 additions)

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sending all KB documents to OpenAI in one extraction call | Works for 3-4 small PDFs; times out for larger KB | Limit total context per call; extract per-document and aggregate results | At ~5+ documents or any document > 50 pages |
| Triggering AI summary on dashboard mount | 3–8 second delay on every page load; OpenAI cost scales with traffic | Cache summary in Convex; only trigger via explicit button or on KB change | From day one — latency is visible immediately |
| Fetching 12 monthly P&L reports sequentially in one Convex action | Sync takes 30–60 seconds; risks Convex action timeout | Use `summarize_column_by=Month` single-call approach | Immediately — sequential API calls are slow |
| Mounting all 11 dashboard sections simultaneously with AI sections | Cold load triggers AI summary generation query; if not cached, shows spinner for the entire dashboard | Separate AI sections into their own Convex queries; use three-state pattern independently | From first deploy |

---

## Security Mistakes (v1.2 additions)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing full client intake data from KB documents to OpenAI for extraction | PII (names, dates of birth, case details) sent to OpenAI API | KB documents used for extraction should be aggregate reports only, not individual intake forms; add a document type tag to `knowledgeBase` and filter |
| Storing extracted KPIs without RBAC | Staff sees impact metrics that may reveal financial benchmarks or program capacity | Gate KBI Cards and AI summary to admin/manager roles (same as QB data) |
| Exposing the `generateSummary` action as a public Convex action | Any user can trigger unlimited OpenAI calls, creating runaway cost | Gate `generateSummary` behind `requireRole(["admin", "manager"])` in the action handler |

---

## UX Pitfalls (v1.2 additions)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| KPI cards showing AI-extracted numbers with no source attribution | Kareem cannot tell if "112 clients served" is real or fabricated | Show document source name and extraction date under each KPI card value |
| "Regenerate Summary" button with no loading state or feedback | Kareem clicks it, nothing visible happens for 5 seconds, clicks again triggering duplicate requests | Disable button during generation; show "Generating..." with spinner; re-enable on completion or error |
| Donation chart showing flat $0 line with no explanation | Looks like a bug when it's actually an account mapping issue | Show "Configure donation accounts →" empty state with admin link when no accounts are designated |
| 11 dashboard sections overwhelming the page | Executive cannot find key information; scroll fatigue | Suggest a default section order that places AI sections (KBI Cards, AI Summary) between ExecutiveSnapshot and GrantBudget; make them easily hideable |

---

## "Looks Done But Isn't" Checklist (v1.2 additions)

- [ ] **KB KPI extraction:** Verify with a real DEC document that extracted values match what is actually written in the document — do not only test with synthetic test documents
- [ ] **KB KPI extraction:** Verify the UI shows provenance (document name + extraction date) alongside each KPI value
- [ ] **AI summary panel:** Verify the "Regenerate" button is disabled while generation is in progress and re-enables on completion or error
- [ ] **AI summary panel:** Verify the panel shows the last known summary while regenerating, not a blank/spinner screen
- [ ] **Donation chart:** Verify the chart handles the case where no donation accounts have been designated (shows helpful empty state, not a broken chart)
- [ ] **Donation chart:** Verify monthly totals actually reflect individual income account filtering, not all income
- [ ] **QB P&L parsing:** Confirm the parser handles DEC's actual QB account labels by logging one real P&L response before building the parser
- [ ] **Cost guard:** Confirm `generateSummary` action is role-gated and cannot be triggered by anonymous or staff-level users

---

## Recovery Strategies (v1.2 additions)

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Extracted KPIs are hallucinated values | MEDIUM | Add source provenance display immediately; switch to `optional` schema fields; add explicit "return null if absent" prompt instruction; re-run extraction |
| AI summary costs spike from auto-triggering | LOW–MEDIUM | Remove auto-trigger from cron or mount; make it manual-only; check OpenAI usage dashboard for extent of overage |
| Donation chart shows wrong income accounts | LOW | Add account designation admin UI to `appSettings`; re-fetch with correct account filter; no data loss, just a config addition |
| Monthly P&L fetch hitting QB rate limits | LOW | Switch from 12 sequential calls to `summarize_column_by=Month` single call; update parser accordingly |
| Generation race condition (duplicate summaries) | LOW | Add `status: "generating"` guard before triggering action; delete duplicate rows in Convex dashboard |

---

## Pitfall-to-Phase Mapping (v1.2)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hallucinated KPI extraction values | Phase 1 (KB KPI extraction) | Run extraction on 3 real DEC documents; manually verify every extracted value against source text |
| Assistants API used for structured extraction | Phase 1 (KB KPI extraction) | Confirm implementation uses Chat Completions + json_schema, not Assistants threads |
| Stale extraction when KB changes | Phase 1 (KB KPI extraction) | Upload a new document; verify KPI stale indicator appears; regenerate; verify values update |
| AI summary cost runaway | Phase 2 (AI summary panel) | Confirm generation is triggered only by explicit button or KB-change event; confirm role gate |
| Generation race condition | Phase 2 (AI summary panel) | Click "Regenerate" 5 times rapidly; confirm only one OpenAI call fires |
| QB no donation entity / wrong account names | Phase 3 (donation charts) | Log real QB P&L JSON; confirm income account names; build admin account designation before chart |
| Monthly breakdown requires separate fetch strategy | Phase 3 (donation charts) | Confirm `summarize_column_by=Month` approach used; verify monthly totals sum to YTD total from existing P&L |
| QB nonprofit-mode label mismatch | Phase 3 (donation charts) | Test parser against real DEC QB response; confirm `totalRevenue > 0` when income exists |
| Dashboard layout congestion | Phase 1 or Phase 2 (whichever adds first new section) | Verify new section IDs added to `DashboardSectionId` type; verify section is hideable; test default section ordering on fresh user prefs |
| PII in extraction payload | Phase 1 (KB KPI extraction) | Confirm only aggregate reports (not intake forms) are used as extraction sources; add document type tagging to KB admin |

---

# v1.0–v1.1 Pitfalls (Preserved)

---

## Critical Pitfalls

### Pitfall 1: Google Calendar Service Account Cannot Access Calendars Without Explicit Sharing

**What goes wrong:**
The service account email is created and the API is enabled, but every calendar list or events API call returns an empty result or a 404. The service account authenticates successfully — it just has no calendars shared with it.

**Why it happens:**
Service accounts are not Google Workspace users. They do not automatically have access to any user's or organization's calendars. Google Calendar's ACL (access control list) model requires explicit sharing. Unlike a personal user who logs in via OAuth and can see their own calendars, a service account's "calendar list" is empty unless calendars have been shared to its email address (`something@project.iam.gserviceaccount.com`). Developers assume authentication = access and skip the sharing step.

**How to avoid:**
For each Google Calendar to integrate (client sessions, board meetings, community events), open Google Calendar settings → "Share with specific people" → add the service account email with "See all event details" permission. Then in code, enumerate the `calendarId` values directly — do not rely on `calendarList.list()` returning them automatically, because sharing a calendar no longer automatically inserts it into the service account's calendar list (confirmed by Google Calendar API docs). Store the calendar IDs explicitly in Convex `appSettings` so they can be configured without code changes.

**Warning signs:**
- `calendar.events.list()` returns 200 but with zero events even when calendars visibly have events
- `calendarList.list()` returns an empty `items` array
- No error thrown — just empty data

**Phase to address:**
Google Calendar integration phase. Must be verified before any event rendering code is written.

---

### Pitfall 2: Dashboard "undefined" vs "null" Conflation Breaks Empty States

**What goes wrong:**
Dashboard KPI cards and charts appear blank with no explanation — not loading spinners, not empty state messages — because components treat `undefined` (still loading) and `null` (QB not connected / no data) identically, or handle neither and render broken values like `"--"` or `NaN`.

**Why it happens:**
Convex `useQuery` returns `undefined` while the query is in-flight and the actual query result (including `null`) once resolved. Components that don't explicitly branch on `undefined` vs `null` skip the loading spinner and jump straight to a broken render. In this codebase, `ExecutiveSnapshot` correctly checks `=== undefined` for loading, but components like `ProfitLoss` receive `null` from `getProfitAndLoss` when QB is not connected and must handle that separately. The real issue is that `quickbooksCache` can be empty (QB never synced) vs. the QB connection existing but the cache being stale — these produce the same `null` return but have different root causes and should show different messages.

**How to avoid:**
For every dashboard component, implement the three-state pattern explicitly:
1. `data === undefined` → show spinner (Convex loading)
2. `data === null` → show integration "not connected" empty state with action button
3. `data.someField` being falsy → show data-specific empty state

The existing `ProfitLoss.tsx` does this correctly — use it as the template for any new dashboard sections. Never let a component silently render `$0` or `--` when the real state is "data not yet available."

**Warning signs:**
- KPI cards show `$0` or `--` when QB is connected and has data
- Charts render empty canvases rather than loading spinners
- Console warnings about rendering `NaN` or `undefined` values

**Phase to address:**
Dashboard data population fix phase.

---

### Pitfall 3: QuickBooks OAuth Refresh Token Rotation — Storing the Old Token

**What goes wrong:**
QB cron syncs work for ~100 days then permanently fail with `invalid_grant`. All QB-dependent dashboard data stops populating. The Convex logs show repeated token refresh failures, but the dashboard just shows stale data silently.

**Why it happens:**
QuickBooks OAuth 2.0 uses rotating refresh tokens: every successful refresh returns a new refresh token that invalidates the old one. The current `quickbooks.ts` `saveTokens` mutation stores the new token on initial OAuth connect, but the `quickbooksActions.ts` refresh logic must also persist the new refresh token returned on every sync. If the refresh succeeds but the new token is not written back to `quickbooksConfig`, the next sync attempts to use the already-rotated (now invalid) old token. Intuit's 2025 policy update introduced explicit expiry timestamps on refresh tokens, making this failure faster to hit.

**How to avoid:**
In `quickbooksActions.ts`, whenever a token refresh is performed, immediately call a mutation to update both `accessToken` and `refreshToken` in the `quickbooksConfig` table with the new values returned by the Intuit token endpoint. Treat refresh token updates as atomic — if the write fails, treat the sync as failed, do not proceed with stale tokens. Add a `tokenRefreshedAt` field to the config table to surface token age in the admin UI.

**Warning signs:**
- QB sync cron logs show 401 or `invalid_grant` errors
- Dashboard data freezes at a specific date (last successful sync before token invalidation)
- `quickbooksConfig.tokenExpiry` is in the past

**Phase to address:**
Dashboard data population fix phase (audit existing token refresh logic before adding new features).

---

### Pitfall 4: Convex Cron Failures Are Silent — Dashboard Data Goes Stale Without Alerting Anyone

**What goes wrong:**
The QB sync cron (15 min) or Sheets sync cron (30 min) fails silently — throws an error that's logged to Convex's internal logs but not surfaced anywhere in the dashboard. The Executive Director sees data that is hours or days old with no indication anything is wrong.

**Why it happens:**
The current `crons.ts` wraps sync actions in try-catch at the action level but has no alerting mechanism. Convex does log cron failures to the dashboard logs view, but that requires someone to actively check the Convex dashboard. There is no `lastSyncAt` surface in the UI for the QB integration (only for Sheets config), and no distinction between "syncing now" and "last synced 6 hours ago."

**How to avoid:**
Add `lastSyncSucceededAt` and `lastSyncError` fields to `quickbooksConfig`. Update them on every cron run (success or failure). Surface this in the dashboard admin panel and as an alert condition: if `lastSyncSucceededAt` is more than 2x the cron interval ago, show a warning banner in the relevant dashboard sections. This also enables the "proactive alerts" feature to detect stale data as an alert condition.

**Warning signs:**
- `fetchedAt` on cached QB data is hours old even though the cron runs every 15 min
- Convex logs show repeated action failures with no auto-recovery

**Phase to address:**
Dashboard data population fix + proactive alerts phase.

---

### Pitfall 5: Newsletter HTML Exceeds Constant Contact's 400 KB Limit on Complex Newsletters

**What goes wrong:**
A newsletter with all sections filled in (welcome message, milestones, testimonials, community events, partnerships, stats, volunteer box, social section) fails to send via Constant Contact's API. The error is generic ("campaign activity could not be saved") and does not mention the file size constraint.

**Why it happens:**
The `buildNewsletterHtml` in `newsletterTemplate.ts` generates a fully inline-styled table-based HTML email. With all 19 sections populated, the generated HTML plus the OpenAI-polished version can approach or exceed the 400 KB limit enforced by Constant Contact's custom code email endpoint. Additionally, the `generatedEmailHtml` column stores the full HTML string in Convex — very large newsletters can hit Convex's per-document size limits (1 MB per document maximum, but practically slower queries at >100 KB).

**How to avoid:**
Add a byte-length check before saving generated HTML to Convex and before sending to CC. If size exceeds 380 KB (a safe margin below the 400 KB limit), warn the user to shorten sections. Remove HTML comments from the generated output (the template has numerous `<!-- Section Name -->` comments that add size without value in production). Confirm the `[[trackingImage]]` tag is included in the generated HTML for accurate open rate tracking (currently missing from the template).

**Warning signs:**
- Large newsletters fail to save as CC campaign activities
- Constant Contact API returns 400 or 500 on campaign activity creation with full-content newsletters
- `generatedEmailHtml` stored in Convex is visibly very large (inspect in Convex dashboard)

**Phase to address:**
Newsletter template fix phase.

---

### Pitfall 6: Google Calendar Timezone Handling — Events Display at Wrong Times

**What goes wrong:**
Calendar events fetched from the Google Calendar API display in the wrong timezone on the dashboard. A 9 AM board meeting in the organization's local timezone (Pacific/Eastern) shows as 4 PM or 2 PM depending on UTC offset.

**Why it happens:**
Google Calendar API returns event `start.dateTime` as an ISO 8601 string with the event's original timezone offset (e.g., `2026-03-15T09:00:00-08:00`). When this is parsed with `new Date()` in JavaScript and displayed with `.toLocaleTimeString()` without a locale/timezone argument, it renders in the user's browser timezone — which may match, or may not. The deeper issue is that the Convex action fetching events converts the datetime to a Unix timestamp for storage, discarding timezone metadata. When the frontend renders the timestamp, there's no stored timezone to reference.

**How to avoid:**
Store event times as ISO 8601 strings with their original timezone offset rather than converting to Unix timestamps. Alternatively, store both the Unix timestamp and the `timeZone` field from the calendar event's `start` object. In the frontend, render event times using `toLocaleString('en-US', { timeZone: org_timezone })` where `org_timezone` is a stored org preference (e.g., `"America/Los_Angeles"`). Add an org timezone setting to `appSettings` during the calendar integration phase.

**Warning signs:**
- Displayed event times are off by exactly N hours (UTC offset)
- All-day events show as starting the day before (date boundary issue when converting to timestamps)

**Phase to address:**
Google Calendar integration phase — must handle timezone in the data model from the start; retrofitting is painful.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing QB raw JSON blobs in `quickbooksCache.data` as strings | Avoids schema changes per QB report format | No type safety; JSON.parse errors crash silently; querying data requires parsing in every query function | Acceptable for v1 caching layer; never for primary data |
| Using `grantsCache` (Sheets) and `grants` (Excel) as parallel tables without sync logic | Simpler implementation | Dashboard can show contradictory data from two sources; no single source of truth | Acceptable until a real sync strategy is designed |
| Hardcoded calendar IDs in code (if implemented this way) | Faster to ship | Cannot change calendars without a deployment; breaks when org restructures calendars | Never acceptable; use `appSettings` table instead |
| Alert thresholds hardcoded in queries | Simpler MVP | Cannot tune alerts without deployment; admin cannot configure sensitivity | Acceptable in phase 1; move to `appSettings` by phase 2 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Calendar API | Using `calendarList.list()` expecting to see shared calendars | Explicitly share each calendar to the service account email; store calendar IDs in `appSettings`; call `events.list()` with stored `calendarId` values |
| Google Calendar API | Fetching `maxResults` default (250) without pagination for active orgs | Always pass `maxResults` explicitly (250 is fine for this org scale); implement `pageToken` loop for completeness |
| Constant Contact newsletter | Missing `[[trackingImage]]` tag in generated HTML | Add `[[trackingImage]]` to the `<body>` of `buildNewsletterHtml` before the closing tag; CC needs this for open tracking |
| Constant Contact newsletter | Re-using a campaign activity ID without checking its current state | Before reusing `campaignActivityId`, check if the campaign was already sent — sent campaigns cannot be resent, only duplicated |
| QuickBooks token refresh | Not persisting the new refresh token returned by Intuit after each refresh | After every `refreshToken()` call, immediately run `ctx.runMutation` to write the new tokens back to `quickbooksConfig` |
| Google Sheets sync | Hardcoded column index offsets (e.g., `row[8]` for session count) | Document which sheet column maps to which field; if the sheet structure changes, all sync breaks silently |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all calendar events on every dashboard load | Dashboard slow to load; Convex action budget consumed quickly | Cache events in a Convex table with TTL (e.g., 30 min cron like Sheets); never fetch from Google directly on page load | Immediately — the Google Calendar API adds 200-800ms latency per call |
| Rendering all grant events in a single calendar widget with no date filtering | Calendar widget shows hundreds of events; UI hangs | Limit to upcoming 30-60 days by default; paginate | At ~50+ active grants with quarterly report deadlines |
| Dashboard renders all 7 sections simultaneously on load | Initial load triggers 7 parallel Convex query subscriptions | Already handled by section visibility; ensure hidden sections do not mount their components | Currently fine; becomes an issue if sections are always mounted regardless of visibility |
| QB P&L parser iterating nested row structure with any[] types | Type errors surface in production but not development | Add explicit type definitions for the QB report shape; use Zod for parse validation | At the first QB report format change |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Google service account private key in `appSettings` table (Convex DB) | Private key readable by any user who can query `appSettings`; DB breach exposes key | Keep the private key in Convex environment variables (`GOOGLE_PRIVATE_KEY`) — this is already the correct pattern in the codebase; never move it to the DB |
| Exposing calendar event attendee email addresses on the dashboard | Exposes client PII to any authenticated user regardless of role | Filter attendee data server-side in the Convex query; return only event summary, date/time, and calendar type — not attendee lists |
| Alert notifications revealing sensitive financial thresholds to all roles | Staff/readonly users seeing budget anomaly alerts that reveal QB data they shouldn't access | Gate alert data on the same RBAC rules as the underlying data; alerts about QB data visible only to admin/manager |
| Using `calendarId: "primary"` with domain-wide delegation | With domain-wide delegation enabled, this accesses the service account's own "primary" calendar (empty) — not the intended calendar | Always use explicit calendar IDs from the sharing approach; do not use domain-wide delegation unless Google Workspace admin access is available |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing an alert for every grant with a report due in the next 90 days | Executive sees 15 alerts every day; alert fatigue sets in immediately | Tier alerts: "Due within 7 days" = red urgent; "Due within 30 days" = yellow warning; "Due 31-90 days" = informational or hidden by default |
| Calendar widget showing raw Google Calendar event titles (internal naming conventions) | Executive sees "CONF-2026-Q1-Legal-Review" instead of "Legal Case Review" | Normalize event display names; allow renaming at the calendar category level |
| Newsletter preview showing the raw AI-polished HTML with placeholder artifacts | Executive sees `[RECENT_MILESTONE_2]` strings in the preview | Validate that all placeholder patterns are removed before saving `generatedEmailHtml`; the current OpenAI prompt does this but needs a post-process regex check as a safety net |
| Dashboard data showing "Last synced: 3 hours ago" with no action to refresh | Executive cannot tell if data is stale due to a bug or expected timing | Add a manual "Sync Now" button next to the last-synced timestamp; already exists for Sheets but not consistently for QB-dependent sections |

---

## "Looks Done But Isn't" Checklist

- [ ] **Google Calendar integration:** Verify events actually appear — calendars must be explicitly shared with the service account email before any code works; test with a real calendar, not a mocked response
- [ ] **Dashboard KPI cards:** Verify cards show real values, not `"--"`, after QB sync — check that `quickbooksCache` actually has data by inspecting the Convex dashboard data tab
- [ ] **Newsletter template:** Verify `[[trackingImage]]` is present in generated HTML (required by Constant Contact for open tracking); confirm the 400 KB limit is not exceeded with a fully-populated newsletter
- [ ] **Proactive alerts:** Verify alerts do not fire for already-resolved conditions on every page load — alerts need a "dismissed" or "acknowledged" state to avoid repeating
- [ ] **Calendar timezone display:** Verify a test event at 9 AM Pacific shows as 9 AM (not 5 PM UTC) for a user in Pacific timezone
- [ ] **Constant Contact campaign reuse:** Verify that calling send newsletter a second time creates a new send activity rather than trying to resend an already-sent campaign

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| QB refresh token rotated but not stored (all QB data stale) | MEDIUM | Delete `quickbooksConfig` record in Convex dashboard → have admin re-authorize QB OAuth → wait for next 15-min cron |
| Calendar service account not shared with calendars (zero events) | LOW | Share each Google Calendar with service account email → next cron sync will populate events |
| Newsletter HTML too large sent to CC (fails silently) | LOW | Edit newsletter sections to reduce content → regenerate HTML → retry send |
| Alert fatigue causing executive to ignore dashboard | HIGH | Requires full alert redesign: tiered severity, dismiss/acknowledge UI, configurable thresholds — prevent this at design phase |
| Dashboard sections showing wrong data due to `null`/`undefined` confusion | MEDIUM | Component-by-component audit against the three-state pattern (undefined/null/data); test with QB disconnected, then connected with empty cache, then connected with data |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Calendar service account not shared with calendars | Google Calendar integration | Manually create a test event in the shared calendar; verify it appears in the Convex-cached events list |
| Dashboard undefined/null state confusion | Dashboard data population fix | Test all 7 dashboard sections with QB disconnected, with QB connected but no cache, with QB connected and synced |
| QB refresh token not persisted after rotation | Dashboard data population fix | Inspect `quickbooksActions.ts` token refresh logic; confirm new tokens are written back; check `tokenExpiry` advances after a sync |
| Silent cron failures with stale data | Dashboard data population fix + proactive alerts | Add `lastSyncSucceededAt` tracking; verify the admin page surfaces sync health |
| Newsletter 400 KB limit exceeded | Newsletter template fix | Test full newsletter generation with all 19 fields populated; measure `generatedEmailHtml.length` before sending |
| Timezone display errors in calendar | Google Calendar integration | Test with a calendar event explicitly at 9:00 AM in local org timezone; verify display matches |
| Alert fatigue from ungated notifications | Proactive alerts phase | Design alert severity tiers before building any alert UI; require ED sign-off on threshold values |

---

## Sources

**v1.2 Intelligence sources:**
- OpenAI Structured Outputs hallucination behavior: [https://platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs)
- Structured outputs schema enforcement and hallucination risks: [https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/best-practices-for-structured-extraction-from-documents-using-azure-openai/4397282](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/best-practices-for-structured-extraction-from-documents-using-azure-openai/4397282)
- OpenAI Assistants file_search instability and production challenges: [https://community.openai.com/t/breaking-changes-in-openai-api-responses-v2-vector-store-file-search-instability/1354202](https://community.openai.com/t/breaking-changes-in-openai-api-responses-v2-vector-store-file-search-instability/1354202)
- RAG hallucination mitigation 2025: [https://community.openai.com/t/mitigating-hallucinations-in-rag-a-2025-review/1362063](https://community.openai.com/t/mitigating-hallucinations-in-rag-a-2025-review/1362063)
- AI token cost management and rate limiting: [https://skywork.ai/blog/ai-api-cost-throughput-pricing-token-math-budgets-2025/](https://skywork.ai/blog/ai-api-cost-throughput-pricing-token-math-budgets-2025/)
- QuickBooks API limitations: [https://satvasolutions.com/blog/top-5-quickbooks-api-limitations-to-know-before-developing-qbo-app](https://satvasolutions.com/blog/top-5-quickbooks-api-limitations-to-know-before-developing-qbo-app)
- QuickBooks nonprofit reporting terminology (Statement of Activity): [https://www.dancingnumbers.com/run-profit-and-loss-report-in-quickbooks-online/](https://www.dancingnumbers.com/run-profit-and-loss-report-in-quickbooks-online/)
- QuickBooks P&L API structure and chart building challenges: [https://blog.synchub.io/articles/building-meaningful-charts-using-quickbooks-reporting-api](https://blog.synchub.io/articles/building-meaningful-charts-using-quickbooks-reporting-api)
- Convex action cache and invalidation strategy: [https://stack.convex.dev/caching-in](https://stack.convex.dev/caching-in)
- React dashboard performance and lazy loading pitfalls: [https://www.bootstrapdash.com/blog/react-dashboard-performance](https://www.bootstrapdash.com/blog/react-dashboard-performance)
- Nonprofit AI data privacy considerations: [https://nationbuilder.com/responsible-ai-guide-nonprofits-2025](https://nationbuilder.com/responsible-ai-guide-nonprofits-2025)
- Direct codebase inspection: `convex/knowledgeBase.ts`, `convex/knowledgeBaseActions.ts`, `convex/aiDirectorActions.ts`, `convex/quickbooks.ts`, `convex/quickbooksActions.ts`, `src/components/dashboard/DonationPerformance.tsx`, `src/components/dashboard/ExecutiveSnapshot.tsx`, `convex/schema.ts`, `convex/crons.ts`

**v1.0–v1.1 sources:**
- Google Calendar API sharing concepts: [https://developers.google.com/workspace/calendar/api/concepts/sharing](https://developers.google.com/workspace/calendar/api/concepts/sharing)
- Service account calendar access pattern: [https://medium.com/iceapple-tech-talks/integration-with-google-calendar-api-using-service-account-1471e6e102c8](https://medium.com/iceapple-tech-talks/integration-with-google-calendar-api-using-service-account-1471e6e102c8)
- Constant Contact custom code email design guidelines: [https://developer.constantcontact.com/api_guide/design_code_emails.html](https://developer.constantcontact.com/api_guide/design_code_emails.html)
- QuickBooks refresh token rotation: [https://nango.dev/blog/quickbooks-oauth-refresh-token-invalid-grant](https://nango.dev/blog/quickbooks-oauth-refresh-token-invalid-grant)
- Convex `useQuery` undefined vs null patterns: [https://docs.convex.dev/client/react](https://docs.convex.dev/client/react)
- Convex cron job error handling: [https://docs.convex.dev/scheduling/cron-jobs](https://docs.convex.dev/scheduling/cron-jobs)

---
*Pitfalls research for: DEC DASH 2.0 — v1.2 Intelligence milestone (KB KPI extraction + AI summary + donation charts)*
*Updated: 2026-03-01*
