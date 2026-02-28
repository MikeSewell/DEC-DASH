# Milestones

## v1.0 Command Center (Shipped: 2026-02-28)

**Phases:** 4 | **Plans:** 11 | **Commits:** 49 | **Files:** 71 | **LOC:** 21,372 TS
**Timeline:** 10 days (Feb 19 → Feb 28, 2026)
**Git range:** `feat(01-01)..feat(04-02)` | **Tag:** `v1.0`

**Delivered:** Transformed the dashboard into a daily command center — live financial data, calendar integration, and proactive alerts give the Executive Director a single-pane-of-glass view of organizational health.

**Key accomplishments:**
- Rewrote newsletter HTML with table-based email-safe layout + juice CSS inlining for cross-client compatibility (Gmail, Outlook, Apple Mail)
- Fixed all dashboard KPI cards, charts, and widgets to render live QuickBooks data with three-state loading (skeleton/prompt/data)
- Integrated Google Calendar — service account sync, admin configuration, CalendarWidget agenda view on dashboard
- Built proactive alerts panel — grant deadlines, budget variance, sync status alerts with urgency ranking
- Added reusable UI infrastructure: skeleton shimmer components, three-state loading pattern, shared utilities
- Wired "What Needs Attention" as single-query server-aggregated alert system with critical toast notifications

**Phases:**
1. Newsletter Template Fix (2 plans) — Table-based HTML rewrite + juice CSS inlining + size validation + preview accuracy
2. Dashboard Data Population (4 plans) — QB token fix, skeleton shimmers, three-state loading, KPI cards, client activity
3. Google Calendar Integration (3 plans) — Schema + Convex modules, admin config + cron, CalendarWidget dashboard component
4. Proactive Alerts Panel (2 plans) — alerts.ts backend query, WhatNeedsAttention refactor + toast notifications

**Archives:** `milestones/v1.0-ROADMAP.md` | `milestones/v1.0-REQUIREMENTS.md` | `milestones/v1.0-MILESTONE-AUDIT.md`

---

