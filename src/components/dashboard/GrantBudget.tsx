"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useBudgetSummary, useBudgetRecords } from "@/hooks/useQuickBooks";
import { formatCurrency, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PALETTE = ["#2D6A4F", "#52B788", "#6BBF59", "#8CC63F", "#1B4332", "#74C69D", "#40916C", "#95D5B2"];

function useChartConfig() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const CHART_TOOLTIP = {
    backgroundColor: isDark ? "rgba(30,30,30,0.95)" : "rgba(27,67,50,0.9)",
    titleColor: "#FFFFFF",
    bodyColor: isDark ? "#CCCCCC" : "#FFFFFF",
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
    borderWidth: isDark ? 1 : 0,
    cornerRadius: 12,
    padding: 12,
    titleFont: { family: "'Nunito', sans-serif" },
    bodyFont: { family: "'Nunito', sans-serif" },
  };

  const PIE_LEGEND = {
    position: "right" as const,
    labels: {
      usePointStyle: true,
      pointStyle: "circle" as const,
      padding: 12,
      font: { size: 11, family: "'Nunito', sans-serif" },
      color: isDark ? "#CCCCCC" : undefined,
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: PIE_LEGEND,
      tooltip: CHART_TOOLTIP,
    },
  };

  const makeHorizontalBarOptions = (label: string) => ({
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          usePointStyle: true,
          pointStyle: "circle" as const,
          font: { size: 11, family: "'Nunito', sans-serif" },
          color: isDark ? "#CCCCCC" : undefined,
        },
      },
      tooltip: CHART_TOOLTIP,
      title: { display: false, text: label },
    },
    scales: {
      x: {
        grid: {
          color: isDark ? "rgba(255,255,255,0.06)" : "rgba(45,106,79,0.06)",
        },
        ticks: {
          font: { size: 11, family: "'Nunito', sans-serif" },
          color: isDark ? "#CCCCCC" : undefined,
        },
      },
      y: {
        grid: {
          color: isDark ? "rgba(255,255,255,0.06)" : "rgba(45,106,79,0.06)",
        },
        ticks: {
          font: { size: 11, family: "'Nunito', sans-serif" },
          color: isDark ? "#CCCCCC" : undefined,
        },
      },
    },
  });

  return { isDark, CHART_TOOLTIP, PIE_LEGEND, pieOptions, makeHorizontalBarOptions };
}

type ViewMode = "table" | "chart";

// LineItem type for parsed lineItems JSON
type LineItem = {
  category: string;
  group: string;
  actual: number;
  budget: number;
  variance: number;
};

// Type helper for grantRows elements
type BudgetRecord = NonNullable<ReturnType<typeof useBudgetRecords>>[number];

function getGrantName(record: BudgetRecord): string {
  return record.className?.trim() || record.budgetName;
}

function truncateLabel(str: string, max: number): string {
  return str.length > max ? str.substring(0, max) + "..." : str;
}

function getStatusInfo(pctSpent: number) {
  const status =
    pctSpent > 100 ? "Over Budget" : pctSpent >= 80 ? "Caution" : "On Track";
  const statusVariant =
    pctSpent > 100 ? "danger" : pctSpent >= 80 ? "warning" : "success";
  const progressColor =
    pctSpent > 100 ? "bg-danger" : pctSpent >= 80 ? "bg-warning" : "bg-success";
  return { status, statusVariant, progressColor };
}

// ---- Grant Detail Modal ----

interface GrantDetailModalProps {
  record: BudgetRecord;
  onClose: () => void;
  pieOptions: ReturnType<typeof useChartConfig>["pieOptions"];
  CHART_TOOLTIP: ReturnType<typeof useChartConfig>["CHART_TOOLTIP"];
  isDark: boolean;
}

