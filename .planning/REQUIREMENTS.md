# Requirements: DEC DASH 2.0

**Defined:** 2026-03-01
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v1.2 Requirements

Requirements for v1.2 Intelligence milestone. Each maps to roadmap phases.

### KB Extraction

- [x] **KB-01**: Admin can trigger extraction of organizational metrics (client counts, program stats, impact numbers) from KB documents via Chat Completions with json_schema
- [ ] **KB-02**: Extracted KPI values display as dashboard stat cards with the source document name and extraction timestamp
- [x] **KB-03**: All extraction schema fields are nullable — returns null when a metric is not explicitly found in documents (no hallucinated values)
- [x] **KB-04**: Extraction results are cached in Convex kbSummaryCache table and served reactively to the dashboard

### AI Summary

- [ ] **SUM-01**: Admin/manager can generate a 3-5 bullet organizational summary from KB documents via the Assistants API file_search
- [ ] **SUM-02**: Manual Regenerate button triggers summary refresh, gated to admin/manager roles
- [ ] **SUM-03**: Generation status indicator shows current state (idle/generating/ready/failed) with "Generated X ago" timestamp
- [ ] **SUM-04**: Stale cached summary remains visible during regeneration (no blank screen)

### Donation Charts

- [ ] **DON-01**: Monthly income trend chart displays 12-month QB income data via summarize_column_by=Month single API call
- [ ] **DON-02**: Income breakdown shows revenue by QB account category (grants, program fees, contributions, etc.)
- [ ] **DON-03**: Admin can designate which QB income accounts represent donation/income categories via admin settings
- [ ] **DON-04**: DonationPerformance.tsx reads real QB monthly income data instead of always-null getDonations query

## Future Requirements

### KB Intelligence Enhancements

- **KB-05**: Staleness badge when KB documents change since last extraction
- **KB-06**: Automated KB re-extraction on document upload
- **KB-07**: Configurable extraction fields via admin UI
- **KB-08**: KB summary history with compare-over-time

### Donation Enhancements

- **DON-05**: Multi-month income forecast/projection
- **DON-06**: Scheduled weekly summary emails

## Out of Scope

| Feature | Reason |
|---------|--------|
| Streaming KB summary generation | Convex actions do not support streaming to client; 5-30 second extraction time acceptable with spinner |
| Per-card AI narrative explanations | Adds cost per card; AI Director chat already handles "explain this" queries |
| PayPal/GoFundMe integration for donation data | Out of scope per PROJECT.md; QB income accounts capture donation totals |
| Automated summary on dashboard load | Cost runaway risk ($0.50-$1.00/call at gpt-4o rates); manual trigger is safer |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KB-01 | Phase 8 | Complete |
| KB-02 | Phase 8 | Pending |
| KB-03 | Phase 8 | Complete |
| KB-04 | Phase 8 | Complete |
| SUM-01 | Phase 9 | Pending |
| SUM-02 | Phase 9 | Pending |
| SUM-03 | Phase 9 | Pending |
| SUM-04 | Phase 9 | Pending |
| DON-01 | Phase 10 | Pending |
| DON-02 | Phase 10 | Pending |
| DON-03 | Phase 10 | Pending |
| DON-04 | Phase 10 | Pending |

**Coverage:**
- v1.2 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap creation*
