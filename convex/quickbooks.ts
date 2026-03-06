import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get QuickBooks connection config
export const getConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("quickbooksConfig").first();
    if (!config) return null;
    return {
      _id: config._id,
      realmId: config.realmId,
      companyName: config.companyName,
      connectedAt: config.connectedAt,
      isExpired: config.tokenExpiry < Date.now(),
    };
  },
});

// Get cached report by type
export const getCachedReport = query({
  args: { reportType: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", args.reportType))
      .first();
    if (!cached) return null;
    return {
      data: JSON.parse(cached.data),
      fetchedAt: cached.fetchedAt,
      periodStart: cached.periodStart,
      periodEnd: cached.periodEnd,
    };
  },
});

// Shared helper: parse raw P&L JSON data into totals
function parsePnlTotals(rawData: string): { totalRevenue: number; totalExpenses: number; netIncome: number } {
  const raw = JSON.parse(rawData);
  const rows: any[] = raw?.Rows?.Row ?? [];

  let totalRevenue = 0;
  let totalExpenses = 0;
  let netIncome = 0;

  for (const row of rows) {
    const group = (row.group ?? row.Header?.ColData?.[0]?.value ?? "").toLowerCase();
    const summaryValue = parseFloat(row.Summary?.ColData?.[1]?.value ?? "0");

    if (group.includes("income") && !group.includes("netincome") && !group.includes("net income")) {
      totalRevenue += summaryValue;
    } else if (group.includes("expense") || group.includes("cost of goods")) {
      totalExpenses += summaryValue;
    } else if (group.includes("grossprofit") || group.includes("gross profit")) {
      // Gross profit row — informational, revenue - COGS
    } else if (group.includes("netincome") || group.includes("net income")) {
      netIncome = summaryValue;
    }
  }

  return { totalRevenue, totalExpenses: Math.abs(totalExpenses), netIncome };
}

// Get Profit & Loss — parsed into structured ProfitLossData
export const getProfitAndLoss = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "profit_loss"))
      .first();
    if (!cached) return null;

    const raw = JSON.parse(cached.data);
    const rows: any[] = raw?.Rows?.Row ?? [];

    const revenueByCategory: Record<string, number> = {};
    const expensesByCategory: Record<string, number> = {};

    for (const row of rows) {
      const group = (row.group ?? row.Header?.ColData?.[0]?.value ?? "").toLowerCase();

      if (group.includes("income") && !group.includes("netincome") && !group.includes("net income")) {
        extractCategories(row, revenueByCategory);
      } else if (group.includes("expense") || group.includes("cost of goods")) {
        extractCategories(row, expensesByCategory);
      }
    }

    const { totalRevenue, totalExpenses, netIncome } = parsePnlTotals(cached.data);

    return {
      data: {
        totalRevenue,
        totalExpenses,
        netIncome,
        revenueByCategory,
        expensesByCategory,
        period: { start: cached.periodStart ?? "", end: cached.periodEnd ?? "" },
      },
      fetchedAt: cached.fetchedAt,
    };
  },
});

// Get year-over-year trends — compares current month P&L with same month in prior year
export const getTrends = query({
  handler: async (ctx) => {
    const currentCache = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "profit_loss"))
      .first();

    const priorYearCache = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "profit_loss_prior_year"))
      .first();

    // Both must exist for trends to be meaningful
    if (!currentCache || !priorYearCache) return null;

    const current = parsePnlTotals(currentCache.data);
    const prior = parsePnlTotals(priorYearCache.data);

    function computeTrend(
      current: number,
      prior: number,
      positiveWhenHigher: boolean
    ): { pctChange: number; positive: boolean } | null {
      if (prior === 0) return null; // avoid division by zero
      const pctChange = Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10; // 1 decimal place
      const positive = positiveWhenHigher ? current > prior : current < prior;
      return { pctChange, positive };
    }

    return {
      revenue: computeTrend(current.totalRevenue, prior.totalRevenue, true),
      expenses: computeTrend(current.totalExpenses, prior.totalExpenses, false),
      fetchedAt: Math.max(currentCache.fetchedAt, priorYearCache.fetchedAt),
    };
  },
});

