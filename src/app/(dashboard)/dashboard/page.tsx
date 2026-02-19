"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DEFAULT_DASHBOARD_SECTIONS } from "@/lib/constants";
import type { DashboardSectionId } from "@/types";

import DashboardSection from "@/components/dashboard/DashboardSection";
import ExecutiveSnapshot from "@/components/dashboard/ExecutiveSnapshot";
import GrantBudget from "@/components/dashboard/GrantBudget";
import GrantTracking from "@/components/dashboard/GrantTracking";
import DonationPerformance from "@/components/dashboard/DonationPerformance";
import ProfitLoss from "@/components/dashboard/ProfitLoss";
import ProgramsCoparent from "@/components/dashboard/ProgramsCoparent";
import ProgramsLegal from "@/components/dashboard/ProgramsLegal";
import Spinner from "@/components/ui/Spinner";

// Map section IDs to their component and metadata
const SECTION_COMPONENTS: Record<DashboardSectionId, React.ComponentType> = {
  "executive-snapshot": ExecutiveSnapshot,
  "grant-budget": GrantBudget,
  "grant-tracking": GrantTracking,
  "donation-performance": DonationPerformance,
  "profit-loss": ProfitLoss,
  "programs-coparent": ProgramsCoparent,
  "programs-legal": ProgramsLegal,
};

const SECTION_TITLES: Record<DashboardSectionId, string> = Object.fromEntries(
  DEFAULT_DASHBOARD_SECTIONS.map((s) => [s.id, s.title])
) as Record<DashboardSectionId, string>;

export default function DashboardPage() {
  const prefs = useQuery(api.dashboardPrefs.getPrefs);
  const savePrefs = useMutation(api.dashboardPrefs.savePrefs);

  // Local state to enable optimistic UI updates
  const [localOrder, setLocalOrder] = useState<DashboardSectionId[] | null>(null);
  const [localHidden, setLocalHidden] = useState<DashboardSectionId[] | null>(null);
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);

  // Derive current order and hidden state
  const defaultOrder = DEFAULT_DASHBOARD_SECTIONS.map((s) => s.id);

  const sectionOrder: DashboardSectionId[] = useMemo(() => {
    if (localOrder) return localOrder;
    if (prefs?.sectionOrder && prefs.sectionOrder.length > 0) {
      return prefs.sectionOrder as DashboardSectionId[];
    }
    return defaultOrder;
  }, [localOrder, prefs, defaultOrder]);

  const hiddenSections: DashboardSectionId[] = useMemo(() => {
    if (localHidden) return localHidden;
    if (prefs?.hiddenSections) {
      return prefs.hiddenSections as DashboardSectionId[];
    }
    return [];
  }, [localHidden, prefs]);

  const visibleSections = sectionOrder.filter(
    (id) => !hiddenSections.includes(id)
  );

  // Persist helper
  const persistPrefs = useCallback(
    (order: DashboardSectionId[], hidden: DashboardSectionId[]) => {
      savePrefs({ sectionOrder: order, hiddenSections: hidden }).catch(() => {
        // Silently fail -- local state still holds
      });
    },
    [savePrefs]
  );

  // Move a section up
  const handleMoveUp = useCallback(
    (id: DashboardSectionId) => {
      const idx = sectionOrder.indexOf(id);
      if (idx <= 0) return;
      const newOrder = [...sectionOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      setLocalOrder(newOrder);
      persistPrefs(newOrder, hiddenSections);
    },
    [sectionOrder, hiddenSections, persistPrefs]
  );

  // Move a section down
  const handleMoveDown = useCallback(
    (id: DashboardSectionId) => {
      const idx = sectionOrder.indexOf(id);
      if (idx < 0 || idx >= sectionOrder.length - 1) return;
      const newOrder = [...sectionOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      setLocalOrder(newOrder);
      persistPrefs(newOrder, hiddenSections);
    },
    [sectionOrder, hiddenSections, persistPrefs]
  );

  // Hide a section
  const handleToggleHide = useCallback(
    (id: DashboardSectionId) => {
      const newHidden = hiddenSections.includes(id)
        ? hiddenSections.filter((h) => h !== id)
        : [...hiddenSections, id];
      setLocalHidden(newHidden);
      persistPrefs(sectionOrder, newHidden);
    },
    [sectionOrder, hiddenSections, persistPrefs]
  );

  // Restore a hidden section
  const handleRestore = useCallback(
    (id: DashboardSectionId) => {
      const newHidden = hiddenSections.filter((h) => h !== id);
      setLocalHidden(newHidden);
      persistPrefs(sectionOrder, newHidden);
    },
    [sectionOrder, hiddenSections, persistPrefs]
  );

  // Reset to default order
  const handleReset = useCallback(() => {
    setLocalOrder(defaultOrder);
    setLocalHidden([]);
    persistPrefs(defaultOrder, []);
  }, [defaultOrder, persistPrefs]);

  // Show a loading spinner only on initial load (prefs === undefined means still loading)
  if (prefs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted mt-1">
            Overview of operations, grants, finances, and programs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hiddenSections.length > 0 && (
            <button
              onClick={() => setShowHiddenPanel((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              {hiddenSections.length} hidden
            </button>
          )}
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            title="Reset layout to default"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Hidden sections restore panel */}
      {showHiddenPanel && hiddenSections.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Hidden Sections</h3>
          <div className="flex flex-wrap gap-2">
            {hiddenSections.map((id) => (
              <button
                key={id}
                onClick={() => handleRestore(id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-hover px-3 py-1 text-xs font-medium text-muted hover:text-foreground hover:border-primary transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {SECTION_TITLES[id] ?? id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Sections */}
      <div className="space-y-6">
        {visibleSections.map((sectionId, index) => {
          const SectionComponent = SECTION_COMPONENTS[sectionId];
          if (!SectionComponent) return null;

          return (
            <DashboardSection
              key={sectionId}
              id={sectionId}
              title={SECTION_TITLES[sectionId] ?? sectionId}
              onMoveUp={() => handleMoveUp(sectionId)}
              onMoveDown={() => handleMoveDown(sectionId)}
              onToggleHide={() => handleToggleHide(sectionId)}
              isFirst={index === 0}
              isLast={index === visibleSections.length - 1}
            >
              <SectionComponent />
            </DashboardSection>
          );
        })}
      </div>

      {/* Empty state when all sections hidden */}
      {visibleSections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <svg className="h-12 w-12 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
          <p className="text-base font-medium">All sections are hidden.</p>
          <p className="text-sm mt-1">Click &quot;Reset&quot; to restore the default layout.</p>
        </div>
      )}
    </div>
  );
}
