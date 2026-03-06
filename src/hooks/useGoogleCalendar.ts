"use client";

import { useQuery, useAction, useMutation } from "convex/react";
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

export function useListCalendars() {
  const listCalendars = useAction(api.googleCalendarActions.listAvailableCalendars);
  return { listCalendars };
}

export function useCalendarDisconnect() {
  const disconnect = useMutation(api.googleCalendar.disconnect);
  return { disconnect };
}

export function useCalendarSaveConfig() {
  const saveConfig = useMutation(api.googleCalendar.saveConfig);
  return { saveConfig };
}
