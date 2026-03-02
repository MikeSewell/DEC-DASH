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
import { useTheme } from "@/hooks/useTheme";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { FALLBACK_INCOME_TREND, FALLBACK_DONATION_SOURCES } from "@/lib/dashboardFallbacks";

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

// ─── DonationChart inner component ─────────────────────────────────────────────

interface DonationChartProps {
  data: {
    months: Array<{ label: string; total: number; breakdown: Record<string, number> }>;
    accounts: string[];
    fetchedAt: number | null;
  };
  isFallback?: boolean;
}

function DonationChart({ data, isFallback }: DonationChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { months, accounts, fetchedAt } = data;

  // Grand total across all months
  const grandTotal = months.reduce((sum, m) => sum + m.total, 0);

  // Compute sources for the source cards
  const sources: DonationSource[] = isFallback
    ? FALLBACK_DONATION_SOURCES.map((s) => ({ ...s }))
    : accounts.map((accountName) => {
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

  // Build chart data (DON-01 + DON-02)
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

      {/* Sync timestamp — only for live data */}
      {fetchedAt && (
        <p className="text-xs text-muted text-right">
          Last synced: {timeAgo(fetchedAt)}
        </p>
      )}

      {/* Sample data notice — only in fallback mode */}
      {isFallback && (
        <p className="text-xs text-muted/50 text-right">
          Sample data — connect QuickBooks and configure income accounts for live figures
        </p>
      )}
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────────

export default function DonationPerformance() {
  const config = useQuickBooksConfig();
  const incomeTrend = useIncomeTrend();

  // Loading state
  if (config === undefined || incomeTrend === undefined) {
    return <ChartSkeleton />;
  }

  // QB not connected — show fallback chart
  if (config === null) {
    return <DonationChart data={FALLBACK_INCOME_TREND} isFallback={true} />;
  }

  // Not configured (no income accounts selected) — show fallback chart
  if (incomeTrend === null || !incomeTrend.configured) {
    return <DonationChart data={FALLBACK_INCOME_TREND} isFallback={true} />;
  }

  // Live data
  return <DonationChart data={incomeTrend} isFallback={false} />;
}
