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

    let totalRevenue = 0;
    let totalExpenses = 0;
    let netIncome = 0;
    const revenueByCategory: Record<string, number> = {};
    const expensesByCategory: Record<string, number> = {};

    for (const row of rows) {
      const group = row.group ?? row.Header?.ColData?.[0]?.value ?? "";
      const summaryValue = parseFloat(row.Summary?.ColData?.[1]?.value ?? "0");

      if (group === "Income") {
        totalRevenue = summaryValue;
        extractCategories(row, revenueByCategory);
      } else if (group === "Expenses") {
        totalExpenses = summaryValue;
        extractCategories(row, expensesByCategory);
      } else if (group === "GrossProfit") {
        // Gross profit row — informational, revenue - COGS
      } else if (group === "NetIncome") {
        netIncome = summaryValue;
      }
    }

    return {
      data: {
        totalRevenue,
        totalExpenses: Math.abs(totalExpenses),
        netIncome,
        revenueByCategory,
        expensesByCategory,
        period: { start: cached.periodStart ?? "", end: cached.periodEnd ?? "" },
      },
      fetchedAt: cached.fetchedAt,
    };
  },
});

// Helper to extract category amounts from a P&L report section
function extractCategories(sectionRow: any, target: Record<string, number>) {
  const subRows: any[] = sectionRow.Rows?.Row ?? [];
  for (const sub of subRows) {
    if (sub.type === "Section" && sub.Header && sub.Summary) {
      const catName = sub.Header.ColData?.[0]?.value ?? "Other";
      const catAmount = parseFloat(sub.Summary.ColData?.[1]?.value ?? "0");
      if (catAmount !== 0) target[catName] = Math.abs(catAmount);
    } else if (sub.type === "Data" && sub.ColData) {
      const catName = sub.ColData[0]?.value ?? "Other";
      const catAmount = parseFloat(sub.ColData[1]?.value ?? "0");
      if (catAmount !== 0) target[catName] = Math.abs(catAmount);
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
