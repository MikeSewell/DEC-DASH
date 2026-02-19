"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useActiveGrants } from "@/hooks/useGrantTracker";
import { useQuickBooksConfig } from "@/hooks/useQuickBooks";
import Spinner from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

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
    <div className="flex items-start gap-4 rounded-lg border border-border bg-surface p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10", accentColor)}>
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
  const clients = useQuery(api.clients.list, {});
  const programs = useQuery(api.programs.list);
  const activeGrants = useActiveGrants();
  const qbConfig = useQuickBooksConfig();

  const isClientsLoading = clients === undefined;
  const isProgramsLoading = programs === undefined;
  const isGrantsLoading = activeGrants === undefined;
  const isQBLoading = qbConfig === undefined;

  const totalClients = clients ? clients.length : "--";
  const activePrograms = programs ? programs.filter((p) => p.isActive).length : "--";
  const activeGrantCount = activeGrants ? activeGrants.length : "--";

  // Determine service connection status
  const qbConnected = qbConfig !== undefined && qbConfig !== null && !qbConfig.isExpired;
  const servicesStatus = isQBLoading ? "--" : qbConnected ? "Connected" : "Disconnected";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        value={totalClients}
        label="Total Clients"
        loading={isClientsLoading}
        accentColor="text-primary"
      />

      <StatCard
        icon={
          <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        value={activePrograms}
        label="Active Programs"
        loading={isProgramsLoading}
        accentColor="text-accent"
      />

      <StatCard
        icon={
          <svg className="h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        value={activeGrantCount}
        label="Active Grants"
        loading={isGrantsLoading}
        accentColor="text-primary-light"
      />

      <StatCard
        icon={
          <svg
            className={cn("h-5 w-5", qbConnected ? "text-success" : "text-warning")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
        value={servicesStatus}
        label="QuickBooks Status"
        loading={isQBLoading}
        accentColor={qbConnected ? "text-success" : "text-warning"}
      />
    </div>
  );
}
