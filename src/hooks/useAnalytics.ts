"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useActiveClientCount() {
  return useQuery(api.analytics.getActiveClientCount);
}

export function useSessionVolume() {
  return useQuery(api.analytics.getSessionVolume);
}

export function useIntakeTrend() {
  return useQuery(api.analytics.getIntakeTrend);
}

export function useAllDemographics(programId?: string) {
  return useQuery(
    api.analytics.getAllDemographics,
    programId ? { programId: programId as any } : {}
  );
}

export function useZipCodeStats() {
  return useQuery(api.clients.getZipCodeStats);
}

export function useSessionTrends() {
  return useQuery(api.analytics.getSessionTrends);
}

export function useGoalStats() {
  return useQuery(api.analytics.getGoalStats);
}

export function useIntakeVolume() {
  return useQuery(api.analytics.getIntakeVolume);
}

export function useAuditFeed() {
  return useQuery(api.analytics.getAuditFeed);
}

export function useStaffActionStats() {
  return useQuery(api.analytics.getStaffActionStats);
}

export function useCategorizationStats() {
  return useQuery(api.analytics.getCategorizationStats);
}

export function useLegalInsights(programId?: string) {
  return useQuery(
    api.analytics.getLegalInsights,
    programId ? { programId: programId as any } : {}
  );
}

export function useCpcInsights(programId?: string) {
  return useQuery(
    api.analytics.getCpcInsights,
    programId ? { programId: programId as any } : {}
  );
}
