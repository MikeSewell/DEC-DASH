"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useGrantsList(fundingStage?: string) {
  return useQuery(api.grants.list, fundingStage ? { fundingStage } : {});
}

export function useGrantDetail(id: Id<"grants">) {
  return useQuery(api.grants.getById, { id });
}

export function useGrantStats() {
  return useQuery(api.grants.getStats);
}
