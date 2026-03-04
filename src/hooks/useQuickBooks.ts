"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useQuickBooksConfig() {
  return useQuery(api.quickbooks.getConfig);
}

export function useProfitAndLoss() {
  return useQuery(api.quickbooks.getProfitAndLoss);
}

export function useTrends() {
  return useQuery(api.quickbooks.getTrends);
}

export function useExpenses() {
  return useQuery(api.quickbooks.getExpenses);
}

export function useVendors() {
  return useQuery(api.quickbooks.getVendors);
}

export function useAccounts() {
  return useQuery(api.quickbooks.getAccounts);
}

export function useClasses() {
  return useQuery(api.quickbooks.getClasses);
}

export function useCashFlow() {
  return useQuery(api.quickbooks.getCashFlow);
}

export function useBalanceSheet() {
  return useQuery(api.quickbooks.getBalanceSheet);
}

export function useBudgetVsActuals() {
  return useQuery(api.quickbooks.getBudgetVsActuals);
}

// New budget data hooks — consume the budgetCache data pipeline (Phase 30).
// Three-state pattern: undefined=loading, null=no data, object/array=ready.

export function useBudgetSummary() {
  return useQuery(api.budgetQueries.getBudgetSummary);
}

export function useBudgetRecords() {
  return useQuery(api.budgetQueries.listBudgetRecords);
}

export function useBudgetByGrantId(grantId: Id<"grants"> | undefined) {
  return useQuery(
    api.budgetQueries.getBudgetByGrantId,
    grantId ? { grantId } : "skip"
  );
}

export function useDonations() {
  return useQuery(api.quickbooks.getDonations);
}

export function useIncomeTrend() {
  return useQuery(api.quickbooks.getIncomeTrend);
}

export function useIncomeAccounts() {
  return useQuery(api.quickbooks.getIncomeAccounts);
}

export function useQuickBooksSync() {
  const triggerSync = useAction(api.quickbooksActions.triggerSync);
  return { triggerSync };
}
