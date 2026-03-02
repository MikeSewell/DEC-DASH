"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAllDemographics } from "@/hooks/useAnalytics";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";
import { cn } from "@/lib/utils";
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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PALETTE = [
  "#1B5E6B", "#2D6A4F", "#52B788", "#6BBF59", "#8CC63F",
  "#2B9E9E", "#7DD4C8", "#74C69D", "#40916C", "#95D5B2",
  "#1A7A7A", "#5BBFB5",
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

const makeDoughnutData = (dist: { name: string; count: number }[]) => ({
  labels: dist.map((d) => d.name),
  datasets: [{
    data: dist.map((d) => d.count),
    backgroundColor: dist.map((_, i) => PALETTE[i % PALETTE.length]),
    borderWidth: 2,
    borderColor: "var(--surface, rgba(255,254,249,0.9))",
    hoverOffset: 6,
  }],
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
  datasets: [{
    label: "Participants",
    data: dist.map((d) => d.count),
    backgroundColor: color,
    borderRadius: 6,
    borderSkipped: false,
  }],
});

function makeHorizontalBarOptions() {
  return {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP },
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

const TYPE_COLORS: Record<string, string> = {
  legal: "bg-primary",
  coparent: "bg-accent",
  fatherhood: "bg-[#2B9E9E]",
  other: "bg-muted",
};

function ProgramCard({
  program,
  isSelected,
  onClick,
}: {
  program: { _id: string; name: string; type: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const overview = useQuery(api.analytics.getProgramOverview, {
    programId: program._id as any,
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-5 text-left transition-all",
        isSelected
          ? "border-primary bg-primary/5 shadow-[var(--warm-shadow-md)]"
          : "border-border bg-surface shadow-[var(--warm-shadow-sm)] hover-lift hover:border-primary/30"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[program.type] ?? "bg-muted"}`} />
        <h3 className="text-sm font-semibold text-foreground">{program.name}</h3>
      </div>
      {overview === undefined ? (
        <div className="h-10 w-16 rounded-lg bg-background animate-pulse" />
      ) : (
        <>
          <p className="text-2xl font-bold text-foreground">{overview.totalParticipants}</p>
          <p className="text-[11px] text-muted">Participants</p>
        </>
      )}
    </button>
  );
}

export default function ProgramOverviewTab() {
  const programs = useQuery(api.programs.list);
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(undefined);

  const demographics = useAllDemographics(selectedProgramId);
  const globalOverview = useQuery(api.analytics.getProgramOverview, {});

  if (programs === undefined || demographics === undefined) {
    return <ChartSkeleton height={200} />;
  }

  const selectedName = selectedProgramId
    ? programs.find((p) => p._id === selectedProgramId)?.name ?? "Program"
    : "All Programs";

  return (
    <div className="space-y-6">
      {/* Program selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* All programs card */}
        <button
          onClick={() => setSelectedProgramId(undefined)}
          className={cn(
            "rounded-2xl border p-5 text-left transition-all",
            !selectedProgramId
              ? "border-primary bg-primary/5 shadow-[var(--warm-shadow-md)]"
              : "border-border bg-surface shadow-[var(--warm-shadow-sm)] hover-lift hover:border-primary/30"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-foreground" />
            <h3 className="text-sm font-semibold text-foreground">All Programs</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {globalOverview ? globalOverview.totalParticipants : "—"}
          </p>
          <p className="text-[11px] text-muted">Participants</p>
        </button>

        {/* Per-program cards */}
        {programs.map((program) => (
          <ProgramCard
            key={program._id}
            program={program}
            isSelected={selectedProgramId === program._id}
            onClick={() =>
              setSelectedProgramId(selectedProgramId === program._id ? undefined : program._id)
            }
          />
        ))}
      </div>

      {/* Section label */}
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
        {selectedName} — Demographics
      </h3>

      {/* Demographics charts */}
      {demographics.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted">
          <p className="text-sm font-medium">No participant data found.</p>
          <p className="text-xs mt-1 opacity-70">Demographics will appear once clients are added.</p>
        </div>
      ) : (
        <>
          {/* Row 1: Ethnicity (wide bar) + Gender (doughnut) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
              <h4 className="text-sm font-semibold text-foreground mb-4">Ethnicity</h4>
              <div style={{ height: Math.max(200, demographics.ethnicityDistribution.length * 36) }}>
                <Bar
                  data={makeBarData(demographics.ethnicityDistribution, "#1B5E6B")}
                  options={makeHorizontalBarOptions()}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
              <h4 className="text-sm font-semibold text-foreground mb-4">Gender</h4>
              <div style={{ height: 260 }}>
                <Doughnut data={makeDoughnutData(demographics.genderDistribution)} options={doughnutOptions} />
              </div>
            </div>
          </div>

          {/* Row 2: Age Groups (doughnut) + Referral Sources (bar) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
              <h4 className="text-sm font-semibold text-foreground mb-4">Age Groups</h4>
              <div style={{ height: 280 }}>
                <Doughnut data={makeDoughnutData(demographics.ageDistribution)} options={doughnutOptions} />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
              <h4 className="text-sm font-semibold text-foreground mb-4">Top Referral Sources</h4>
              <div style={{ height: Math.max(200, demographics.referralSource.length * 34) }}>
                <Bar
                  data={makeBarData(demographics.referralSource, "#2B9E9E")}
                  options={makeHorizontalBarOptions()}
                />
              </div>
            </div>
          </div>

          {/* Row 3: Zip Codes */}
          {demographics.zipDistribution.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
              <h4 className="text-sm font-semibold text-foreground mb-4">Top Zip Codes</h4>
              <div style={{ height: Math.max(200, demographics.zipDistribution.length * 32) }}>
                <Bar
                  data={makeBarData(demographics.zipDistribution, "#52B788")}
                  options={makeHorizontalBarOptions()}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
