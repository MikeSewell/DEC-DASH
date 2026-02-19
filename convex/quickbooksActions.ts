"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Internal: refresh tokens
export const refreshTokens = internalAction({
  handler: async (ctx) => {
    const OAuthClient = (await import("intuit-oauth")).default;
    const config = await ctx.runQuery(internal.quickbooksInternal.getFullConfig);
    if (!config) throw new Error("QuickBooks not connected");

    const oauthClient = new OAuthClient({
      clientId: process.env.QB_CLIENT_ID!,
      clientSecret: process.env.QB_CLIENT_SECRET!,
      environment: (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox",
      redirectUri: process.env.QB_REDIRECT_URI!,
    });

    oauthClient.setToken({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
      token_type: "bearer",
      expires_in: Math.floor((config.tokenExpiry - Date.now()) / 1000),
      realmId: config.realmId,
    });

    const authResponse = await oauthClient.refresh();
    const token = authResponse.getJson();

    await ctx.runMutation(internal.quickbooksInternal.updateTokens, {
      configId: config._id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiry: Date.now() + token.expires_in * 1000,
    });

    return token.access_token;
  },
});

// Fetch P&L report from QB API
export const fetchProfitAndLoss = internalAction({
  args: { startDate: v.optional(v.string()), endDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const startDate = args.startDate || getFirstDayOfYear();
    const endDate = args.endDate || getToday();

    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`QB API error: ${response.status}`);
    const data = await response.json();

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "profit_loss",
      data: JSON.stringify(data),
      periodStart: startDate,
      periodEnd: endDate,
    });
  },
});

// Fetch expenses
export const fetchExpenses = internalAction({
  args: { startDate: v.optional(v.string()), endDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const startDate = args.startDate || getFirstDayOfYear();
    const endDate = args.endDate || getToday();

    const query = `SELECT * FROM Purchase WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`;
    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`QB API error: ${response.status}`);
    const data = await response.json();

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "expenses",
      data: JSON.stringify(data),
      periodStart: startDate,
      periodEnd: endDate,
    });
  },
});

// Fetch vendors
export const fetchVendors = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const query = "SELECT * FROM Vendor MAXRESULTS 1000";
    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`QB API error: ${response.status}`);
    const data = await response.json();

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "vendors",
      data: JSON.stringify(data),
    });
  },
});

// Fetch chart of accounts
export const fetchAccounts = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const query = "SELECT * FROM Account MAXRESULTS 1000";
    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`QB API error: ${response.status}`);
    const data = await response.json();

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "accounts",
      data: JSON.stringify(data),
    });
  },
});

// Fetch classes (grants/funds)
export const fetchClasses = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const query = "SELECT * FROM Class MAXRESULTS 1000";
    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`QB API error: ${response.status}`);
    const data = await response.json();

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "classes",
      data: JSON.stringify(data),
    });
  },
});

// Fetch cash flow statement
export const fetchCashFlow = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const startDate = getFirstDayOfYear();
    const endDate = getToday();

    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/reports/CashFlow?start_date=${startDate}&end_date=${endDate}&minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`QB API error: ${response.status}`);
    const data = await response.json();

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "cash_flow",
      data: JSON.stringify(data),
      periodStart: startDate,
      periodEnd: endDate,
    });
  },
});

// Fetch balance sheet
export const fetchBalanceSheet = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/reports/BalanceSheet?minorversion=65`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`QB API error: ${response.status}`);
    const data = await response.json();

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "balance_sheet",
      data: JSON.stringify(data),
    });
  },
});

// Sync all data
export const syncAllData = internalAction({
  handler: async (ctx) => {
    try {
      await ctx.runAction(internal.quickbooksActions.fetchProfitAndLoss, {});
      await ctx.runAction(internal.quickbooksActions.fetchExpenses, {});
      await ctx.runAction(internal.quickbooksActions.fetchVendors, {});
      await ctx.runAction(internal.quickbooksActions.fetchAccounts, {});
      await ctx.runAction(internal.quickbooksActions.fetchClasses, {});
      await ctx.runAction(internal.quickbooksActions.fetchCashFlow, {});
      await ctx.runAction(internal.quickbooksActions.fetchBalanceSheet, {});
    } catch (error) {
      console.error("QB sync error:", error);
      throw error;
    }
  },
});

// Manual sync trigger (exposed as public action)
export const triggerSync = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.quickbooksActions.syncAllData, {});
  },
});

// Helpers
async function getAuthenticatedConfig(ctx: any) {
  const config = await ctx.runQuery(internal.quickbooksInternal.getFullConfig);
  if (!config) throw new Error("QuickBooks not connected");

  if (config.tokenExpiry < Date.now() + 60000) {
    const newToken = await ctx.runAction(internal.quickbooksActions.refreshTokens, {});
    return { accessToken: newToken, realmId: config.realmId };
  }

  return { accessToken: config.accessToken, realmId: config.realmId };
}

function getBaseUrl(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getFirstDayOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}
