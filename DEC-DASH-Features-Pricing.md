# DEC DASH 2.0 — Executive Dashboard Platform

**Custom-built for the Dads' Education Center (DEC)**
A full-stack executive dashboard connecting financial data, client management, grant tracking, AI-powered tools, and marketing — all in one unified platform.

---

## Platform Summary

| | |
|---|---|
| **Frontend** | Next.js 15 (React), TypeScript, Tailwind CSS, Chart.js |
| **Backend** | Convex (real-time database, serverless functions, file storage, cron jobs) |
| **AI Engine** | OpenAI GPT-4o (4 integrated AI systems) |
| **Integrations** | QuickBooks Online, Google Sheets, Constant Contact, OpenAI |
| **Auth** | Email/password with 6-tier role-based access control |
| **Hosting** | VPS-deployed (standalone build, Nginx, PM2) |
| **Database Tables** | 22 tables with indexed queries |

---

## Feature Breakdown

### 1. Executive Dashboard

A fully customizable command center with real-time KPIs.

- **4 live KPI cards** — Active Grants ($), Total Funds Raised, Cash on Hand (from QuickBooks), Revenue YTD
- **Grant Budget vs. Spending** — Horizontal stacked bar chart with color-coded pacing (green/yellow/red), budget comparison table, automatic fuzzy-matching between grant names and QuickBooks classes
- **Grant Tracking Overview** — Active grants with status and deadlines from Google Sheets
- **Donation Performance** — Trend charts for donation sources and volume
- **Profit & Loss** — Revenue, Expenses, Net Income cards + doughnut chart of expense breakdown by category
- **Program Demographics (Co-Parent)** — Pie charts for gender, age, ethnicity; bar charts for referral sources and outcomes
- **Program Demographics (Legal)** — Same statistical breakdowns plus reason-for-visit analysis
- **Per-user customization** — Drag to reorder sections, hide/show sections, reset to default; preferences persist across sessions
- **Light/dark theme toggle**

### 2. Financial Management (Expenses)

Five-tab expense management system with QuickBooks integration.

| Tab | Description |
|---|---|
| **By Vendor** | Grouped expense totals by vendor, sortable table, date-range filter, free-text search |
| **By Account** | Grouped expense totals by QuickBooks account type |
| **By Class (Budget vs. Actuals)** | Side-by-side budget vs. actual spend comparison per grant/class, variance tracking |
| **AI Insights** | On-demand GPT-4o analysis: overall assessment, prioritized cost-saving recommendations (high/medium/low with estimated savings), vendor insights, account distribution notes |
| **AI Categorize** | Full AI-powered grant allocation workflow (see AI Features below) |

- **PDF Export** — Filtered expense reports with date range, up to 100 rows, paginated output
- **Date range filtering** and **free-text search** across all tabs

### 3. AI-Powered Expense Categorization

An end-to-end pipeline that reads QuickBooks expenses, scores them against qualifying grants, sends batches to GPT-4o, and writes approved allocations back to QuickBooks.

- **4-factor scoring engine:**
  - Pacing score (0–40) — behind-pace grants prioritized
  - Time urgency (0–25) — grants expiring sooner scored higher
  - Diversification (0–25) — penalizes over-concentration toward one grant
  - Budget headroom (0–10) — grants with more remaining budget scored higher
- **Batch AI processing** — Sends expenses to GPT-4o in batches of 30 with pre-scored context
- **Post-validation** — Overrides hallucinated grant names with pre-scored top picks
- **Confidence levels** — High / Medium / Low per allocation
- **Bulk actions** — Approve All High, Bulk Assign, Reset to AI
- **QuickBooks write-back** — Submit approved allocations directly to QB (updates ClassRef per line item)
- **Grant Class Cards** — Per-grant budget/pacing visualization
- **Run history** — Metadata tracking (started, total, processed, submitted)

### 4. Grant Tracker

Full lifecycle grant management from pipeline to quarterly reporting.

