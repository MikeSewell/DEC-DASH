"use client";

import { useState } from "react";
import { useGrantsList, useGrantStats } from "@/hooks/useGrants";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import GrantsTable from "@/components/grants/GrantsTable";
import { cn, formatCurrency } from "@/lib/utils";
import type { FundingStage } from "@/types";

const STAGES: { id: FundingStage; label: string; color: string }[] = [
  { id: "active", label: "Active", color: "bg-green-500" },
  { id: "committed", label: "Committed", color: "bg-blue-500" },
  { id: "pending", label: "Pending", color: "bg-yellow-500" },
  { id: "cultivating", label: "Cultivating", color: "bg-purple-500" },
  { id: "denied", label: "Denied", color: "bg-red-500" },
];

export default function GrantsPage() {
  const [activeTab, setActiveTab] = useState<FundingStage>("active");
  const stats = useGrantStats();
  const grants = useGrantsList(activeTab);

  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading grants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
          Grants
        </h1>
        <p className="text-sm text-muted mt-1">
          Grant pipeline and funding tracker
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{stats.total}</p>
            <p className="text-xs text-muted mt-1">Total Grants</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(stats.totalAwarded)}
            </p>
            <p className="text-xs text-muted mt-1">Total Awarded</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {stats.byStage["active"] ?? 0}
            </p>
            <p className="text-xs text-muted mt-1">Active Grants</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {stats.upcomingReports}
            </p>
            <p className="text-xs text-muted mt-1">Upcoming Reports</p>
            <p className="text-[10px] text-muted">Next 30 days</p>
          </div>
        </Card>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px">
          {STAGES.map((stage) => {
            const count = stats.byStage[stage.id] ?? 0;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveTab(stage.id)}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-b-2 rounded-t-lg transition-colors flex items-center gap-2",
                  activeTab === stage.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted hover:text-foreground hover:bg-surface-hover/50"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", stage.color)} />
                {stage.label}
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeTab === stage.id
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-hover text-muted"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Grants table */}
      <Card>
        {grants === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <GrantsTable grants={grants as any} />
        )}
      </Card>
    </div>
  );
}
