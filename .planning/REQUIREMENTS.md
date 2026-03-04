# Requirements: DEC DASH 2.0

**Defined:** 2026-03-04
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v3.1 Requirements

Requirements for Grant Budget Restoration. Each maps to roadmap phases.

### QB Budget Data

- [ ] **BGTD-01**: System fetches active Budget entities from QB using existing OAuth connection
- [ ] **BGTD-02**: System fetches active Classes from QB to map budgets to grant programs
- [ ] **BGTD-03**: System fetches BudgetVsActuals report per budget/class combination
- [ ] **BGTD-04**: System parses report data into revenue, expenses, net revenue, and account-level line items
- [ ] **BGTD-05**: Parsed budget vs actuals data is cached in a Convex table
- [ ] **BGTD-06**: Budget data syncs on cron with existing QB 15-min cycle

### Grant Budget UI

- [ ] **BGUI-01**: User sees 4 summary cards: Total Revenue (actual vs budget), Total Expenses (actual vs budget), Budget Remaining ($+%), Overall Burn Rate
- [ ] **BGUI-02**: User can toggle between Table View and Chart View
- [ ] **BGUI-03**: Table View shows per-grant rows with Budget, Actual, Remaining, % Spent progress bar, and status badge (On Track / Caution / Over Budget)
- [ ] **BGUI-04**: Chart View shows expense distribution pie chart, budget vs actual horizontal bar chart, and individual grant cards with mini pie charts
- [ ] **BGUI-05**: User can click any grant to open a detail modal with account-level line-item breakdown and expense distribution pie chart
- [ ] **BGUI-06**: Grant Budget section adapts to dark/light theme using existing useChartConfig pattern

## Future Requirements

(None — focused milestone)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Two-way budget editing in QB | Read-only sync sufficient; budget management stays in QB |
| Revenue-only budget view | Old app filtered revenue out of grant budgets; expenses are what matters for burn tracking |
| Budget forecasting/projections | Not in old design; defer to future milestone |
| Budget alerts (over-budget notifications) | Existing alerts panel already has budget variance alerts |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BGTD-01 | — | Pending |
| BGTD-02 | — | Pending |
| BGTD-03 | — | Pending |
| BGTD-04 | — | Pending |
| BGTD-05 | — | Pending |
| BGTD-06 | — | Pending |
| BGUI-01 | — | Pending |
| BGUI-02 | — | Pending |
| BGUI-03 | — | Pending |
| BGUI-04 | — | Pending |
| BGUI-05 | — | Pending |
| BGUI-06 | — | Pending |

**Coverage:**
- v3.1 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12 ⚠️

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after initial definition*
