# DEC DASH 2.0

## What This Is

An executive command center for the Dads' Education Center (DEC) nonprofit. A single-pane-of-glass dashboard that connects financial data (QuickBooks), client/program management, grant tracking, AI-powered tools, newsletter creation (Constant Contact), and organizational scheduling (Google Calendar) — with proactive alerts that surface what needs the Executive Director's attention each day, complete with trend indicators, color-coded calendar events, and configurable alert thresholds.

## Core Value

When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## Requirements

### Validated

- ✓ QuickBooks integration — P&L, expenses, budget vs. actuals, class sync, 15-min cron — existing
- ✓ AI expense categorization — 4-factor scoring, GPT-4o batch processing, QB write-back — existing
- ✓ Grant tracker — 5-stage pipeline, detail pages, inline editing, Excel import — existing
- ✓ Client & program management — unified roster, legal + co-parent intake forms, role-based views — existing
- ✓ AI Director (Iceberg AI) — multi-session chat with knowledge base, vector store search — existing
- ✓ Newsletter system — section editor, AI HTML generation, Constant Contact send — existing
- ✓ RBAC — 6-tier role system (admin, manager, staff, lawyer, psychologist, readonly) — existing
- ✓ Admin console — 9-tab configuration (Users, QB, CC, Sheets, Google Calendar, Knowledge Base, Alerts, Audit Log, AI Config) — existing
- ✓ Google Sheets sync — grant tracking + demographics data, 30-min cron — existing
- ✓ Expense management — 5-tab system (By Vendor, By Account, By Class, AI Insights, AI Categorize) — existing
- ✓ PDF export — date-filtered expense reports — existing
- ✓ Excel import scripts — legal intake, co-parent intake, grant matrix — existing
- ✓ Newsletter HTML cross-client compatibility — table-based layout, juice CSS inlining, size validation — v1.0
- ✓ Dashboard data population — KPI cards, charts, widgets render live QB data with three-state loading — v1.0
- ✓ Dashboard command center — financial snapshot, client activity, reorderable sections — v1.0
- ✓ Google Calendar integration — service account sync, admin config, CalendarWidget agenda view — v1.0
- ✓ Proactive alerts panel — grant deadlines, budget variance, sync status, urgency ranking — v1.0
- ✓ KPI trend indicators — year-over-year arrows with percentage change on dashboard cards — v1.1
- ✓ Color-coded calendar events — visual distinction by event type (client, board, community, grant) — v1.1
- ✓ Countdown badges for imminent calendar events — v1.1
- ✓ Calendar event toast notifications — alert for events starting within 30-60 min — v1.1
- ✓ Configurable alert thresholds — Admin console Alerts section + gear icon shortcut on panel — v1.1
- ✓ Alert dismissal with persistence — acknowledge alerts across sessions — v1.1
- ✓ In-app toast notifications for new alerts — v1.1

### Active

- [ ] Donation performance charts — trend visualization from QB income accounts

### Out of Scope

- Mobile native app — web-first, responsive design sufficient
- Real-time chat/messaging between users — not a communication tool
- Social media integration — not needed for command center
- Payment/donation platform integration (GoFundMe, PayPal) — QB handles financial tracking
- Gmail integration — email stays in Gmail, not surfaced in dashboard
- Google Drive integration — documents stay in Drive
- Two-way Google Calendar editing — creates sync conflicts; read-only with link-out is sufficient
- Google Calendar webhooks — cron polling is simpler and sufficient for infrequently-changing event data
- Real-time push notifications (browser/mobile) — in-app alerts panel sufficient; push is v2+
- Newsletter mobile-responsive template — low priority vs dashboard/alert/calendar polish

## Context

Shipped v1.1 Polish milestone with 22,027 LOC TypeScript across 94 TS/TSX files.
Tech stack: Next.js 15, Convex backend, QuickBooks API, Constant Contact API, Google Sheets API, Google Calendar API, OpenAI Assistants API.
26 database tables, 100+ backend functions, 13 routes, 4 AI systems, 5 third-party integrations.

