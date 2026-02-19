"use client";

import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";

type ConfidenceLevel = "all" | "high" | "medium" | "low";

interface ConfidenceFilterProps {
  active: ConfidenceLevel;
  onFilterChange: (level: ConfidenceLevel) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts: { all: number; high: number; medium: number; low: number };
}

const TABS: { id: ConfidenceLevel; label: string; color: string }[] = [
  { id: "all", label: "All", color: "border-primary text-primary bg-primary/5" },
  { id: "high", label: "High", color: "border-emerald-500 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30" },
  { id: "medium", label: "Medium", color: "border-amber-500 text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30" },
  { id: "low", label: "Low", color: "border-red-500 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30" },
];

export default function ConfidenceFilter({ active, onFilterChange, search, onSearchChange, counts }: ConfidenceFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex gap-0 border-b border-border -mb-px">
        {TABS.map((tab) => {
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-semibold border-b-2 rounded-t-lg transition-colors",
                active === tab.id
                  ? tab.color
                  : "border-transparent text-muted hover:text-foreground hover:bg-surface-hover/50"
              )}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>
      <div className="flex-1 w-full sm:max-w-xs">
        <Input
          placeholder="Search vendor, account..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
