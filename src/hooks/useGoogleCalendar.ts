"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCalendarConfig() {
  return useQuery(api.googleCalendar.getConfig);
}

export function useCalendarEvents() {
  return useQuery(api.googleCalendar.getEvents);
}

export function useCalendarSync() {
  const triggerSync = useAction(api.googleCalendarActions.triggerSync);
  return { triggerSync };
}
