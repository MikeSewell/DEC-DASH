"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useGrants() {
  return useQuery(api.googleSheets.getGrants);
}

export function useActiveGrants() {
  return useQuery(api.googleSheets.getActiveGrants);
}

export function useGrantDeadlines() {
  return useQuery(api.googleSheets.getGrantDeadlines);
}

export function useSheetsConfig() {
  return useQuery(api.googleSheets.getConfig);
}

export function useProgramDemographics(programType: string) {
  return useQuery(api.googleSheets.getProgramDemographics, { programType });
}

export function useSheetsSync() {
  const triggerSync = useAction(api.googleSheetsActions.triggerSync);
  return { triggerSync };
}
