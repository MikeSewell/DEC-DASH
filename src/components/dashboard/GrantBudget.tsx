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
import { useGrants } from "@/hooks/useGrantTracker";
import { useQuickBooksConfig } from "@/hooks/useQuickBooks";
import Spinner from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getBudgetColor(spent: number, total: number): string {
  if (total === 0) return "#6b7280"; // gray
  const pct = spent / total;
  if (pct > 1) return "#ef4444"; // red -- over budget
  if (pct >= 0.75) return "#f59e0b"; // yellow -- approaching budget
  return "#22c55e"; // green -- under budget
}

export default function GrantBudget() {
  const grants = useGrants();
  const qbConfig = useQuickBooksConfig();

  if (grants === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!grants || grants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm">No grant data available.</p>
        <p className="text-xs mt-1">Connect Google Sheets to import grant information.</p>
      </div>
    );
  }

  const activeGrants = grants.filter(
    (g) => g.status === "active" || g.status === "pending"
  );

  const labels = activeGrants.map((g) =>
    g.grantName.length > 25 ? g.grantName.slice(0, 22) + "..." : g.grantName
  );
  const budgetAmounts = activeGrants.map((g) => g.totalAmount);
  const spentAmounts = activeGrants.map((g) => g.amountSpent ?? 0);
  const remainingAmounts = activeGrants.map(
    (g) => Math.max(0, g.totalAmount - (g.amountSpent ?? 0))
  );
  const spentColors = activeGrants.map((g) =>
    getBudgetColor(g.amountSpent ?? 0, g.totalAmount)
  );

  const qbConnected = qbConfig !== undefined && qbConfig !== null && !qbConfig.isExpired;

  const chartData = {
    labels,
    datasets: [
      {
        label: "Spent",
        data: spentAmounts,
        backgroundColor: spentColors,
        borderRadius: 4,
        barPercentage: 0.7,
      },
      {
        label: "Remaining",
        data: remainingAmounts,
        backgroundColor: "rgba(107, 114, 128, 0.15)",
        borderRadius: 4,
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
          font: { size: 12 },
        },
      },
      tooltip: {
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
          color: "rgba(0,0,0,0.05)",
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
          QuickBooks not connected. Spent amounts are from Google Sheets data only.
        </p>
      )}

      <div style={{ height: Math.max(200, activeGrants.length * 60) }}>
        <Bar data={chartData} options={options} />
      </div>

      {/* Summary table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left py-2 font-medium">Grant</th>
              <th className="text-right py-2 font-medium">Budget</th>
              <th className="text-right py-2 font-medium">Spent</th>
              <th className="text-right py-2 font-medium">Remaining</th>
              <th className="text-right py-2 font-medium">Used</th>
            </tr>
          </thead>
          <tbody>
            {activeGrants.map((grant) => {
              const spent = grant.amountSpent ?? 0;
              const remaining = Math.max(0, grant.totalAmount - spent);
              const pct = grant.totalAmount > 0 ? (spent / grant.totalAmount) * 100 : 0;
              return (
                <tr key={grant.sheetRowId} className="border-b border-border/50">
                  <td className="py-2 text-foreground font-medium">{grant.grantName}</td>
                  <td className="py-2 text-right text-muted">{formatCurrency(grant.totalAmount)}</td>
                  <td className="py-2 text-right text-foreground">{formatCurrency(spent)}</td>
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
