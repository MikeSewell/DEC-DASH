"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface GrantCategory {
  account_name: string;
  total_budget: number;
  amount_spent: number;
  remaining: number;
  percent_spent: number;
}

interface GrantProfile {
  class_id: string;
  class_name: string;
  end_date: string;
  remaining_days: number;
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  percent_spent: number;
  pacing_status: string;
  categories: GrantCategory[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function PacingBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    behind_pace: { label: "Behind", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    on_track: { label: "On Track", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    ahead_of_pace: { label: "Ahead", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  };
  const c = config[status] || { label: status, cls: "bg-gray-100 text-gray-800" };
  return <span className={cn("inline-block px-2 py-0.5 text-xs font-semibold rounded-full", c.cls)}>{c.label}</span>;
}

export default function GrantClassCards({ profiles }: { profiles: GrantProfile[] | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!profiles || profiles.length === 0) {
    return null;
  }

  return (
    <Card>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
            Grant Budget Overview
          </h3>
          <p className="text-xs text-muted mt-0.5">{profiles.length} active grants with budgets</p>
        </div>
        <svg
          className={cn("w-5 h-5 text-muted transition-transform", expanded && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((grant) => (
            <div
              key={grant.class_id}
              className="border border-border rounded-xl p-4 bg-background"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{grant.class_name}</p>
                  <p className="text-xs text-muted">{grant.remaining_days}d remaining</p>
                </div>
                <PacingBadge status={grant.pacing_status} />
              </div>

              {/* Overall progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span>{formatCurrency(grant.total_spent)} spent</span>
                  <span>{formatCurrency(grant.total_budget)} budget</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      grant.percent_spent > 90 ? "bg-red-500" : grant.percent_spent > 70 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, grant.percent_spent)}%` }}
                  />
                </div>
              </div>

              {/* Category breakdown */}
              <div className="space-y-1.5">
                {grant.categories.map((cat) => (
                  <div key={cat.account_name} className="flex items-center justify-between text-xs">
                    <span className="text-muted truncate max-w-[55%]">{cat.account_name}</span>
                    <span className="text-foreground font-medium">
                      {formatCurrency(cat.remaining)} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
