"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useLatestRun() {
  return useQuery(api.allocation.getLatestRun);
}

export function useAllocations(runId: Id<"allocationRuns"> | undefined) {
  return useQuery(api.allocation.getAllocations, runId ? { runId } : "skip");
}

export function useAllocationStats(runId: Id<"allocationRuns"> | undefined) {
  return useQuery(api.allocation.getAllocationStats, runId ? { runId } : "skip");
}

export function useGrantProfiles() {
  return useQuery(api.allocation.getGrantProfiles);
}

export function useRunCategorization() {
  return useAction(api.allocationActions.runCategorization);
}

export function useRefreshCategorization() {
  return useAction(api.allocationActions.refreshCategorization);
}

export function useSubmitToQuickBooks() {
  return useAction(api.allocationActions.submitToQuickBooks);
}

export function useUpdateFinalAssignment() {
  return useMutation(api.allocation.updateFinalAssignment);
}

export function useApproveAllocation() {
  return useMutation(api.allocation.approveAllocation);
}

export function useApproveAllHighConfidence() {
  return useMutation(api.allocation.approveAllHighConfidence);
}

export function useBulkUpdateAssignment() {
  return useMutation(api.allocation.bulkUpdateAssignment);
}

export function useResetToAISuggestions() {
  return useMutation(api.allocation.resetToAISuggestions);
}

export function useSkipAllocation() {
  return useMutation(api.allocation.skipAllocation);
}
