"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import UserManagement from "@/components/admin/UserManagement";
import QuickBooksConnect from "@/components/admin/QuickBooksConnect";
import ConstantContactConnect from "@/components/admin/ConstantContactConnect";
import GoogleSheetsConfig from "@/components/admin/GoogleSheetsConfig";
import AuditLog from "@/components/admin/AuditLog";

type AdminTab =
  | "users"
  | "quickbooks"
  | "constant-contact"
  | "google-sheets"
  | "audit-log"
  | "settings";

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "users",
    label: "Users",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    id: "quickbooks",
    label: "QuickBooks",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    id: "constant-contact",
    label: "Constant Contact",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    id: "google-sheets",
    label: "Google Sheets",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M13.125 12h-2.25" />
      </svg>
    ),
  },
  {
    id: "audit-log",
    label: "Audit Log",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as AdminTab | null;
  const [activeTab, setActiveTab] = useState<AdminTab>(tabParam || "users");

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  function handleTabChange(tab: AdminTab) {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  }

  function renderTabContent() {
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "quickbooks":
        return <QuickBooksConnect />;
      case "constant-contact":
        return <ConstantContactConnect />;
      case "google-sheets":
        return <GoogleSheetsConfig />;
      case "audit-log":
        return <AuditLog />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <UserManagement />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>
        <p className="text-sm text-muted mt-1">
          Manage users, integrations, and system settings
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-0 -mb-px min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground hover:border-border"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}

function SettingsPanel() {
  const openaiSetting = useQuery(api.settings.get, { key: "openai_api_key" });
  const promptSetting = useQuery(api.settings.get, { key: "ai_director_system_prompt" });
  const setSetting = useMutation(api.settings.set);

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptLoaded, setPromptLoaded] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");

  const isConfigured = !!openaiSetting?.value;

  // Load saved prompt into textarea once
  useEffect(() => {
    if (promptSetting !== undefined && !promptLoaded) {
      setSystemPrompt(promptSetting?.value || "");
      setPromptLoaded(true);
    }
  }, [promptSetting, promptLoaded]);

  function maskKey(key: string): string {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 7) + "•••" + key.slice(-4);
  }

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await setSetting({ key: "openai_api_key", value: apiKey.trim() });
      setApiKey("");
      setSaveMessage("API key saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Failed to save API key.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrompt() {
    setSavingPrompt(true);
    setPromptMessage("");
    try {
      await setSetting({ key: "ai_director_system_prompt", value: systemPrompt.trim() });
      setPromptMessage("System prompt saved successfully.");
      setTimeout(() => setPromptMessage(""), 3000);
    } catch {
      setPromptMessage("Failed to save system prompt.");
    } finally {
      setSavingPrompt(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* OpenAI API Key */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-base font-semibold text-foreground">
            OpenAI API Key
          </h3>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
              isConfigured
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isConfigured ? "bg-green-500" : "bg-yellow-500"
              )}
            />
            {isConfigured ? "Configured" : "Not Configured"}
          </span>
        </div>

        <p className="text-sm text-muted mb-4">
          Used by AI Director, Newsletter Generator, Knowledge Base, and Expense
          Recommender. Falls back to the server environment variable if not set
          here.
        </p>

        {isConfigured && (
          <div className="mb-4 px-3 py-2 bg-surface-hover rounded-lg border border-border">
            <p className="text-xs text-muted mb-0.5">Current key</p>
            <p className="text-sm font-mono text-foreground">
              {maskKey(openaiSetting.value)}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isConfigured ? "Enter new key to update..." : "sk-proj-..."}
              className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground"
            >
              {showKey ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Key"}
          </button>
        </div>

        {saveMessage && (
          <p className={cn(
            "mt-2 text-sm",
            saveMessage.includes("success") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {saveMessage}
          </p>
        )}
      </div>

      {/* AI Director System Prompt */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-1">
          AI Director — System Prompt
        </h3>
        <p className="text-sm text-muted mb-4">
          Customize the instructions that guide AI Director&apos;s personality and behavior. Leave blank to use the default prompt.
        </p>

        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          placeholder={`You are AI Director, the AI assistant for Dads Evoking Change (DEC)...\n\n(Leave blank to use default instructions)`}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y min-h-[120px]"
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted">
            {systemPrompt.length > 0
              ? `${systemPrompt.length} characters`
              : "Using default system prompt"}
          </p>
          <button
            onClick={handleSavePrompt}
            disabled={savingPrompt}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingPrompt ? "Saving..." : "Save Prompt"}
          </button>
        </div>

        {promptMessage && (
          <p className={cn(
            "mt-2 text-sm",
            promptMessage.includes("success") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {promptMessage}
          </p>
        )}
      </div>

      {/* Static app info */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Application Settings
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Application Name</p>
            <p className="text-sm text-muted mt-1">DEC Dashboard</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Organization</p>
            <p className="text-sm text-muted mt-1">Dads Evoking Change</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">QuickBooks Sync Interval</p>
            <p className="text-sm text-muted mt-1">Every 15 minutes</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Google Sheets Sync Interval</p>
            <p className="text-sm text-muted mt-1">Every 30 minutes</p>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Theme
        </h3>
        <p className="text-sm text-muted">
          Theme settings are controlled via the theme toggle in the header. The
          dashboard supports light and dark modes.
        </p>
      </div>
    </div>
  );
}
