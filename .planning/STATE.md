---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Analytics
status: ready_to_plan
last_updated: "2026-03-01"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 10
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** Phase 11 — Analytics Foundation + Dashboard Cards

## Current Position

Phase: 11 of 15 (Analytics Foundation + Dashboard Cards)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-03-01 — v1.3 roadmap created, 5 phases mapped, ready to plan Phase 11

Progress: [░░░░░░░░░░] 0% (v1.3)

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v1.3)
- Average duration: —
- Total execution time: —

## Accumulated Context

### Decisions

Carried from v1.2:
- getProgramDemographics() already exists in convex/googleSheets.ts — Demographics tab is mostly frontend
- Sessions table exists but needs aggregate queries; clientGoals needs getStats(); coparentIntake needs getStats()
- Audit log analytics query needed; allocation stats query exists but needs historical acceptance-rate view
- QB income account names unknown — admin designation UI is prerequisite for DON charts
- Phase 10 (Donation) deferred from v1.2 → now Phase 15 in v1.3

### Pending Todos

- Run npx convex dev --once to deploy any schema changes from v1.2 before starting v1.3
- Deploy v1.2 to production if not yet done
- Validate ROLE_NAV_MAP in constants.ts to confirm which roles get /analytics link (admin, manager, staff — not lawyer, psychologist, readonly)

### Blockers/Concerns

- QB monthly income JSON column shape needs validation before Phase 15 (DON charts)
- npx convex dev --once must be run interactively — schema deploys cannot be automated in CI

## Session Continuity

Last session: 2026-03-01
Stopped at: v1.3 roadmap created — 5 phases (11-15), 22 requirements mapped, 100% coverage
Resume file: None
