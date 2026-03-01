"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useQuickBooksConfig, useBudgetVsActuals } from "@/hooks/useQuickBooks";
import { BarChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getBudgetColor(spent: number, total: number): string {
  if (total === 0) return "#6b7280"; // gray
  const pct = spent / total;
  if (pct > 1) return "#ef4444"; // red -- over budget
  if (pct >= 0.75) return "#f59e0b"; // yellow -- approaching budget
  return "#22c55e"; // green -- under budget
}

// Fuzzy match grant funder/program to QB class names (lowercased, trimmed comparison)
function matchGrantToClass(
  fundingSource: string,
  programName: string | undefined,
  bvaData: any[]
): { actual: number; budget: number } | null {
  const funderLower = fundingSource.toLowerCase().trim();
  const programLower = (programName ?? "").toLowerCase().trim();
  for (const entry of bvaData) {
    const classLower = (entry.className ?? "").toLowerCase().trim();
    if (!classLower || classLower === "all") continue;
    if (funderLower.includes(classLower) || classLower.includes(funderLower) ||
        (programLower && (programLower.includes(classLower) || classLower.includes(programLower)))) {
      return { actual: entry.expenses?.actual ?? 0, budget: entry.expenses?.budget ?? 0 };
    }
  }
  return null;
}

export default function GrantBudget() {
  const grants = useQuery(api.grants.list, { fundingStage: "active" });
  const qbConfig = useQuickBooksConfig();
  const bva = useBudgetVsActuals();

  if (grants === undefined) {
    return <BarChartSkeleton bars={5} height={240} />;
  }

  if (grants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm">No active grants found.</p>
        <p className="text-xs mt-1">Import grants via the Grant Matrix spreadsheet.</p>
      </div>
    );
  }

  const activeGrants = grants.filter((g) => g.amountAwarded && g.amountAwarded > 0);

  const qbConnected = qbConfig !== undefined && qbConfig !== null && !qbConfig.isExpired;
  const bvaData: any[] = (qbConnected && bva?.data) ? bva.data : [];

  const grantSpending = activeGrants.map((g) => {
    const qbMatch = bvaData.length > 0 ? matchGrantToClass(g.fundingSource, g.programName ?? undefined, bvaData) : null;
    const spent = qbMatch ? qbMatch.actual : 0;
    return { spent, source: qbMatch ? "qb" as const : "none" as const };
  });

  const labels = activeGrants.map((g) => {
    const name = g.fundingSource;
    return name.length > 25 ? name.slice(0, 22) + "..." : name;
  });
  const budgetAmounts = activeGrants.map((g) => g.amountAwarded ?? 0);
  const spentAmounts = grantSpending.map((gs) => gs.spent);
  const remainingAmounts = activeGrants.map(
    (g, i) => Math.max(0, (g.amountAwarded ?? 0) - grantSpending[i].spent)
  );
  const spentColors = activeGrants.map((g, i) =>
    getBudgetColor(grantSpending[i].spent, g.amountAwarded ?? 0)
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: "Spent",
        data: spentAmounts,
        backgroundColor: spentColors,
        borderRadius: 8,
        barPercentage: 0.7,
      },
      {
        label: "Remaining",
        data: remainingAmounts,
        backgroundColor: "rgba(107, 114, 128, 0.15)",
        borderRadius: 8,
        barPercentage: 0.7,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "rectRounded" as const,
          padding: 16,
          font: { size: 12, family: "'Nunito', sans-serif" },
        },
      },
      tooltip: {
        backgroundColor: "rgba(27,67,50,0.9)",
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: "'Nunito', sans-serif" },
        bodyFont: { family: "'Nunito', sans-serif" },
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
            const label = ctx.dataset.label ?? "";
            const val = ctx.raw as number;
            return `${label}: ${formatCurrency(val)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          callback: (value: string | number) => formatCurrency(Number(value)),
        },
        grid: {
          color: "rgba(45,106,79,0.06)",
        },
      },
      y: {
        stacked: true,
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div>
      {!qbConnected && (
        <p className="text-xs text-warning mb-3 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Connect QuickBooks to see actual spending against grant budgets.
        </p>
      )}
      {qbConnected && bvaData.length > 0 && (
        <p className="text-xs text-success mb-3 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Actual spending from QuickBooks Budget vs Actuals reports.
        </p>
      )}

      <div style={{ height: Math.max(200, activeGrants.length * 60) }}>
        <Bar data={chartData} options={options} />
      </div>

      {/* Summary table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border/60 text-muted">
              <th className="text-left py-2 font-medium">Grant</th>
              <th className="text-right py-2 font-medium">Budget</th>
              <th className="text-right py-2 font-medium">Spent</th>
              <th className="text-right py-2 font-medium">Remaining</th>
              <th className="text-right py-2 font-medium">Used</th>
            </tr>
          </thead>
          <tbody>
            {activeGrants.map((grant, i) => {
              const awarded = grant.amountAwarded ?? 0;
              const spent = grantSpending[i].spent;
              const remaining = Math.max(0, awarded - spent);
              const pct = awarded > 0 ? (spent / awarded) * 100 : 0;
              return (
                <tr key={grant._id} className="border-b border-border/50">
                  <td className="py-2 text-foreground font-medium">{grant.fundingSource}</td>
                  <td className="py-2 text-right text-muted">{formatCurrency(awarded)}</td>
                  <td className="py-2 text-right text-foreground">
                    {formatCurrency(spent)}
                    {grantSpending[i].source === "qb" && (
                      <span className="ml-1 text-[10px] text-success" title="From QuickBooks">QB</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-foreground">{formatCurrency(remaining)}</td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        pct > 100
                          ? "text-danger font-semibold"
                          : pct >= 75
                            ? "text-warning font-semibold"
                            : "text-success"
                      }
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
