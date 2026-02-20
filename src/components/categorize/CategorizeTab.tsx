"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import SummaryCards from "@/components/categorize/SummaryCards";
import GrantClassCards from "@/components/categorize/GrantClassCards";
import ConfidenceFilter from "@/components/categorize/ConfidenceFilter";
import BulkActions from "@/components/categorize/BulkActions";
import AllocationTable from "@/components/categorize/AllocationTable";
import {
  useLatestRun,
  useAllocations,
  useAllocationStats,
  useGrantProfiles,
  useRunCategorization,
  useRefreshCategorization,
  useSubmitToQuickBooks,
  useUpdateFinalAssignment,
  useApproveAllocation,
  useApproveAllHighConfidence,
  useBulkUpdateAssignment,
  useResetToAISuggestions,
  useSkipAllocation,
} from "@/hooks/useAllocations";

type ConfidenceLevel = "all" | "high" | "medium" | "low";

export default function CategorizeTab() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const latestRun = useLatestRun();
  const allocations = useAllocations(latestRun?._id);
  const stats = useAllocationStats(latestRun?._id);
  const grantProfiles = useGrantProfiles();

  const runCategorization = useRunCategorization();
  const refreshCategorization = useRefreshCategorization();
  const submitToQB = useSubmitToQuickBooks();
  const updateAssignment = useUpdateFinalAssignment();
  const approveAllocation = useApproveAllocation();
  const approveAllHigh = useApproveAllHighConfidence();
  const bulkUpdate = useBulkUpdateAssignment();
  const resetToAI = useResetToAISuggestions();
  const skipAllocation = useSkipAllocation();

  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGrantId, setBulkGrantId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Build grant options from profiles
  const grantOptions = useMemo(() => {
    if (!grantProfiles) return [];
    return grantProfiles.map((g) => ({ class_id: g.class_id, class_name: g.class_name }));
  }, [grantProfiles]);

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    if (!allocations) return [];
    let result = [...allocations];

    if (confidenceFilter !== "all") {
      result = result.filter((a) => a.confidence === confidenceFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.vendorName.toLowerCase().includes(q) ||
          a.accountName.toLowerCase().includes(q) ||
          (a.suggestedClassName && a.suggestedClassName.toLowerCase().includes(q)) ||
          (a.finalClassName && a.finalClassName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allocations, confidenceFilter, search]);

  const confidenceCounts = useMemo(() => {
    if (!allocations) return { all: 0, high: 0, medium: 0, low: 0 };
    return {
      all: allocations.length,
      high: allocations.filter((a) => a.confidence === "high").length,
      medium: allocations.filter((a) => a.confidence === "medium").length,
      low: allocations.filter((a) => a.confidence === "low").length,
    };
  }, [allocations]);

  const showMessage = useCallback((text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // Action handlers
  const handleRunAI = useCallback(async () => {
    if (!currentUser?._id) return;
    setIsRunning(true);
    setMessage(null);
    try {
      await runCategorization({ userId: currentUser._id });
      showMessage("Categorization complete!", "success");
    } catch (err: any) {
      showMessage(err.message || "Failed to run categorization", "error");
    } finally {
      setIsRunning(false);
    }
  }, [currentUser, runCategorization, showMessage]);

  const handleRefresh = useCallback(async () => {
    if (!currentUser?._id) return;
    setIsRunning(true);
    setMessage(null);
    try {
      await refreshCategorization({ userId: currentUser._id });
      showMessage("Refresh + categorization complete!", "success");
    } catch (err: any) {
      showMessage(err.message || "Failed to refresh", "error");
    } finally {
      setIsRunning(false);
    }
  }, [currentUser, refreshCategorization, showMessage]);

  const handleApproveAllHigh = useCallback(async () => {
    if (!latestRun?._id) return;
    try {
      const count = await approveAllHigh({ runId: latestRun._id });
      showMessage(`Approved ${count} high-confidence allocations`, "success");
    } catch (err: any) {
      showMessage(err.message || "Failed to approve", "error");
    }
  }, [latestRun, approveAllHigh, showMessage]);

  const handleResetToAI = useCallback(async () => {
    if (!latestRun?._id) return;
    try {
      await resetToAI({ runId: latestRun._id });
      showMessage("Reset to AI suggestions", "success");
    } catch (err: any) {
      showMessage(err.message || "Failed to reset", "error");
    }
  }, [latestRun, resetToAI, showMessage]);

  const handleSubmit = useCallback(async () => {
    if (!latestRun?._id) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await submitToQB({ runId: latestRun._id });
      showMessage(`Submitted ${result.submitted} to QuickBooks (${result.errors} errors)`, result.errors > 0 ? "error" : "success");
    } catch (err: any) {
      showMessage(err.message || "Failed to submit", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [latestRun, submitToQB, showMessage]);

  const handleUpdateAssignment = useCallback(
    (id: Id<"expenseAllocations">, classId: string, className: string) => {
      updateAssignment({ allocationId: id, finalClassId: classId, finalClassName: className });
    },
    [updateAssignment]
  );

  const handleBulkApply = useCallback(async () => {
    if (!bulkGrantId || selectedIds.size === 0) return;
    const grant = grantOptions.find((g) => g.class_id === bulkGrantId);
    if (!grant) return;
    try {
      await bulkUpdate({
        allocationIds: Array.from(selectedIds) as Id<"expenseAllocations">[],
        finalClassId: grant.class_id,
        finalClassName: grant.class_name,
      });
      setSelectedIds(new Set());
      setBulkGrantId("");
      showMessage(`Applied ${grant.class_name} to ${selectedIds.size} allocations`, "success");
    } catch (err: any) {
      showMessage(err.message || "Bulk update failed", "error");
    }
  }, [bulkGrantId, selectedIds, grantOptions, bulkUpdate, showMessage]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const editableIds = filteredAllocations
      .filter((a) => a.status === "pending" || a.status === "approved")
      .map((a) => a._id);
    setSelectedIds(new Set(editableIds));
  }, [filteredAllocations]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Loading state
  if (latestRun === undefined || grantProfiles === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading categorization data...</p>
        </div>
      </div>
    );
  }

  const isRunInProgress = latestRun?.status === "running";
  const hasApproved = (stats?.approved ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
            Expense Categorization
          </h2>
          <p className="text-sm text-muted mt-1">
            AI-powered grant allocation with pacing & diversification
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            loading={isRunning && !isSubmitting}
            disabled={isRunning || isSubmitting || isRunInProgress}
            onClick={handleRunAI}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run AI
          </Button>
          {latestRun && (
            <>
              <Button size="sm" variant="secondary" disabled={isRunning || isSubmitting} onClick={handleApproveAllHigh}>
                Approve All High
              </Button>
              <Button size="sm" variant="ghost" disabled={isRunning || isSubmitting} onClick={handleResetToAI}>
                Reset to AI
              </Button>
              <Button size="sm" variant="ghost" loading={isRunning && !isSubmitting} disabled={isRunning || isSubmitting} onClick={handleRefresh}>
                Refresh
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={isSubmitting}
                disabled={!hasApproved || isRunning || isSubmitting}
                onClick={handleSubmit}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Submit ({stats?.approved ?? 0})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Run status banner */}
      {isRunInProgress && (
        <Card className="border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <p className="text-sm text-foreground font-medium">Categorization is running... This may take a minute.</p>
          </div>
        </Card>
      )}

      {latestRun?.status === "failed" && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <p className="text-sm text-red-800 dark:text-red-300">
            Last run failed: {latestRun.errorMessage || "Unknown error"}
          </p>
        </Card>
      )}

      {/* No run yet */}
      {!latestRun && (
        <Card>
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 className="text-lg font-semibold text-foreground mb-2 font-[family-name:var(--font-fraunces)]">No Categorization Runs Yet</h3>
            <p className="text-sm text-muted mb-4">
              Click &quot;Run AI&quot; to analyze unclassified expenses and get grant assignment suggestions.
            </p>
          </div>
        </Card>
      )}

      {/* Results */}
      {latestRun && latestRun.status !== "running" && (
        <>
          <SummaryCards stats={stats} />
          <GrantClassCards profiles={grantProfiles} />

          <ConfidenceFilter
            active={confidenceFilter}
            onFilterChange={setConfidenceFilter}
            search={search}
            onSearchChange={setSearch}
            counts={confidenceCounts}
          />

          <BulkActions
            selectedCount={selectedIds.size}
            totalCount={filteredAllocations.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            allSelected={selectedIds.size > 0 && selectedIds.size === filteredAllocations.filter((a) => a.status === "pending" || a.status === "approved").length}
            grantOptions={grantOptions}
            selectedGrantId={bulkGrantId}
            onGrantChange={setBulkGrantId}
            onApply={handleBulkApply}
          />

          <Card>
            <AllocationTable
              allocations={filteredAllocations}
              grantOptions={grantOptions}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onUpdateAssignment={handleUpdateAssignment}
              onApprove={(id) => approveAllocation({ allocationId: id })}
              onSkip={(id) => skipAllocation({ allocationId: id })}
            />
          </Card>

          {/* Run metadata */}
          <div className="text-xs text-muted text-right">
            Run started {new Date(latestRun.startedAt).toLocaleString()} |{" "}
            {latestRun.totalExpenses} expenses | {latestRun.totalProcessed} processed
            {latestRun.totalSubmitted != null && ` | ${latestRun.totalSubmitted} submitted to QB`}
          </div>
        </>
      )}
    </div>
  );
}
