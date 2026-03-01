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
