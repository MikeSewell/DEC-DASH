---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Intelligence
status: in_progress
last_updated: "2026-03-01T02:15:00Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 6
  completed_plans: 1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** v1.2 Intelligence — Phase 8: KB KPI Extraction

## Current Position

Phase: 8 of 10 (KB KPI Extraction)
Plan: 1 of 2 in current phase (08-01 complete — kbSummaryCache schema deployed, kbInsights.ts + kbInsightsActions.ts live)
Status: In progress — ready for 08-02 frontend dashboard
Last activity: 2026-03-01 — 08-01 complete (schema deployed, all 3 tasks committed)

Progress: [#░░░░░░░░░] 17% (1/6 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 1 (v1.2)
- Average duration: 20 min
- Total execution time: 20 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 8. KB KPI Extraction | 1/2 | 20 min | 20 min |
| 9. AI Summary Panel | 0/2 | — | — |
| 10. Donation Performance Charts | 0/2 | — | — |

*Updated after each plan completion*

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 08 P01 | 20 min | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Archived to PROJECT.md Key Decisions table.
Key decisions affecting v1.2:
- KB extraction must use Chat Completions with json_schema (NOT Assistants API file_search — non-deterministic, no structured output)
- All KPI schema fields nullable — returns null when metric not found (prevents hallucination)
- AI summary uses manual Regenerate only — no auto-trigger on load (cost runaway risk $0.50-$1.00/call)
- QB income designation admin UI required before donation chart (account names are org-specific, can't hardcode)

From 08-01 execution:
- Convex uses v.null() not v.null_() — this version's API differs from plan spec; auto-fixed during Task 1
- kbSummaryCache singleton table uses no index (queried with .first(), like quickbooksConfig pattern)
- conflictValue/conflictDocument are v.optional(v.string()) in Convex but type: ["string", "null"] in KPI_SCHEMA (OpenAI strict mode requires all fields in required array)
- [Phase 08]: v.null() not v.null_() — Convex current API uses v.null() for nullable validators; plan spec was incorrect
- [Phase 08]: conflictValue/conflictDocument: v.optional(v.string()) in Convex schema but type: [string,null] in KPI_SCHEMA — OpenAI strict mode requires all fields in required array

### Pending Todos

- Execute 08-02 frontend dashboard (wires getCache + extractMetrics to KB KPI panel)
- Validate real QB P&L JSON shape (summarize_column_by=Month) before writing income parser in Phase 10-01
- Deploy to production after milestone: npm run build + rsync + pm2 restart

### Blockers/Concerns

- QB monthly P&L JSON column shape confirmed via community sources but not validated against DEC's QB config — must inspect one real API response before writing parser (Phase 10-01)
- DEC's QB income account names are unknown — admin designation UI (Phase 10-01) is required prerequisite before chart shows real data
- npx convex dev --once fails in non-interactive terminal — schema deploys must be run by user interactively

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 08-01-PLAN.md — kbSummaryCache schema + kbInsights.ts + kbInsightsActions.ts deployed to Convex
Resume file: None
