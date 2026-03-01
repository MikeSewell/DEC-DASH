# Roadmap: DEC DASH 2.0

## Milestones

- ✅ **v1.0 Command Center** — Phases 1-4 (shipped 2026-02-28)
- ✅ **v1.1 Polish** — Phases 5-7 (shipped 2026-02-28)
- 🚧 **v1.2 Intelligence** — Phases 8-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 Command Center (Phases 1-4) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Newsletter Template Fix (2/2 plans) — completed 2026-02-28
- [x] Phase 2: Dashboard Data Population (4/4 plans) — completed 2026-02-28
- [x] Phase 3: Google Calendar Integration (3/3 plans) — completed 2026-02-28
- [x] Phase 4: Proactive Alerts Panel (2/2 plans) — completed 2026-02-28

Full details: `milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Polish (Phases 5-7) — SHIPPED 2026-02-28</summary>

- [x] Phase 5: Dashboard KPI Trends (1/1 plans) — completed 2026-02-28
- [x] Phase 6: Calendar Enhancements (1/1 plans) — completed 2026-02-28
- [x] Phase 7: Alert Configuration & Persistence (2/2 plans) — completed 2026-02-28

Full details: `milestones/v1.1-ROADMAP.md`

</details>

### 🚧 v1.2 Intelligence (In Progress)

**Milestone Goal:** Surface knowledge base data and donation trends directly on the dashboard — AI-extracted KPIs, auto-generated summaries, and QB income visualizations.

- [x] **Phase 8: KB KPI Extraction** — Schema, Chat Completions extraction action, and KPI stat cards on dashboard (completed 2026-03-01)
- [ ] **Phase 9: AI Summary Panel** — Assistants API narrative summary with manual regeneration and status indicators
- [ ] **Phase 10: Donation Performance Charts** — QB monthly income trend chart with account breakdown and admin designation UI

## Phase Details

### Phase 8: KB KPI Extraction
**Goal**: Kareem can see real organizational metrics extracted from KB documents as stat cards on the dashboard
**Depends on**: Nothing (independent of prior v1.2 work; schema deploy required first)
**Requirements**: KB-01, KB-02, KB-03, KB-04
**Success Criteria** (what must be TRUE):
  1. Admin can trigger KB metric extraction and new stat cards appear on the dashboard showing real values from uploaded documents
  2. Each KPI card displays the source document name and extraction timestamp so Kareem can verify data provenance
  3. When a document does not contain a specific metric, the card shows a null/empty state rather than a fabricated value
  4. Extracted KPI values persist in the Convex kbSummaryCache table and load reactively without re-triggering extraction on every page visit
**Plans**: TBD

Plans:
- [x] 08-01: kbSummaryCache schema + kbInsights.ts backend (queries/mutations) + kbInsightsActions.ts (Chat Completions extraction)
- [ ] 08-02: KBInsights.tsx dashboard component (KPI stat cards + extraction trigger + staleness detection) + dashboard registration

### Phase 9: AI Summary Panel
**Goal**: Kareem can read a 3-5 bullet AI-generated summary of organizational highlights from KB documents, with manual refresh on demand
**Depends on**: Phase 8 (shares kbSummaryCache table and kbInsightsActions.ts file)
**Requirements**: SUM-01, SUM-02, SUM-03, SUM-04
**Success Criteria** (what must be TRUE):
  1. Admin or manager can click Regenerate and a fresh 3-5 bullet summary from KB documents appears on the dashboard
  2. The Regenerate button is disabled during generation and role-gated so staff/readonly roles cannot trigger costly API calls
  3. A "Generated X ago" timestamp and status indicator (idle/generating/ready/failed) is visible at all times
  4. The previous summary remains visible while a new one is being generated — the panel never shows a blank screen mid-refresh
**Plans**: TBD

Plans:
- [ ] 09-01: Assistants API summary action + SUM cache path in kbInsightsActions.ts + kbInsights.ts summary CRUD
- [ ] 09-02: KBInsights.tsx summary panel section (bullets, Regenerate button, status indicator, stale-data display)

### Phase 10: Donation Performance Charts
**Goal**: Kareem can see real QB income trends and breakdowns on the dashboard instead of an always-empty donation chart
**Depends on**: Nothing (independent of Phases 8-9; uses separate QB data path)
**Requirements**: DON-01, DON-02, DON-03, DON-04
**Success Criteria** (what must be TRUE):
  1. DonationPerformance.tsx displays a populated line chart showing 12 months of QB income data instead of a blank empty state
  2. The chart breaks down income by QB account category (grants, program fees, contributions, etc.) showing which sources contribute each month
  3. Admin can open the admin settings and designate which QB income accounts represent donation/income categories, and the chart reflects that designation
  4. When no accounts have been designated, the chart shows a clear "Configure donation accounts in Admin" prompt rather than a broken or empty chart
**Plans**: TBD

Plans:
- [ ] 10-01: fetchIncomeTrend QB action (summarize_column_by=Month) + getIncomeTrend Convex query + admin account designation UI in appSettings
- [ ] 10-02: DonationPerformance.tsx data source swap (useIncomeTrend hook) + income breakdown chart rendering + empty/unconfigured states

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Newsletter Template Fix | v1.0 | 2/2 | Complete | 2026-02-28 |
| 2. Dashboard Data Population | v1.0 | 4/4 | Complete | 2026-02-28 |
| 3. Google Calendar Integration | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Proactive Alerts Panel | v1.0 | 2/2 | Complete | 2026-02-28 |
| 5. Dashboard KPI Trends | v1.1 | 1/1 | Complete | 2026-02-28 |
| 6. Calendar Enhancements | v1.1 | 1/1 | Complete | 2026-02-28 |
| 7. Alert Configuration & Persistence | v1.1 | 2/2 | Complete | 2026-02-28 |
| 8. KB KPI Extraction | 2/2 | Complete   | 2026-03-01 | - |
| 9. AI Summary Panel | v1.2 | 0/2 | Not started | - |
| 10. Donation Performance Charts | v1.2 | 0/2 | Not started | - |
