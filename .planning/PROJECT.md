# DEC DASH 2.0

## What This Is

An executive command center for the Dads' Education Center (DEC) nonprofit. A single-pane-of-glass dashboard that connects financial data (QuickBooks), client/program management, grant tracking, AI-powered tools, newsletter creation (Constant Contact), and organizational scheduling (Google Calendar) — purpose-built for the Executive Director to run the organization from one place, every day.

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
- ✓ Admin console — 7-tab configuration (Users, QB, CC, Sheets, Knowledge Base, Audit Log, AI Config) — existing
- ✓ Google Sheets sync — grant tracking + demographics data, 30-min cron — existing
- ✓ Expense management — 5-tab system (By Vendor, By Account, By Class, AI Insights, AI Categorize) — existing
- ✓ PDF export — date-filtered expense reports — existing
- ✓ Excel import scripts — legal intake, co-parent intake, grant matrix — existing

### Active

- [ ] Fix dashboard data population — KPI cards, charts, and widgets not rendering data
- [ ] Redesign dashboard as daily command center — financial snapshot, client activity, upcoming tasks/deadlines
- [ ] Fix newsletter template formatting — HTML template rendering issues
- [ ] Google Calendar integration — surface client sessions, board/team meetings, community events, grant deadlines
- [ ] Proactive alerts/notifications — surface what needs attention (grant deadlines, follow-ups, anomalies)
- [ ] Expand Google Sheets integration — ensure sync is reliable and covers all needed data

### Out of Scope

- Mobile native app — web-first, responsive design sufficient
- Real-time chat/messaging between users — not a communication tool
- Social media integration — not needed for v1 command center
- Payment/donation platform integration (GoFundMe, PayPal) — QB handles financial tracking
- Gmail integration — email stays in Gmail, not surfaced in dashboard
- Google Drive integration — documents stay in Drive

## Context

DEC is a nonprofit focused on fatherhood education and support. The Executive Director (Kareem Chadly) needs a single tool to monitor organizational health daily. The app already has 22 database tables, 90+ backend functions, 13 routes, 4 AI systems, and 4 third-party integrations. The core infrastructure is solid — the priority is making the dashboard actually work as a command center and adding Google Calendar to complete the daily picture.

The existing dashboard page has KPI cards, charts, and demographic visualizations defined but data is not populating correctly. The newsletter system works end-to-end but the HTML template has formatting issues that need fixing.

Google Calendar would pull in four types of events: client sessions, board/team meetings, community events, and grant reporting deadlines — giving Kareem a unified view of what's happening and what's coming up.

## Constraints

- **Tech stack**: Next.js 15 + Convex backend — must build within existing architecture
- **Integrations**: QuickBooks, Constant Contact, Google Sheets already connected — add Google Calendar API
- **Deployment**: Standalone Next.js build on Hostinger VPS via rsync + PM2
- **Convex**: Single deployment (`aware-finch-86`) used for both dev and production
- **Auth**: @convex-dev/auth with Password provider — no changes needed
- **Theme**: Warm palette with DEC brand colors (#1B5E6B teal, #6BBF59 green), Nunito/Fraunces fonts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Skip codebase mapping | Team knows the codebase well, existing CLAUDE.md is comprehensive | — Pending |
| Google Calendar over Gmail/Drive | Calendar events directly support "what needs attention today" use case | — Pending |
| Fix before expand | Dashboard and newsletter fixes before new features | — Pending |

---
*Last updated: 2026-02-28 after initialization*
