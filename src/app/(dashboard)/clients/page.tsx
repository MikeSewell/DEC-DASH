"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Table from "@/components/ui/Table";

export default function ClientsPage() {
  const router = useRouter();
  const forms = useQuery(api.legalIntake.list, {});
  const stats = useQuery(api.legalIntake.getStats);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!forms) return [];
    if (!search.trim()) return forms;
    const term = search.toLowerCase();
    return forms.filter(
      (f) =>
        f.firstName?.toLowerCase().includes(term) ||
        f.lastName?.toLowerCase().includes(term) ||
        f.coParentName?.toLowerCase().includes(term)
    );
  }, [forms, search]);

  if (forms === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading clients...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: Record<string, unknown>) =>
        `${item.firstName || ""} ${item.lastName || ""}`.trim() || "\u2014",
    },
    {
      key: "coParentName",
      header: "Co-Parent",
      render: (item: Record<string, unknown>) =>
        (item.coParentName as string) || "\u2014",
    },
    {
      key: "reasonForVisit",
      header: "Reason",
      render: (item: Record<string, unknown>) => {
        const reason = item.reasonForVisit as string;
        if (!reason) return "\u2014";
        return reason.length > 40 ? reason.slice(0, 40) + "..." : reason;
      },
    },
    {
      key: "countyFiledIn",
      header: "County",
      render: (item: Record<string, unknown>) =>
        (item.countyFiledIn as string) || "\u2014",
    },
    {
      key: "numberOfVisits",
      header: "Visits",
      render: (item: Record<string, unknown>) =>
        (item.numberOfVisits as string) || "\u2014",
    },
    {
      key: "upcomingCourtDate",
      header: "Court Date",
      render: (item: Record<string, unknown>) =>
        (item.upcomingCourtDate as string) || "\u2014",
    },
    {
      key: "hasAttorney",
      header: "Attorney",
      render: (item: Record<string, unknown>) => {
        const val = item.hasAttorney as string;
        if (!val) return "\u2014";
        return (
          <Badge variant={val === "Yes" ? "success" : "default"}>
            {val}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date",
      render: (item: Record<string, unknown>) =>
        item.createdAt ? formatDate(item.createdAt as number) : "\u2014",
    },
  ];

  const statCards = [
    {
      label: "Total Clients",
      value: stats?.total ?? 0,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m0 0a4 4 0 118 0m-8 0a4 4 0 018 0m-4-8a4 4 0 110-8 4 4 0 010 8z" />
        </svg>
      ),
      color: "bg-primary",
    },
    {
      label: "New This Month",
      value: stats?.newThisMonth ?? 0,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      color: "bg-accent",
    },
    {
      label: "Top County",
      value: stats?.topCounty ?? "N/A",
      subtitle: stats?.topCount ? `${stats.topCount} clients` : undefined,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "bg-primary-light",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            Legal Program Clients
          </h1>
          <p className="text-sm text-muted mt-1">
            Father Intake Forms &mdash; legal program client records
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => router.push("/clients/new")}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Client
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-muted">{card.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted">{card.subtitle}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card title={`Clients (${filtered.length})`}>
        <Table
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          onRowClick={(item) => router.push(`/clients/${(item as Record<string, unknown>)._id}`)}
          emptyMessage="No intake forms found"
        />
      </Card>
    </div>
  );
}
