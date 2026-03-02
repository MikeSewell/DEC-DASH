"use client";

import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PALETTE = [
  "#2D6A4F",
  "#52B788",
  "#6BBF59",
  "#8CC63F",
  "#1B4332",
  "#74C69D",
  "#40916C",
  "#95D5B2",
];

function useChartConfig() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const CHART_TOOLTIP = {
    backgroundColor: isDark ? "rgba(30,30,30,0.95)" : "rgba(27,67,50,0.9)",
    titleColor: "#FFFFFF",
    bodyColor: isDark ? "#CCCCCC" : "#FFFFFF",
    borderColor: isDark ? "#404040" : "transparent",
    borderWidth: isDark ? 1 : 0,
    cornerRadius: 12,
    padding: 12,
    titleFont: { family: "'Nunito', sans-serif" as const },
    bodyFont: { family: "'Nunito', sans-serif" as const },
  };

  const PIE_LEGEND = {
    position: "right" as const,
    labels: {
      usePointStyle: true,
      pointStyle: "circle" as const,
      padding: 12,
      font: { size: 11, family: "'Nunito', sans-serif" },
      color: isDark ? "#CCCCCC" : undefined,
    },
  };

  function makeHorizontalBarOptions(_label: string) {
    return {
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: CHART_TOOLTIP,
      },
      scales: {
        x: {
          grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(45,106,79,0.06)" },
          ticks: {
            font: { family: "'Nunito', sans-serif", size: 11 },
            color: isDark ? "#999999" : undefined,
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: "'Nunito', sans-serif", size: 11 },
            color: isDark ? "#999999" : undefined,
          },
        },
      },
    };
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: PIE_LEGEND, tooltip: CHART_TOOLTIP },
  };

  return { CHART_TOOLTIP, PIE_LEGEND, makeHorizontalBarOptions, pieOptions, isDark };
}

export default function ProgramsCoparent() {
  const { makeHorizontalBarOptions, pieOptions, isDark } = useChartConfig();
  const programs = useQuery(api.programs.list);
  const coparentProgram = programs?.find((p) => p.type === "coparent");
  const demographics = useQuery(
    api.analytics.getAllDemographics,
    coparentProgram ? { programId: coparentProgram._id } : "skip"
  );
  const overview = useQuery(
    api.analytics.getProgramOverview,
    coparentProgram ? { programId: coparentProgram._id } : "skip"
  );

  if (demographics === undefined || programs === undefined || overview === undefined) {
    return <ChartSkeleton height={200} />;
  }

  if (!coparentProgram || demographics === null || demographics.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <p className="text-sm">No co-parent program data yet.</p>
      </div>
    );
  }

  const { total, genderDistribution, ethnicityDistribution, ageDistribution, referralSource, zipDistribution } = demographics;

  const makePieData = (dist: { name: string; count: number }[]) => ({
    labels: dist.map((d) => d.name),
    datasets: [
      {
        data: dist.map((d) => d.count),
        backgroundColor: dist.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderColor: isDark ? "#1E1E1E" : "#FFFEF9",
      },
    ],
  });

  const makeBarData = (dist: { name: string; count: number }[], color: string) => ({
    labels: dist.map((d) => d.name),
    datasets: [
      {
        label: "Participants",
        data: dist.map((d) => d.count),
        backgroundColor: color,
        borderRadius: 8,
      },
    ],
  });

  return (
    <div className="space-y-6">
      {/* Executive overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted">Total Participants</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-primary">{overview?.multiSessionClients ?? 0}</p>
          <p className="text-xs text-muted">Returning (2+ Sessions)</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-accent">{overview?.totalSessions ?? 0}</p>
          <p className="text-xs text-muted">Total Sessions</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-success">{overview?.completedCount ?? 0}</p>
          <p className="text-xs text-muted">Completed Program</p>
        </div>
      </div>

      {/* Second row — engagement metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-foreground">{overview?.recentSessions ?? 0}</p>
          <p className="text-xs text-muted">Sessions (Last 30 Days)</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-primary">{overview?.avgSessionsPerClient ?? 0}</p>
          <p className="text-xs text-muted">Avg Sessions / Person</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-accent">
            {overview?.attendanceRate !== null ? `${overview?.attendanceRate}%` : "—"}
          </p>
          <p className="text-xs text-muted">Attendance Rate</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-success">{overview?.zipCodeReach ?? 0}</p>
          <p className="text-xs text-muted">Zip Codes Reached</p>
        </div>
      </div>

      {/* Demographics charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {genderDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Gender</h4>
            <div style={{ height: 200 }}>
              <Pie data={makePieData(genderDistribution)} options={pieOptions} />
            </div>
          </div>
        )}

        {ageDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Age Distribution</h4>
            <div style={{ height: 200 }}>
              <Pie data={makePieData(ageDistribution)} options={pieOptions} />
            </div>
          </div>
        )}

        {ethnicityDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Ethnicity</h4>
            <div style={{ height: Math.max(180, ethnicityDistribution.length * 32) }}>
              <Bar data={makeBarData(ethnicityDistribution, "#2D6A4F")} options={makeHorizontalBarOptions("Ethnicity")} />
            </div>
          </div>
        )}

        {zipDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Zip Code Distribution</h4>
            <div style={{ height: Math.max(180, zipDistribution.length * 32) }}>
              <Bar data={makeBarData(zipDistribution, "#1B5E6B")} options={makeHorizontalBarOptions("Zip Code")} />
            </div>
          </div>
        )}
      </div>

      {referralSource.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">How Participants Found Us</h4>
            <div style={{ height: Math.max(200, referralSource.length * 32) }}>
              <Bar data={makeBarData(referralSource, "#6BBF59")} options={makeHorizontalBarOptions("Referral Source")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
