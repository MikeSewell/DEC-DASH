"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── PayPal OAuth2 token exchange ────────────────────────────────────────────

async function getAccessToken(clientId: string, clientSecret: string, environment: string): Promise<string> {
  const baseUrl = environment === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PayPal OAuth failed: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ─── Fetch transactions in 31-day chunks (PayPal max) ────────────────────────

interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_event_code: string;
    transaction_initiation_date: string;
    transaction_amount: {
      currency_code: string;
      value: string;
    };
    fee_amount?: {
      currency_code: string;
      value: string;
    };
    payer_info?: {
      email_address?: string;
      payer_name?: {
        given_name?: string;
        surname?: string;
      };
    };
  };
  payer_info?: {
    email_address?: string;
    payer_name?: {
      given_name?: string;
      surname?: string;
    };
  };
}

async function fetchAllTransactions(
  accessToken: string,
  baseUrl: string,
  startDate: string,
  endDate: string
): Promise<PayPalTransaction[]> {
  const allTransactions: PayPalTransaction[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Chunk into 31-day windows (PayPal API limit)
  let chunkStart = new Date(start);
  while (chunkStart < end) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + 31);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const params = new URLSearchParams({
        start_date: chunkStart.toISOString(),
        end_date: chunkEnd.toISOString(),
        fields: "transaction_info,payer_info",
        page_size: "500",
        page: String(page),
      });

      const response = await fetch(`${baseUrl}/v1/reporting/transactions?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`PayPal transaction fetch failed (page ${page}): ${response.status} — ${errorBody}`);
        break;
      }

      const data = await response.json();
      totalPages = data.total_pages || 1;

      if (data.transaction_details) {
        allTransactions.push(...data.transaction_details);
      }

      page++;
    }

    chunkStart = new Date(chunkEnd);
  }

  return allTransactions;
}

// ─── Process transactions into summary, monthly breakdown, top payers ────────

interface MonthlyBreakdown {
  month: string;
  count: number;
  total: number;
  incoming: number;
  outgoing: number;
  net: number;
}

interface TopPayer {
  name: string;
  email: string;
  total: number;
  transaction_count: number;
}

function processTransactions(transactions: PayPalTransaction[]) {
  let totalIncoming = 0;
  let totalOutgoing = 0;
  let totalTransactions = 0;

  const monthlyMap = new Map<string, MonthlyBreakdown>();
  const payerMap = new Map<string, TopPayer>();

  for (const tx of transactions) {
    const info = tx.transaction_info;
    const amount = parseFloat(info.transaction_amount.value);

    // Skip zero-amount records (authorizations, etc.)
    if (amount === 0) continue;

    totalTransactions++;

    if (amount > 0) {
      totalIncoming += amount;
    } else {
      totalOutgoing += Math.abs(amount);
    }

    // Monthly breakdown
    const date = new Date(info.transaction_initiation_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        count: 0,
        total: 0,
        incoming: 0,
        outgoing: 0,
        net: 0,
      });
    }
    const monthly = monthlyMap.get(monthKey)!;
    monthly.count++;
    monthly.total += Math.abs(amount);
    if (amount > 0) {
      monthly.incoming += amount;
    } else {
      monthly.outgoing += Math.abs(amount);
    }
    monthly.net += amount;

    // Top payers (only incoming)
    if (amount > 0) {
      const payer = tx.payer_info || info.payer_info;
      const email = payer?.email_address || "unknown";
      const name = payer?.payer_name
        ? `${payer.payer_name.given_name || ""} ${payer.payer_name.surname || ""}`.trim()
        : "Unknown";
      const payerKey = email !== "unknown" ? email : name;

      if (!payerMap.has(payerKey)) {
        payerMap.set(payerKey, { name, email, total: 0, transaction_count: 0 });
      }
      const p = payerMap.get(payerKey)!;
      p.total += amount;
      p.transaction_count++;
    }
  }

  const netAmount = totalIncoming - totalOutgoing;
  const averageTransaction = totalTransactions > 0 ? (totalIncoming + totalOutgoing) / totalTransactions : 0;

  // Sort monthly by date
  const monthlyBreakdown = Array.from(monthlyMap.values()).sort(
    (a, b) => a.month.localeCompare(b.month)
  );

  // Top 20 payers by total
  const topPayers = Array.from(payerMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  return {
    totalTransactions,
    totalIncoming: Math.round(totalIncoming * 100) / 100,
    totalOutgoing: Math.round(totalOutgoing * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    averageTransaction: Math.round(averageTransaction * 100) / 100,
    monthlyBreakdown,
    topPayers,
  };
}

// ─── Main sync action ────────────────────────────────────────────────────────

export const syncPayPal = internalAction({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.paypalInternal.getFullConfig);
    if (!config) {
      throw new Error("PayPal not configured");
    }

    const baseUrl = config.environment === "sandbox"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

    console.log(`PayPal sync starting (${config.environment})...`);

    const accessToken = await getAccessToken(config.clientId, config.clientSecret, config.environment);

    // Last 12 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const transactions = await fetchAllTransactions(
      accessToken,
      baseUrl,
      startDate.toISOString(),
      endDate.toISOString()
    );

    console.log(`PayPal fetched ${transactions.length} transactions`);

    const processed = processTransactions(transactions);

    // Keep only summary of transaction details (not full payload — too large)
    const transactionSummary = transactions.slice(0, 100).map((tx) => ({
      id: tx.transaction_info.transaction_id,
      date: tx.transaction_info.transaction_initiation_date,
      amount: tx.transaction_info.transaction_amount.value,
      currency: tx.transaction_info.transaction_amount.currency_code,
      payer: tx.payer_info?.payer_name
        ? `${tx.payer_info.payer_name.given_name || ""} ${tx.payer_info.payer_name.surname || ""}`.trim()
        : tx.transaction_info.payer_info?.payer_name
          ? `${tx.transaction_info.payer_info.payer_name.given_name || ""} ${tx.transaction_info.payer_info.payer_name.surname || ""}`.trim()
          : "Unknown",
    }));

    await ctx.runMutation(internal.paypalInternal.upsertCache, {
      totalTransactions: processed.totalTransactions,
      totalIncoming: processed.totalIncoming,
      totalOutgoing: processed.totalOutgoing,
      netAmount: processed.netAmount,
      averageTransaction: processed.averageTransaction,
      monthlyBreakdown: JSON.stringify(processed.monthlyBreakdown),
      topPayers: JSON.stringify(processed.topPayers),
      transactionDetails: JSON.stringify(transactionSummary),
      periodStart: startDate.toISOString().slice(0, 10),
      periodEnd: endDate.toISOString().slice(0, 10),
      fetchedAt: Date.now(),
    });

    console.log(`PayPal sync completed: ${processed.totalTransactions} transactions, $${processed.totalIncoming} incoming`);
  },
});

// Public action — allows admin UI "Sync Now" button
export const triggerSync = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.paypalActions.syncPayPal, {});
  },
});
