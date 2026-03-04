"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useBudgetSummary, useBudgetRecords } from "@/hooks/useQuickBooks";
import { formatCurrency, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";

function useChartConfig() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return { isDark };
}

type ViewMode = "table" | "chart";

export default function GrantBudget() {
  const { isDark } = useChartConfig();
  const summary = useBudgetSummary();
  const records = useBudgetRecords();
  const [activeView, setActiveView] = useState<ViewMode>("table");

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

  // Filter out the "All" aggregate row — it is already represented by summary cards
  const grantRows = (records ?? []).filter(
    (r) => r.className.trim().toLowerCase() !== "all" && r.className.trim() !== ""
  );

  return (
    <div>
      {/* Summary Cards (BGUI-01) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Chart View — placeholder until Phase 32 */}
      {activeView === "chart" && (
        <div className="flex items-center justify-center py-16 text-muted">
          <p className="text-sm">Chart view coming soon.</p>
        </div>
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
                    const status =
                      pctSpent > 100
                        ? "Over Budget"
                        : pctSpent >= 80
                          ? "Caution"
                          : "On Track";
                    const statusVariant =
                      pctSpent > 100
                        ? "danger"
                        : pctSpent >= 80
                          ? "warning"
                          : "success";
                    const progressColor =
                      pctSpent > 100
                        ? "bg-danger"
                        : pctSpent >= 80
                          ? "bg-warning"
                          : "bg-success";

                    // Show class name; fall back to budgetName if className is blank
                    const grantName =
                      record.className && record.className.trim()
                        ? record.className
                        : record.budgetName;

                    return (
                      <tr
                        key={record._id}
                        className="border-b border-border/50 hover:bg-surface-hover/40 transition-colors"
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
    </div>
  );
}