- **Stats dashboard** — Total Grants, Total Awarded ($), Active count, Upcoming Reports (next 30 days)
- **5 funding-stage pipeline** — Active, Committed, Pending, Cultivating, Denied — with count badges
- **Grant table** — Sortable list with QuickBooks spending fuzzy-match
- **Detail page per grant:**
  - Grant info grid (19 editable fields) — funder, program, amount, dates, AR status, payment schedule, notes
  - Funder contact card — clickable phone and email links
  - Quarterly reporting timeline — Q1–Q4 dates with countdown badges (color-coded: overdue, <7 days, 7–30 days, future)
  - Budget vs. Spending progress bar — green/yellow/red with awarded/spent/remaining breakdown (QB-connected)
- **Inline editing** — Admin/manager can toggle all fields to edit mode, save or cancel
- **Excel import script** — Reads "Grant Matrix .xlsx", normalizes 5 funding stages, converts Excel serial dates, upserts in batches of 20 (handles 46+ grants)

### 5. Client & Program Management

Unified client roster with role-based filtering and full intake form system.

- **Client roster** — Stats row (Total, Active, New This Month), debounced search, program-type tabs
- **Add Client modal** — First/Last name, Program, Status, Zip, Age Group, Ethnicity, Notes
- **Client detail page** — Inline-editable client info card, delete (admin only)
- **Legal Intake Forms** — 28 fields across 7 collapsible sections:
  - Personal Info, Visit Details, Legal Status, Court Orders, Children, Child Support, Safety & Notes
  - Dropdowns for attorney status, restraining orders, ethnicity, legal goals
- **Co-Parent Intake Forms** — 22 fields across 3 sections:
  - Participant Info, Co-Parent Info, Session Info
  - Tracks both client and co-parent details, session history
- **Program management** — Add/edit/delete programs (Legal, Co-Parent, Fatherhood, Other), active toggle
- **Role-locked views** — Lawyers see only legal clients, psychologists see only co-parent clients
- **Bulk import scripts** — Excel import for legal intake, 3-sheet co-parent import with deduplication

### 6. AI Director

A ChatGPT-style assistant with persistent sessions and organizational knowledge.

- **Multi-session chat** — Session sidebar with preview, message count, timestamps
- **Persistent history** — Messages stored in database, last 20 messages used for context
- **Knowledge Base search** — OpenAI Assistants API with Vector Store for file_search over uploaded documents
- **Fallback mode** — Chat completions when no vector store configured
- **Admin-configurable system prompt** — Customizable AI personality and instructions
- **Auto-provisioning** — Creates OpenAI Assistant + Vector Store on first use
- **Session management** — Create, switch, delete sessions

### 7. Newsletter System

End-to-end newsletter creation, AI generation, visual editing, and sending via Constant Contact.

- **Newsletter list** — Status badges (draft/review/published), create new (auto-named by month/year)
- **Section editor** — 20 fields organized into 7 collapsible categories:
  1. Welcome & Leadership (welcome message, milestones, reflections)
  2. Programs (updates, highlights, testimonials, events)
  3. Dad of the Month (name, story, photo)
  4. Community & Partnerships
  5. Impact & Stats (Fatherhood by the Numbers)
  6. Support & Involvement (volunteer needs, donations)
  7. Stay Connected (contact info, social CTA)
- **AI HTML generation** — Injects content into branded template, GPT-4o polish pass (removes empty sections, fixes formatting, generates subject line and preheader)
- **Visual preview** — Desktop/mobile toggle, iframe rendering
- **Editable preview** — contentEditable iframe for direct HTML editing with save/cancel
- **Send test email** — To any address via Constant Contact test endpoint
- **Send to contact list** — Load CC lists with member counts, send immediately
- **Campaign reuse** — Stored campaignActivityId links test and real sends to same campaign
- **2,000 character limit** per field with live counter, auto-save on blur

### 8. Authentication & Role-Based Access Control

Six-tier permission system controlling every route, mutation, and UI element.

| Role | Access Level |
|---|---|
| **Admin** | Full access — user management, delete actions, all features, all pages |
| **Manager** | Most features — grant editing, program management, client management |
| **Staff** | Standard operational access to dashboard, expenses, clients, grants |
| **Lawyer** | Restricted to `/clients` (legal clients only) + `/settings` |
| **Psychologist** | Restricted to `/clients` (co-parent clients only) + `/settings` |
| **Read-only** | View-only access across permitted pages |

