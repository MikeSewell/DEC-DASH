"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useProfitAndLoss } from "@/hooks/useQuickBooks";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProfitLossData } from "@/types";
import { FALLBACK_PNL } from "@/lib/dashboardFallbacks";

ChartJS.register(ArcElement, Tooltip, Legend);

const EXPENSE_COLORS = [
  "#1B4332",
  "#2D6A4F",
  "#40916C",
  "#52B788",
  "#6BBF59",
  "#8CC63F",
  "#74C69D",
  "#95D5B2",
  "#3D7A52",
  "#A3D65A",
];

interface ProfitLossContentProps {
  data: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    expensesByCategory: Record<string, number>;
    period?: { start: string; end: string };
  };
  fetchedAt: number | null;
  isFallback?: boolean;
}

function ProfitLossContent({ data, fetchedAt, isFallback }: ProfitLossContentProps) {
  const { totalRevenue, totalExpenses, netIncome, expensesByCategory } = data;
  const isPositive = (netIncome || 0) >= 0;

  // Expense breakdown for donut chart
  const categories = Object.entries(expensesByCategory ?? {})
    .filter(([, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]);

  const donutData = {
    labels: categories.map(([cat]) => cat),
    datasets: [
      {
        data: categories.map(([, val]) => val),
        backgroundColor: categories.map((_, i) => EXPENSE_COLORS[i % EXPENSE_COLORS.length]),
        borderWidth: 2,
        borderColor: "rgba(255,254,249,0.9)",
        hoverOffset: 6,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle" as const,
          padding: 12,
          font: { size: 11, family: "'Nunito', sans-serif" },
          generateLabels: (chart: ChartJS) => {
            const dataset = chart.data.datasets[0];
            const labels = chart.data.labels as string[];
            return labels.map((label, i) => ({
              text: `${label}: ${formatCurrency((dataset.data[i] as number) || 0)}`,
              fillStyle: (dataset.backgroundColor as string[])[i],
              strokeStyle: "transparent",
              index: i,
              hidden: false,
              fontColor: undefined,
              lineWidth: 0,
              pointStyle: "circle" as const,
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(27,67,50,0.9)",
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: "'Nunito', sans-serif" },
        bodyFont: { family: "'Nunito', sans-serif" },
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) => {
            const val = ctx.raw as number;
            const total = (totalExpenses || 1);
            const pct = ((val / total) * 100).toFixed(1);
            return `${ctx.label}: ${formatCurrency(val || 0)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Three stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue || 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Total Expenses</p>
          <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses || 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Net Income</p>
          <p className={cn("text-2xl font-bold", isPositive ? "text-success" : "text-danger")}>
            {formatCurrency(netIncome || 0)}
          </p>
        </div>
      </div>

      {/* Expense breakdown donut */}
      {categories.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Expense Breakdown</h4>
          <div style={{ height: 280 }}>
            <Doughnut data={donutData} options={donutOptions} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted text-center py-4">No expense categories available.</p>
      )}

      {/* Period info */}
      {data.period && (
        <p className="text-xs text-muted text-right">
          Period: {data.period.start} to {data.period.end}
        </p>
      )}

      {/* Fallback indicator */}
      {isFallback && (
        <p className="text-xs text-muted/50 text-right">
          Sample data &mdash; <a href="/admin" className="hover:underline">connect QuickBooks</a> for live figures
        </p>
      )}

      {/* Live sync timestamp */}
      {!isFallback && fetchedAt && (
        <p className="text-xs text-muted text-right">
          Last synced: {timeAgo(fetchedAt)}
        </p>
      )}
    </div>
  );
}

export default function ProfitLoss() {
  const plResult = useProfitAndLoss();

  if (plResult === undefined) {
    return <ChartSkeleton />;
  }

  if (plResult === null) {
    return <ProfitLossContent data={FALLBACK_PNL} fetchedAt={null} isFallback={true} />;
  }

  const data = plResult.data as ProfitLossData | null;
  if (!data) {
    return <ProfitLossContent data={FALLBACK_PNL} fetchedAt={null} isFallback={true} />;
  }

  return <ProfitLossContent data={data} fetchedAt={plResult.fetchedAt} isFallback={false} />;
}
