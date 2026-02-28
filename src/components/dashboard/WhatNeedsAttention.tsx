"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ListSkeleton } from "@/components/dashboard/skeletons/TableSkeleton";
import { useToast } from "@/components/ui/Toast";
import { useEffect, useRef } from "react";
import type { Alert } from "../../../convex/alerts";

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

function ChartBarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
    </svg>
  );
}

function ItemIcon({ type }: { type: Alert["type"] }) {
  if (type === "deadline") return <CalendarIcon />;
  if (type === "integration") return <PlugIcon />;
  if (type === "budget") return <ChartBarIcon />;
  if (type === "sync") return <RefreshIcon />;
  return <CalendarIcon />; // fallback
}

const severityStyles: Record<Alert["severity"], string> = {
  critical: "border-l-4 border-red-400 bg-red-50/50 dark:bg-red-950/20",
  warning: "border-l-4 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
  info: "border-l-4 border-primary bg-primary/5",
};

const severityIconColors: Record<Alert["severity"], string> = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-primary",
};

export default function WhatNeedsAttention() {
  const alerts = useQuery(api.alerts.getAlerts);
  const { toast } = useToast();
  const toastedIds = useRef(new Set<string>());
  const isLoading = alerts === undefined;

  // Fire toast for critical alerts — once per ID per browser session
  useEffect(() => {
    if (!alerts) return;
    for (const alert of alerts) {
      if (alert.severity === "critical" && !toastedIds.current.has(alert.id)) {
        toastedIds.current.add(alert.id);
        toast({
          title: alert.title,
          description: alert.description,
          variant: "warning", // Toast system uses "warning" for amber styling
        });
      }
    }
  }, [alerts, toast]);

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
            {alerts.length}
          </span>
        )}
      </div>

      {/* Panel Body */}
      <div className="px-5 py-4">
        {isLoading ? (
          <ListSkeleton items={3} />
        ) : alerts.length === 0 ? (
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
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 rounded-lg p-3 ${severityStyles[alert.severity]}`}
              >
                {/* Item icon */}
                <div className={`mt-0.5 shrink-0 ${severityIconColors[alert.severity]}`}>
                  <ItemIcon type={alert.type} />
                </div>

                {/* Item content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {alert.description}
                  </p>
                </div>

                {/* Action link */}
                {alert.action && (
                  <a
                    href={alert.action.href}
                    className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-hover hover:border-primary transition-colors"
                  >
                    {alert.action.label}
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
