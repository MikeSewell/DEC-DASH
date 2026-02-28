"use client";

import { useQuickBooksConfig, useAccounts, useProfitAndLoss } from "@/hooks/useQuickBooks";
import { StatCardSkeleton } from "@/components/dashboard/skeletons/StatCardSkeleton";
import { cn, formatDollars, formatCurrencyExact, timeAgo } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  trend?: { value: string; positive: boolean } | null;
  accentColor?: string;
  tooltip?: string;
}

function StatCard({ icon, value, label, trend, accentColor = "text-primary", tooltip }: StatCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10", accentColor)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn("text-2xl font-bold text-foreground", tooltip && "cursor-help")}
          title={tooltip}
        >
          {value}
        </div>
        <p className="text-sm text-muted mt-0.5">{label}</p>
        {trend && (
          <p
            className={cn(
              "text-xs mt-1 font-medium",
              trend.positive ? "text-success" : "text-danger"
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ExecutiveSnapshot() {
  const qbConfig = useQuickBooksConfig();
  const accounts = useAccounts();
  const pnl = useProfitAndLoss();

  // Loading state: any query still undefined
  if (qbConfig === undefined || accounts === undefined || pnl === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // Disconnected state: QB not configured or token expired
  if (qbConfig === null || qbConfig.isExpired) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg
          className="h-10 w-10 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
        <p className="text-sm mt-3">Connect QuickBooks to see financial data.</p>
        <a href="/admin" className="text-primary hover:underline text-xs mt-2">
          Configure QuickBooks &rarr;
        </a>
      </div>
    );
  }

  // Extract values with null safety
  const cashOnHand = accounts?.data?.totalCash ?? null;
  const totalRevenue = pnl?.data?.totalRevenue ?? null;
  const totalExpenses = pnl?.data?.totalExpenses ?? null;

  // Determine most recent fetchedAt for timestamp
  const latestFetchedAt = Math.max(accounts?.fetchedAt ?? 0, pnl?.fetchedAt ?? 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        {/* Card 1: Cash on Hand */}
        <StatCard
          icon={
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
          }
          value={cashOnHand !== null ? formatDollars(cashOnHand) : "--"}
          label="Cash on Hand"
          tooltip={cashOnHand !== null ? formatCurrencyExact(cashOnHand) : undefined}
          accentColor="text-primary"
        />

        {/* Card 2: Revenue YTD */}
        <StatCard
          icon={
            <svg
              className="h-5 w-5 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
              />
            </svg>
          }
          value={totalRevenue !== null ? formatDollars(totalRevenue) : "--"}
          label="Revenue YTD"
          tooltip={totalRevenue !== null ? formatCurrencyExact(totalRevenue) : undefined}
          accentColor="text-success"
        />

        {/* Card 3: Total Expenses */}
        <StatCard
          icon={
            <svg
              className="h-5 w-5 text-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"
              />
            </svg>
          }
          value={totalExpenses !== null ? formatDollars(totalExpenses) : "--"}
          label="Total Expenses"
          tooltip={totalExpenses !== null ? formatCurrencyExact(totalExpenses) : undefined}
          accentColor="text-danger"
        />
      </div>

      {/* Updated timestamp */}
      {latestFetchedAt > 0 && (
        <p className="text-xs text-muted text-right mt-3">
          Updated {timeAgo(latestFetchedAt)}
        </p>
      )}
    </div>
  );
}
