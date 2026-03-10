"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useIncomeTrend, useQuickBooksConfig } from "@/hooks/useQuickBooks";
import { usePayPalConfig, usePayPalData } from "@/hooks/usePayPal";
import { useTheme } from "@/hooks/useTheme";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { formatCurrency, timeAgo } from "@/lib/utils";
import Link from "next/link";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PALETTE = [
  "#1B5E6B", "#2B9E9E", "#5BBFB5", "#6BBF59",
  "#8CC63F", "#7DD4C8", "#1A7A7A", "#2D6A4F",
];

// ─── Icon helpers ────────────────────────────────────────────────────────────────

function getAccountIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("individual") || lower.includes("donation")) return "heart";
  if (lower.includes("grant") || lower.includes("foundation")) return "building";
  if (lower.includes("event")) return "calendar";
  return "banknotes";
}

function SourceIcon({ icon }: { icon: string }) {
  if (icon === "heart") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    );
  }
  if (icon === "building") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    );
  }
  if (icon === "calendar") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    );
  }
  // Default: banknotes
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

// ─── Donation source cards sub-component ────────────────────────────────────────

interface DonationSource {
  name: string;
  amount: number;
  icon: string;
}

function DonationSourceCards({ sources, total }: { sources: DonationSource[]; total: number }) {
  if (sources.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sources.map((source) => {
        const pct = total > 0 ? Math.round((source.amount / total) * 100) : 0;
        return (
          <div
            key={source.name}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 border-l-4 border-l-primary shadow-[var(--warm-shadow-sm)] hover-lift"
          >
            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SourceIcon icon={source.icon} />
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{source.name}</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(source.amount)}</p>
            </div>
            {/* Percentage */}
            <span className="text-sm text-muted font-medium shrink-0">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Top Payers sub-component (PayPal only) ──────────────────────────────────────

interface TopPayer {
  name: string;
  email: string;
  total: number;
  transaction_count: number;
}

function TopPayersCards({ payers }: { payers: TopPayer[] }) {
  if (payers.length === 0) return null;
  const top5 = payers.slice(0, 5);
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">Top Donors</h4>
      <div className="space-y-2">
        {top5.map((payer, i) => (
          <div
            key={payer.email + i}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-[var(--warm-shadow-sm)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{payer.name}</p>
              <p className="text-xs text-muted truncate">{payer.transaction_count} transaction{payer.transaction_count !== 1 ? "s" : ""}</p>
            </div>
            <p className="text-sm font-bold text-primary shrink-0">{formatCurrency(payer.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DonationChart inner component (QB data) ─────────────────────────────────────

interface DonationChartProps {
  data: {
    months: Array<{ label: string; total: number; breakdown: Record<string, number> }>;
    accounts: string[];
    fetchedAt: number | null;
  };
  source: "quickbooks" | "paypal";
}

function DonationChart({ data, source }: DonationChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { months, accounts, fetchedAt } = data;

  // Grand total across all months
  const grandTotal = months.reduce((sum, m) => sum + m.total, 0);

  // Compute sources for the source cards
  const sources: DonationSource[] = accounts.map((accountName) => {
        const amount = months.reduce((sum, m) => sum + (m.breakdown[accountName] ?? 0), 0);
        return { name: accountName, amount, icon: getAccountIcon(accountName) };
      });
  const sourcesTotal = sources.reduce((sum, s) => sum + s.amount, 0);

  // Average monthly income
  const avgMonthly = months.length > 0 ? grandTotal / months.length : 0;

  // Current month vs previous month trend
  const currentMonthTotal = months.length > 0 ? months[months.length - 1].total : 0;
  const prevMonthTotal = months.length > 1 ? months[months.length - 2].total : 0;
  const trendPct = prevMonthTotal > 0
    ? Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
    : currentMonthTotal > 0 ? 100 : 0;
  const trendPositive = currentMonthTotal >= prevMonthTotal;

  // Build chart data
  const labels = months.map((m) => m.label);
  const datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string | boolean;
    fill?: boolean;
    tension: number;
    pointRadius: number;
    pointHoverRadius: number;
    pointBackgroundColor: string;
    pointBorderColor: string;
    pointBorderWidth: number;
    borderWidth: number;
  }[] = [];

  // If multiple accounts, add a line per account
  if (accounts.length > 1) {
    for (let i = 0; i < accounts.length; i++) {
      const accountName = accounts[i];
      const color = PALETTE[i % PALETTE.length];
      datasets.push({
        label: accountName,
        data: months.map((m) => m.breakdown[accountName] ?? 0),
        borderColor: color,
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: isDark ? "#1E1E1E" : "rgba(255,254,249,0.9)",
        pointBorderWidth: 1.5,
        borderWidth: 2,
      });
    }
  }

  // Total line (always shown)
  datasets.push({
    label: accounts.length > 1 ? "Total Income" : (accounts[0] ?? "Income"),
    data: months.map((m) => m.total),
    borderColor: isDark ? "#26A69A" : "#2D6A4F",
    backgroundColor: accounts.length > 1 ? "transparent" : (isDark ? "rgba(38,166,154,0.1)" : "rgba(45, 106, 79, 0.1)"),
    fill: accounts.length <= 1,
    tension: 0.3,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: isDark ? "#26A69A" : "#1B4332",
    pointBorderColor: isDark ? "#1E1E1E" : "#FFFEF9",
    pointBorderWidth: 2,
    borderWidth: accounts.length > 1 ? 3 : 2,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData = { labels, datasets } as any;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: accounts.length > 1,
        position: "top" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle" as const,
          padding: 16,
          font: { size: 11, family: "'Nunito', sans-serif" },
          color: isDark ? "#CCCCCC" : undefined,
        },
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(30,30,30,0.95)" : "rgba(27,67,50,0.9)",
        titleColor: "#FFFFFF",
        bodyColor: isDark ? "#CCCCCC" : "#FFFFFF",
        borderColor: isDark ? "#404040" : "transparent",
        borderWidth: isDark ? 1 : 0,
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: "'Nunito', sans-serif" },
        bodyFont: { family: "'Nunito', sans-serif" },
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) =>
            `${ctx.dataset.label}: ${formatCurrency(ctx.raw as number)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => formatCurrency(Number(value)),
          font: { family: "'Nunito', sans-serif", size: 11 },
          color: isDark ? "#999999" : undefined,
        },
        grid: {
          color: isDark ? "rgba(255,255,255,0.06)" : "rgba(45,106,79,0.06)",
        },
      },
      x: {
        grid: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(45,106,79,0.04)" },
        ticks: {
          font: { family: "'Nunito', sans-serif", size: 11 },
          color: isDark ? "#999999" : undefined,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-3xl font-extrabold text-foreground">{formatCurrency(grandTotal)}</p>
          <p className="text-xs text-muted mt-1">Total Income (12 mo)</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-3xl font-extrabold text-foreground">{formatCurrency(avgMonthly)}</p>
          <p className="text-xs text-muted mt-1">Avg Monthly</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className={`text-3xl font-extrabold ${trendPositive ? "text-success" : "text-danger"}`}>
            {trendPositive ? "+" : ""}{trendPct}%
          </p>
          <p className="text-xs text-muted mt-1">vs Previous Month</p>
        </div>
      </div>

      {/* Donation source cards */}
      <DonationSourceCards sources={sources} total={sourcesTotal} />

      {/* Line chart */}
      {months.length > 0 ? (
        <div style={{ height: 300 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : (
        <p className="text-sm text-muted text-center py-8">
          No monthly income data to chart.
        </p>
      )}

      {/* Sync timestamp */}
      {fetchedAt && (
        <p className="text-xs text-muted text-right">
          Source: {source === "paypal" ? "PayPal" : "QuickBooks"} &middot; Last synced: {timeAgo(fetchedAt)}
        </p>
      )}

    </div>
  );
}

// ─── PayPal data adapter — converts paypalCache into DonationChart format ────

function PayPalDonationView({ data }: {
  data: {
    totalIncoming: number;
    totalOutgoing: number;
    netAmount: number;
    averageTransaction: number;
    monthlyBreakdown: Array<{ month: string; count: number; total: number; incoming: number; outgoing: number; net: number }>;
    topPayers: Array<{ name: string; email: string; total: number; transaction_count: number }>;
    fetchedAt: number;
  };
}) {
  // Convert PayPal monthly breakdown → DonationChart format
  const months = data.monthlyBreakdown.map((m) => {
    const [year, monthNum] = m.month.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
    return {
      label,
      total: m.incoming,
      breakdown: { "PayPal Donations": m.incoming } as Record<string, number>,
    };
  });

  const chartData = {
    months,
    accounts: ["PayPal Donations"],
    fetchedAt: data.fetchedAt,
  };

  return (
    <div className="space-y-6">
      <DonationChart data={chartData} source="paypal" />
      <TopPayersCards payers={data.topPayers} />
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────────

export default function DonationPerformance() {
  const qbConfig = useQuickBooksConfig();
  const incomeTrend = useIncomeTrend();
  const paypalConfig = usePayPalConfig();
  const paypalData = usePayPalData();

  // Loading state — wait for both PayPal and QB checks
  if (paypalConfig === undefined || qbConfig === undefined) {
    return <ChartSkeleton />;
  }

  // Prefer PayPal data when connected and has data
  if (paypalConfig !== null && paypalData !== undefined) {
    if (paypalData !== null && paypalData.monthlyBreakdown.length > 0) {
      return <PayPalDonationView data={paypalData} />;
    }
    // PayPal connected but no data yet — still loading or first sync pending
    if (paypalData === undefined) {
      return <ChartSkeleton />;
    }
  }

  // Fall back to QB income trend
  if (incomeTrend === undefined) {
    return <ChartSkeleton />;
  }

  // Neither connected
  if (qbConfig === null && paypalConfig === null) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No donation data</p>
        <p className="text-xs text-muted">
          <Link href="/admin?tab=paypal" className="text-primary hover:underline">Connect PayPal</Link> or <Link href="/admin?tab=quickbooks" className="text-primary hover:underline">QuickBooks</Link> to see income trends.
        </p>
      </div>
    );
  }

  // QB connected but no income accounts configured
  if (qbConfig !== null && (incomeTrend === null || !incomeTrend.configured)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">Income accounts not configured</p>
        <p className="text-xs text-muted">
          <Link href="/expenses" className="text-primary hover:underline">Select income accounts</Link> in the Donation Performance settings.
        </p>
      </div>
    );
  }

  // QB data available
  if (incomeTrend && incomeTrend.configured) {
    return <DonationChart data={incomeTrend} source="quickbooks" />;
  }

  return null;
}