// Helper to extract category amounts from a P&L report section (recursive for nested QB sections)
function extractCategories(sectionRow: any, target: Record<string, number>) {
  const subRows: any[] = sectionRow.Rows?.Row ?? [];
  for (const sub of subRows) {
    if (sub.type === "Section" && sub.Rows?.Row?.length > 0) {
      // Has child rows — recurse into them instead of counting this section's summary
      // (avoids double-counting parent summaries that aggregate child values)
      extractCategories(sub, target);
    } else if (sub.type === "Section" && sub.Header && sub.Summary) {
      // Leaf section with no child rows — count its summary
      const catName = sub.Header.ColData?.[0]?.value ?? "Other";
      const catAmount = parseFloat(sub.Summary.ColData?.[1]?.value ?? "0");
      if (catAmount !== 0) target[catName] = (target[catName] ?? 0) + Math.abs(catAmount);
    } else if (sub.type === "Data" && sub.ColData) {
      const catName = sub.ColData[0]?.value ?? "Other";
      const catAmount = parseFloat(sub.ColData[1]?.value ?? "0");
      if (catAmount !== 0) target[catName] = (target[catName] ?? 0) + Math.abs(catAmount);
    }
  }
}

// Get Expenses — parsed into ExpenseItem[] for table + aggregated summaries
export const getExpenses = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "expenses"))
      .first();
    if (!cached) return null;

    const raw = JSON.parse(cached.data);
    const purchases: any[] = raw?.QueryResponse?.Purchase ?? [];

    // Build individual ExpenseItem[] for table/filters
    const items: {
      id: string;
      date: string;
      vendor: string;
      account: string;
      class?: string;
      amount: number;
      memo?: string;
    }[] = [];

    const programMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};
    const vendorMap: Record<string, number> = {};

    for (const purchase of purchases) {
      const totalAmt = parseFloat(purchase.TotalAmt ?? "0");
      const vendorName = purchase.EntityRef?.name ?? "Unknown Vendor";
      const txnDate = purchase.TxnDate ?? "";
      const purchaseId = purchase.Id ?? "";
      vendorMap[vendorName] = (vendorMap[vendorName] ?? 0) + totalAmt;

      const lines: any[] = purchase.Line ?? [];
      for (const line of lines) {
        const detail = line.AccountBasedExpenseLineDetail;
        if (!detail) continue;
        const lineAmt = parseFloat(line.Amount ?? "0");
        const className = detail.ClassRef?.name;
        const accountName = detail.AccountRef?.name ?? "Other";

        items.push({
          id: `${purchaseId}-${line.Id ?? items.length}`,
          date: txnDate,
          vendor: vendorName,
          account: accountName,
          class: className,
          amount: lineAmt,
          memo: line.Description,
        });

        const program = className ?? "Unclassified";
        programMap[program] = (programMap[program] ?? 0) + lineAmt;
        categoryMap[accountName] = (categoryMap[accountName] ?? 0) + lineAmt;
      }
    }

    const toSorted = (map: Record<string, number>) =>
      Object.entries(map)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    return {
      data: items,
      programSpending: toSorted(programMap),
      categorySpending: toSorted(categoryMap),
      topVendors: toSorted(vendorMap).slice(0, 20),
      fetchedAt: cached.fetchedAt,
    };
  },
});

// Get Vendors
export const getVendors = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "vendors"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
  },
});

// Get Accounts — parsed with bank account balances
export const getAccounts = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "accounts"))
      .first();
    if (!cached) return null;

    const raw = JSON.parse(cached.data);
    const allAccounts: any[] = raw?.QueryResponse?.Account ?? [];

    const bankAccounts = allAccounts
      .filter((a: any) => a.AccountType === "Bank")
      .map((a: any) => ({
        name: a.Name ?? "Unknown",
        balance: parseFloat(a.CurrentBalance ?? "0"),
      }));

    const totalCash = bankAccounts.reduce((sum, a) => sum + a.balance, 0);

    return {
      data: {
        accounts: bankAccounts,
        totalCash,
      },
      fetchedAt: cached.fetchedAt,
    };
  },
});

// Get Classes (grants/funds)
export const getClasses = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "classes"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
  },
});

// Get Cash Flow
export const getCashFlow = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "cash_flow"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
  },
});

// Get Balance Sheet
export const getBalanceSheet = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "balance_sheet"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
  },
});

// Get Budget vs Actuals — parsed per-class budget comparison
export const getBudgetVsActuals = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "budget_vs_actuals"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
  },
});

// Get Donations
// Note: Donation tracking was previously powered by PayPal integration (via n8n).
// QB doesn't have a dedicated donations entity. This will return null until a
// PayPal or other donation-platform integration is implemented. The DonationPerformance
// component handles null gracefully with an empty state message.
export const getDonations = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "donations"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
  },
});

