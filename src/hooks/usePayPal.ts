"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function usePayPalConfig() {
  return useQuery(api.paypal.getConfig);
}

export function usePayPalData() {
  return useQuery(api.paypal.getData);
}

export function usePayPalSync() {
  const triggerSync = useAction(api.paypalActions.triggerSync);
  return { triggerSync };
}
