"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
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
  // Animate fill on mount
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

  // Single source of truth: grants table (same as Grants tab)
  const isLoading = grantStats === undefined || fundingGoalSetting === undefined;
  const current = grantStats?.totalAwarded ?? 0;
  const hasLiveData = current > 0;

  const goal = fundingGoalSetting?.value
    ? Number(fundingGoalSetting.value)
    : DEFAULT_FUNDING_GOAL;

  const percentage = Math.min(100, goal > 0 ? (current / goal) * 100 : 0);
  const fillHeight = mounted ? `${percentage}%` : "0%";

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

      {/* Funds Raised by Year */}
      {fundingByYear && fundingByYear.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">Funds Raised by Year</p>
            {yoyLabel && (
              <span className={`text-xs font-semibold ${yoyLabel.positive ? "text-success" : "text-danger"}`}>
                {yoyLabel.positive ? "+" : ""}{yoyLabel.change}% YoY
              </span>
            )}
          </div>
          <div style={{ height: Math.max(120, fundingByYear.length * 28) }}>
            <Bar
              data={{
                labels: fundingByYear.map((d) => String(d.year)),
                datasets: [
                  {
                    label: "Funds Raised",
                    data: fundingByYear.map((d) => d.amount),
                    backgroundColor: "#2D6A4F",
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
                      label: (ctx) => formatCurrency(ctx.parsed.x),
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
