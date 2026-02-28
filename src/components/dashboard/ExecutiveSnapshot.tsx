"use client";

import { useGrants, useActiveGrants } from "@/hooks/useGrantTracker";
import { useAccounts, useProfitAndLoss } from "@/hooks/useQuickBooks";
import Spinner from "@/components/ui/Spinner";
import { cn, formatDollars } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: { value: string; positive: boolean } | null;
  loading?: boolean;
  accentColor?: string;
}

function StatCard({ icon, value, label, trend, loading, accentColor = "text-primary" }: StatCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10", accentColor)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold text-foreground">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-muted text-base font-normal">Loading...</span>
            </span>
          ) : (
            value
          )}
        </div>
        <p className="text-sm text-muted mt-0.5">{label}</p>
        {trend && !loading && (
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
  const allGrants = useGrants();
  const activeGrants = useActiveGrants();
  const accounts = useAccounts();
  const pnl = useProfitAndLoss();

  const isGrantsLoading = allGrants === undefined;
  const isActiveGrantsLoading = activeGrants === undefined;
  const isAccountsLoading = accounts === undefined;
  const isPnlLoading = pnl === undefined;

  const activeGrantsDollar = activeGrants
    ? formatDollars(activeGrants.reduce((sum, g) => sum + g.totalAmount, 0))
    : "--";

  const totalFundsRaised = allGrants
    ? formatDollars(allGrants.reduce((sum, g) => sum + g.totalAmount, 0))
    : "--";

  const cashOnHand = accounts?.data?.totalCash != null
    ? formatDollars(accounts.data.totalCash)
    : "--";

  const revenueYTD = pnl?.data?.totalRevenue != null
    ? formatDollars(pnl.data.totalRevenue)
    : "--";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
      <StatCard
        icon={
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        value={activeGrantsDollar}
        label="Active Grants"
        loading={isActiveGrantsLoading}
        accentColor="text-primary"
      />

      <StatCard
        icon={
          <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        }
        value={totalFundsRaised}
        label="Total Funds Raised"
        loading={isGrantsLoading}
        accentColor="text-accent"
      />

      <StatCard
        icon={
          <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        }
        value={cashOnHand}
        label="Cash on Hand"
        loading={isAccountsLoading}
        accentColor="text-primary-light"
      />

      <StatCard
        icon={
          <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        }
        value={revenueYTD}
        label="Revenue YTD"
        loading={isPnlLoading}
        accentColor="text-success"
      />
    </div>
  );
}
