"use client";

import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useSessionTrends, useGoalStats, useIntakeVolume } from "@/hooks/useAnalytics";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CHART_TOOLTIP = {
  backgroundColor: "rgba(27,67,50,0.9)",
  cornerRadius: 12,
  padding: 12,
  titleFont: { family: "'Nunito', sans-serif" as const },
  bodyFont: { family: "'Nunito', sans-serif" as const },
};

export default function ClientActivityTab() {
  const sessionTrends = useSessionTrends();
  const goalStats = useGoalStats();
  const intakeVolume = useIntakeVolume();

  // Show skeleton while any hook is loading
  if (sessionTrends === undefined || goalStats === undefined || intakeVolume === undefined) {
    return <ChartSkeleton height={200} />;
  }

  // Derived booleans for empty states
  const hasSessionData = sessionTrends.months.some((m) => m.count > 0);
  const hasIntakeData = intakeVolume.months.some((m) => m.legal > 0 || m.coparent > 0);

  // --- Section 1: Session Volume Line Chart data ---
  const sessionLabels = sessionTrends.months.map((m) => m.label);
  const sessionData = {
    labels: sessionLabels,
    datasets: [
      {
        label: "Sessions",
        data: sessionTrends.months.map((m) => m.count),
        borderColor: "#1B5E6B",
        backgroundColor: "rgba(27,94,107,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#1B5E6B",
        borderWidth: 2,
      },
    ],
  };

  const sessionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: CHART_TOOLTIP,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Nunito', sans-serif", size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(45,106,79,0.06)" },
        ticks: { font: { family: "'Nunito', sans-serif", size: 11 }, precision: 0 },
      },
    },
  };

  // --- Section 3: Intake Volume Grouped Bar Chart data ---
  const intakeLabels = intakeVolume.months.map((m) => m.label);
  const intakeData = {
    labels: intakeLabels,
    datasets: [
      {
        label: "Legal",
        data: intakeVolume.months.map((m) => m.legal),
        backgroundColor: "#1B5E6B",
        borderRadius: 6,
      },
      {
        label: "Co-Parent",
        data: intakeVolume.months.map((m) => m.coparent),
        backgroundColor: "#6BBF59",
        borderRadius: 6,
      },
    ],
  };

  const intakeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle" as const,
          padding: 12,
          font: { size: 11, family: "'Nunito', sans-serif" },
        },
      },
      tooltip: CHART_TOOLTIP,
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: { font: { family: "'Nunito', sans-serif", size: 11 } },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        grid: { color: "rgba(45,106,79,0.06)" },
        ticks: { font: { family: "'Nunito', sans-serif", size: 11 }, precision: 0 },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Session Volume Trends (ACT-01) */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
        <h4 className="text-sm font-semibold text-foreground mb-3">Session Volume (Past 12 Months)</h4>
        {hasSessionData ? (
          <div style={{ height: 280 }}>
            <Line data={sessionData} options={sessionOptions} />
          </div>
        ) : (
          <p className="text-sm text-muted py-8 text-center">No session data recorded yet.</p>
        )}
      </div>

      {/* Section 2: Goal Status Breakdown (ACT-02) */}
      {goalStats.total === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--warm-shadow-sm)]">
          <p className="text-sm text-muted text-center py-4">No client goals recorded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-success">{goalStats.completed}</p>
            <p className="text-xs text-muted">Completed</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-primary">{goalStats.inProgress}</p>
            <p className="text-xs text-muted">In Progress</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-muted">{goalStats.notStarted}</p>
            <p className="text-xs text-muted">Not Started</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-accent">{goalStats.completionRate}%</p>
            <p className="text-xs text-muted">Completion Rate</p>
          </div>
        </div>
      )}

      {/* Section 3: Intake Volume by Month (ACT-03) */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
        <h4 className="text-sm font-semibold text-foreground mb-3">Intake Volume (Past 12 Months)</h4>
        {hasIntakeData ? (
          <div style={{ height: 280 }}>
            <Bar data={intakeData} options={intakeOptions} />
          </div>
        ) : (
          <p className="text-sm text-muted py-8 text-center">No intake data recorded yet.</p>
        )}
      </div>
    </div>
  );
}
