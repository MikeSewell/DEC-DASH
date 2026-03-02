"use client";

import { useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
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
import { useAllDemographics } from "@/hooks/useAnalytics";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { cn } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PALETTE = [
  "#1B5E6B",
  "#2D6A4F",
  "#52B788",
  "#6BBF59",
  "#8CC63F",
  "#2B9E9E",
  "#7DD4C8",
  "#74C69D",
  "#40916C",
  "#95D5B2",
  "#1A7A7A",
  "#5BBFB5",
];

const CHART_TOOLTIP = {
  backgroundColor: "rgba(27,67,50,0.95)",
  cornerRadius: 8,
  padding: { top: 8, bottom: 8, left: 12, right: 12 },
  titleFont: { family: "'Nunito', sans-serif", size: 13, weight: "bold" as const },
  bodyFont: { family: "'Nunito', sans-serif", size: 12 },
  displayColors: true,
  boxPadding: 4,
};

function makeHorizontalBarOptions(label: string) {
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
        grid: { color: "rgba(45,106,79,0.06)" },
        ticks: { font: { family: "'Nunito', sans-serif", size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: "'Nunito', sans-serif", size: 11 } },
      },
    },
  };
}

const makeDoughnutData = (dist: { name: string; count: number }[]) => ({
  labels: dist.map((d) => d.name),
  datasets: [
    {
      data: dist.map((d) => d.count),
      backgroundColor: dist.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2,
      borderColor: "var(--surface, rgba(255,254,249,0.9))",
      hoverOffset: 6,
    },
  ],
});

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "60%",
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        usePointStyle: true,
        pointStyle: "circle" as const,
        padding: 16,
        font: { size: 11, family: "'Nunito', sans-serif" },
      },
    },
    tooltip: CHART_TOOLTIP,
  },
};

const makeBarData = (dist: { name: string; count: number }[], color: string) => ({
  labels: dist.map((d) => d.name),
  datasets: [
    {
      label: "Participants",
      data: dist.map((d) => d.count),
      backgroundColor: color,
      borderRadius: 6,
      borderSkipped: false,
    },
  ],
});

type ProgramOption = { id: string | undefined; label: string };

export default function DemographicsTab() {
  const programs = useQuery(api.programs.list);
  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(undefined);
  const demographics = useAllDemographics(selectedProgram);

  const programOptions: ProgramOption[] = [
    { id: undefined, label: "All Programs" },
    ...(programs ?? []).map((p: { _id: string; name: string }) => ({ id: p._id, label: p.name })),
  ];

  if (demographics === undefined) {
    return <ChartSkeleton height={200} />;
  }

  if (demographics.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <svg
          className="h-12 w-12 mb-4 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
        <p className="text-sm font-medium">No participant data found.</p>
        <p className="text-xs mt-1 opacity-70">Demographics will appear once clients are added.</p>
      </div>
    );
  }

  const {
    total,
    active,
    completed,
    genderDistribution,
    ethnicityDistribution,
    ageDistribution,
    referralSource,
    zipDistribution,
  } = demographics;

  return (
    <div className="space-y-6">
      {/* Program filter + summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {programOptions.map((opt) => (
            <button
              key={opt.id ?? "all"}
              onClick={() => setSelectedProgram(opt.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-all",
                selectedProgram === opt.id
                  ? "bg-primary text-white shadow-md"
                  : "bg-surface border border-border text-muted hover:text-foreground hover:border-primary/30"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span><strong className="text-foreground">{total}</strong> total</span>
          <span className="text-primary"><strong>{active}</strong> enrolled</span>
          <span className="text-accent"><strong>{completed}</strong> completed</span>
        </div>
      </div>

      {/* Row 1: Ethnicity (wide bar) + Gender (doughnut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-4">Ethnicity</h4>
          <div style={{ height: Math.max(200, ethnicityDistribution.length * 36) }}>
            <Bar
              data={makeBarData(ethnicityDistribution, "#1B5E6B")}
              options={makeHorizontalBarOptions("Ethnicity")}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-4">Gender</h4>
          <div style={{ height: 260 }}>
            <Doughnut data={makeDoughnutData(genderDistribution)} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Row 2: Age Groups (doughnut) + Referral Sources (bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-4">Age Groups</h4>
          <div style={{ height: 280 }}>
            <Doughnut data={makeDoughnutData(ageDistribution)} options={doughnutOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-4">Top Referral Sources</h4>
          <div style={{ height: Math.max(200, referralSource.length * 34) }}>
            <Bar
              data={makeBarData(referralSource, "#2B9E9E")}
              options={makeHorizontalBarOptions("Referral Source")}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Zip Codes (full width bar) */}
      {zipDistribution.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-4">Top Zip Codes</h4>
          <div style={{ height: Math.max(200, zipDistribution.length * 32) }}>
            <Bar
              data={makeBarData(zipDistribution, "#52B788")}
              options={makeHorizontalBarOptions("Zip Code")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
