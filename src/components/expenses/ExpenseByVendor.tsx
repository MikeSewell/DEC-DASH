"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyExact, formatDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { ExpenseItem } from "@/types";
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

interface ExpenseByVendorProps {
  data: ExpenseItem[];
}

interface VendorGroup {
  vendor: string;
  items: ExpenseItem[];
  total: number;
}

export default function ExpenseByVendor({ data }: ExpenseByVendorProps) {
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());

  const vendorGroups = useMemo(() => {
    const groups: Record<string, ExpenseItem[]> = {};
    for (const item of data) {
      const key = item.vendor || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    const result: VendorGroup[] = Object.entries(groups)
      .map(([vendor, items]) => ({
        vendor,
        items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        total: items.reduce((sum, i) => sum + i.amount, 0),
      }))
      .sort((a, b) => b.total - a.total);

    return result;
  }, [data]);

  const top10 = vendorGroups.slice(0, 10);

  const chartData = {
    labels: top10.map((g) =>
      g.vendor.length > 20 ? g.vendor.slice(0, 18) + "..." : g.vendor
    ),
    datasets: [
      {
        label: "Total Spend",
        data: top10.map((g) => g.total),
        backgroundColor: "rgba(27, 77, 62, 0.7)",
        borderColor: "rgba(27, 77, 62, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { x: number | null } }) =>
            `$${(ctx.parsed.x ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
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

  function toggleVendor(vendor: string) {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(vendor)) {
        next.delete(vendor);
      } else {
        next.add(vendor);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card title="Top 10 Vendors by Spend">
        <div className="h-[400px]">
          {top10.length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted">
              No vendor data available
            </div>
          )}
        </div>
      </Card>

      {/* Collapsible vendor groups */}
      <Card title={`All Vendors (${vendorGroups.length})`}>
        <div className="divide-y divide-border">
          {vendorGroups.map((group) => (
            <div key={group.vendor}>
              <button
                onClick={() => toggleVendor(group.vendor)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={cn(
                      "w-4 h-4 text-muted transition-transform",
                      expandedVendors.has(group.vendor) && "rotate-90"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-foreground">{group.vendor}</span>
                  <span className="text-xs text-muted">
                    ({group.items.length} {group.items.length === 1 ? "expense" : "expenses"})
                  </span>
                </div>
                <span className="font-semibold text-foreground">
                  {formatCurrencyExact(group.total)}
                </span>
              </button>

              {expandedVendors.has(group.vendor) && (
                <div className="bg-surface-hover/30 border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-2 text-left text-xs font-semibold text-muted uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted uppercase">Account</th>
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
                          <td className="px-4 py-2 text-foreground">{item.account}</td>
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
