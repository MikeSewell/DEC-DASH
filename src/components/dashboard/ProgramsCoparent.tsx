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
  "#1B4D3E",
  "#2D7A5F",
  "#D4A843",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#14B8A6",
];

export default function ProgramsCoparent() {
  const programStats = useQuery(api.programs.getStats);
  const clients = useQuery(api.clients.list, {});

  if (programStats === undefined || clients === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const coparentPrograms = programStats.filter((p) => p.type === "coparent");

  if (coparentPrograms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <p className="text-sm">No co-parent programs found.</p>
        <p className="text-xs mt-1">Create a co-parent program to see stats here.</p>
      </div>
    );
  }

  // Aggregate stats across all co-parent programs
  const coparentProgramIds = new Set(coparentPrograms.map((p) => p._id));
  const coparentClients = clients.filter(
    (c) => c.programId && coparentProgramIds.has(c.programId)
  );

  const totalEnrolled = coparentClients.length;
  const activeClients = coparentClients.filter((c) => c.status === "active").length;
  const completedClients = coparentClients.filter((c) => c.status === "completed").length;
  const totalSessions = coparentPrograms.reduce((sum, p) => sum + p.totalSessions, 0);
  const avgSessions = totalEnrolled > 0 ? (totalSessions / totalEnrolled).toFixed(1) : "0";

  // Age distribution from co-parent clients
  const ageDistribution: Record<string, number> = {};
  for (const client of coparentClients) {
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
        borderColor: "rgba(255,255,255,0.8)",
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
          font: { size: 11 },
        },
      },
    },
  };

  // Recent enrollments (sorted by enrollment date, last 5)
  const recentEnrollments = [...coparentClients]
    .filter((c) => c.enrollmentDate)
    .sort((a, b) => (b.enrollmentDate ?? 0) - (a.enrollmentDate ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold text-foreground">{totalEnrolled}</p>
          <p className="text-xs text-muted">Total Enrolled</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold text-primary">{activeClients}</p>
          <p className="text-xs text-muted">Active</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold text-success">{completedClients}</p>
          <p className="text-xs text-muted">Completed</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
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
          No age group data recorded for co-parent clients.
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
