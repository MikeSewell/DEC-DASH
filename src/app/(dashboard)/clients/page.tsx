"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ClientStatus, ProgramType } from "@/types";
import { cn, formatDate, capitalize } from "@/lib/utils";
import { ROLE_PROGRAM_TYPE_MAP } from "@/lib/constants";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Table from "@/components/ui/Table";

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

const emptyClientForm: ClientFormData = {
  firstName: "",
  lastName: "",
  programId: "",
  status: "active",
  zipCode: "",
  ageGroup: "",
  ethnicity: "",
  notes: "",
};

interface ProgramFormData {
  name: string;
  type: ProgramType;
  description: string;
  isActive: boolean;
}

const emptyProgramForm: ProgramFormData = {
  name: "",
  type: "other",
  description: "",
  isActive: true,
};

export default function ClientsPage() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const programs = useQuery(api.programs.list);
  const clientStats = useQuery(api.clients.getStats);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [clientForm, setClientForm] = useState<ClientFormData>(emptyClientForm);
  const [programForm, setProgramForm] = useState<ProgramFormData>(emptyProgramForm);
  const [savingClient, setSavingClient] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const clients = useQuery(api.clients.listWithPrograms, {
    programType: activeTab !== "all" ? activeTab : undefined,
    search: debouncedSearch.trim() || undefined,
  });

  const createClient = useMutation(api.clients.create);
  const createProgram = useMutation(api.programs.create);
  const removeProgram = useMutation(api.programs.remove);

  const userRole = currentUser?.role;
  const isAdminOrManager = userRole === "admin" || userRole === "manager";
  const lockedType = userRole ? ROLE_PROGRAM_TYPE_MAP[userRole] : undefined;

  // Build tabs dynamically from programs
  const tabs = useMemo(() => {
    if (!programs) return [];
    const types = new Set(programs.map((p) => p.type));
    const allTabs: { id: string; label: string }[] = [];

    if (!lockedType) {
      allTabs.push({ id: "all", label: "All" });
    }

    if ((!lockedType || lockedType === "coparent") && types.has("coparent")) {
      allTabs.push({ id: "coparent", label: "Co-Parent" });
    }
    if ((!lockedType || lockedType === "legal") && types.has("legal")) {
      allTabs.push({ id: "legal", label: "Legal" });
    }
    if (!lockedType && types.has("fatherhood")) {
      allTabs.push({ id: "fatherhood", label: "Fatherhood" });
    }
    if (!lockedType && types.has("other")) {
      allTabs.push({ id: "other", label: "Other" });
    }

    return allTabs;
  }, [programs, lockedType]);

  // Auto-select tab for locked roles
  useMemo(() => {
    if (lockedType && activeTab === "all") {
      setActiveTab(lockedType);
    }
  }, [lockedType, activeTab]);

  // Filter programs for the Add Client dropdown based on role
  const availablePrograms = useMemo(() => {
    if (!programs) return [];
    if (lockedType) return programs.filter((p) => p.type === lockedType);
    return programs;
  }, [programs, lockedType]);

  async function handleAddClient() {
    if (!clientForm.firstName.trim() || !clientForm.lastName.trim()) return;
    setSavingClient(true);
    try {
      await createClient({
        firstName: clientForm.firstName.trim(),
        lastName: clientForm.lastName.trim(),
        programId: clientForm.programId
          ? (clientForm.programId as Id<"programs">)
          : undefined,
        status: clientForm.status,
        enrollmentDate: Date.now(),
        zipCode: clientForm.zipCode || undefined,
        ageGroup: clientForm.ageGroup || undefined,
        ethnicity: clientForm.ethnicity || undefined,
        notes: clientForm.notes || undefined,
      });
      setClientForm(emptyClientForm);
      setShowAddClientModal(false);
    } catch (err) {
      console.error("Failed to add client:", err);
    } finally {
      setSavingClient(false);
    }
  }

  async function handleAddProgram() {
    if (!programForm.name.trim()) return;
    setSavingProgram(true);
    try {
      await createProgram({
        name: programForm.name.trim(),
        type: programForm.type,
        description: programForm.description || undefined,
        isActive: programForm.isActive,
      });
      setProgramForm(emptyProgramForm);
      setShowAddProgramModal(false);
    } catch (err) {
      console.error("Failed to add program:", err);
    } finally {
      setSavingProgram(false);
    }
  }

  async function handleDeleteProgram(programId: string) {
    setDeletingProgram(programId);
    try {
      await removeProgram({ programId: programId as Id<"programs"> });
    } catch (err) {
      console.error("Failed to delete program:", err);
      alert((err as Error).message);
    } finally {
      setDeletingProgram(null);
    }
  }

  // Open Add Client modal with auto-selected program for locked roles
  function openAddClientModal() {
    const form = { ...emptyClientForm };
    if (lockedType && availablePrograms.length > 0) {
      form.programId = availablePrograms[0]._id;
    }
    setClientForm(form);
    setShowAddClientModal(true);
  }

  if (currentUser === undefined || programs === undefined || clients === undefined) {
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
        `${item.firstName} ${item.lastName}`,
    },
    {
      key: "programName",
      header: "Program",
      render: (item: Record<string, unknown>) =>
        (item.programName as string) || "\u2014",
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            Clients
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage program enrollment and client records
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdminOrManager && (
            <Button variant="secondary" size="md" onClick={() => setShowAddProgramModal(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Program
            </Button>
          )}
          <Button variant="primary" size="md" onClick={openAddClientModal}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Client
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m0 0a4 4 0 118 0m-8 0a4 4 0 018 0m-4-8a4 4 0 110-8 4 4 0 010 8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted">Total Clients</p>
              <p className="text-2xl font-bold text-foreground">{clientStats?.total ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-accent">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted">Active</p>
              <p className="text-2xl font-bold text-foreground">{clientStats?.active ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-primary-light">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted">New This Month</p>
              <p className="text-2xl font-bold text-foreground">{clientStats?.newThisMonth ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tab navigation */}
      {tabs.length > 1 && (
        <div className="border-b border-border">
          <nav className="flex gap-0 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-b-2 rounded-t-lg transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted hover:text-foreground hover:bg-surface-hover/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Client table */}
      <Card title={`Clients (${clients.length})`}>
        <Table
          columns={columns}
          data={clients as unknown as Record<string, unknown>[]}
          onRowClick={(item) =>
            router.push(`/clients/${(item as Record<string, unknown>)._id}`)
          }
          emptyMessage="No clients found"
        />
      </Card>

      {/* Add Client Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => {
          setShowAddClientModal(false);
          setClientForm(emptyClientForm);
        }}
        title="Add Client"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={clientForm.firstName}
              onChange={(e) =>
                setClientForm((prev) => ({ ...prev, firstName: e.target.value }))
              }
              placeholder="First name"
              required
            />
            <Input
              label="Last Name"
              value={clientForm.lastName}
              onChange={(e) =>
                setClientForm((prev) => ({ ...prev, lastName: e.target.value }))
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
              value={clientForm.programId}
              onChange={(e) =>
                setClientForm((prev) => ({ ...prev, programId: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="">Select a program...</option>
              {availablePrograms.map((p) => (
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
              value={clientForm.status}
              onChange={(e) =>
                setClientForm((prev) => ({
                  ...prev,
                  status: e.target.value as ClientStatus,
                }))
              }
              className="w-full px-3 py-2 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Zip Code"
              value={clientForm.zipCode}
              onChange={(e) =>
                setClientForm((prev) => ({ ...prev, zipCode: e.target.value }))
              }
              placeholder="Zip code"
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Age Group
              </label>
              <select
                value={clientForm.ageGroup}
                onChange={(e) =>
                  setClientForm((prev) => ({ ...prev, ageGroup: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              value={clientForm.ethnicity}
              onChange={(e) =>
                setClientForm((prev) => ({ ...prev, ethnicity: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              value={clientForm.notes}
              onChange={(e) =>
                setClientForm((prev) => ({ ...prev, notes: e.target.value }))
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
                setShowAddClientModal(false);
                setClientForm(emptyClientForm);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={savingClient}
              disabled={!clientForm.firstName.trim() || !clientForm.lastName.trim()}
              onClick={handleAddClient}
            >
              Add Client
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Program Modal */}
      <Modal
        isOpen={showAddProgramModal}
        onClose={() => {
          setShowAddProgramModal(false);
          setProgramForm(emptyProgramForm);
        }}
        title="Manage Programs"
        size="lg"
      >
        <div className="space-y-6">
          {/* Existing programs list */}
          {programs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Existing Programs
              </h3>
              <div className="space-y-2">
                {programs.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-background"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted">
                        {capitalize(p.type)} {!p.isActive && " (Inactive)"}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={deletingProgram === p._id}
                      onClick={() => handleDeleteProgram(p._id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new program form */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Add New Program
            </h3>
            <div className="space-y-4">
              <Input
                label="Program Name"
                value={programForm.name}
                onChange={(e) =>
                  setProgramForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Fatherhood Workshop"
                required
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Type
                </label>
                <select
                  value={programForm.type}
                  onChange={(e) =>
                    setProgramForm((prev) => ({
                      ...prev,
                      type: e.target.value as ProgramType,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="coparent">Co-Parent</option>
                  <option value="legal">Legal</option>
                  <option value="fatherhood">Fatherhood</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={programForm.description}
                  onChange={(e) =>
                    setProgramForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Program description..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-y bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={programForm.isActive}
                  onChange={(e) =>
                    setProgramForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="rounded border-border"
                />
                Active
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setShowAddProgramModal(false);
                    setProgramForm(emptyProgramForm);
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  loading={savingProgram}
                  disabled={!programForm.name.trim()}
                  onClick={handleAddProgram}
                >
                  Add Program
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
