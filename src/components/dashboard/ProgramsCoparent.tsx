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
import { useProgramDemographics } from "@/hooks/useGrantTracker";
import Spinner from "@/components/ui/Spinner";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PALETTE = [
  "#1B4332",
  "#2D6A4F",
  "#52B788",
  "#6BBF59",
  "#8CC63F",
  "#74C69D",
  "#40916C",
  "#95D5B2",
];

const CHART_TOOLTIP = {
  backgroundColor: "rgba(27,67,50,0.9)",
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
  },
};

export default function ProgramsCoparent() {
  const demographics = useProgramDemographics("coparent");

  if (demographics === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (demographics.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <p className="text-sm">No co-parent program data synced yet.</p>
        <p className="text-xs mt-1">Configure the co-parent Google Sheet to see demographics.</p>
      </div>
    );
  }

  const { total, active, completed, avgSessions, genderDistribution, ethnicityDistribution, ageDistribution, outcomeDistribution } = demographics;

  const makePieData = (dist: { name: string; count: number }[]) => ({
    labels: dist.map((d) => d.name),
    datasets: [
      {
        data: dist.map((d) => d.count),
        backgroundColor: dist.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderColor: "rgba(255,254,249,0.9)",
      },
    ],
  });

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: PIE_LEGEND, tooltip: CHART_TOOLTIP },
  };

  const ethnicityBarData = {
    labels: ethnicityDistribution.map((d) => d.name),
    datasets: [
      {
        label: "Participants",
        data: ethnicityDistribution.map((d) => d.count),
        backgroundColor: "#2D6A4F",
        borderRadius: 8,
      },
    ],
  };

  const ethnicityBarOptions = {
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

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted">Total Participants</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-primary">{active}</p>
          <p className="text-xs text-muted">Active</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-success">{completed}</p>
          <p className="text-xs text-muted">Completed</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-accent">{avgSessions}</p>
          <p className="text-xs text-muted">Avg Sessions</p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender */}
        {genderDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Gender</h4>
            <div style={{ height: 200 }}>
              <Pie data={makePieData(genderDistribution)} options={pieOptions} />
            </div>
          </div>
        )}

        {/* Age Groups */}
        {ageDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Age Distribution</h4>
            <div style={{ height: 200 }}>
              <Pie data={makePieData(ageDistribution)} options={pieOptions} />
            </div>
          </div>
        )}

        {/* Ethnicity (horizontal bar) */}
        {ethnicityDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Ethnicity</h4>
            <div style={{ height: Math.max(180, ethnicityDistribution.length * 32) }}>
              <Bar data={ethnicityBarData} options={ethnicityBarOptions} />
            </div>
          </div>
        )}

        {/* Outcomes */}
        {outcomeDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Program Outcomes</h4>
            <div style={{ height: 200 }}>
              <Pie data={makePieData(outcomeDistribution)} options={pieOptions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
