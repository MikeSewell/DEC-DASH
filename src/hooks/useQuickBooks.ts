"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

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

export function useDonations() {
  return useQuery(api.quickbooks.getDonations);
}

export function useQuickBooksSync() {
  const triggerSync = useAction(api.quickbooksActions.triggerSync);
  return { triggerSync };
}