// Get all QB income-type accounts (for admin designation UI)
export const getIncomeAccounts = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "accounts"))
      .first();
    if (!cached) return null;

    const raw = JSON.parse(cached.data);
    const allAccounts: any[] = raw?.QueryResponse?.Account ?? [];

    const incomeAccounts = allAccounts
      .filter((a: any) => a.AccountType === "Income" || a.AccountType === "Other Income")
      .map((a: any) => ({
        id: a.Id as string,
        name: a.Name as string,
        accountType: a.AccountType as string,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { accounts: incomeAccounts, fetchedAt: cached.fetchedAt };
  },
});

// Get monthly income trend data filtered by admin-designated accounts
export const getIncomeTrend = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "income_trend"))
      .first();
    if (!cached) return null;

    // Read designated accounts from appSettings
    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "donation_income_accounts"))
      .first();

    // If no accounts designated, return null with a flag
    const designatedAccounts: string[] = setting?.value
      ? JSON.parse(setting.value)
      : [];

    if (designatedAccounts.length === 0) {
      return { configured: false as const, months: [], accounts: [], fetchedAt: cached.fetchedAt };
    }

    const raw = JSON.parse(cached.data);

    // Extract month labels from column headers
    // QB P&L with summarize_column_by=Month returns Columns.Column array
    const columns: any[] = raw?.Columns?.Column ?? [];
    // First column is "Account" label, remaining are month columns, last may be "Total"
    const monthColumns: string[] = [];
    for (let i = 1; i < columns.length; i++) {
      const colTitle = columns[i]?.ColTitle ?? "";
      if (colTitle.toLowerCase() === "total") continue;
      monthColumns.push(colTitle);
    }

    // Parse income rows from the report
    const rows: any[] = raw?.Rows?.Row ?? [];
    const accountMonthlyData: Record<string, number[]> = {};

    for (const row of rows) {
      const group = (row.group ?? "").toLowerCase();
      if (group.includes("income") && !group.includes("netincome") && !group.includes("net income")) {
        extractMonthlyIncomeRows(row, designatedAccounts, monthColumns.length, accountMonthlyData);
      }
    }

    // Build result: monthly totals and per-account breakdown
    const months = monthColumns.map((label, i) => {
      let total = 0;
      const breakdown: Record<string, number> = {};
      for (const [accountName, values] of Object.entries(accountMonthlyData)) {
        const val = values[i] ?? 0;
        total += val;
        if (val !== 0) breakdown[accountName] = val;
      }
      return { label, total, breakdown };
    });

    return {
      configured: true as const,
      months,
      accounts: Object.keys(accountMonthlyData),
      fetchedAt: cached.fetchedAt,
    };
  },
});

// Helper: recursively extract monthly values for designated income accounts
function extractMonthlyIncomeRows(
  sectionRow: any,
  designatedAccounts: string[],
  monthCount: number,
  result: Record<string, number[]>
) {
  const subRows: any[] = sectionRow.Rows?.Row ?? [];
  for (const sub of subRows) {
    if (sub.type === "Section" && sub.Header) {
      // Sub-section: check if the header name matches a designated account
      const headerName = sub.Header?.ColData?.[0]?.value ?? "";
      if (designatedAccounts.includes(headerName)) {
        // Use summary row for this section's monthly values
        const summaryColData: any[] = sub.Summary?.ColData ?? [];
        // Skip first column (label) and last column if "Total"
        const values: number[] = [];
        for (let i = 1; i <= monthCount; i++) {
          values.push(parseFloat(summaryColData[i]?.value ?? "0"));
        }
        result[headerName] = values;
      } else {
        // Recurse into sub-sections to find matching accounts
        extractMonthlyIncomeRows(sub, designatedAccounts, monthCount, result);
      }
    } else if (sub.type === "Data" && sub.ColData) {
      const accountName = sub.ColData[0]?.value ?? "";
      if (designatedAccounts.includes(accountName)) {
        const values: number[] = [];
        for (let i = 1; i <= monthCount; i++) {
          values.push(parseFloat(sub.ColData[i]?.value ?? "0"));
        }
        result[accountName] = values;
      }
    }
  }
}

// Save OAuth tokens from callback
export const saveTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    realmId: v.string(),
    tokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("quickbooksConfig").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("quickbooksConfig", {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      realmId: args.realmId,
      tokenExpiry: args.tokenExpiry,
      connectedAt: Date.now(),
    });
  },
});

// Disconnect QuickBooks
export const disconnect = mutation({
  handler: async (ctx) => {
    const config = await ctx.db.query("quickbooksConfig").first();
    if (config) {
      await ctx.db.delete(config._id);
    }

    const caches = await ctx.db.query("quickbooksCache").collect();
    for (const cache of caches) {
      await ctx.db.delete(cache._id);
    }
  },
});
