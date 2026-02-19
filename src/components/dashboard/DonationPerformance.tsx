"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useDonations } from "@/hooks/useQuickBooks";
import Spinner from "@/components/ui/Spinner";
import { formatCurrency, timeAgo } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DonationEntry {
  date: string;
  amount: number;
  donor?: string;
}

interface DonationsData {
  donations?: DonationEntry[];
  totalDonations?: number;
  averageDonation?: number;
  donorCount?: number;
  monthlyTotals?: Record<string, number>;
  fundingGoal?: number;
  fundingGoalProgress?: number;
}

export default function DonationPerformance() {
  const donationsResult = useDonations();

  if (donationsResult === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (donationsResult === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        <p className="text-sm">No donation data available.</p>
        <p className="text-xs mt-1">Connect QuickBooks to import donation information.</p>
      </div>
    );
  }

  const data = donationsResult.data as DonationsData | null;
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <p className="text-sm">No donation records found.</p>
      </div>
    );
  }

  const totalDonations = data.totalDonations ?? 0;
  const avgDonation = data.averageDonation ?? 0;
  const donorCount = data.donorCount ?? 0;
  const fundingGoal = data.fundingGoal ?? 0;
  const fundingProgress = data.fundingGoalProgress ?? (fundingGoal > 0 ? (totalDonations / fundingGoal) * 100 : 0);

  // Build monthly chart data
  const monthlyTotals = data.monthlyTotals ?? {};
  const sortedMonths = Object.keys(monthlyTotals).sort();
  const recentMonths = sortedMonths.slice(-12); // Last 12 months

  const chartData = {
    labels: recentMonths.map((m) => {
      // Format "2025-01" as "Jan 25"
      const [year, month] = m.split("-");
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }),
    datasets: [
      {
        label: "Monthly Donations",
        data: recentMonths.map((m) => monthlyTotals[m] ?? 0),
        borderColor: "#1B4D3E",
        backgroundColor: "rgba(27, 77, 62, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#1B4D3E",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown }) => formatCurrency(ctx.raw as number),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => formatCurrency(Number(value)),
        },
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDonations)}</p>
          <p className="text-xs text-muted mt-1">Total Donations</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(avgDonation)}</p>
          <p className="text-xs text-muted mt-1">Avg Donation</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{donorCount}</p>
          <p className="text-xs text-muted mt-1">Total Donors</p>
        </div>
      </div>

      {/* Funding goal progress */}
      {fundingGoal > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-foreground">Funding Goal Progress</p>
            <p className="text-sm text-muted">
              {formatCurrency(totalDonations)} / {formatCurrency(fundingGoal)}
            </p>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-hover overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, fundingProgress)}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1">{fundingProgress.toFixed(1)}% of goal reached</p>
        </div>
      )}

      {/* Line chart */}
      {recentMonths.length > 0 ? (
        <div style={{ height: 280 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : (
        <p className="text-sm text-muted text-center py-8">
          No monthly donation data to chart.
        </p>
      )}

      {donationsResult.fetchedAt && (
        <p className="text-xs text-muted text-right">
          Last synced: {timeAgo(donationsResult.fetchedAt)}
        </p>
      )}
    </div>
  );
}
