---
created: 2026-03-01T05:22:54.982Z
title: Unify Google OAuth and fix program data pipeline
area: auth
files:
  - convex/googleSheets.ts
  - convex/googleCalendar.ts
  - convex/analytics.ts
  - convex/kbInsightsActions.ts
  - src/components/analytics/DemographicsTab.tsx
  - src/components/dashboard/ProgramsLegal.tsx
  - src/components/dashboard/ProgramsCoparent.tsx
---

## Problem

Three related architectural issues prevent the dashboard from showing live program data:

**1. Fragmented Google OAuth:** Google Calendar and Google Sheets use separate OAuth configurations. Calendar has its own OAuth flow (`googleCalendar.ts`), and Sheets has a separate config singleton (`sheetsConfig`). The user must configure each independently in Admin. These should share one Google OAuth token — a single "Connect Google" flow that requests both Calendar and Sheets scopes.

**2. Program data gated behind Sheets:** The Programs sections (Co-Parent, Legal) and the Demographics tab all depend on `programDataCache`, which only populates via a Sheets sync cron (every 30 min). But the data already exists in KB documents — the Phase 8 KB KPI Extraction pipeline (`kbInsightsActions.ts`) proves structured data can be extracted from KB docs via OpenAI. Demographics data should have a fallback or primary source from KB, not just Sheets.

**3. Single-sheet limitation:** The current `sheetsConfig` is a global singleton (`.first()`) — only one spreadsheet ID can be configured. This is too rigid for an org that may have program data across multiple sheets or tabs.

Dashboard screenshot (2026-03-01) confirms: Programs Co-Parent and Programs Legal both show "Connect Google Sheets to view this data" while Calendar shows "No calendars configured" — despite Google OAuth being available for Calendar.

## Solution

- Unify Google OAuth: single credentials + token store shared by Calendar and Sheets, requesting combined scopes (`calendar.readonly`, `spreadsheets.readonly`)
- Consider KB-as-data-source: extend the AI extraction pipeline to pull demographics/program data from KB documents as an alternative to Sheets sync
- Multi-sheet support: allow multiple spreadsheet configs or auto-discover tabs within a connected spreadsheet
- This is likely a v1.4 milestone scope item
