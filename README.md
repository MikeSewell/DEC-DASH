# DEC DASH 2.0

Executive dashboard for the **Dads' Education Center (DEC)**, a nonprofit supporting fathers through co-parenting, legal aid, and fatherhood programs.

## Stack

- **Next.js 15** — App Router, TypeScript, Tailwind CSS v4
- **Convex** — Backend (database, real-time queries, mutations, crons)
- **QuickBooks API** — Financial data (P&L, expenses, cash flow, balance sheet)
- **Google Sheets API** — Grant tracking
- **OpenAI Assistants API** — AI Director chat with knowledge base
- **Constant Contact API** — Newsletter management
- **Chart.js** — Data visualizations

## Design System

The UI uses a **warm, organic** aesthetic inspired by community and nature — avoiding the generic SaaS look.

- **Typography**: [Nunito](https://fonts.google.com/specimen/Nunito) (body) + [Fraunces](https://fonts.google.com/specimen/Fraunces) (display headings) + Geist Mono (code)
- **Color palette**: Teal primary (`#1B5E6B`), green accent (`#6BBF59`), warm cream background (`#F7F5F0`), dark forest mode (`#141F16`)
- **Shadows**: Green-tinted warm shadows (`--warm-shadow-sm` through `--warm-shadow-xl`)
- **Shapes**: Pill-shaped buttons (`rounded-full`), large card radii (`rounded-2xl`), organic blob decorations
- **Motion**: Fade-up and scale-in entrance animations, hover-lift micro-interactions, staggered children reveals
- **Textures**: Subtle CSS noise grain overlay, frosted glass header, gradient sidebar

## Features

- **Executive Snapshot** — Revenue, expenses, cash flow, grant utilization at a glance
- **Financial Dashboard** — QuickBooks-synced P&L, expense breakdowns, vendor spend
- **Grant & Budget Tracking** — Google Sheets-synced grant status, burn rates, deadlines
- **Unified Client & Program Management** — Combined `/clients` page with program tabs, role-based filtering (lawyers see only legal clients, psychologists see only co-parent clients), per-client intake forms, program CRUD, and search
- **AI Director** — OpenAI-powered assistant with document knowledge base for strategic Q&A
- **Newsletter Builder** — Branded HTML email template matching the n8n workflow design: two-column header (logo + title), Executive Director greeting/signature, highlighted milestone and program boxes, participant testimonial blocks, community event tables, fatherhood stats, support section with donate/volunteer CTAs, social media icons; ~20 content sections; OpenAI polishes the template (removes empty placeholder sections, adds preheader); visual contentEditable preview editing (click text to modify/delete directly in the rendered email); send test emails for review before publishing via Constant Contact
- **AI Expense Categorization** — Pre-scores unclassified QB expenses against grant budgets using pacing, diversification, time urgency, and budget factors; sends to OpenAI for final grant selection; users review/override and submit assignments back to QuickBooks
- **Expense Recommender** — AI-powered expense optimization suggestions
- **Legal Intake Forms** — Digital Father Intake Form with 28 fields across 7 collapsible sections; linked to client records; bulk import from Excel; full CRUD with audit logging
- **Co-Parent Intake Forms** — Co-parenting session intake with 22 fields across 3 sections (participant info, co-parent info, session info); linked to client records; bulk import from multi-sheet Excel
- **Role-Based Access** — Admin, manager, staff, lawyer, psychologist, and readonly roles; role-based nav filtering (lawyers see only Clients + Settings)
- **Customizable Dashboard** — Reorderable and hideable sections per user

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account ([convex.dev](https://convex.dev))
- API credentials for QuickBooks, Google Sheets, OpenAI, and Constant Contact

### Setup

```bash
npm install
npx convex dev          # Start Convex backend (runs schema migrations)
npm run dev             # Start Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` for Next.js and set Convex environment variables via the Convex dashboard:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `QB_CLIENT_ID` / `QB_CLIENT_SECRET` | QuickBooks OAuth app credentials |
| `QB_REDIRECT_URI` | QuickBooks OAuth callback URL |
| `QB_ENVIRONMENT` | `sandbox` or `production` |
| `CC_CLIENT_ID` / `CC_CLIENT_SECRET` | Constant Contact OAuth credentials |
| `CC_REDIRECT_URI` | Constant Contact OAuth callback URL |
| `GOOGLE_SHEETS_CREDENTIALS` | Google service account JSON |
| `OPENAI_API_KEY` | OpenAI API key |

## Project Structure

```
convex/               # Backend — schema, queries, mutations, actions, crons
scripts/              # One-time import scripts (legal intake, co-parent intake)
src/
  app/(dashboard)/    # Dashboard pages (admin, expenses, categorize, clients, settings, etc.)
  app/api/            # Next.js API routes (OAuth callbacks)
  components/         # React components organized by feature
  lib/                # Shared utilities and constants
  types/              # TypeScript type definitions
```

## Data Sync

- **QuickBooks** — Cached in `quickbooksCache` table, auto-refreshed every 15 minutes via cron
- **Google Sheets** — Cached in `grantsCache` table, auto-refreshed every 30 minutes via cron
- OAuth connections are global (singleton config, any admin can initiate)
