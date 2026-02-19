"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatDate, timeAgo, capitalize } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

const PAGE_SIZE = 25;

export default function AuditLog() {
  const logs = useQuery(api.auditLog.getLogs, { limit: 200 });
  const users = useQuery(api.users.getAllUsers);

  const [filterUser, setFilterUser] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [page, setPage] = useState(0);

  if (logs === undefined || users === undefined) {
    return (
      <Card title="Audit Log">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  const userMap = new Map<string, string>(users.map((u) => [u._id as string, u.name as string]));

  // Apply filters
  let filtered = logs;

  if (filterUser) {
    filtered = filtered.filter(
      (log) => log.userId === filterUser
    );
  }

  if (filterEntity) {
    filtered = filtered.filter(
      (log) => log.entityType === filterEntity
    );
  }

  if (filterDateFrom) {
    const from = new Date(filterDateFrom).getTime();
    filtered = filtered.filter((log) => log.createdAt >= from);
  }

  if (filterDateTo) {
    const to = new Date(filterDateTo).getTime() + 86400000;
    filtered = filtered.filter((log) => log.createdAt < to);
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Get unique entity types for filter
  const entityTypes: string[] = Array.from(new Set(logs.map((l) => l.entityType)));

  return (
    <Card title={`Audit Log (${filtered.length} entries)`}>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 pb-4 border-b border-border">
        <div className="w-full md:w-48">
          <label className="block text-xs font-medium text-muted mb-1">User</label>
          <select
            value={filterUser}
            onChange={(e) => {
              setFilterUser(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-xs font-medium text-muted mb-1">Entity Type</label>
          <select
            value={filterEntity}
            onChange={(e) => {
              setFilterEntity(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">All Types</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {capitalize(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-40">
          <Input
            label="From"
            type="date"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <div className="w-full md:w-40">
          <Input
            label="To"
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  No audit log entries found
                </td>
              </tr>
            ) : (
              pageData.map((log) => (
                <tr key={log._id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    <div>
                      <p className="text-sm">{timeAgo(log.createdAt)}</p>
                      <p className="text-xs text-muted">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {userMap.get(log.userId as Id<"users">) || "Unknown"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-surface-hover text-foreground">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {capitalize(log.entityType)}
                  </td>
                  <td className="px-4 py-3 text-muted max-w-[300px] truncate">
                    {log.details || "\u2014"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-4">
          <p className="text-sm text-muted">
            Showing {page * PAGE_SIZE + 1}\u2013
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-sm rounded-md border border-border text-foreground hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-sm rounded-md border border-border text-foreground hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