- Server-side enforcement via `requireRole()` on every protected query/mutation
- Dynamic sidebar navigation filtered by role
- First user automatically becomes admin
- Force password change on new user creation

### 9. Admin Console (7 Tabs)

| Tab | Features |
|---|---|
| **Users** | Create/edit/delete users, assign roles, force password change |
| **QuickBooks** | OAuth connect/disconnect, connection status, manual sync trigger, token expiry display |
| **Constant Contact** | OAuth connect/disconnect, token refresh, connection status |
| **Google Sheets** | Configure spreadsheet ID, sheet name, service account, per-purpose configs, manual sync |
| **Knowledge Base** | Upload files (PDF, DOCX, TXT) to Convex storage + OpenAI Vector Store, list/delete files |
| **Audit Log** | Chronological log of all admin actions — actor, action type, entity, details, timestamp |
| **AI Config** | OpenAI API key management, AI Director system prompt editor, app settings display |

### 10. Integrations

| Integration | Sync | Direction | Features |
|---|---|---|---|
| **QuickBooks Online** | Every 15 min (cron) | Read + Write | P&L reports, expenses/purchases, budget vs. actuals, chart of accounts, classes; write-back for AI-approved allocations |
| **Google Sheets** | Every 30 min (cron) | Read | Grant tracking data, program demographic data |
| **Constant Contact** | On demand | Write | Newsletter campaigns, test emails, contact list sends |
| **OpenAI GPT-4o** | On demand | Read/Write | 4 systems — expense categorization, AI insights, AI Director chat, newsletter generation |

### 11. Data & Reporting

- **22 database tables** with indexed queries for fast lookups
- **14+ chart types** — pie, doughnut, horizontal bar, stacked bar — all branded with DEC color palette
- **PDF export** — Date-filtered expense reports
- **Excel import scripts** — Legal intake, co-parent intake (3-sheet with deduplication), grant matrix (46+ grants)
- **Real-time sync** — QuickBooks data refreshed every 15 minutes, Sheets every 30 minutes
- **Audit logging** — All admin actions tracked with actor, timestamp, and details

---

## Technical Complexity Summary

| Category | Count |
|---|---|
| Database tables | 22 |
| Backend functions (queries, mutations, actions) | 90+ |
| Frontend pages/routes | 13 |
| Frontend components | 59+ files |
| AI-powered systems | 4 |
| Third-party API integrations | 4 |
| Cron jobs | 2 |
| Chart visualizations | 14+ |
| Import scripts | 4 |
| Intake form fields (legal + co-parent) | 50 |
| Grant fields (editable) | 19 |
| Newsletter content fields | 20 |
| User roles | 6 |

---

## Deployment & Infrastructure

- **Standalone Next.js build** deployed to VPS via rsync
- **Nginx** reverse proxy with SSL
- **PM2** process manager for zero-downtime restarts
- **Convex cloud** for real-time backend (database, serverless functions, file storage, cron scheduling)
- **Automated sync** — No manual data entry required for financial and grant data

---

## What This Replaces

Without DEC DASH, the organization would need:

- A **CRM** for client and intake management (e.g., Salesforce — $25–150/user/month)
- A **grant management platform** (e.g., Instrumentl — $179/month, Fluxx — custom pricing)
- An **accounting dashboard** on top of QuickBooks (e.g., Fathom — $49–199/month, Jirav — $150+/month)
- A **newsletter platform** with template design (already paying for Constant Contact, but this eliminates manual HTML building)
- An **AI assistant** with organizational knowledge (e.g., ChatGPT Teams — $30/user/month + no org-specific context)
- An **expense categorization service** (manual bookkeeper hours or custom development)
- Separate **reporting/analytics tools** for program demographics
- **Role-based access** across all of the above (additional per-seat costs)

DEC DASH consolidates all of this into a single, branded, role-based platform purpose-built for the organization's workflows.
