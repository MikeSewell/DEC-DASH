"use client";

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
import { useAllDemographics, useZipCodeStats } from "@/hooks/useAnalytics";
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
      borderColor: "rgba(255,254,249,0.9)",
    },
  ],
});

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "55%",
  plugins: { legend: PIE_LEGEND, tooltip: CHART_TOOLTIP },
};

const OUTCOME_COLORS: Record<string, string> = {
  "Completed": "#2D6A4F",
  "Active": "#1B5E6B",
  "In Progress": "#6BBF59",
  "Dropped": "#DC6B4A",
  "Withdrawn": "#D4A843",
  "Unknown": "#9CA3AF",
};

const makeOutcomeData = (dist: { name: string; count: number }[]) => ({
  labels: dist.map((d) => d.name),
  datasets: [
    {
      data: dist.map((d) => d.count),
      backgroundColor: dist.map((d) => OUTCOME_COLORS[d.name] ?? PALETTE[0]),
      borderWidth: 2,
      borderColor: "rgba(255,254,249,0.9)",
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

export default function DemographicsTab() {
  const demographics = useAllDemographics();
  const zipCodeStats = useZipCodeStats();

  if (demographics === undefined || zipCodeStats === undefined) {
    return <ChartSkeleton height={200} />;
  }

  if (demographics.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg
          className="h-10 w-10 mb-3 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
          />
        </svg>
        <p className="text-sm">No program data synced yet.</p>
        <p className="text-xs mt-1">Data will appear after the next sync cycle.</p>
      </div>
    );
  }

  const { total, active, completed, genderDistribution, ethnicityDistribution, ageDistribution, referralSource } =
    demographics;

  return (
    <div className="space-y-6">
      {/* Summary stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Demographics charts — 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Gender Distribution (Doughnut) */}
        {genderDistribution.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
            <h4 className="text-sm font-semibold text-foreground mb-3">Gender</h4>
            <div style={{ height: 220 }}>
              <Doughnut data={makeDoughnutData(genderDistribution)} options={doughnutOptions} />
            </div>
          </div>
        )}

        {/* Chart 2: Age Distribution (Doughnut) */}
        {ageDistribution.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
            <h4 className="text-sm font-semibold text-foreground mb-3">Age Groups</h4>
            <div style={{ height: 220 }}>
              <Doughnut data={makeDoughnutData(ageDistribution)} options={doughnutOptions} />
            </div>
          </div>
        )}

        {/* Chart 3: Ethnicity (Horizontal Bar) */}
        {ethnicityDistribution.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
            <h4 className="text-sm font-semibold text-foreground mb-3">Ethnicity</h4>
            <div style={{ height: Math.max(180, ethnicityDistribution.length * 32) }}>
              <Bar
                data={makeBarData(ethnicityDistribution, "#2D6A4F")}
                options={makeHorizontalBarOptions("Ethnicity")}
              />
            </div>
          </div>
        )}

        {/* Chart 4: Top Referral Sources (Horizontal Bar) */}
        {referralSource.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
            <h4 className="text-sm font-semibold text-foreground mb-3">Top Referral Sources</h4>
            <div style={{ height: Math.max(200, referralSource.length * 32) }}>
              <Bar
                data={makeBarData(referralSource, "#1B5E6B")}
                options={makeHorizontalBarOptions("Referral Source")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Outcomes & Geography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 5: Program Outcomes (Doughnut) */}
        {demographics.outcomeDistribution.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
            <h4 className="text-sm font-semibold text-foreground mb-3">Program Outcomes</h4>
            <div style={{ height: 220 }}>
              <Doughnut data={makeOutcomeData(demographics.outcomeDistribution)} options={doughnutOptions} />
            </div>
          </div>
        )}

        {/* Chart 6: Zip Code Coverage (Horizontal Bar) */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-3">Client Zip Codes</h4>
          {zipCodeStats.length > 0 ? (
            (() => {
              const sortedZips = [...zipCodeStats]
                .sort((a, b) => b.count - a.count)
                .slice(0, 15);
              const zipBarData = {
                labels: sortedZips.map((z) => z.zipCode),
                datasets: [
                  {
                    label: "Clients",
                    data: sortedZips.map((z) => z.count),
                    backgroundColor: "#1B5E6B",
                    borderRadius: 8,
                  },
                ],
              };
              return (
                <div style={{ height: Math.max(200, sortedZips.length * 28) }}>
                  <Bar data={zipBarData} options={makeHorizontalBarOptions("Zip Code")} />
                </div>
              );
            })()
          ) : (
            <p className="text-xs text-muted mt-2">
              No zip code data available. Zip codes are captured during client intake.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
