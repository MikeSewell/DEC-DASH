"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useProfitAndLoss } from "@/hooks/useQuickBooks";
import { useTheme } from "@/hooks/useTheme";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProfitLossData } from "@/types";
import Link from "next/link";

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
}

function ProfitLossContent({ data, fetchedAt }: ProfitLossContentProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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
        borderColor: isDark ? "rgba(30,30,30,0.9)" : "rgba(255,254,249,0.9)",
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
          color: isDark ? "#CCCCCC" : "#2C3E2D",
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
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Total Revenue</p>
          <p className="text-3xl font-extrabold text-success">{formatCurrency(totalRevenue || 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Total Expenses</p>
          <p className="text-3xl font-extrabold text-danger">{formatCurrency(totalExpenses || 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xs text-muted mb-1 uppercase tracking-wide">Net Income</p>
          <p className={cn("text-3xl font-extrabold", isPositive ? "text-success" : "text-danger")}>
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

      {/* Expense category progress bars */}
      {categories.length > 0 && (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Expense Categories</h4>
          <div className="space-y-1">
            {categories.map(([name, amount], i) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              const fillColor = EXPENSE_COLORS[i % EXPENSE_COLORS.length];
              return (
                <div key={name} className="flex items-center gap-2 py-1.5 dads-category-bar">
                  <span className="text-sm font-medium text-foreground w-36 shrink-0 truncate" title={name}>
                    {name}
                  </span>
                  <div className="flex-1 mx-3">
                    <div className="h-2 rounded-full bg-border/30">
                      <div
                        className="h-2 rounded-full transition-[width] duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: fillColor,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {formatCurrency(amount)}
                  </span>
                  <span className="text-xs text-muted shrink-0 w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Period info */}
      {data.period && (
        <p className="text-xs text-muted text-right">
          Period: {data.period.start} to {data.period.end}
        </p>
      )}

      {/* Live sync timestamp */}
      {fetchedAt && (
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
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No profit &amp; loss data</p>
        <p className="text-xs text-muted">
          <Link href="/admin" className="text-primary hover:underline">Connect QuickBooks</Link> to see revenue, expenses, and breakdowns.
        </p>
      </div>
    );
  }

  const data = plResult.data as ProfitLossData | null;
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <p className="text-sm text-muted">No P&amp;L data available yet.</p>
      </div>
    );
  }

  return <ProfitLossContent data={data} fetchedAt={plResult.fetchedAt} />;
}
