"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AnalyticsTab } from "@/types";
import DemographicsTab from "@/components/analytics/DemographicsTab";
import ClientActivityTab from "@/components/analytics/ClientActivityTab";
import OperationsTab from "@/components/analytics/OperationsTab";

const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: "demographics", label: "Demographics" },
  { id: "client-activity", label: "Client Activity" },
  { id: "operations", label: "Operations" },
];


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
      {activeTab === "client-activity" && <ClientActivityTab />}
      {activeTab === "operations" && <OperationsTab />}
    </div>
  );
}
