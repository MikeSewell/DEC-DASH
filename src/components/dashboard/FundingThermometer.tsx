"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency } from "@/lib/utils";

const FUNDING_GOAL_TARGET = 500_000;

export default function FundingThermometer() {
  // Animate fill on mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(id);
  }, []);

  const grantStats = useQuery(api.grants.getStats);

  // Single source of truth: grants table (same as Grants tab)
  const isLoading = grantStats === undefined;
  const current = grantStats?.totalAwarded ?? 0;
  const hasLiveData = current > 0;

  const goal = FUNDING_GOAL_TARGET;

  const percentage = Math.min(100, goal > 0 ? (current / goal) * 100 : 0);
  const fillHeight = mounted ? `${percentage}%` : "0%";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 hover-lift">
      {/* Thermometer bar */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <p className="text-xs font-medium text-muted uppercase tracking-wide">Progress</p>
        <div
          className="relative w-14 rounded-2xl bg-border/30 dark:bg-border/20 overflow-hidden"
          style={{ height: 200 }}
          aria-label={`Funding progress: ${percentage.toFixed(1)}%`}
        >
          {/* Fill — anchored to bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-2xl"
            style={{
              height: fillHeight,
              background: "linear-gradient(to top, var(--primary-dark, #0D2216), var(--primary, #1B5E6B), #2B9E9E)",
              transition: "height 1000ms ease-out",
            }}
          />
          {/* Percentage label overlaid on fill */}
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{
              textShadow: "0 1px 3px rgba(0,0,0,0.6)",
            }}
          >
            <span className="text-white text-xs font-bold rotate-[-90deg] whitespace-nowrap">
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
        {/* Goal line label */}
        <p className="text-xs text-muted">100%</p>
      </div>

      {/* Right side stats */}
      <div className="flex flex-col justify-center gap-4 flex-1">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-1">
            FY Funding Goal
          </p>
          <p className="text-4xl font-black text-primary leading-none">
            {percentage.toFixed(1)}%
          </p>
          <p className="text-sm text-muted mt-1">of annual goal reached</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {formatCurrency(current)}
            </span>
            <span className="text-sm text-muted">raised</span>
          </div>
          <p className="text-sm text-muted">
            Goal: {formatCurrency(goal)}
          </p>
          <p className="text-sm text-muted">
            Remaining: <span className="font-semibold text-foreground">{formatCurrency(Math.max(0, goal - current))}</span>
          </p>
        </div>
        {!hasLiveData && <p className="text-xs text-muted/60">No grant data available yet.</p>}
      </div>
    </div>
  );
}
