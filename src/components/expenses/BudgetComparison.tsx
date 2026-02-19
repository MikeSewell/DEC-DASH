"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyExact, formatPercent } from "@/lib/utils";
import { useClasses, useExpenses } from "@/hooks/useQuickBooks";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ClassBudget {
  name: string;
  budget: number;
}

interface BudgetVsActual {
  className: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export default function BudgetComparison() {
  const classesData = useClasses();
  const expensesData = useExpenses();

  const comparison = useMemo<BudgetVsActual[]>(() => {
    if (!classesData?.data || !expensesData?.data) return [];

    const classes: ClassBudget[] = Array.isArray(classesData.data)
      ? classesData.data
      : [];

    const expenses = Array.isArray(expensesData.data) ? expensesData.data : [];

    // Group expenses by class
    const actualByClass: Record<string, number> = {};
    for (const exp of expenses) {
      const cls = (exp as { class?: string }).class || "Unclassified";
      actualByClass[cls] = (actualByClass[cls] || 0) + ((exp as { amount: number }).amount || 0);
    }

    // Build comparison data
    const results: BudgetVsActual[] = [];

    // Add classes that have budgets
    for (const cls of classes) {
      const name = (cls as { name?: string }).name || "Unknown";
      const budget = (cls as { budget?: number }).budget || 0;
      const actual = actualByClass[name] || 0;
      const variance = budget - actual;
      const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;

      results.push({
        className: name,
        budget,
        actual,
        variance,
        variancePercent,
      });

      delete actualByClass[name];
    }

    // Add remaining classes from expenses without budgets
    for (const [name, actual] of Object.entries(actualByClass)) {
      results.push({
        className: name,
        budget: 0,
        actual,
        variance: -actual,
        variancePercent: -100,
      });
    }

    return results.sort((a, b) => b.actual - a.actual);
  }, [classesData, expensesData]);

  if (classesData === undefined || expensesData === undefined) {
    return (
      <Card title="Budget vs Actual">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  const chartData = {
    labels: comparison.map((c) =>
      c.className.length > 20 ? c.className.slice(0, 18) + "..." : c.className
    ),
    datasets: [
      {
        label: "Budget",
        data: comparison.map((c) => c.budget),
        backgroundColor: "rgba(156, 163, 175, 0.5)",
        borderColor: "rgba(156, 163, 175, 1)",
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: "Actual",
        data: comparison.map((c) => c.actual),
        backgroundColor: comparison.map((c) =>
          c.variance >= 0
            ? "rgba(34, 197, 94, 0.6)"
            : "rgba(239, 68, 68, 0.6)"
        ),
        borderColor: comparison.map((c) =>
          c.variance >= 0
            ? "rgba(34, 197, 94, 1)"
            : "rgba(239, 68, 68, 1)"
        ),
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: { family: "'Nunito', sans-serif" },
        },
      },
      tooltip: {
        backgroundColor: "rgba(27,67,50,0.9)",
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: "'Nunito', sans-serif" },
        bodyFont: { family: "'Nunito', sans-serif" },
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { x: number | null } }) =>
            `${ctx.dataset.label}: $${(ctx.parsed.x ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: (value: string | number) =>
            `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
        },
        grid: { display: false },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card title="Budget vs Actual by Grant/Class">
        <div style={{ height: Math.max(300, comparison.length * 50) }}>
          {comparison.length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted">
              No budget comparison data available
            </div>
          )}
        </div>
      </Card>

      {/* Variance Table */}
      <Card title="Budget Variance Details">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">
                  Grant / Class
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">
                  Budget
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">
                  Actual
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">
                  Variance
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">
                  % Used
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparison.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No data available
                  </td>
                </tr>
              ) : (
                comparison.map((row) => {
                  const usedPercent = row.budget > 0 ? (row.actual / row.budget) * 100 : 0;
                  return (
                    <tr key={row.className}>
                      <td className="px-4 py-3 text-foreground font-medium">{row.className}</td>
                      <td className="px-4 py-3 text-foreground text-right">
                        {formatCurrencyExact(row.budget)}
                      </td>
                      <td className="px-4 py-3 text-foreground text-right font-medium">
                        {formatCurrencyExact(row.actual)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-semibold",
                          row.variance >= 0 ? "text-success" : "text-danger"
                        )}
                      >
                        {row.variance >= 0 ? "+" : ""}
                        {formatCurrencyExact(row.variance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                usedPercent > 100 ? "bg-danger" : usedPercent > 80 ? "bg-warning" : "bg-success"
                              )}
                              style={{ width: `${Math.min(usedPercent, 100)}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              usedPercent > 100
                                ? "text-danger"
                                : usedPercent > 80
                                  ? "text-warning"
                                  : "text-success"
                            )}
                          >
                            {formatPercent(usedPercent)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
