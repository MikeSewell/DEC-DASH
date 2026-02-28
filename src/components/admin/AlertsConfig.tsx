"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

const DEFAULTS = {
  deadlineWindowDays: 30,
  budgetVariancePct: 90,
  qbStalenessHours: 1,
  sheetsStalenessHours: 2,
  calendarStalenessHours: 2,
};

export default function AlertsConfig() {
  const config = useQuery(api.alertConfig.get);
  const update = useMutation(api.alertConfig.update);

  const [deadlineWindowDays, setDeadlineWindowDays] = useState(DEFAULTS.deadlineWindowDays);
  const [budgetVariancePct, setBudgetVariancePct] = useState(DEFAULTS.budgetVariancePct);
  const [qbStalenessHours, setQbStalenessHours] = useState(DEFAULTS.qbStalenessHours);
  const [sheetsStalenessHours, setSheetsStalenessHours] = useState(DEFAULTS.sheetsStalenessHours);
  const [calendarStalenessHours, setCalendarStalenessHours] = useState(DEFAULTS.calendarStalenessHours);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Populate fields from Convex data once
  useEffect(() => {
    if (config !== undefined && !loaded) {
      setDeadlineWindowDays(config.deadlineWindowDays);
      setBudgetVariancePct(config.budgetVariancePct);
      setQbStalenessHours(config.qbStalenessHours);
      setSheetsStalenessHours(config.sheetsStalenessHours);
      setCalendarStalenessHours(config.calendarStalenessHours);
      setLoaded(true);
    }
  }, [config, loaded]);

  function handleResetToDefaults() {
    setDeadlineWindowDays(DEFAULTS.deadlineWindowDays);
    setBudgetVariancePct(DEFAULTS.budgetVariancePct);
    setQbStalenessHours(DEFAULTS.qbStalenessHours);
    setSheetsStalenessHours(DEFAULTS.sheetsStalenessHours);
    setCalendarStalenessHours(DEFAULTS.calendarStalenessHours);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    try {
      await update({
        deadlineWindowDays,
        budgetVariancePct,
        qbStalenessHours,
        sheetsStalenessHours,
        calendarStalenessHours,
      });
      setSaveMessage("Alert thresholds saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Failed to save alert thresholds.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-[var(--warm-shadow-sm)]">
      <h3 className="text-base font-semibold text-foreground mb-1">
        Alert Thresholds
      </h3>
      <p className="text-sm text-muted mb-6">
        Configure alert thresholds to control which alerts appear in the What Needs Attention panel.
        Changes take effect immediately for all users.
      </p>

      <div className="space-y-5">
        {/* Deadline Window */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Deadline Window (days)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            step={1}
            value={deadlineWindowDays}
            onChange={(e) => setDeadlineWindowDays(Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">
            Alerts appear for grant report deadlines within this many days
          </p>
        </div>

        {/* Budget Variance */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Budget Alert Threshold (%)
          </label>
          <input
            type="number"
            min={50}
            max={100}
            step={1}
            value={budgetVariancePct}
            onChange={(e) => setBudgetVariancePct(Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">
            Alerts when grant spending exceeds this percentage of total budget
          </p>
        </div>

        {/* QB Staleness */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            QuickBooks Staleness (hours)
          </label>
          <input
            type="number"
            min={0.5}
            max={48}
            step={0.5}
            value={qbStalenessHours}
            onChange={(e) => setQbStalenessHours(Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">
            Alert when QuickBooks data has not synced within this many hours
          </p>
        </div>

        {/* Sheets Staleness */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Google Sheets Staleness (hours)
          </label>
          <input
            type="number"
            min={0.5}
            max={48}
            step={0.5}
            value={sheetsStalenessHours}
            onChange={(e) => setSheetsStalenessHours(Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">
            Alert when Sheets data has not synced within this many hours
          </p>
        </div>

        {/* Calendar Staleness */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Google Calendar Staleness (hours)
          </label>
          <input
            type="number"
            min={0.5}
            max={48}
            step={0.5}
            value={calendarStalenessHours}
            onChange={(e) => setCalendarStalenessHours(Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">
            Alert when Calendar data has not synced within this many hours
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={handleSave}
          disabled={saving || config === undefined}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save Thresholds"}
        </button>
        <button
          type="button"
          onClick={handleResetToDefaults}
          className="text-sm text-muted hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          Reset to Defaults
        </button>
      </div>

      {saveMessage && (
        <p
          className={cn(
            "mt-3 text-sm",
            saveMessage.includes("success")
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {saveMessage}
        </p>
      )}
    </div>
  );
}
