"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useBudgetVsActuals, useQuickBooksConfig } from "@/hooks/useQuickBooks";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Input from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { FundingStage } from "@/types";

const FUNDING_STAGES: FundingStage[] = ["active", "committed", "pending", "cultivating", "denied"];

const stageVariant: Record<FundingStage, "success" | "info" | "warning" | "default" | "danger"> = {
  active: "success",
  committed: "info",
  pending: "warning",
  cultivating: "default",
  denied: "danger",
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function ReportDate({ label, dateStr }: { label: string; dateStr?: string }) {
  if (!dateStr) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-sm text-muted">—</span>
      </div>
    );
  }

  const days = daysUntil(dateStr);
  let countdownColor = "text-muted";
  let countdownText = "";

  if (days <= 0) {
    countdownColor = "text-danger font-semibold";
    countdownText = days === 0 ? "Today" : "Overdue";
  } else if (days <= 7) {
    countdownColor = "text-danger font-semibold";
    countdownText = days === 1 ? "Tomorrow" : `${days} days`;
  } else if (days <= 30) {
    countdownColor = "text-warning font-medium";
    countdownText = `${days} days`;
  } else {
    countdownText = `${days} days`;
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted ml-2">{formatDate(dateStr)}</span>
      </div>
      <span className={`text-sm ${countdownColor}`}>{countdownText}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="py-2">
      <dt className="text-xs text-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-foreground mt-0.5">
        {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
      </dd>
    </div>
  );
}

function matchGrantToClass(
  grantName: string,
  bvaData: Array<{ className?: string; expenses?: { actual?: number; budget?: number } }>
): { actual: number; budget: number } | null {
  const grantLower = grantName.toLowerCase().trim();
  for (const entry of bvaData) {
    const classLower = (entry.className ?? "").toLowerCase().trim();
    if (!classLower || classLower === "all") continue;
    if (grantLower.includes(classLower) || classLower.includes(grantLower)) {
      return { actual: entry.expenses?.actual ?? 0, budget: entry.expenses?.budget ?? 0 };
    }
  }
  return null;
}

interface GrantFormState {
  fundingStage: string;
  fundingSource: string;
  programType: string;
  programName: string;
  amountAwarded: string;
  startDate: string;
  endDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  arStatus: string;
  dateFundsReceived: string;
  paymentSchedule: string;
  grantNumber: string;
  q1ReportDate: string;
  q2ReportDate: string;
  q3ReportDate: string;
  q4ReportDate: string;
  notes: string;
}

const emptyForm: GrantFormState = {
  fundingStage: "", fundingSource: "", programType: "", programName: "",
  amountAwarded: "", startDate: "", endDate: "", contactName: "",
  contactPhone: "", contactEmail: "", arStatus: "", dateFundsReceived: "",
  paymentSchedule: "", grantNumber: "", q1ReportDate: "", q2ReportDate: "",
  q3ReportDate: "", q4ReportDate: "", notes: "",
};

