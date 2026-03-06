"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionVolume, useIntakeTrend } from "@/hooks/useAnalytics";
import { StatCardGridSkeleton } from "@/components/dashboard/skeletons/StatCardSkeleton";
import Link from "next/link";

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
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

function CalendarCheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
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

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accentColor?: string;
  children?: React.ReactNode;
}

function StatCard({ icon, value, label, accentColor = "text-primary", children }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ${accentColor}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
          <p className="text-sm text-muted mt-0.5">{label}</p>
        </div>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}

export default function ClientActivity() {
  const clientStats = useQuery(api.clients.getStats);
  const programStats = useQuery(api.clients.getStatsByProgram);
  const programs = useQuery(api.programs.list);
  const sessionVolume = useSessionVolume();
  const intakeTrend = useIntakeTrend();

  const isLoading =
    clientStats === undefined ||
    programStats === undefined ||
    programs === undefined ||
    sessionVolume === undefined ||
    intakeTrend === undefined;

  if (isLoading) {
    return <StatCardGridSkeleton count={4} />;
  }

  const showTrend = intakeTrend.lastMonth > 0 || intakeTrend.thisMonth > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <StatCard
          icon={<UsersIcon />}
          value={clientStats.total}
          label="Total Clients"
          accentColor="text-primary"
        >
          {programStats && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Legal: {programStats.legal}
              </span>
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                Co-Parent: {programStats.coparent}
              </span>
            </div>
          )}
        </StatCard>

        {/* New Intakes This Month */}
        <StatCard
          icon={<TrendingUpIcon />}
          value={intakeTrend.thisMonth}
          label="New Intakes This Month"
          accentColor="text-success"
        >
          {showTrend && (
            <p className={`text-xs font-medium flex items-center gap-0.5 ${intakeTrend.positive ? "text-success" : "text-danger"}`}>
              {intakeTrend.positive ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {Math.abs(intakeTrend.changePercent)}% vs last month
            </p>
          )}
        </StatCard>

        {/* Sessions (30 Days) */}
        <StatCard
          icon={<CalendarCheckIcon />}
          value={sessionVolume.count}
          label="Sessions (30 Days)"
          accentColor="text-accent"
        />

        {/* Active Programs */}
        <StatCard
          icon={<GridIcon />}
          value={programs.length}
          label="Active Programs"
          accentColor="text-primary-light"
        />
      </div>

      {/* View all clients link */}
      <div className="flex justify-end">
        <Link
          href="/programs"
          className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
        >
          View all clients <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
