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
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { FALLBACK_INCOME_TREND } from "@/lib/dashboardFallbacks";

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
  const { months, accounts, fetchedAt } = data;

  // Grand total across all months
  const grandTotal = months.reduce((sum, m) => sum + m.total, 0);

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
        pointBorderColor: "rgba(255,254,249,0.9)",
        pointBorderWidth: 1.5,
        borderWidth: 2,
      });
    }
  }

  // Total line (always shown)
  datasets.push({
    label: accounts.length > 1 ? "Total Income" : (accounts[0] ?? "Income"),
    data: months.map((m) => m.total),
    borderColor: "#2D6A4F",
    backgroundColor: accounts.length > 1 ? "transparent" : "rgba(45, 106, 79, 0.1)",
    fill: accounts.length <= 1,
    tension: 0.3,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: "#1B4332",
    pointBorderColor: "#FFFEF9",
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
        },
      },
      tooltip: {
        backgroundColor: "rgba(27,67,50,0.9)",
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
        },
        grid: {
          color: "rgba(45,106,79,0.06)",
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Nunito', sans-serif", size: 11 },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(grandTotal)}</p>
          <p className="text-xs text-muted mt-1">Total Income (12 mo)</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(avgMonthly)}</p>
          <p className="text-xs text-muted mt-1">Avg Monthly</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className={`text-2xl font-bold ${trendPositive ? "text-success" : "text-danger"}`}>
            {trendPositive ? "+" : ""}{trendPct}%
          </p>
          <p className="text-xs text-muted mt-1">vs Previous Month</p>
        </div>
      </div>

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
