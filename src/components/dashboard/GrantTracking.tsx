"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Badge from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/dashboard/skeletons/TableSkeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

const stageVariant: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  active: "success",
  committed: "info",
  pending: "warning",
  prospective: "default",
  denied: "danger",
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getUrgencyClasses(days: number): string {
  if (days <= 7) {
    // Overdue or imminent — red
    return "border-l-4 border-l-red-500 bg-red-500/5 dark:bg-red-500/10";
  }
  if (days <= 30) {
    // Approaching — amber
    return "border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10";
  }
  // Comfortable — green
  return "border-l-4 border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10";
}

function DeadlineCountdown({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  let color: string;
  if (days <= 7) color = "text-danger font-semibold";
  else if (days <= 30) color = "text-warning font-medium";
  else color = "text-emerald-600 dark:text-emerald-400";

  return (
    <span className={color}>
      {days <= 0 ? "Overdue" : days === 1 ? "Tomorrow" : `${days} days`}
    </span>
  );
}

export default function GrantTracking() {
  const grants = useQuery(api.grants.list, { fundingStage: "active" });
  const deadlines = useQuery(api.grants.getUpcomingDeadlines);
  const grantStats = useQuery(api.grants.getStats);

  if (grants === undefined || deadlines === undefined) {
    return <TableSkeleton rows={5} />;
  }

  if (grants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">No active grants found.</p>
        <p className="text-xs mt-1">Grant tracking is sourced from the Grants tab records.</p>
      </div>
    );
  }

  const upcomingDeadlines = deadlines.slice(0, 5);

  const successRate = grantStats?.successRate;

  return (
    <div className="space-y-6">
      {/* Grant Success Rate */}
      {successRate && (successRate.byCount !== null || successRate.byAmount !== null) && (
        <div className="flex flex-wrap gap-4">
          {successRate.byCount !== null && (
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 shadow-[var(--warm-shadow-sm)]">
              <span className="text-xs text-muted">Success Rate (by count):</span>
              <span className="text-sm font-bold text-primary">{successRate.byCount}%</span>
              <span className="text-[10px] text-muted">
                ({successRate.securedCount} secured / {successRate.securedCount + successRate.deniedCount} decided)
              </span>
            </div>
          )}
          {successRate.byAmount !== null && (
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 shadow-[var(--warm-shadow-sm)]">
              <span className="text-xs text-muted">Success Rate (by $):</span>
              <span className="text-sm font-bold text-accent">{successRate.byAmount}%</span>
            </div>
          )}
        </div>
      )}

      {/* Grants Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left py-2 font-medium">Funder</th>
              <th className="text-left py-2 font-medium">Program</th>
              <th className="text-left py-2 font-medium">Stage</th>
              <th className="text-right py-2 font-medium">Awarded</th>
              <th className="text-right py-2 font-medium">End Date</th>
            </tr>
          </thead>
          <tbody>
            {grants.map((grant) => (
              <tr key={grant._id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                <td className="py-2.5 text-foreground font-medium">{grant.fundingSource}</td>
                <td className="py-2.5 text-muted">{grant.programName ?? "—"}</td>
                <td className="py-2.5">
                  <Badge variant={stageVariant[grant.fundingStage] ?? "default"}>
                    {grant.fundingStage.charAt(0).toUpperCase() + grant.fundingStage.slice(1)}
                  </Badge>
                </td>
                <td className="py-2.5 text-right text-foreground">{grant.amountAwarded ? formatCurrency(grant.amountAwarded) : "—"}</td>
                <td className="py-2.5 text-right text-muted">{grant.endDate ? formatDate(grant.endDate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Upcoming Deadlines
          </h4>
          <div className="space-y-2">
            {upcomingDeadlines.map((dl, idx) => (
              <div
                key={`${dl.grantId}-${dl.deadlineDate}-${idx}`}
                className={`flex items-center justify-between rounded-xl px-4 py-3 shadow-[var(--warm-shadow-sm)] hover-lift ${getUrgencyClasses(daysUntil(dl.deadlineDate))}`}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{dl.fundingSource} — {dl.reportLabel}</p>
                  <p className="text-xs text-muted">{formatDate(dl.deadlineDate, "long")}</p>
                </div>
                <DeadlineCountdown dateStr={dl.deadlineDate} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