Dashboard renders live financial data from QuickBooks with year-over-year trend arrows on KPI cards, color-coded calendar events with live countdown badges, and a configurable proactive alerts panel with per-user dismissal persistence. Newsletter HTML renders correctly across major email clients.

Known operational notes:
- Google Calendar service account must be manually shared with each calendar for events to sync (silent empty-result failure mode)
- `npx convex dev --once` must be run interactively to deploy schema changes
- CALENDAR_DOT_COLORS in constants.ts is dead code (superseded by EVENT_TYPE_CONFIG in v1.1)
- Pre-existing TypeScript errors in 6 Convex files (allocationActions.ts, grants.ts, newsletterActions.ts, auth.ts, seedPrograms.ts, constantContactActions.ts) — `npm run build` still passes

## Constraints

- **Tech stack**: Next.js 15 + Convex backend — must build within existing architecture
- **Integrations**: QuickBooks, Constant Contact, Google Sheets, Google Calendar connected
- **Deployment**: Standalone Next.js build on Hostinger VPS via rsync + PM2
- **Convex**: Single deployment (`aware-finch-86`) used for both dev and production
- **Auth**: @convex-dev/auth with Password provider — no changes needed
- **Theme**: Warm palette with DEC brand colors (#1B5E6B teal, #6BBF59 green), Nunito/Fraunces fonts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Skip codebase mapping | Team knows the codebase well, existing CLAUDE.md is comprehensive | ✓ Good — saved time, no issues |
| Google Calendar over Gmail/Drive | Calendar events directly support "what needs attention today" use case | ✓ Good — clean integration via existing service account |
| Fix before expand | Dashboard and newsletter fixes before new features | ✓ Good — solid data foundation enabled Phase 3-4 |
| Table-based newsletter HTML | Outlook Word renderer requires tables for reliable layout | ✓ Good — cross-client compatibility achieved |
| Dual juice CSS inlining passes | Pre-AI and post-AI inlining ensures stored HTML is fully inlined regardless of OpenAI output | ✓ Good — eliminated CSS stripping edge cases |
| Three-state loading pattern | undefined=loading, null=not-configured, data=ready — prevents flash of wrong state | ✓ Good — adopted across all dashboard sections + calendar |
| Single alerts query | Server-side aggregation vs 3-query fan-out in WhatNeedsAttention | ✓ Good — simpler client code, no query coordination |
| Reuse Sheets service account for Calendar | Same Google Cloud project, no new auth setup needed | ✓ Good — zero-config calendar integration |
| Per-section try/catch in alerts | One failed table read cannot crash entire alert query | ✓ Good — resilient alert system |
| Toast dedup via useRef | Prevents repeated critical alert toasts on re-renders | ✓ Good — clean UX, fires once per session |
| Cash on Hand excluded from trends | Point-in-time bank balance, not a P&L metric — no meaningful YoY comparison | ✓ Good — accurate trend semantics |
| Prior-year same-month comparison | Feb vs Feb rather than YTD vs YTD for apples-to-apples monthly context | ✓ Good — intuitive percentage changes |
| parsePnlTotals shared helper | Eliminates row-parsing duplication between getProfitAndLoss and getTrends | ✓ Good — DRY, single source of truth |
| EVENT_TYPE_CONFIG in constants.ts | Shareable and testable event classification config, not buried in CalendarWidget | ✓ Good — reusable across components |
| Keyword-based event classification | First-match priority: client > board > community > grant > general | ✓ Good — simple, extensible |
| alertConfig as singleton table | Typed fields, structured schema, native Convex patch semantics vs KV store | ✓ Good — consistent with QB/CC config pattern |
| Client-side dismissal filtering | getAlerts stays public/unauthenticated; getMyDismissals handles auth separately | ✓ Good — clean separation of concerns |
| Inline ?? fallbacks for thresholds | alerts.ts uses `configRow?.field ?? default` instead of cross-file constant imports | ✓ Good — self-contained, avoids circular deps |

---
*Last updated: 2026-02-28 after v1.1 milestone*
