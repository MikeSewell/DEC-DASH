"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSheetsConfig, useSheetsSync } from "@/hooks/useGrantTracker";
import { formatDate, timeAgo } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

export default function GoogleSheetsConfig() {
  const config = useSheetsConfig();
  const { triggerSync } = useSheetsSync();
  const saveConfig = useMutation(api.googleSheets.saveConfig);

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [serviceAccountEmail, setServiceAccountEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (config) {
      setSpreadsheetId(config.spreadsheetId || "");
      setSheetName(config.sheetName || "");
      setServiceAccountEmail(config.serviceAccountEmail || "");
    }
  }, [config]);

  async function handleSaveAndTest() {
    if (!spreadsheetId.trim() || !sheetName.trim() || !serviceAccountEmail.trim()) {
      setSaveMessage("All fields are required.");
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      await saveConfig({
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim(),
        serviceAccountEmail: serviceAccountEmail.trim(),
      });

      // Trigger a sync to test
      await triggerSync();
      setSaveMessage("Configuration saved and sync triggered successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save configuration";
      setSaveMessage(`Error: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await triggerSync();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  if (config === undefined) {
    return (
      <Card title="Google Sheets Integration">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  const isConfigured = config !== null;

  return (
    <Card title="Google Sheets Integration">
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isConfigured ? "bg-success" : "bg-warning"
            }`}
          />
          <span className="text-sm font-medium text-foreground">
            {isConfigured ? "Configured" : "Not Configured"}
          </span>
          {isConfigured && config.lastSyncAt && (
            <Badge variant="info">
              Last sync: {timeAgo(config.lastSyncAt)}
            </Badge>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Spreadsheet ID"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          />

          <Input
            label="Sheet Name"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Grant Tracker"
          />

          <Input
            label="Service Account Email"
            value={serviceAccountEmail}
            onChange={(e) => setServiceAccountEmail(e.target.value)}
            placeholder="dec-sheets@project.iam.gserviceaccount.com"
          />
        </div>

        {/* Save message */}
        {saveMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              saveMessage.startsWith("Error")
                ? "bg-danger-light text-danger"
                : "bg-success-light text-success"
            }`}
          >
            {saveMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={handleSaveAndTest}
          >
            Save &amp; Test
          </Button>
          {isConfigured && (
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              onClick={handleSync}
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
