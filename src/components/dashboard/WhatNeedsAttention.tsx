"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ListSkeleton } from "@/components/dashboard/skeletons/TableSkeleton";
import { formatDate } from "@/lib/utils";

interface AttentionItem {
  id: string;
  type: "deadline" | "integration" | "info";
  severity: "warning" | "info" | "success";
  title: string;
  description: string;
  action?: { label: string; href: string };
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-8 w-8 text-accent opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ItemIcon({ type }: { type: AttentionItem["type"] }) {
  if (type === "deadline") return <CalendarIcon />;
  if (type === "integration") return <PlugIcon />;
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

const severityStyles: Record<AttentionItem["severity"], string> = {
  warning: "border-l-4 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
  info: "border-l-4 border-primary bg-primary/5",
  success: "border-l-4 border-accent bg-accent/5",
};

const severityIconColors: Record<AttentionItem["severity"], string> = {
  warning: "text-amber-500",
  info: "text-primary",
  success: "text-accent",
};

export default function WhatNeedsAttention() {
  const deadlines = useQuery(api.grants.getUpcomingDeadlines);
  const qbConfig = useQuery(api.quickbooks.getConfig);
  const grantStats = useQuery(api.grants.getStats);

  const isLoading = deadlines === undefined || qbConfig === undefined || grantStats === undefined;

  // Build attention items from resolved data
  const items: AttentionItem[] = [];

  if (!isLoading) {
    // QB connection status
    if (qbConfig === null) {
      items.push({
        id: "qb-not-connected",
        type: "integration",
        severity: "warning",
        title: "QuickBooks Not Connected",
        description: "Financial data unavailable — connect QuickBooks to see expenses, P&L, and cash on hand.",
        action: { label: "Connect", href: "/admin" },
      });
    } else if (qbConfig?.isExpired) {
      items.push({
        id: "qb-expired",
        type: "integration",
        severity: "warning",
        title: "QuickBooks Token Expired",
        description: "Your QuickBooks session has expired. Reconnect to restore financial data sync.",
        action: { label: "Reconnect", href: "/admin" },
      });
    }

    // Upcoming grant deadlines
    if (deadlines && deadlines.length > 0) {
      for (const deadline of deadlines) {
        items.push({
          id: `deadline-${deadline.grantId}-${deadline.reportLabel}`,
          type: "deadline",
          severity: "warning",
          title: `${deadline.reportLabel} — ${deadline.fundingSource}`,
          description: `Due ${formatDate(deadline.deadlineDate)}`,
          action: { label: "View Grant", href: "/grants" },
        });
      }
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-[var(--warm-shadow-sm)]">
      {/* Panel Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BellIcon />
        </div>
        <h2 className="flex-1 text-base font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
          What Needs Attention
        </h2>
        {!isLoading && (
          <span className="rounded-full bg-primary text-white text-xs font-medium px-2.5 py-0.5 tabular-nums">
            {items.length}
          </span>
        )}
      </div>

      {/* Panel Body */}
      <div className="px-5 py-4">
        {isLoading ? (
          <ListSkeleton items={3} />
        ) : items.length === 0 ? (
          /* All-clear state */
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
            <CheckCircleIcon />
            <p className="text-sm text-muted">
              All clear — nothing needs your attention right now.
            </p>
          </div>
        ) : (
          /* Items list */
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-lg p-3 ${severityStyles[item.severity]}`}
              >
                {/* Item icon */}
                <div className={`mt-0.5 shrink-0 ${severityIconColors[item.severity]}`}>
                  <ItemIcon type={item.type} />
                </div>

                {/* Item content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {item.description}
                  </p>
                </div>

                {/* Action link */}
                {item.action && (
                  <a
                    href={item.action.href}
                    className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-hover hover:border-primary transition-colors"
                  >
                    {item.action.label}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
