"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePayPalConfig, usePayPalSync } from "@/hooks/usePayPal";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";

export default function PayPalConfig() {
  const config = usePayPalConfig();
  const { triggerSync } = usePayPalSync();
  const saveConfig = useMutation(api.paypal.saveConfig);
  const disconnectPayPal = useMutation(api.paypal.disconnect);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const isConnected = config !== null && config !== undefined;

  async function handleSave() {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await saveConfig({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        environment,
      });
      setClientId("");
      setClientSecret("");
      setMessage("PayPal credentials saved successfully.");
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setMessage("Failed to save PayPal credentials.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setMessage("");
    try {
      await triggerSync({});
      setMessage("PayPal sync completed successfully.");
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setMessage(`Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectPayPal();
      setShowDisconnectModal(false);
      setMessage("PayPal disconnected.");
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setMessage("Failed to disconnect PayPal.");
    }
  }

  if (config === undefined) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-[var(--warm-shadow-sm)]">
        <p className="text-sm text-muted">Loading PayPal configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-[var(--warm-shadow-sm)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.408-1.13.964L7.076 21.337z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">PayPal Integration</h3>
              <p className="text-xs text-muted">Transaction sync for donation tracking</p>
            </div>
          </div>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            isConnected
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isConnected ? "bg-green-500" : "bg-yellow-500"
            )} />
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>

        {isConnected && config && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-border bg-surface-hover/50 p-3">
              <p className="text-xs text-muted">Environment</p>
              <p className="text-sm font-medium text-foreground capitalize">{config.environment}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-hover/50 p-3">
              <p className="text-xs text-muted">Connected Since</p>
              <p className="text-sm font-medium text-foreground">{timeAgo(config.connectedAt)}</p>
            </div>
          </div>
        )}

        {/* Action buttons when connected */}
        {isConnected && (
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
            <button
              onClick={() => setShowDisconnectModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Credentials form */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-[var(--warm-shadow-sm)]">
        <h3 className="text-base font-semibold text-foreground mb-1">
          {isConnected ? "Update Credentials" : "Connect PayPal"}
        </h3>
        <p className="text-sm text-muted mb-4">
          Enter your PayPal REST API credentials from the{" "}
          <a
            href="https://developer.paypal.com/dashboard/applications"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            PayPal Developer Dashboard
          </a>.
        </p>

        <div className="space-y-3">
          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Environment</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="production"
                  checked={environment === "production"}
                  onChange={() => setEnvironment("production")}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Production</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="sandbox"
                  checked={environment === "sandbox"}
                  onChange={() => setEnvironment("sandbox")}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Sandbox</span>
              </label>
            </div>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="AW..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Client Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="EL..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !clientId.trim() || !clientSecret.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Credentials"}
          </button>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <p className={cn(
          "text-sm",
          message.includes("success") || message.includes("saved") || message.includes("completed")
            ? "text-green-600 dark:text-green-400"
            : message.includes("disconnected")
              ? "text-muted"
              : "text-red-600 dark:text-red-400"
        )}>
          {message}
        </p>
      )}

      {/* Disconnect confirmation modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-[var(--warm-shadow-lg)] max-w-sm w-full">
            <h3 className="text-lg font-semibold text-foreground mb-2">Disconnect PayPal?</h3>
            <p className="text-sm text-muted mb-4">
              This will remove your PayPal credentials and clear all cached transaction data. The Donation Performance widget will fall back to QuickBooks data.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
