"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency, cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const DEFAULT_FUNDING_GOAL = 500_000;

export default function FundingThermometer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(id);
  }, []);

  const grantStats = useQuery(api.grants.getStats);
  const fundingGoalSetting = useQuery(api.settings.get, { key: "funding_goal" });
  const fundingByYear = useQuery(api.grants.getFundingByYear);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const isLoading = grantStats === undefined || fundingGoalSetting === undefined || fundingByYear === undefined;
  const totalAllTime = grantStats?.totalAwarded ?? 0;

  // Current FY raised — find the current year in fundingByYear
  const currentYear = new Date().getFullYear();
  const currentYearData = fundingByYear?.find((d) => d.year === currentYear);
  const raisedThisYear = currentYearData?.amount ?? 0;

  const goal = fundingGoalSetting?.value
    ? Number(fundingGoalSetting.value)
    : DEFAULT_FUNDING_GOAL;

  // Progress bar uses current FY raised vs annual goal
  const percentage = Math.min(100, goal > 0 ? (raisedThisYear / goal) * 100 : 0);
  const remaining = Math.max(0, goal - raisedThisYear);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // YoY comparison
  const yoyLabel =
    fundingByYear && fundingByYear.length >= 2
      ? (() => {
          const curr = fundingByYear[fundingByYear.length - 1].amount;
          const prev = fundingByYear[fundingByYear.length - 2].amount;
          if (prev === 0) return null;
          const change = Math.round(((curr - prev) / prev) * 100);
          return { change, positive: change >= 0 };
        })()
      : null;

  return (
    <div className="space-y-6">
      {/* Top row: progress bar + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Goal progress — spans 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          {/* Big number + label */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-primary leading-none">
              {percentage.toFixed(1)}%
            </span>
            <span className="text-sm text-muted">of FY {currentYear} goal reached</span>
          </div>

          {/* Full-width progress bar */}
          <div className="relative h-8 rounded-full bg-border/20 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: mounted ? `${percentage}%` : "0%",
                background: "linear-gradient(90deg, var(--primary-dark, #0D2216), var(--primary, #1B5E6B), #2B9E9E)",
                transition: "width 1000ms ease-out",
              }}
            />
            {/* Percentage badge on the bar */}
            {percentage > 8 && (
              <div
                className="absolute inset-y-0 flex items-center"
                style={{
                  left: `${Math.min(percentage, 96)}%`,
                  transform: "translateX(-100%)",
                  paddingRight: 8,
                }}
              >
                <span className="text-white text-xs font-bold drop-shadow-sm">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Raised / Goal / Remaining / All-Time row */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Raised FY {currentYear}</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(raisedThisYear)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">FY Goal</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(goal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Remaining</p>
              <p className={cn("text-xl font-bold", remaining === 0 ? "text-success" : "text-foreground")}>
                {formatCurrency(remaining)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">All-Time Total</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalAllTime)}</p>
            </div>
          </div>
        </div>

        {/* Right: Quick stats card */}
        <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Grant Overview</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Total Grants</span>
              <span className="text-sm font-bold text-foreground">{grantStats?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Active</span>
              <span className="text-sm font-bold text-success">{grantStats?.activeCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Upcoming Reports</span>
              <span className="text-sm font-bold text-foreground">{grantStats?.upcomingReports ?? 0}</span>
            </div>
            {grantStats?.successRate?.byCount !== null && grantStats?.successRate?.byCount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Success Rate</span>
                <span className="text-sm font-bold text-foreground">{grantStats.successRate.byCount}%</span>
              </div>
            )}
          </div>
          {yoyLabel && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">YoY Change</span>
                <span className={cn("text-sm font-bold", yoyLabel.positive ? "text-success" : "text-danger")}>
                  {yoyLabel.positive ? "+" : ""}{yoyLabel.change}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Funds Raised by Year chart */}
      {fundingByYear && fundingByYear.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
            Funds Raised by Year
          </p>
          <div style={{ height: Math.max(140, fundingByYear.length * 32) }}>
            <Bar
              data={{
                labels: fundingByYear.map((d) => String(d.year)),
                datasets: [
                  {
                    label: "Funds Raised",
                    data: fundingByYear.map((d) => d.amount),
                    backgroundColor: isDark ? "#2B9E9E" : "#2D6A4F",
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                indexAxis: "y" as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: isDark ? "rgba(30,30,30,0.95)" : "rgba(27,67,50,0.9)",
                    titleColor: "#FFFFFF",
                    bodyColor: "#FFFFFF",
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                      label: (ctx) => formatCurrency(ctx.parsed.x ?? 0),
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(45,106,79,0.06)" },
                    ticks: {
                      font: { size: 10, family: "'Nunito', sans-serif" },
                      color: isDark ? "#999" : undefined,
                      callback: (v) => formatCurrency(v as number),
                    },
                  },
                  y: {
                    grid: { display: false },
                    ticks: {
                      font: { size: 11, family: "'Nunito', sans-serif" },
                      color: isDark ? "#999" : undefined,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
