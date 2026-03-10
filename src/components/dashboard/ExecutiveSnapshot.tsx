"use client";

import { useQuickBooksConfig, useAccounts, useProfitAndLoss, useBudgetSummary } from "@/hooks/useQuickBooks";
import { useGrantStats } from "@/hooks/useGrants";
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
          className={cn("text-3xl font-extrabold text-foreground", tooltip && "cursor-help")}
          title={tooltip}
        >
          {value}
        </div>
        <p className="text-sm text-muted mt-0.5">{label}</p>
        {trend && (
          <p
            className={cn(
              "text-xs mt-1 font-medium inline-flex items-center gap-1",
              trend.positive ? "text-success" : "text-danger"
            )}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              {trend.positive ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
              )}
            </svg>
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
  const budgetSummary = useBudgetSummary();
  const grantStats = useGrantStats();

  // Loading state
  if (qbConfig === undefined || accounts === undefined || pnl === undefined || budgetSummary === undefined || grantStats === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // Check if cached data is available
  const hasCachedData = pnl !== null || accounts !== null || grantStats !== null;
  const isExpired = qbConfig !== null && qbConfig.isExpired;

  // Extract values
  const cashOnHand = accounts?.data?.totalCash ?? null;
  const totalRevenue = pnl?.data?.totalRevenue ?? 0;
  const totalFundsRaised = grantStats?.totalAwarded ?? 0;

  // Avg monthly expenses & runway from budget summary
  const avgMonthlyExpenses = budgetSummary?.monthlyCashBurn ?? null;
  const runwayMonths = cashOnHand !== null && avgMonthlyExpenses && avgMonthlyExpenses > 0
    ? Math.round((cashOnHand / avgMonthlyExpenses) * 10) / 10
    : null;

  // Determine most recent fetchedAt for timestamp
  const latestFetchedAt = Math.max(accounts?.fetchedAt ?? 0, pnl?.fetchedAt ?? 0);

  // No data available — show empty state prompting connection
  if (!hasCachedData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No financial data available</p>
        <p className="text-xs text-muted">
          <a href="/admin" className="text-primary hover:underline">Connect QuickBooks</a> to see cash, revenue, and expense figures.
        </p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        {/* Card 1: Active Grants */}
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-3xl font-extrabold text-foreground">
              {formatDollars(grantStats?.activeAwarded ?? 0)}
            </div>
            <p className="text-sm text-muted mt-0.5">Active Grants</p>
            <p className="text-xs mt-1 text-muted/70">
              {grantStats?.activeCount ?? 0} grant{(grantStats?.activeCount ?? 0) !== 1 ? "s" : ""} currently active
            </p>
          </div>
        </div>

        {/* Card 2: Total Funds Raised */}
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-success">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-3xl font-extrabold text-foreground">
              {formatCurrencyExact(totalFundsRaised)}
            </div>
            <p className="text-sm text-muted mt-0.5">Total Funds Raised</p>
            <p className="text-xs mt-1 text-muted/70">
              {formatCurrencyExact(totalRevenue)} received YTD {currentYear}
            </p>
          </div>
        </div>

        {/* Card 3: Current Cash on Hand */}
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-3xl font-extrabold text-foreground" title={cashOnHand !== null ? formatCurrencyExact(cashOnHand) : undefined}>
              {cashOnHand !== null ? formatCurrencyExact(cashOnHand) : "--"}
            </div>
            <p className="text-sm text-muted mt-0.5">Current Cash on Hand</p>
            {runwayMonths !== null && (
              <p className="text-xs mt-1 font-medium text-success">
                {runwayMonths} months operating runway
              </p>
            )}
            {avgMonthlyExpenses !== null && (
              <p className="text-xs mt-0.5 text-muted/70">
                Avg Monthly Expenses: {formatCurrencyExact(avgMonthlyExpenses)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Updated timestamp */}
      {latestFetchedAt > 0 && (
        <p className="text-xs text-muted text-right mt-3">
          Updated {timeAgo(latestFetchedAt)}
          {isExpired && (
            <span className="text-muted/50"> &mdash; QB token expired, <a href="/admin" className="hover:underline">reconnect</a> to refresh</span>
          )}
        </p>
      )}
    </div>
  );
}
