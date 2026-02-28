"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCalendarConfig, useCalendarSync } from "@/hooks/useGoogleCalendar";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface CalendarEntry {
  calendarId: string;
  displayName: string;
}

export default function GoogleCalendarConfig() {
  const config = useCalendarConfig();
  const { triggerSync } = useCalendarSync();
  const saveConfig = useMutation(api.googleCalendar.saveConfig);

  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [newCalendarId, setNewCalendarId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  // Initialize from config on mount
  useEffect(() => {
    if (config) {
      setCalendars(config.calendars ?? []);
    }
  }, [config]);

  function handleAddCalendar() {
    const id = newCalendarId.trim();
    const name = newDisplayName.trim();
    if (!id || !name) return;
    setCalendars((prev) => [...prev, { calendarId: id, displayName: name }]);
    setNewCalendarId("");
    setNewDisplayName("");
  }

  function handleRemoveCalendar(index: number) {
    setCalendars((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveAndTest() {
    if (calendars.length === 0) return;
    setSaving(true);
    setMessage("");
    try {
      await saveConfig({ calendars });
      await triggerSync();
      setMessage("Configuration saved and sync triggered successfully.");
      setTimeout(() => setMessage(""), 4000);
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
          Configure Google Calendar IDs to sync. Each calendar must be shared with the service account
          email before events will appear.
        </p>

        {/* Calendar list */}
        {calendars.length > 0 && (
          <div className="rounded-lg border border-border divide-y divide-border">
            {calendars.map((cal, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cal.displayName}</p>
                  <p className="text-xs text-muted font-mono truncate">{cal.calendarId}</p>
                </div>
                <button
                  onClick={() => handleRemoveCalendar(index)}
                  className="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add calendar row */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Add Calendar</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newCalendarId}
              onChange={(e) => setNewCalendarId(e.target.value)}
              placeholder="e.g. abc123@group.calendar.google.com"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="e.g. DEC Board"
              className="flex-1 sm:max-w-[180px] px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleAddCalendar}
              disabled={!newCalendarId.trim() || !newDisplayName.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Save message */}
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
            onClick={handleSaveAndTest}
            disabled={calendars.length === 0 || saving}
          >
            Save &amp; Test
          </Button>
          {isConfigured && (
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              onClick={handleSyncNow}
              disabled={syncing}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Sync Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
