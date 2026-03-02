"use client";

import { useSessionVolume, useIntakeTrend } from "@/hooks/useAnalytics";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StatCardGridSkeleton } from "@/components/dashboard/skeletons/StatCardSkeleton";

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  );
}

interface TrendBadgeProps {
  changePercent: number;
  positive: boolean;
  show: boolean;
}

function TrendBadge({ changePercent, positive, show }: TrendBadgeProps) {
  if (!show) return null;
  return (
    <p className={`text-xs mt-1 font-medium flex items-center gap-0.5 ${positive ? "text-success" : "text-danger"}`}>
      {positive ? <ArrowUpIcon /> : <ArrowDownIcon />}
      {Math.abs(changePercent)}% vs last month
    </p>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accentColor?: string;
  trend?: React.ReactNode;
}

function StatCard({ icon, value, label, accentColor = "text-primary", trend }: StatCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ${accentColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        <p className="text-sm text-muted mt-0.5">{label}</p>
        {trend}
      </div>
    </div>
  );
}

export default function AnalyticsCards() {
  const clientStats = useQuery(api.clients.getStats);
  const sessionVolume = useSessionVolume();
  const intakeTrend = useIntakeTrend();

  const isLoading =
    clientStats === undefined ||
    sessionVolume === undefined ||
    intakeTrend === undefined;

  if (isLoading) {
    return <StatCardGridSkeleton count={3} />;
  }

  const showTrend =
    intakeTrend.lastMonth > 0 || intakeTrend.thisMonth > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Clients */}
        <StatCard
          icon={<UsersIcon />}
          value={clientStats.total}
          label="Total Clients"
          accentColor="text-primary"
        />

        {/* Session Volume */}
        <StatCard
          icon={<CalendarCheckIcon />}
          value={sessionVolume.count}
          label="Sessions (30 days)"
          accentColor="text-accent"
        />

        {/* Intake Trend */}
        <StatCard
          icon={<TrendingUpIcon />}
          value={intakeTrend.thisMonth}
          label="New Intakes This Month"
          accentColor="text-success"
          trend={
            <TrendBadge
              changePercent={intakeTrend.changePercent}
              positive={intakeTrend.positive}
              show={showTrend}
            />
          }
        />
      </div>

      {/* View analytics link */}
      <div className="flex justify-end">
        <a
          href="/analytics"
          className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
        >
          View analytics <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
