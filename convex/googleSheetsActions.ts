"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Sync grant tracker from Google Sheets
export const syncGrantTracker = internalAction({
  handler: async (ctx) => {
    const { google } = await import("googleapis");

    const config = await ctx.runQuery(internal.googleSheetsInternal.getFullConfig);
    if (!config) throw new Error("Google Sheets not configured");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A2:J1000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No grant data found in spreadsheet");
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;

      const grantData = {
        sheetRowId: `row-${i + 2}`,
        grantName: row[0] || "",
        funder: row[1] || "",
        totalAmount: parseFloat(row[2]?.replace(/[$,]/g, "")) || 0,
        amountSpent: row[3] ? parseFloat(row[3]?.replace(/[$,]/g, "")) : undefined,
        startDate: row[4] || "",
        endDate: row[5] || "",
        status: normalizeStatus(row[6]),
        restrictions: row[7] || undefined,
        deadlines: row[8] ? JSON.stringify(row[8].split(",").map((s: string) => s.trim()).filter(Boolean)) : undefined,
        notes: row[9] || undefined,
        lastSyncAt: Date.now(),
      };

      await ctx.runMutation(internal.googleSheetsInternal.upsertGrant, grantData);
    }

    await ctx.runMutation(internal.googleSheetsInternal.updateLastSync, {
      configId: config._id,
    });
  },
});

// Manual sync trigger
export const triggerSync = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.googleSheetsActions.syncGrantTracker, {});
  },
});

function normalizeStatus(
  status: string | undefined
): "active" | "pending" | "completed" | "cultivating" {
  if (!status) return "pending";
  const lower = status.toLowerCase().trim();
  if (lower === "active") return "active";
  if (lower === "completed" || lower === "closed") return "completed";
  if (lower === "cultivating" || lower === "prospecting") return "cultivating";
  return "pending";
}