function GrantDetailModal({
  record,
  onClose,
  pieOptions,
  isDark,
}: GrantDetailModalProps) {
  const budget = record.expenseBudget;
  const actual = record.expenseActual;
  const remaining = budget - actual;
  const pctSpent = budget > 0 ? (actual / budget) * 100 : actual > 0 ? 999 : 0;
  const { status, statusVariant, progressColor } = getStatusInfo(pctSpent);
  const name = getGrantName(record);

  // Parse lineItems safely
  let lineItems: LineItem[] = [];
  let parseError = false;
  try {
    lineItems = JSON.parse(record.lineItems) as LineItem[];
  } catch {
    parseError = true;
  }

  // Expense items for chart — only items with actual > 0, sorted descending
  const expenseItems = lineItems
    .filter((i) => i.actual > 0)
    .sort((a, b) => b.actual - a.actual);

  const pieData = {
    labels: expenseItems.map((i) =>
      truncateLabel(i.group || i.category, 20)
    ),
    datasets: [
      {
        data: expenseItems.map((i) => i.actual),
        backgroundColor: PALETTE.map((_, idx) => PALETTE[idx % PALETTE.length]),
        borderWidth: 0,
      },
    ],
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-5 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[900px] max-h-[90vh] bg-surface rounded-2xl overflow-hidden shadow-[var(--warm-shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
          <div>
            <p className="text-lg font-bold text-foreground">{name}</p>
            <p className="text-xs text-muted mt-1">{record.budgetName}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Badge variant={statusVariant as "success" | "warning" | "danger"}>
              {status}
            </Badge>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-border bg-surface hover:bg-surface-hover flex items-center justify-center text-muted hover:text-foreground text-xl cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal scrollable content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* 4-column summary grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Budget */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
                Total Budget
              </p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(budget)}
              </p>
            </div>
            {/* Total Spent */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
                Total Spent
              </p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(actual)}
              </p>
            </div>
            {/* Remaining */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
                Remaining
              </p>
              <p
                className={cn(
                  "text-xl font-bold",
                  remaining < 0 ? "text-danger" : "text-success"
                )}
              >
                {formatCurrency(remaining)}
              </p>
            </div>
            {/* % Spent */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
                % Spent
              </p>
              <p className="text-xl font-bold text-foreground">
                {pctSpent > 100 ? ">100" : pctSpent.toFixed(1)}%
              </p>
              {/* Full-width progress bar */}
              <div className="mt-2 h-1.5 rounded-full bg-border/30 overflow-hidden w-full">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", progressColor)}
                  style={{ width: `${Math.min(pctSpent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Expense Distribution Pie */}
          <div className="rounded-xl border border-border bg-background p-5 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-4">
              Expense Distribution
            </p>
            {expenseItems.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted">
                <p className="text-sm">No expense data available.</p>
              </div>
            ) : (
              <div className="h-[220px]">
                <Pie data={pieData} options={pieOptions} />
              </div>
            )}
          </div>

          {/* Line Item Details */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-background px-5 py-3 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Line Item Details
              </p>
            </div>

            {parseError ? (
              <div className="flex items-center justify-center py-10 text-muted px-5">
                <p className="text-sm">Unable to parse line items.</p>
              </div>
            ) : lineItems.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted px-5">
                <p className="text-sm">No line item data available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted bg-background">
                      <th className="text-left px-5 py-2.5 pb-3 font-medium">Account</th>
                      <th className="text-right px-4 py-2.5 pb-3 font-medium">Budget</th>
                      <th className="text-right px-4 py-2.5 pb-3 font-medium">Actual</th>
                      <th className="text-right px-4 py-2.5 pb-3 font-medium">Remaining</th>
                      <th className="text-right px-5 py-2.5 pb-3 font-medium">% Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const itemRemaining = item.budget - item.actual;
                      const itemPct =
                        item.budget > 0
                          ? (item.actual / item.budget) * 100
                          : item.actual > 0
                            ? 999
                            : 0;

                      const pctBadgeClass =
                        itemPct > 100
                          ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          : itemPct > 80
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";

                      return (
                        <tr
                          key={idx}
                          className={cn(
                            "border-b border-border/50 hover:bg-surface-hover/40 transition-colors",
                            isDark ? "" : ""
                          )}
                        >
                          <td className="px-5 py-3 text-sm text-foreground">
                            {item.group || item.category}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted tabular-nums">
                            {formatCurrency(item.budget)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-foreground tabular-nums">
                            {formatCurrency(item.actual)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right text-sm font-medium tabular-nums",
                              itemRemaining < 0 ? "text-danger" : "text-success"
                            )}
                          >
                            {formatCurrency(itemRemaining)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={cn(
                                "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                pctBadgeClass
                              )}
                            >
                              {itemPct > 100
                                ? ">100%"
                                : `${itemPct.toFixed(1)}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Component ----

export default function GrantBudget() {
  const { isDark, CHART_TOOLTIP, pieOptions, makeHorizontalBarOptions } = useChartConfig();
  const summary = useBudgetSummary();
  const records = useBudgetRecords();
  const [activeView, setActiveView] = useState<ViewMode>("table");
  const [selectedRecord, setSelectedRecord] = useState<BudgetRecord | null>(null);

  // Loading state — undefined means Convex query is in flight
  if (summary === undefined || records === undefined) {
    return <ChartSkeleton height={240} />;
  }

  // Empty state — null means budgetCache has no records yet
  if (summary === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg
          className="h-10 w-10 mb-3 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
        <p className="text-sm font-medium">No budget data available</p>
        <p className="text-xs mt-1 text-muted/70">
          Budget data syncs from QuickBooks every 15 minutes.
        </p>
      </div>
    );
  }

  // "All" aggregate records are already filtered out by listBudgetRecords query
  const grantRows = (records ?? []).filter(
    (r) => r.className.trim() !== ""
  );

  return (
    <div>
      {/* Summary Cards (BGUI-01) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Card 1: Total Revenue */}
        <div
          className={cn(
            "rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]",
            isDark ? "bg-surface" : "bg-surface"
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
            Total Revenue
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(summary.totalRevenueActual)}
          </p>
          <p className="text-xs text-muted mt-1">
            of {formatCurrency(summary.totalRevenueBudget)} budgeted
          </p>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
            Total Expenses
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(summary.totalExpenseActual)}
          </p>
          <p className="text-xs text-muted mt-1">
            of {formatCurrency(summary.totalExpenseBudget)} budgeted
          </p>
        </div>

        {/* Card 3: Budget Remaining */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
            Budget Remaining
          </p>
          <p
            className={cn(
              "text-2xl font-bold",
              summary.budgetRemaining < 0 ? "text-danger" : "text-foreground"
            )}
          >
            {formatCurrency(summary.budgetRemaining)}
          </p>
          <p className="text-xs text-muted mt-1">
            {summary.budgetRemainingPct}% remaining
          </p>
        </div>

        {/* Card 4: Overall Burn Rate */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
            Overall Burn Rate
          </p>
          <p className="text-2xl font-bold text-foreground">
            {summary.burnRate}%
          </p>
          <p className="text-xs text-muted mt-1">of total budget spent</p>
        </div>
      </div>

      {/* Financial Health Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Card 5: Monthly Cash Burn */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
            Monthly Cash Burn
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(summary.monthlyCashBurn)}
          </p>
          <p className="text-xs text-muted mt-1">
            avg over {summary.monthsElapsed} month{summary.monthsElapsed !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Card 6: Expense Ratio */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
            Expense Ratio
          </p>
          <p className={cn(
            "text-2xl font-bold",
            summary.expenseRatio > 100 ? "text-danger" : "text-foreground"
          )}>
            {summary.expenseRatio}%
          </p>
          <p className="text-xs text-muted mt-1">expenses / revenue</p>
        </div>

        {/* Card 7: Operating Margin */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
            Operating Margin
          </p>
          <p className={cn(
            "text-2xl font-bold",
            summary.operatingMargin < 0 ? "text-danger" : "text-success"
          )}>
            {summary.operatingMargin}%
          </p>
          <p className="text-xs text-muted mt-1">(revenue - expenses) / revenue</p>
        </div>
      </div>

      {/* View Toggle (BGUI-02) */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setActiveView("table")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeView === "table"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          Table View
        </button>
        <button
          onClick={() => setActiveView("chart")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeView === "chart"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          Chart View
        </button>
      </div>

      {/* Chart View (BGUI-04) */}
      {activeView === "chart" && (
        <>
          {grantRows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted">
              <p className="text-sm">No grant records found.</p>
            </div>
          ) : (
            <>
              {/* Two-column chart grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Left: Expense Distribution Pie */}
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-3">
                    Expense Distribution by Grant
                  </p>
                  <div className="h-[250px]">
                    <Pie
                      data={{
                        labels: grantRows.map((r) => getGrantName(r)),
                        datasets: [
                          {
                            data: grantRows.map((r) => r.expenseActual),
                            backgroundColor: grantRows.map(
                              (_, i) => PALETTE[i % PALETTE.length]
                            ),
                            borderWidth: 0,
                          },
                        ],
                      }}
                      options={pieOptions}
                    />
                  </div>
                </div>

                {/* Right: Budget vs Actual Horizontal Bar */}
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-3">
                    Budget vs Actual by Grant
                  </p>
                  <div className="h-[250px]">
                    <Bar
                      data={{
                        labels: grantRows.map((r) =>
                          truncateLabel(getGrantName(r), 15)
                        ),
                        datasets: [
                          {
                            label: "Actual",
                            data: grantRows.map((r) => r.expenseActual),
                            backgroundColor: "#2D6A4F",
                          },
                          {
                            label: "Budget",
                            data: grantRows.map((r) => r.expenseBudget),
                            backgroundColor: isDark
                              ? "rgba(107,191,89,0.3)"
                              : "rgba(107,191,89,0.25)",
                          },
                        ],
                      }}
                      options={makeHorizontalBarOptions("Budget vs Actual")}
                    />
                  </div>
                </div>
              </div>

              {/* Individual Grant Breakdown heading */}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-3">
                Individual Grant Breakdown
              </p>

              {/* Grant mini-pie cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grantRows.map((record, idx) => {
                  const budget = record.expenseBudget;
                  const actual = record.expenseActual;
                  const remaining = budget - actual;
                  const pctSpent =
                    budget > 0 ? (actual / budget) * 100 : actual > 0 ? 999 : 0;
                  const { status, statusVariant } = getStatusInfo(pctSpent);
                  const name = getGrantName(record);

                  return (
                    <div
                      key={record._id}
                      className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--warm-shadow-sm)] cursor-pointer hover-lift transition-all"
                      onClick={() => setSelectedRecord(record)}
                    >
                      {/* Top row: name + status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="font-medium text-foreground text-sm leading-snug">
                          {name}
                        </p>
                        <Badge variant={statusVariant as "success" | "warning" | "danger"}>
                          {status}
                        </Badge>
                      </div>

                      {/* Mini pie chart */}
                      <div className="h-[120px] mb-3">
                        <Pie
                          data={{
                            labels: ["Spent", "Remaining"],
                            datasets: [
                              {
                                data: [actual, Math.max(budget - actual, 0)],
                                backgroundColor: [
                                  PALETTE[idx % PALETTE.length],
                                  isDark
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(0,0,0,0.05)",
                                ],
                                borderWidth: 0,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: CHART_TOOLTIP,
                            },
                          }}
                        />
                      </div>

                      {/* Budget / Spent / Remaining summary */}
                      <div className="border-t border-border/50 pt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">Budget</span>
                          <span className="text-foreground font-medium tabular-nums">
                            {formatCurrency(budget)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">Spent</span>
                          <span className="text-foreground font-medium tabular-nums">
                            {formatCurrency(actual)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">Remaining</span>
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              remaining < 0 ? "text-danger" : "text-success"
                            )}
                          >
                            {formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Table View (BGUI-03) */}
      {activeView === "table" && (
        <>
          {grantRows.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted">
              <p className="text-sm">No individual grant records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border/60 text-muted">
                    <th className="text-left py-2 pb-3 font-medium">Grant</th>
                    <th className="text-right py-2 pb-3 font-medium">Budget</th>
                    <th className="text-right py-2 pb-3 font-medium">Actual</th>
                    <th className="text-right py-2 pb-3 font-medium">Remaining</th>
                    <th className="text-right py-2 pb-3 font-medium">% Spent</th>
                    <th className="text-center py-2 pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grantRows.map((record) => {
                    const budget = record.expenseBudget;
                    const actual = record.expenseActual;
                    const remaining = budget - actual;
                    const pctSpent = budget > 0 ? (actual / budget) * 100 : 0;
                    const { status, statusVariant, progressColor } =
                      getStatusInfo(pctSpent);

                    // Show class name; fall back to budgetName if className is blank
                    const grantName = getGrantName(record);

                    return (
                      <tr
                        key={record._id}
                        className="border-b border-border/50 hover:bg-surface-hover/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedRecord(record)}
                      >
                        {/* Grant name */}
                        <td className="py-3 pr-4 font-medium text-foreground">
                          {grantName}
                        </td>

                        {/* Budget */}
                        <td className="py-3 text-right text-muted tabular-nums">
                          {formatCurrency(budget)}
                        </td>

                        {/* Actual */}
                        <td className="py-3 text-right text-foreground tabular-nums">
                          {formatCurrency(actual)}
                        </td>

                        {/* Remaining — red if over budget, green if positive */}
                        <td
                          className={cn(
                            "py-3 text-right tabular-nums font-medium",
                            remaining < 0 ? "text-danger" : "text-success"
                          )}
                        >
                          {formatCurrency(remaining)}
                        </td>

                        {/* % Spent — progress bar + number */}
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-20 h-1.5 rounded-full bg-border/30 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  progressColor
                                )}
                                style={{ width: `${Math.min(pctSpent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-foreground min-w-[45px] text-right">
                              {pctSpent.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="py-3 text-center">
                          <Badge variant={statusVariant as "success" | "warning" | "danger"}>
                            {status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sync timestamp footer */}
          <p className="text-[10px] text-muted/60 mt-3 text-right">
            Last synced: {new Date(summary.lastSyncedAt).toLocaleString()}
          </p>
        </>
      )}

      {/* Grant Detail Modal (BGUI-05) */}
      {selectedRecord && (
        <GrantDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          pieOptions={pieOptions}
          CHART_TOOLTIP={CHART_TOOLTIP}
          isDark={isDark}
        />
      )}
    </div>
  );
}
