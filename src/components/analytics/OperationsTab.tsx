"use client";

import { useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  useAuditFeed,
  useStaffActionStats,
  useCategorizationStats,
} from "@/hooks/useAnalytics";
import { ChartSkeleton } from "@/components/dashboard/skeletons/ChartSkeleton";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OperationsTab() {
  const [showAll, setShowAll] = useState(false);

  const auditFeed = useAuditFeed();
  const staffActionStats = useStaffActionStats();
  const categorizationStats = useCategorizationStats();

  if (
    auditFeed === undefined ||
    staffActionStats === undefined ||
    categorizationStats === undefined
  ) {
    return <ChartSkeleton height={200} />;
  }

  // Section 2: Category distribution chart data
  const categoryDistribution = categorizationStats.categoryDistribution;
  const top8Categories = categoryDistribution.slice(0, 8);

  const doughnutData = {
    labels: categoryDistribution.map((d) => d.category),
    datasets: [
      {
        data: categoryDistribution.map((d) => d.count),
        backgroundColor: categoryDistribution.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderColor: "rgba(255,254,249,0.9)",
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "55%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle" as const,
          padding: 12,
          font: { size: 11, family: "'Nunito', sans-serif" },
        },
      },
      tooltip: CHART_TOOLTIP,
    },
  };

  const barData = {
    labels: top8Categories.map((d) => d.category),
    datasets: [
      {
        data: top8Categories.map((d) => d.count),
        backgroundColor: "#1B5E6B",
        borderRadius: 8,
      },
    ],
  };

  const barOptions = {
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

  const barHeight = Math.max(200, Math.min(categoryDistribution.length, 8) * 32);

  // Section 4: Activity feed slice
  const visibleFeed = showAll ? auditFeed : auditFeed.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Section 1: Categorization Summary Cards (OPS-03) */}
      {categorizationStats.totalAllocations === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--warm-shadow-sm)]">
          <p className="text-sm text-muted text-center">
            No expense categorization data yet. Run AI categorization from the Expenses page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-foreground">
              {categorizationStats.totalAllocations}
            </p>
            <p className="text-xs text-muted">Total Categorized</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-success">{categorizationStats.accepted}</p>
            <p className="text-xs text-muted">Accepted</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-primary">
              {categorizationStats.acceptanceRate}%
            </p>
            <p className="text-xs text-muted">Acceptance Rate</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
            <p className="text-xl font-bold text-accent">
              {categorizationStats.confidenceBreakdown.high}
            </p>
            <p className="text-xs text-muted">High Confidence</p>
          </div>
        </div>
      )}

      {/* Section 2: Category Distribution Charts (OPS-04) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Doughnut chart */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-3">Expense Categories</h4>
          {categoryDistribution.length === 0 ? (
            <p className="text-xs text-muted">No category data available.</p>
          ) : (
            <div style={{ height: 240 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          )}
        </div>

        {/* Horizontal bar chart */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
          <h4 className="text-sm font-semibold text-foreground mb-3">Categories by Count</h4>
          {categoryDistribution.length === 0 ? (
            <p className="text-xs text-muted">No category data available.</p>
          ) : (
            <div style={{ height: barHeight }}>
              <Bar data={barData} options={barOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Staff Action Stats Table (OPS-02) */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-foreground">Staff Activity Summary</h4>
          {staffActionStats.mostActive !== null && (
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              Most Active: {staffActionStats.mostActive.userName}
            </span>
          )}
        </div>

        {staffActionStats.staffStats.length === 0 ? (
          <p className="text-sm text-muted">No staff activity recorded yet.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide pb-2">
                    Staff Member
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide pb-2">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide pb-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffActionStats.staffStats.map((member, idx) => (
                  <tr
                    key={member.userId}
                    className={`border-t border-border/50${idx === 0 && staffActionStats.mostActive !== null ? " bg-primary/5" : ""}`}
                  >
                    <td className="py-2.5 font-medium text-foreground">{member.userName}</td>
                    <td className="py-2.5 text-muted">{member.userEmail}</td>
                    <td className="py-2.5 text-right font-semibold text-primary">
                      {member.actionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-3 text-right">
              Total actions: {staffActionStats.totalActions}
            </p>
          </>
        )}
      </div>

      {/* Section 4: Recent Activity Feed (OPS-01) */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
        <h4 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h4>

        {auditFeed.length === 0 ? (
          <p className="text-sm text-muted">
            No activity recorded yet. Actions will appear here as staff use the system.
          </p>
        ) : (
          <>
            <div className="space-y-0 divide-y divide-border/50">
              {visibleFeed.map((entry) => (
                <div key={entry.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.description}</p>
                    <p className="text-xs text-muted mt-0.5">by {entry.userName}</p>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {timeAgo(entry.createdAt)}
                  </span>
                </div>
              ))}
            </div>

            {auditFeed.length > 20 && (
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="mt-3 text-xs text-primary hover:underline font-medium"
              >
                {showAll ? "Show less" : `Show all (${auditFeed.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
