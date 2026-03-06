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

// Fetch expenses (paginated — QB caps at 1000 per request)
export const fetchExpenses = internalAction({
  args: { startDate: v.optional(v.string()), endDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const startDate = args.startDate || getFirstDayOfYear();
    const endDate = args.endDate || getToday();

    const PAGE_SIZE = 1000;
    let startPosition = 1;
    const allPurchases: any[] = [];

    // Paginate until we get fewer results than PAGE_SIZE
    while (true) {
      const q = `SELECT * FROM Purchase WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;
      const response = await fetch(
        `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(q)}&minorversion=65`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) throw new Error(`QB API error: ${response.status}`);
      const data = await response.json();
      const purchases: any[] = data?.QueryResponse?.Purchase ?? [];
      allPurchases.push(...purchases);

      if (purchases.length < PAGE_SIZE) break;
      startPosition += PAGE_SIZE;
    }

    // Wrap in the same QueryResponse shape the downstream parser expects
    const data = { QueryResponse: { Purchase: allPurchases } };

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
        let url = `${baseUrl}/v3/company/${realmId}/reports/BudgetVsActuals?start_date=${startDate}&end_date=${endDate}&accounting_method=Accrual&budget=${combo.budgetId}&minorversion=65`;
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

    // Write to quickbooksCache for backward compatibility (existing UI components still consume this)
    await ctx.runMutation(internal.quickbooksInternal.cacheReport, {
      reportType: "budget_vs_actuals",
      data: JSON.stringify(results),
      periodStart: startDate,
      periodEnd: endDate,
    });

    // Read grants for fuzzy matching and write structured records to budgetCache
    const grants = await ctx.runQuery(internal.budgetInternal.getAllGrants);

    const budgetRecords = results.map((parsed: any, idx: number) => {
      const combo = combinations[idx];
      const matchedGrantId = matchBudgetToGrant(combo.className, grants);
      return {
        budgetId: combo.budgetId,
        budgetName: combo.budgetName,
        classId: combo.classId,
        className: combo.className,
        revenueActual: parsed.revenue?.actual ?? 0,
        revenueBudget: parsed.revenue?.budget ?? 0,
        revenueVariance: parsed.revenue?.variance ?? 0,
        revenuePercentUsed: parsed.revenue?.percentUsed ?? 0,
        expenseActual: parsed.expenses?.actual ?? 0,
        expenseBudget: parsed.expenses?.budget ?? 0,
        expenseVariance: parsed.expenses?.variance ?? 0,
        expensePercentUsed: parsed.expenses?.percentUsed ?? 0,
        netActual: parsed.net?.actual ?? 0,
        netBudget: parsed.net?.budget ?? 0,
        netVariance: parsed.net?.variance ?? 0,
        netPercentUsed: parsed.net?.percentUsed ?? 0,
        lineItems: JSON.stringify(parsed.lineItems ?? []),
        periodStart: startDate,
        periodEnd: endDate,
        grantId: matchedGrantId ?? undefined,
        syncedAt: Date.now(),
      };
    });

    if (budgetRecords.length > 0) {
      await ctx.runMutation(internal.budgetInternal.batchUpsertBudgetRecords, {
        records: JSON.stringify(budgetRecords),
      });
    }
  },
});

// Fuzzy-match a QB class name to a grant record by fundingSource / programName
function matchBudgetToGrant(
  className: string,
  grants: Array<{ _id: any; fundingSource: string; programName?: string | null }>
): any | null {
  const classLower = (className ?? "").toLowerCase().trim();
  if (!classLower || classLower === "all") return null;

  for (const grant of grants) {
    const funderLower = (grant.fundingSource ?? "").toLowerCase().trim();
    const programLower = (grant.programName ?? "").toLowerCase().trim();
    if (
      funderLower.includes(classLower) ||
      classLower.includes(funderLower) ||
      (programLower && (programLower.includes(classLower) || classLower.includes(programLower)))
    ) {
      return grant._id;
    }
  }
  return null;
}

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

// Fetch P&L with monthly breakdown for income trend chart
export const fetchIncomeTrend = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    // Last 12 months: from the 1st of the month 11 months ago to today
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const startDate = startMonth.toISOString().split("T")[0];
    const endDate = getToday();

    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&summarize_column_by=Month&minorversion=65`,
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
      reportType: "income_trend",
      data: JSON.stringify(data),
      periodStart: startDate,
      periodEnd: endDate,
    });
  },
});

// Fetch prior-year YTD P&L (Jan 1 to today's date in prior year) for trend comparison
export const fetchPriorYearPnl = internalAction({
  handler: async (ctx) => {
    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    const now = new Date();
    const priorYear = now.getFullYear() - 1;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const currentDay = String(now.getDate()).padStart(2, "0");
    const startDate = `${priorYear}-01-01`;
    const endDate = `${priorYear}-${month}-${currentDay}`;

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
      await ctx.runAction(internal.quickbooksActions.fetchIncomeTrend, {});
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
