"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AnalyticsTab } from "@/types";
import DemographicsTab from "@/components/analytics/DemographicsTab";

const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: "demographics", label: "Demographics" },
  { id: "client-activity", label: "Client Activity" },
  { id: "operations", label: "Operations" },
];

function PlaceholderContent({ tab }: { tab: AnalyticsTab }) {
  const messages: Record<AnalyticsTab, string> = {
    demographics: "Demographics charts coming soon",
    "client-activity": "Client Activity charts coming soon",
    operations: "Operations charts coming soon",
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-12 flex flex-col items-center justify-center gap-4">
      {/* Bar chart placeholder icon */}
      <svg
        className="w-12 h-12 text-muted/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3v18h18M7 16v-5m4 5V8m4 8v-3"
        />
      </svg>
      <p className="text-sm text-muted font-medium">{messages[tab]}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("demographics");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
          Analytics
        </h1>
        <p className="text-sm text-muted mt-1">
          Program demographics, client activity, and operational insights.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px">
          {ANALYTICS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-semibold border-b-2 rounded-t-lg transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted hover:text-foreground hover:bg-surface-hover/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "demographics" && <DemographicsTab />}
      {activeTab === "client-activity" && <PlaceholderContent tab="client-activity" />}
      {activeTab === "operations" && <PlaceholderContent tab="operations" />}
    </div>
  );
}
