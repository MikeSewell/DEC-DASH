"use client";

import { useActiveGrants, useGrantDeadlines, useSheetsConfig } from "@/hooks/useGrantTracker";
import Badge from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/dashboard/skeletons/TableSkeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { GrantStatus } from "@/types";

const statusVariant: Record<GrantStatus, "success" | "warning" | "danger" | "info" | "default"> = {
  active: "success",
  pending: "warning",
  completed: "info",
  cultivating: "default",
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function DeadlineCountdown({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  let color = "text-muted";
  if (days <= 7) color = "text-danger font-semibold";
  else if (days <= 30) color = "text-warning font-medium";

  return (
    <span className={color}>
      {days <= 0 ? "Overdue" : days === 1 ? "Tomorrow" : `${days} days`}
    </span>
  );
}

export default function GrantTracking() {
  const activeGrants = useActiveGrants();
  const deadlines = useGrantDeadlines();
  const sheetsConfig = useSheetsConfig();

  if (activeGrants === undefined || deadlines === undefined || sheetsConfig === undefined) {
    return <TableSkeleton rows={5} />;
  }

  if (sheetsConfig === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">Connect Google Sheets to view this data.</p>
        <a href="/admin" className="text-primary hover:underline text-xs mt-2">Configure Google Sheets →</a>
      </div>
    );
  }

  if (!activeGrants || activeGrants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">No active grants found.</p>
        <p className="text-xs mt-1">Data will appear after the next sync cycle.</p>
      </div>
    );
  }

  // Show up to 5 upcoming deadlines
  const upcomingDeadlines = deadlines.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Grants Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left py-2 font-medium">Grant Name</th>
              <th className="text-left py-2 font-medium">Funder</th>
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Amount</th>
              <th className="text-right py-2 font-medium">End Date</th>
            </tr>
          </thead>
          <tbody>
            {activeGrants.map((grant) => (
              <tr key={grant.sheetRowId} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                <td className="py-2.5 text-foreground font-medium">{grant.grantName}</td>
                <td className="py-2.5 text-muted">{grant.funder}</td>
                <td className="py-2.5">
                  <Badge variant={statusVariant[grant.status as GrantStatus] ?? "default"}>
                    {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
                  </Badge>
                </td>
                <td className="py-2.5 text-right text-foreground">{formatCurrency(grant.totalAmount)}</td>
                <td className="py-2.5 text-right text-muted">{formatDate(grant.endDate)}</td>
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
                key={`${dl.grantId}-${dl.deadline}-${idx}`}
                className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 bg-surface shadow-[var(--warm-shadow-sm)] hover-lift"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{dl.grantName}</p>
                  <p className="text-xs text-muted">{formatDate(dl.deadline, "long")}</p>
                </div>
                <DeadlineCountdown dateStr={dl.deadline} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
