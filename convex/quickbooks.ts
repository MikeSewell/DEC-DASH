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

// Get Profit & Loss
export const getProfitAndLoss = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "profit_loss"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
  },
});

// Get Expenses
export const getExpenses = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "expenses"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
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

// Get Accounts (Chart of Accounts)
export const getAccounts = query({
  handler: async (ctx) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "accounts"))
      .first();
    if (!cached) return null;
    return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt };
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

// Get Donations
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
