/**
 * Dashboard fallback data — shown when integrations are not connected.
 * NOTE: These are placeholder values for the Dads' Education Center dashboard.
 * They represent a plausible FY 2024 financial snapshot for a small US nonprofit.
 * Replace with live data once integrations are reconnected (see REQUIREMENTS.md: INTEG-01 through INTEG-03).
 *
 * FALLBACK_NOTE: All values in this file are dummy/placeholder data added as part of
 * Phase 26 (Dummy Data Fallbacks). They are displayed when integrations are disconnected.
 */

// ─── QuickBooks: Executive Snapshot ───────────────────────────────────────────

export const FALLBACK_QB_SNAPSHOT = {
  cashOnHand: 54320,
  totalRevenue: 285400,
  totalExpenses: 248160,
  netIncome: 37240,
  revenueTrend: { value: "8.4% vs last year", positive: true },
  expensesTrend: { value: "3.1% vs last year", positive: true }, // lower expenses = positive
} as const;

// ─── QuickBooks: Profit & Loss ─────────────────────────────────────────────────

export const FALLBACK_PNL = {
  totalRevenue: 285400,
  totalExpenses: 248160,
  netIncome: 37240,
  expensesByCategory: {
    "Program Services": 98400,
    "Salaries & Benefits": 87200,
    "Occupancy": 24600,
    "Professional Fees": 18900,
    "Marketing & Outreach": 11200,
    "Office & Admin": 7860,
  } as Record<string, number>,
  period: { start: "2024-01-01", end: "2024-12-31" },
} as const;

// ─── Google Calendar: Upcoming Events ─────────────────────────────────────────

/**
 * Fallback calendar events. Dates are computed relative to today at render time
 * so they always appear as upcoming events. Exported as a factory function.
 */
export function getFallbackCalendarEvents() {
  const now = Date.now();
  const day = 86_400_000; // ms per day

  return [
    {
      _id: "fallback-1",
      eventId: "fallback-ev-1",
      calendarId: "fallback",
      calendarDisplayName: "DEC Programs",
      summary: "Fatherhood Group Session",
      startAt: now + day * 1 + 10 * 3600 * 1000, // tomorrow 10am
      endAt: now + day * 1 + 12 * 3600 * 1000,
      isAllDay: false,
      location: "Community Center Room B",
    },
    {
      _id: "fallback-2",
      eventId: "fallback-ev-2",
      calendarId: "fallback",
      calendarDisplayName: "DEC Admin",
      summary: "Grant Report Deadline — Safe Families Fund",
      startAt: now + day * 3,
      endAt: now + day * 3,
      isAllDay: true,
    },
    {
      _id: "fallback-3",
      eventId: "fallback-ev-3",
      calendarId: "fallback",
      calendarDisplayName: "DEC Legal",
      summary: "Legal Clinic — Pro Bono Consultations",
      startAt: now + day * 4 + 14 * 3600 * 1000, // 4 days out, 2pm
      endAt: now + day * 4 + 17 * 3600 * 1000,
      isAllDay: false,
      location: "DEC Main Office",
    },
    {
      _id: "fallback-4",
      eventId: "fallback-ev-4",
      calendarId: "fallback",
      calendarDisplayName: "DEC Programs",
      summary: "Co-Parenting Workshop",
      startAt: now + day * 7 + 9 * 3600 * 1000,
      endAt: now + day * 7 + 11 * 3600 * 1000,
      isAllDay: false,
      location: "Virtual (Zoom)",
    },
    {
      _id: "fallback-5",
      eventId: "fallback-ev-5",
      calendarId: "fallback",
      calendarDisplayName: "DEC Admin",
      summary: "Board Meeting — Monthly Review",
      startAt: now + day * 10 + 18 * 3600 * 1000,
      endAt: now + day * 10 + 20 * 3600 * 1000,
      isAllDay: false,
    },
  ];
}

// ─── Knowledge Base: Metrics ───────────────────────────────────────────────────

export const FALLBACK_KB_METRICS = [
  {
    key: "fallback-clients-served",
    label: "Clients Served (YTD)",
    value: "147",
    unit: null,
    sourceDocument: "Annual Program Report 2024",
    conflictValue: undefined,
    conflictDocument: undefined,
  },
  {
    key: "fallback-program-completion",
    label: "Program Completion Rate",
    value: "78",
    unit: "%",
    sourceDocument: "Q3 Outcomes Summary",
    conflictValue: undefined,
    conflictDocument: undefined,
  },
  {
    key: "fallback-avg-sessions",
    label: "Avg Sessions per Client",
    value: "6.2",
    unit: "sessions",
    sourceDocument: "Annual Program Report 2024",
    conflictValue: undefined,
    conflictDocument: undefined,
  },
  {
    key: "fallback-volunteers",
    label: "Active Volunteers",
    value: "23",
    unit: null,
    sourceDocument: "Volunteer Roster Q4",
    conflictValue: undefined,
    conflictDocument: undefined,
  },
] as const;

export const FALLBACK_KB_SUMMARY_BULLETS = [
  "DEC served 147 clients across legal and co-parenting programs in 2024, a 12% increase over 2023.",
  "Program completion rates improved to 78%, driven by enhanced intake follow-up procedures.",
  "Legal clinic provided 89 pro bono consultation hours, saving clients an estimated $44,500 in legal fees.",
  "Co-parenting workshop attendance averaged 14 participants per session, with a 92% satisfaction rating.",
];

// ─── Funding Goal Thermometer ──────────────────────────────────────────────────

export const FALLBACK_FUNDING_GOAL = {
  current: 285400,
  goal: 500000,
  label: "FY 2024 Funding Goal",
} as const;

// ─── Donation Performance (Income Trend) ──────────────────────────────────────

/** Fallback income trend — 12 months of sample data */
export const FALLBACK_INCOME_TREND = (() => {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    // Realistic nonprofit income with seasonal variation
    const base = 22000;
    const seasonal = Math.sin((d.getMonth() / 11) * Math.PI) * 6000;
    const total = Math.round(base + seasonal + (Math.random() * 3000 - 1500));
    months.push({
      label,
      total,
      breakdown: {
        "Individual Donations": Math.round(total * 0.55),
        "Grants & Foundations": Math.round(total * 0.35),
        "Events & Other": Math.round(total * 0.10),
      },
    });
  }
  return {
    months,
    accounts: ["Individual Donations", "Grants & Foundations", "Events & Other"],
    configured: true,
    fetchedAt: null as null,
  };
})();
