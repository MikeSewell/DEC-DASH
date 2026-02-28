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
      refreshToken: token.refresh_token || config.refreshToken,
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

// Fetch active budgets
export const fetchBudgets = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const query = "SELECT * FROM Budget WHERE Active = true MAXRESULTS 1000";
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
      reportType: "budgets",
      data: JSON.stringify(data),
    });
  },
});

// Fetch Budget vs Actuals reports for each budget+class combination
export const fetchBudgetVsActuals = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    // Read cached budgets and classes
    const budgetsCache = await ctx.runQuery(internal.quickbooksInternal.getCachedData, { reportType: "budgets" });
    const classesCache = await ctx.runQuery(internal.quickbooksInternal.getCachedData, { reportType: "classes" });

    const budgets: any[] = budgetsCache ? JSON.parse(budgetsCache).QueryResponse?.Budget ?? [] : [];
    const classes: any[] = classesCache ? JSON.parse(classesCache).QueryResponse?.Class ?? [] : [];

    if (budgets.length === 0) {
      console.log("No active budgets found, skipping BvA fetch");
      await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
        reportType: "budget_vs_actuals",
        data: JSON.stringify([]),
      });
      return;
    }

    // Build budget-class combinations from BudgetDetail ClassRef values
    const combinations: { budgetId: string; budgetName: string; classId: string; className: string }[] = [];

    for (const budget of budgets) {
      const budgetId = budget.Id;
      const budgetName = budget.Name ?? `Budget ${budgetId}`;
      const details: any[] = budget.BudgetDetail ?? [];

      // Collect unique class IDs referenced in this budget
      const classIds = new Set<string>();
      for (const detail of details) {
        const classRef = detail.ClassRef;
        if (classRef?.value) {
          classIds.add(classRef.value);
        }
      }

      if (classIds.size === 0) {
        // Budget has no class breakdown — fetch without class filter
        combinations.push({ budgetId, budgetName, classId: "", className: "All" });
      } else {
        for (const classId of classIds) {
          const cls = classes.find((c: any) => c.Id === classId);
          const className = cls?.Name ?? `Class ${classId}`;
          combinations.push({ budgetId, budgetName, classId, className });
        }
      }
    }

    const startDate = getFirstDayOfYear();
    const endDate = getToday();
    const results: any[] = [];

    for (const combo of combinations) {
      try {
        let url = `${baseUrl}/v3/company/${realmId}/reports/BudgetVsActuals?start_date=${startDate}&end_date=${endDate}&budget=${combo.budgetId}&minorversion=65`;
        if (combo.classId) {
          url += `&class=${combo.classId}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          console.error(`BvA fetch failed for budget=${combo.budgetId} class=${combo.classId}: ${response.status}`);
          continue;
        }

        const report = await response.json();
        const parsed = parseBudgetVsActualsReport(report, combo.budgetName, combo.className);
        results.push(parsed);
      } catch (err) {
        console.error(`BvA error for ${combo.budgetName}/${combo.className}:`, err);
      }
    }

    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "budget_vs_actuals",
      data: JSON.stringify(results),
      periodStart: startDate,
      periodEnd: endDate,
    });
  },
});

// Parse a single BudgetVsActuals report response
function parseBudgetVsActualsReport(report: any, budgetName: string, className: string) {
  const rows: any[] = report?.Rows?.Row ?? [];
  const result: any = {
    budgetName,
    className,
    revenue: { actual: 0, budget: 0, variance: 0, percentUsed: 0 },
    expenses: { actual: 0, budget: 0, variance: 0, percentUsed: 0 },
    net: { actual: 0, budget: 0, variance: 0, percentUsed: 0 },
    lineItems: [] as { category: string; group: string; actual: number; budget: number; variance: number }[],
  };

  for (const row of rows) {
    const group = row.group ?? "";
    const summary = row.Summary?.ColData ?? [];
    // BvA report columns: [Name, Budget, Actual, Over Budget, % of Budget]
    const budgetVal = parseFloat(summary[1]?.value ?? "0");
    const actualVal = parseFloat(summary[2]?.value ?? "0");
    const varianceVal = parseFloat(summary[3]?.value ?? "0");
    const pctVal = parseFloat(summary[4]?.value ?? "0");

    if (group === "Income") {
      result.revenue = { actual: actualVal, budget: budgetVal, variance: varianceVal, percentUsed: pctVal };
      extractLineItems(row, "Income", result.lineItems);
    } else if (group === "Expenses") {
      result.expenses = { actual: Math.abs(actualVal), budget: Math.abs(budgetVal), variance: varianceVal, percentUsed: pctVal };
      extractLineItems(row, "Expenses", result.lineItems);
    } else if (group === "NetIncome") {
      result.net = { actual: actualVal, budget: budgetVal, variance: varianceVal, percentUsed: pctVal };
    }
  }

  return result;
}

function extractLineItems(
  sectionRow: any,
  group: string,
  lineItems: { category: string; group: string; actual: number; budget: number; variance: number }[]
) {
  const subRows: any[] = sectionRow.Rows?.Row ?? [];
  for (const sub of subRows) {
    if (sub.type === "Data" && sub.ColData) {
      const category = sub.ColData[0]?.value ?? "Other";
      const budget = parseFloat(sub.ColData[1]?.value ?? "0");
      const actual = parseFloat(sub.ColData[2]?.value ?? "0");
      const variance = parseFloat(sub.ColData[3]?.value ?? "0");
      lineItems.push({ category, group, actual: Math.abs(actual), budget: Math.abs(budget), variance });
    } else if (sub.type === "Section" && sub.Rows) {
      // Recurse into sub-sections
      extractLineItems(sub, group, lineItems);
    }
  }
}

// Fetch prior-year P&L for the same month as the current month (for trend comparison)
export const fetchPriorYearPnl = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const now = new Date();
    const priorYear = now.getFullYear() - 1;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(priorYear, now.getMonth() + 1, 0).getDate();
    const startDate = `${priorYear}-${month}-01`;
    const endDate = `${priorYear}-${month}-${String(lastDay).padStart(2, "0")}`;

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
      reportType: "profit_loss_prior_year",
      data: JSON.stringify(data),
      periodStart: startDate,
      periodEnd: endDate,
    });
  },
});

// Sync all data
export const syncAllData = internalAction({
  handler: async (ctx) => {
    try {
      await ctx.runAction(internal.quickbooksActions.fetchProfitAndLoss, {});
      await ctx.runAction(internal.quickbooksActions.fetchPriorYearPnl, {});
      await ctx.runAction(internal.quickbooksActions.fetchExpenses, {});
      await ctx.runAction(internal.quickbooksActions.fetchVendors, {});
      await ctx.runAction(internal.quickbooksActions.fetchAccounts, {});
      await ctx.runAction(internal.quickbooksActions.fetchClasses, {});
      await ctx.runAction(internal.quickbooksActions.fetchCashFlow, {});
      await ctx.runAction(internal.quickbooksActions.fetchBalanceSheet, {});
      // Budgets must be fetched before BvA since BvA reads cached budgets + classes
      await ctx.runAction(internal.quickbooksActions.fetchBudgets, {});
      await ctx.runAction(internal.quickbooksActions.fetchBudgetVsActuals, {});
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
