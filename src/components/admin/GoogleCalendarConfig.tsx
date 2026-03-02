"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  useCalendarConfig,
  useCalendarSync,
  useListCalendars,
} from "@/hooks/useGoogleCalendar";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface AvailableCalendar {
  id: string;
  summary: string;
}

export default function GoogleCalendarConfig() {
  const config = useCalendarConfig();
  const { triggerSync } = useCalendarSync();
  const { listCalendars } = useListCalendars();
  const saveConfig = useMutation(api.googleCalendar.saveConfig);

  const [availableCalendars, setAvailableCalendars] = useState<AvailableCalendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  // Initialize selectedIds from saved config on mount
  useEffect(() => {
    if (config) {
      const ids = new Set((config.calendars ?? []).map((c) => c.calendarId));
      setSelectedIds(ids);
    }
  }, [config]);

  async function handleFetchCalendars() {
    setFetching(true);
    setMessage("");
    try {
      const results = await listCalendars();
      setAvailableCalendars(results);
      setHasFetched(true);
      if (results.length === 0) {
        setMessage(
          "No calendars found. Make sure calendars are shared with the service account."
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch calendars";
      setMessage(`Error: ${msg}`);
      setHasFetched(true);
    } finally {
      setFetching(false);
    }
  }

  function toggleCalendar(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSaveSelection() {
    setSaving(true);
    setMessage("");
    try {
      // Build the calendars array from selectedIds
      const calendars = Array.from(selectedIds).map((id) => {
        // Look up displayName from fetched list first
        const found = availableCalendars.find((c) => c.id === id);
        if (found) {
          return { calendarId: id, displayName: found.summary };
        }
        // Fallback: use existing displayName from saved config (stale/removed calendar)
        const existing = (config?.calendars ?? []).find((c) => c.calendarId === id);
        return { calendarId: id, displayName: existing?.displayName ?? id };
      });

      await saveConfig({ calendars });
      // Trigger sync after saving if there are selected calendars
      if (calendars.length > 0) {
        await triggerSync();
        setMessage("Calendar selection saved and sync triggered.");
      } else {
        setMessage("Calendar selection saved (no calendars selected — sync disabled).");
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save configuration";
      setMessage(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setMessage("");
    try {
      await triggerSync();
      setMessage("Sync triggered successfully.");
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setMessage(`Error: ${msg}`);
    } finally {
      setSyncing(false);
    }
  }

  if (config === undefined) {
    return (
      <Card title="Google Calendar Integration">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  const isConfigured = config !== null && (config.calendars?.length ?? 0) > 0;

  // Determine which previously-configured calendars are not in the fetched list
  const fetchedIds = new Set(availableCalendars.map((c) => c.id));
  const staleCalendars = hasFetched
    ? (config?.calendars ?? []).filter((c) => !fetchedIds.has(c.calendarId))
    : [];

  return (
    <Card title="Google Calendar Integration">
      <div className="space-y-6">
        {/* Status header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={cn(
              "w-3 h-3 rounded-full flex-shrink-0",
              isConfigured ? "bg-success" : "bg-warning"
            )}
          />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
              isConfigured
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            )}
          >
            {isConfigured ? "Configured" : "Not Configured"}
          </span>
          {config?.lastSyncAt && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Last sync: {timeAgo(config.lastSyncAt)}
            </span>
          )}
        </div>

        {/* Info text */}
        <p className="text-sm text-muted">
          Fetch available calendars from your Google service account, then select which ones to sync.
        </p>

        {/* Fetch Calendars button */}
        <div>
          <Button
            variant="primary"
            size="sm"
            loading={fetching}
            onClick={handleFetchCalendars}
            disabled={fetching}
          >
            {!fetching && (
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            Fetch Calendars
          </Button>
        </div>

        {/* Calendar checkbox list (shown after fetch) */}
        {hasFetched && availableCalendars.length > 0 && (
          <div className="rounded-lg border border-border divide-y divide-border">
            {availableCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/10 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(cal.id)}
                  onChange={() => toggleCalendar(cal.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary accent-[#1B5E6B]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{cal.summary}</p>
                  <p className="text-xs text-muted font-mono truncate">{cal.id}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Stale/previously-configured calendars not in fetched list */}
        {hasFetched && staleCalendars.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-warning">
              Previously configured (not found in service account):
            </p>
            <div className="rounded-lg border border-warning/40 divide-y divide-warning/20 bg-warning/5">
              {staleCalendars.map((cal) => (
                <label
                  key={cal.calendarId}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-warning/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(cal.calendarId)}
                    onChange={() => toggleCalendar(cal.calendarId)}
                    className="mt-0.5 w-4 h-4 rounded border-warning text-warning focus:ring-warning accent-[#1B5E6B]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cal.displayName}</p>
                    <p className="text-xs text-muted font-mono truncate">{cal.calendarId}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Message area */}
        {message && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm",
              message.startsWith("Error")
                ? "bg-danger-light text-danger"
                : "bg-success-light text-success"
            )}
          >
            {message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={handleSaveSelection}
            disabled={saving || !hasFetched}
          >
            Save Selection
          </Button>
          {isConfigured && (
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              onClick={handleSyncNow}
              disabled={syncing}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Sync Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
