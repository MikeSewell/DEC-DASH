"use client";

import { useState, useEffect } from "react";
import {
  useCalendarConfig,
  useCalendarSync,
  useListCalendars,
  useCalendarDisconnect,
  useCalendarSaveConfig,
} from "@/hooks/useGoogleCalendar";
import { formatDate, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";

interface AvailableCalendar {
  id: string;
  summary: string;
}

export default function GoogleCalendarConfig() {
  const config = useCalendarConfig();
  const { triggerSync } = useCalendarSync();
  const { listCalendars } = useListCalendars();
  const { disconnect } = useCalendarDisconnect();
  const { saveConfig } = useCalendarSaveConfig();

  const [availableCalendars, setAvailableCalendars] = useState<AvailableCalendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Initialize selectedIds from saved config on mount
  useEffect(() => {
    if (config) {
      const ids = new Set((config.calendars ?? []).map((c) => c.calendarId));
      setSelectedIds(ids);
    }
  }, [config]);

  const isConnected = config !== null && config.connectedAt !== null;
  const isExpired = config?.isExpired ?? false;
  const hasCalendars = (config?.calendars?.length ?? 0) > 0;

  async function handleFetchCalendars() {
    setFetching(true);
    setMessage("");
    try {
      const results = await listCalendars();
      setAvailableCalendars(results);
      setHasFetched(true);
      if (results.length === 0) {
        setMessage("No calendars found. Check that your Google account has calendar access.");
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveSelection() {
    setSaving(true);
    setMessage("");
    try {
      const calendars = Array.from(selectedIds).map((id) => {
        const found = availableCalendars.find((c) => c.id === id);
        if (found) return { calendarId: id, displayName: found.summary };
        const existing = (config?.calendars ?? []).find((c) => c.calendarId === id);
        return { calendarId: id, displayName: existing?.displayName ?? id };
      });

      await saveConfig({ calendars });
      if (calendars.length > 0) {
        await triggerSync();
        setMessage("Calendar selection saved and sync triggered.");
      } else {
        setMessage("Calendar selection saved (no calendars selected).");
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

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnect();
      setAvailableCalendars([]);
      setSelectedIds(new Set());
      setHasFetched(false);
      setMessage("");
    } catch (err) {
      console.error("Disconnect failed:", err);
    } finally {
      setDisconnecting(false);
      setShowDisconnect(false);
    }
  }

  // Loading state
  if (config === undefined) {
    return (
      <Card title="Google Calendar Integration">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  // Determine stale calendars
  const fetchedIds = new Set(availableCalendars.map((c) => c.id));
  const staleCalendars = hasFetched
    ? (config?.calendars ?? []).filter((c) => !fetchedIds.has(c.calendarId))
    : [];

  return (
    <>
      <Card title="Google Calendar Integration">
        <div className="space-y-6">
          {/* Status header */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={cn(
                "w-3 h-3 rounded-full flex-shrink-0",
                isConnected ? "bg-success" : "bg-danger"
              )}
            />
            <span className="text-sm font-medium text-foreground">
              {isConnected ? "Connected" : "Not Connected"}
            </span>
            {isConnected && (
              <Badge variant={isExpired ? "danger" : "success"}>
                {isExpired ? "Token Expired" : "Active"}
              </Badge>
            )}
            {config?.lastSyncAt && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Last sync: {timeAgo(config.lastSyncAt)}
              </span>
            )}
          </div>

          {isConnected ? (
            <>
              {/* Connection details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted uppercase">Connected Since</p>
                  <p className="text-sm text-foreground mt-1">
                    {config.connectedAt ? formatDate(config.connectedAt, "long") : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted uppercase">Selected Calendars</p>
                  <p className="text-sm text-foreground mt-1">
                    {hasCalendars
                      ? config.calendars.map((c) => c.displayName).join(", ")
                      : "None selected"}
                  </p>
                </div>
              </div>

              {/* Info text */}
              <p className="text-sm text-muted">
                Fetch available calendars from your connected Google account, then select which ones to sync.
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
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Fetch Calendars
                </Button>
              </div>

              {/* Calendar checkbox list */}
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

              {/* Stale/previously-configured calendars */}
              {hasFetched && staleCalendars.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-warning">
                    Previously configured (not found in account):
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
                {hasCalendars && (
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
                {isExpired && (
                  <a href="/api/google-calendar/auth">
                    <Button variant="primary" size="sm">
                      Reconnect
                    </Button>
                  </a>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDisconnect(true)}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-muted mb-4">
                Connect your Google account to sync calendar events to the dashboard.
              </p>
              <a href="/api/google-calendar/auth">
                <Button variant="primary" size="md">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  Connect Google Calendar
                </Button>
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Disconnect confirmation modal */}
      <Modal
        isOpen={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        title="Disconnect Google Calendar"
        size="sm"
      >
        <p className="text-sm text-foreground mb-2">
          Are you sure you want to disconnect Google Calendar?
        </p>
        <p className="text-sm text-muted mb-6">
          All cached events will be deleted. You will need to re-authorize to sync again.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDisconnect(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={disconnecting}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </Modal>
    </>
  );
}
