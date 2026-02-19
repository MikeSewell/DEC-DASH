"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useProfitAndLoss } from "@/hooks/useQuickBooks";
import Spinner from "@/components/ui/Spinner";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProfitLossData } from "@/types";

ChartJS.register(ArcElement, Tooltip, Legend);

const EXPENSE_COLORS = [
  "#1B4D3E",
  "#2D7A5F",
  "#D4A843",
  "#E8C96A",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#14B8A6",
  "#6366F1",
];

export default function ProfitLoss() {
  const plResult = useProfitAndLoss();

  if (plResult === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (plResult === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm">No P&L data available.</p>
        <p className="text-xs mt-1">Connect QuickBooks to view Profit & Loss information.</p>
      </div>
    );
  }

  const data = plResult.data as ProfitLossData | null;
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <p className="text-sm">P&L report is empty.</p>
      </div>
    );
  }

  const { totalRevenue, totalExpenses, netIncome, expensesByCategory } = data;
  const isPositive = netIncome >= 0;

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
        borderColor: "rgba(255,255,255,0.8)",
        hoverOffset: 6,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle" as const,
          padding: 12,
          font: { size: 11 },
          generateLabels: (chart: ChartJS) => {
            const dataset = chart.data.datasets[0];
            const labels = chart.data.labels as string[];
            return labels.map((label, i) => ({
              text: `${label}: ${formatCurrency((dataset.data[i] as number) ?? 0)}`,
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
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) => {
            const val = ctx.raw as number;
            const total = totalExpenses || 1;
            const pct = ((val / total) * 100).toFixed(1);
            return `${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Three stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Total Expenses</p>
          <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Net Income</p>
          <p className={cn("text-2xl font-bold", isPositive ? "text-success" : "text-danger")}>
            {formatCurrency(netIncome)}
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

      {plResult.fetchedAt && (
        <p className="text-xs text-muted text-right">
          Last synced: {timeAgo(plResult.fetchedAt)}
        </p>
      )}
    </div>
  );
}
