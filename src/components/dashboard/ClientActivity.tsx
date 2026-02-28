"use client";

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

function UserPlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21a12.318 12.318 0 01-6.374-1.766z" />
    </svg>
  );
}

function UsersRoundIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
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

  const isLoading = clientStats === undefined || programStats === undefined;

  if (isLoading) {
    return <StatCardGridSkeleton count={3} />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Clients */}
        <StatCard
          icon={<UsersIcon />}
          value={clientStats.active}
          label="Active Clients"
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

        {/* New This Month */}
        <StatCard
          icon={<UserPlusIcon />}
          value={clientStats.newThisMonth}
          label="New This Month"
          accentColor="text-accent"
        />

        {/* Total Clients */}
        <StatCard
          icon={<UsersRoundIcon />}
          value={clientStats.total}
          label="Total Clients"
          accentColor="text-primary-light"
        />
      </div>

      {/* View all clients link */}
      <div className="flex justify-end">
        <a
          href="/clients"
          className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
        >
          View all clients <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
