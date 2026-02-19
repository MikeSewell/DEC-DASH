"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyExact, formatDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { ExpenseItem } from "@/types";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpenseByAccountProps {
  data: ExpenseItem[];
}

interface AccountGroup {
  account: string;
  items: ExpenseItem[];
  total: number;
}

const CHART_COLORS = [
  "rgba(27, 77, 62, 0.8)",
  "rgba(212, 168, 67, 0.8)",
  "rgba(45, 122, 95, 0.8)",
  "rgba(232, 201, 106, 0.8)",
  "rgba(15, 42, 31, 0.8)",
  "rgba(99, 164, 139, 0.8)",
  "rgba(180, 140, 50, 0.8)",
  "rgba(60, 150, 110, 0.8)",
  "rgba(140, 180, 160, 0.8)",
  "rgba(200, 170, 80, 0.8)",
];

export default function ExpenseByAccount({ data }: ExpenseByAccountProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const accountGroups = useMemo(() => {
    const groups: Record<string, ExpenseItem[]> = {};
    for (const item of data) {
      const key = item.account || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    const result: AccountGroup[] = Object.entries(groups)
      .map(([account, items]) => ({
        account,
        items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        total: items.reduce((sum, i) => sum + i.amount, 0),
      }))
      .sort((a, b) => b.total - a.total);

    return result;
  }, [data]);

  const chartData = {
    labels: accountGroups.map((g) =>
      g.account.length > 25 ? g.account.slice(0, 23) + "..." : g.account
    ),
    datasets: [
      {
        data: accountGroups.map((g) => g.total),
        backgroundColor: accountGroups.map(
          (_, i) => CHART_COLORS[i % CHART_COLORS.length]
        ),
        borderColor: accountGroups.map(
          (_, i) => CHART_COLORS[i % CHART_COLORS.length].replace("0.8", "1")
        ),
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number; dataset: { data: number[] } }) => {
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = ((ctx.parsed / total) * 100).toFixed(1);
            return `${ctx.label}: $${ctx.parsed.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${pct}%)`;
          },
        },
      },
    },
    cutout: "55%",
  };

  function toggleAccount(account: string) {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(account)) {
        next.delete(account);
      } else {
        next.add(account);
      }
      return next;
    });
  }

  const grandTotal = accountGroups.reduce((sum, g) => sum + g.total, 0);

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card title="Expense Distribution by Account">
        <div className="h-[350px]">
          {accountGroups.length > 0 ? (
            <Doughnut data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted">
              No account data available
            </div>
          )}
        </div>
      </Card>

      {/* Collapsible account groups */}
      <Card title={`All Accounts (${accountGroups.length})`}>
        <div className="divide-y divide-border">
          {accountGroups.map((group, idx) => (
            <div key={group.account}>
              <button
                onClick={() => toggleAccount(group.account)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={cn(
                      "w-4 h-4 text-muted transition-transform",
                      expandedAccounts.has(group.account) && "rotate-90"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <span className="font-medium text-foreground">{group.account}</span>
                  <span className="text-xs text-muted">
                    ({group.items.length} {group.items.length === 1 ? "expense" : "expenses"})
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted">
                    {grandTotal > 0 ? ((group.total / grandTotal) * 100).toFixed(1) : 0}%
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrencyExact(group.total)}
                  </span>
                </div>
              </button>

              {expandedAccounts.has(group.account) && (
                <div className="bg-surface-hover/30 border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-2 text-left text-xs font-semibold text-muted uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase">Vendor</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase">Class</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-muted uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase">Memo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-2 text-foreground whitespace-nowrap">
                            {formatDate(item.date)}
                          </td>
                          <td className="px-4 py-2 text-foreground">{item.vendor}</td>
                          <td className="px-4 py-2 text-foreground">{item.class || "\u2014"}</td>
                          <td className="px-4 py-2 text-foreground text-right font-medium">
                            {formatCurrencyExact(item.amount)}
                          </td>
                          <td className="px-4 py-2 text-muted max-w-[200px] truncate">
                            {item.memo || "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
