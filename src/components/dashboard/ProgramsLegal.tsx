"use client";

import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

const AGE_COLORS = [
  "#2D6A4F",
  "#52B788",
  "#6BBF59",
  "#8CC63F",
  "#1B4332",
  "#74C69D",
  "#40916C",
  "#95D5B2",
];

export default function ProgramsLegal() {
  const programStats = useQuery(api.programs.getStats);
  const clients = useQuery(api.clients.list, {});

  if (programStats === undefined || clients === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const legalPrograms = programStats.filter((p) => p.type === "legal");

  if (legalPrograms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
        </svg>
        <p className="text-sm">No legal programs found.</p>
        <p className="text-xs mt-1">Create a legal program to see stats here.</p>
      </div>
    );
  }

  // Aggregate stats across all legal programs
  const legalProgramIds = new Set(legalPrograms.map((p) => p._id));
  const legalClients = clients.filter(
    (c) => c.programId && legalProgramIds.has(c.programId)
  );

  const totalEnrolled = legalClients.length;
  const activeClients = legalClients.filter((c) => c.status === "active").length;
  const completedClients = legalClients.filter((c) => c.status === "completed").length;
  const totalSessions = legalPrograms.reduce((sum, p) => sum + p.totalSessions, 0);
  const avgSessions = totalEnrolled > 0 ? (totalSessions / totalEnrolled).toFixed(1) : "0";

  // Age distribution from legal clients
  const ageDistribution: Record<string, number> = {};
  for (const client of legalClients) {
    const group = client.ageGroup ?? "Unknown";
    ageDistribution[group] = (ageDistribution[group] ?? 0) + 1;
  }
  const ageEntries = Object.entries(ageDistribution).sort((a, b) => b[1] - a[1]);

  const pieData = {
    labels: ageEntries.map(([group]) => group),
    datasets: [
      {
        data: ageEntries.map(([, count]) => count),
        backgroundColor: ageEntries.map((_, i) => AGE_COLORS[i % AGE_COLORS.length]),
        borderWidth: 2,
        borderColor: "rgba(255,254,249,0.9)",
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
      tooltip: {
        backgroundColor: "rgba(27,67,50,0.9)",
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: "'Nunito', sans-serif" },
        bodyFont: { family: "'Nunito', sans-serif" },
      },
    },
  };

  // Recent enrollments (sorted by enrollment date, last 5)
  const recentEnrollments = [...legalClients]
    .filter((c) => c.enrollmentDate)
    .sort((a, b) => (b.enrollmentDate ?? 0) - (a.enrollmentDate ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-foreground">{totalEnrolled}</p>
          <p className="text-xs text-muted">Total Enrolled</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-primary">{activeClients}</p>
          <p className="text-xs text-muted">Active</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-success">{completedClients}</p>
          <p className="text-xs text-muted">Completed</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-[var(--warm-shadow-sm)] hover-lift">
          <p className="text-xl font-bold text-accent">{avgSessions}</p>
          <p className="text-xs text-muted">Avg Sessions</p>
        </div>
      </div>

      {/* Age distribution pie */}
      {ageEntries.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Age Distribution</h4>
          <div style={{ height: 220 }}>
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted text-center py-4">
          No age group data recorded for legal program clients.
        </p>
      )}

      {/* Recent enrollments */}
      {recentEnrollments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Recent Enrollments</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-right py-2 font-medium">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.map((client) => (
                  <tr key={client._id} className="border-b border-border/50">
                    <td className="py-2 text-foreground">
                      {client.firstName} {client.lastName}
                    </td>
                    <td className="py-2">
                      <Badge
                        variant={
                          client.status === "active"
                            ? "success"
                            : client.status === "completed"
                              ? "info"
                              : "danger"
                        }
                      >
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-2 text-right text-muted">
                      {client.enrollmentDate ? formatDate(client.enrollmentDate) : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
