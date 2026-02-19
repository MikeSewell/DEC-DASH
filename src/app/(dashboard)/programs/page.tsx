"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ProgramType, ClientStatus } from "@/types";
import { cn } from "@/lib/utils";
import { formatDate, capitalize } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Table from "@/components/ui/Table";

type TabId = "all" | "coparent" | "legal" | "fatherhood";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "coparent", label: "Co-Parent" },
  { id: "legal", label: "Legal" },
  { id: "fatherhood", label: "Fatherhood" },
];

const statusVariant: Record<ClientStatus, "success" | "info" | "danger"> = {
  active: "success",
  completed: "info",
  withdrawn: "danger",
};

interface ClientFormData {
  firstName: string;
  lastName: string;
  programId: string;
  status: ClientStatus;
  zipCode: string;
  ageGroup: string;
  ethnicity: string;
  notes: string;
}

const emptyForm: ClientFormData = {
  firstName: "",
  lastName: "",
  programId: "",
  status: "active",
  zipCode: "",
  ageGroup: "",
  ethnicity: "",
  notes: "",
};

export default function ProgramsPage() {
  const programs = useQuery(api.programs.list);
  const programStats = useQuery(api.programs.getStats);
  const clients = useQuery(api.clients.list, {});
  const createClient = useMutation(api.clients.create);

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (activeTab === "all") return clients;

    // Filter by program type
    if (!programs) return [];
    const matchingProgramIds = new Set(
      programs
        .filter((p) => p.type === activeTab)
        .map((p) => p._id)
    );
    return clients.filter(
      (c) => c.programId && matchingProgramIds.has(c.programId)
    );
  }, [clients, programs, activeTab]);

  const statsByType = useMemo(() => {
    if (!programStats) return {};
    const result: Record<string, { active: number; total: number; sessions: number }> = {};
    for (const stat of programStats) {
      const type = stat.type;
      if (!result[type]) {
        result[type] = { active: 0, total: 0, sessions: 0 };
      }
      result[type].active += stat.activeClients;
      result[type].total += stat.activeClients; // total enrolled
      result[type].sessions += stat.totalSessions;
    }
    return result;
  }, [programStats]);

  async function handleAddClient() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      await createClient({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        programId: form.programId
          ? (form.programId as Id<"programs">)
          : undefined,
        status: form.status,
        enrollmentDate: Date.now(),
        zipCode: form.zipCode || undefined,
        ageGroup: form.ageGroup || undefined,
        ethnicity: form.ethnicity || undefined,
        notes: form.notes || undefined,
      });
      setForm(emptyForm);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add client:", err);
    } finally {
      setSaving(false);
    }
  }

  function getProgramName(programId: Id<"programs"> | undefined): string {
    if (!programId || !programs) return "\u2014";
    const program = programs.find((p) => p._id === programId);
    return program?.name || "\u2014";
  }

  if (programs === undefined || clients === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading programs...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: Record<string, unknown>) =>
        `${item.firstName} ${item.lastName}`,
    },
    {
      key: "programId",
      header: "Program",
      render: (item: Record<string, unknown>) =>
        getProgramName(item.programId as Id<"programs"> | undefined),
    },
    {
      key: "status",
      header: "Status",
      render: (item: Record<string, unknown>) => {
        const status = item.status as ClientStatus;
        return (
          <Badge variant={statusVariant[status] || "default"}>
            {capitalize(status)}
          </Badge>
        );
      },
    },
    {
      key: "enrollmentDate",
      header: "Enrolled",
      render: (item: Record<string, unknown>) =>
        item.enrollmentDate
          ? formatDate(item.enrollmentDate as number)
          : "\u2014",
    },
    {
      key: "zipCode",
      header: "Zip Code",
      render: (item: Record<string, unknown>) =>
        (item.zipCode as string) || "\u2014",
    },
  ];

  const statCards = [
    { label: "Co-Parent", key: "coparent", color: "bg-primary" },
    { label: "Legal", key: "legal", color: "bg-accent" },
    { label: "Fatherhood", key: "fatherhood", color: "bg-primary-light" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programs</h1>
          <p className="text-sm text-muted mt-1">
            Manage program enrollment and client data
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Client
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const stats = statsByType[card.key];
          return (
            <Card key={card.key}>
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", card.color)}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted">{card.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.active ?? 0}
                  </p>
                  <p className="text-xs text-muted">
                    {stats?.sessions ?? 0} sessions
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Client table */}
      <Card title={`Clients (${filteredClients.length})`}>
        <Table
          columns={columns}
          data={filteredClients as unknown as Record<string, unknown>[]}
          emptyMessage="No clients found for this program type"
        />
      </Card>

      {/* Add Client Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setForm(emptyForm);
        }}
        title="Add Client"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, firstName: e.target.value }))
              }
              placeholder="First name"
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, lastName: e.target.value }))
              }
              placeholder="Last name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Program
            </label>
            <select
              value={form.programId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, programId: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Select a program...</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({capitalize(p.type)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as ClientStatus,
                }))
              }
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Zip Code"
              value={form.zipCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, zipCode: e.target.value }))
              }
              placeholder="Zip code"
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Age Group
              </label>
              <select
                value={form.ageGroup}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ageGroup: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Select...</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45-54">45-54</option>
                <option value="55+">55+</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Ethnicity
            </label>
            <select
              value={form.ethnicity}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, ethnicity: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Select...</option>
              <option value="Black/African American">Black/African American</option>
              <option value="Hispanic/Latino">Hispanic/Latino</option>
              <option value="White">White</option>
              <option value="Asian">Asian</option>
              <option value="Native American">Native American</option>
              <option value="Pacific Islander">Pacific Islander</option>
              <option value="Two or More Races">Two or More Races</option>
              <option value="Other">Other</option>
              <option value="Prefer Not to Say">Prefer Not to Say</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm resize-y bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setShowAddModal(false);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={saving}
              disabled={!form.firstName.trim() || !form.lastName.trim()}
              onClick={handleAddClient}
            >
              Add Client
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