export default function GrantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as Id<"grants">;
  const grant = useQuery(api.grants.getById, { id });
  const currentUser = useQuery(api.users.getCurrentUser);
  const qbConfig = useQuickBooksConfig();
  const bva = useBudgetVsActuals();
  const updateGrant = useMutation(api.grants.update);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<GrantFormState>(emptyForm);

  const canEdit = currentUser?.role === "admin" || currentUser?.role === "manager";

  // Populate form state from grant data
  useEffect(() => {
    if (grant && !editing) {
      setFormState({
        fundingStage: grant.fundingStage || "",
        fundingSource: grant.fundingSource || "",
        programType: grant.programType || "",
        programName: grant.programName || "",
        amountAwarded: grant.amountAwarded != null ? String(grant.amountAwarded) : "",
        startDate: grant.startDate || "",
        endDate: grant.endDate || "",
        contactName: grant.contactName || "",
        contactPhone: grant.contactPhone || "",
        contactEmail: grant.contactEmail || "",
        arStatus: grant.arStatus || "",
        dateFundsReceived: grant.dateFundsReceived || "",
        paymentSchedule: grant.paymentSchedule || "",
        grantNumber: grant.grantNumber || "",
        q1ReportDate: grant.q1ReportDate || "",
        q2ReportDate: grant.q2ReportDate || "",
        q3ReportDate: grant.q3ReportDate || "",
        q4ReportDate: grant.q4ReportDate || "",
        notes: grant.notes || "",
      });
    }
  }, [grant, editing]);

  function updateField(key: keyof GrantFormState, value: string) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    setEditing(false);
    // Form state will be repopulated by useEffect
  }

  async function handleSave() {
    if (!grant) return;
    setSaving(true);
    try {
      await updateGrant({
        id: grant._id,
        fundingStage: formState.fundingStage || undefined,
        fundingSource: formState.fundingSource || undefined,
        programType: formState.programType || undefined,
        programName: formState.programName || undefined,
        amountAwarded: formState.amountAwarded ? Number(formState.amountAwarded) : undefined,
        startDate: formState.startDate || undefined,
        endDate: formState.endDate || undefined,
        contactName: formState.contactName || undefined,
        contactPhone: formState.contactPhone || undefined,
        contactEmail: formState.contactEmail || undefined,
        arStatus: formState.arStatus || undefined,
        dateFundsReceived: formState.dateFundsReceived || undefined,
        paymentSchedule: formState.paymentSchedule || undefined,
        grantNumber: formState.grantNumber || undefined,
        q1ReportDate: formState.q1ReportDate || undefined,
        q2ReportDate: formState.q2ReportDate || undefined,
        q3ReportDate: formState.q3ReportDate || undefined,
        q4ReportDate: formState.q4ReportDate || undefined,
        notes: formState.notes || undefined,
      });
      setEditing(false);
    } catch (err) {
      console.error("Failed to update grant:", err);
    } finally {
      setSaving(false);
    }
  }

  if (grant === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading grant...</p>
        </div>
      </div>
    );
  }

  if (grant === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted">
        <p className="text-lg font-medium">Grant not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/grants")}>
          Back to Grants
        </Button>
      </div>
    );
  }

  const qbConnected = qbConfig !== undefined && qbConfig !== null && !(qbConfig as any).isExpired;
  const bvaData: Array<{ className?: string; expenses?: { actual?: number; budget?: number } }> =
    qbConnected && bva?.data ? bva.data : [];
  const qbMatch = bvaData.length > 0
    ? matchGrantToClass(grant.programName || grant.fundingSource, bvaData)
    : null;

  const awarded = grant.amountAwarded ?? 0;
  const spent = qbMatch?.actual ?? 0;
  const remaining = Math.max(0, awarded - spent);
  const pct = awarded > 0 ? (spent / awarded) * 100 : 0;

  const selectClass = "w-full px-4 py-2.5 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:shadow-[var(--warm-shadow-sm)] transition-all duration-150";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/grants")}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
              {grant.fundingSource}
            </h1>
            {grant.programName && (
              <p className="text-sm text-muted mt-0.5">{grant.programName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={stageVariant[grant.fundingStage as FundingStage] ?? "default"}>
            {grant.fundingStage.charAt(0).toUpperCase() + grant.fundingStage.slice(1)}
          </Badge>
          {canEdit && !editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
                Save
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grant Info */}
        <Card title="Grant Information">
          {!editing ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <InfoRow label="Funding Source" value={grant.fundingSource} />
              <InfoRow label="Program Name" value={grant.programName} />
              <InfoRow label="Program Type" value={grant.programType} />
              <InfoRow label="Amount Awarded" value={grant.amountAwarded ? formatCurrency(grant.amountAwarded) : undefined} />
              <InfoRow label="Start Date" value={grant.startDate ? formatDate(grant.startDate) : undefined} />
              <InfoRow label="End Date" value={grant.endDate ? formatDate(grant.endDate) : undefined} />
              <InfoRow label="Grant Number" value={grant.grantNumber} />
              <InfoRow label="AR Status" value={grant.arStatus} />
              <InfoRow label="Date Funds Received" value={grant.dateFundsReceived ? formatDate(grant.dateFundsReceived) : undefined} />
              <InfoRow label="Payment Schedule" value={grant.paymentSchedule} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Funding Source"
                value={formState.fundingSource}
                onChange={(e) => updateField("fundingSource", e.target.value)}
              />
              <Input
                label="Program Name"
                value={formState.programName}
                onChange={(e) => updateField("programName", e.target.value)}
              />
              <Input
                label="Program Type"
                value={formState.programType}
                onChange={(e) => updateField("programType", e.target.value)}
              />
              <Input
                label="Amount Awarded"
                type="number"
                value={formState.amountAwarded}
                onChange={(e) => updateField("amountAwarded", e.target.value)}
              />
              <Input
                label="Start Date"
                type="date"
                value={formState.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={formState.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
              />
              <Input
                label="Grant Number"
                value={formState.grantNumber}
                onChange={(e) => updateField("grantNumber", e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Funding Stage</label>
                <select
                  value={formState.fundingStage}
                  onChange={(e) => updateField("fundingStage", e.target.value)}
                  className={selectClass}
                >
                  {FUNDING_STAGES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <Input
                label="AR Status"
                value={formState.arStatus}
                onChange={(e) => updateField("arStatus", e.target.value)}
              />
              <Input
                label="Date Funds Received"
                type="date"
                value={formState.dateFundsReceived}
                onChange={(e) => updateField("dateFundsReceived", e.target.value)}
              />
              <Input
                label="Payment Schedule"
                value={formState.paymentSchedule}
                onChange={(e) => updateField("paymentSchedule", e.target.value)}
              />
            </div>
          )}

          {/* Notes section */}
          {!editing ? (
            grant.notes && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <dt className="text-xs text-muted uppercase tracking-wider mb-1">Notes</dt>
                <dd className="text-sm text-foreground whitespace-pre-wrap">{grant.notes}</dd>
              </div>
            )
          ) : (
            <div className="mt-4 pt-4 border-t border-border/50">
              <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
              <textarea
                value={formState.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
                className={`${selectClass} resize-y`}
              />
            </div>
          )}
        </Card>

        {/* Contact & Reporting */}
        <div className="space-y-6">
          <Card title="Funder Contact">
            {!editing ? (
              grant.contactName || grant.contactPhone || grant.contactEmail ? (
                <div className="space-y-3">
                  {grant.contactName && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-sm text-foreground font-medium">{grant.contactName}</span>
                    </div>
                  )}
                  {grant.contactPhone && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-sm text-foreground">{grant.contactPhone}</span>
                    </div>
                  )}
                  {grant.contactEmail && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <a href={`mailto:${grant.contactEmail}`} className="text-sm text-primary hover:underline">
                        {grant.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">No contact information on file.</p>
              )
            ) : (
              <div className="space-y-4">
                <Input
                  label="Contact Name"
                  value={formState.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={formState.contactPhone}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formState.contactEmail}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                />
              </div>
            )}
          </Card>

          {/* Report Timeline */}
          <Card title="Reporting Timeline">
            {!editing ? (
              <>
                <ReportDate label="Q1" dateStr={grant.q1ReportDate} />
                <ReportDate label="Q2" dateStr={grant.q2ReportDate} />
                <ReportDate label="Q3" dateStr={grant.q3ReportDate} />
                <ReportDate label="Q4" dateStr={grant.q4ReportDate} />
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Q1 Report Date"
                  type="date"
                  value={formState.q1ReportDate}
                  onChange={(e) => updateField("q1ReportDate", e.target.value)}
                />
                <Input
                  label="Q2 Report Date"
                  type="date"
                  value={formState.q2ReportDate}
                  onChange={(e) => updateField("q2ReportDate", e.target.value)}
                />
                <Input
                  label="Q3 Report Date"
                  type="date"
                  value={formState.q3ReportDate}
                  onChange={(e) => updateField("q3ReportDate", e.target.value)}
                />
                <Input
                  label="Q4 Report Date"
                  type="date"
                  value={formState.q4ReportDate}
                  onChange={(e) => updateField("q4ReportDate", e.target.value)}
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Budget card (QB spending) */}
      {qbMatch && awarded > 0 && (
        <Card title="Budget vs Spending">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Spent</span>
              <span className="font-medium text-foreground">{formatCurrency(spent)} of {formatCurrency(awarded)}</span>
            </div>
            {/* Progress bar */}
            <div className="h-3 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct > 100 ? "bg-danger" : pct >= 75 ? "bg-warning" : "bg-success"
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(awarded)}</p>
                <p className="text-xs text-muted">Awarded</p>
              </div>
              <div>
                <p className={`text-lg font-bold tabular-nums ${pct > 100 ? "text-danger" : "text-foreground"}`}>
                  {formatCurrency(spent)}
                </p>
                <p className="text-xs text-muted">Spent (QB)</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(remaining)}</p>
                <p className="text-xs text-muted">Remaining</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
