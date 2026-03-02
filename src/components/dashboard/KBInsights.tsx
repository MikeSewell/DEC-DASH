"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { StatCardSkeleton } from "@/components/dashboard/skeletons/StatCardSkeleton";
import { FALLBACK_KB_METRICS, FALLBACK_KB_SUMMARY_BULLETS } from "@/lib/dashboardFallbacks";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetricEntry {
  key: string;
  label: string;
  value: string | null;
  unit: string | null;
  sourceDocument: string | null;
  conflictValue?: string;
  conflictDocument?: string;
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ metric }: { metric: MetricEntry }) {
  return (
    <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-surface to-primary/[0.03] p-5 shadow-[var(--warm-shadow-sm)] hover-lift">
      {/* AI badge — top-right corner */}
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
        AI
      </div>

      {/* Metric value */}
      <div className="text-3xl font-extrabold text-foreground pr-12">
        {metric.value}
        {metric.unit && (
          <span className="text-sm font-normal text-muted ml-1">{metric.unit}</span>
        )}
      </div>

      {/* Metric label */}
      <p className="text-sm text-muted mt-1">{metric.label}</p>

      {/* Source document attribution */}
      {metric.sourceDocument && (
        <p
          className="text-xs text-muted/70 mt-2 truncate"
          title={metric.sourceDocument}
        >
          from {metric.sourceDocument}
        </p>
      )}

      {/* Conflict indicator — amber warning icon with tooltip */}
      {metric.conflictValue && (
        <span
          title={`Conflict: ${metric.conflictDocument ?? "another document"} reported "${metric.conflictValue}"`}
          className="absolute bottom-3 right-3 text-warning cursor-help"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

// ─── KBInsights ───────────────────────────────────────────────────────────────

export default function KBInsights() {
  const cache = useQuery(api.kbInsights.getCache);
  const currentUser = useQuery(api.users.getCurrentUser);
  const extractAction = useAction(api.kbInsightsActions.extractMetrics);
  const summaryAction = useAction(api.kbInsightsActions.generateSummary);

  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Role gate — admin and manager can trigger extraction
  const canExtract =
    currentUser?.role === "admin" || currentUser?.role === "manager";

  // Combine local loading state with server-side extracting flag for
  // responsive UI even before the server-side flag propagates
  const isExtracting = extracting || (cache?.extracting ?? false);

  // Filter to non-null metric values only
  const visibleMetrics = (cache?.metrics ?? []).filter(
    (m): m is MetricEntry & { value: string } => m.value !== null
  );

  // Summary state — independent from extraction state
  const isGenerating = generating || (cache?.summaryGenerating ?? false);
  const canRegenerate = currentUser?.role === "admin" || currentUser?.role === "manager";
  const hasSummary = cache?.summaryBullets && cache.summaryBullets.length > 0;

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    try {
      await extractAction({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    setSummaryError(null);
    try {
      await summaryAction({});
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Summary generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header row: extract button + last-extracted timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {canExtract && (
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5",
                "px-4 py-1.5 text-sm font-medium text-primary",
                "hover:bg-primary/10 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isExtracting ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Extracting...
                </>
              ) : (
                "Extract Metrics"
              )}
            </button>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        {/* Last-extracted timestamp */}
        {cache?.extractedAt != null && cache.extractedAt > 0 && (
          <p className="text-xs text-muted">
            Last extracted {timeAgo(cache.extractedAt)} &middot;{" "}
            {cache.documentCount} document{cache.documentCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Content area */}
      {cache === undefined ? (
        /* Loading skeleton — 4 placeholder cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : visibleMetrics.length > 0 ? (
        /* Metric cards grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleMetrics.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </div>
      ) : (
        /* Fallback metric cards — shown when no real metrics extracted */
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FALLBACK_KB_METRICS.map((metric) => (
              <MetricCard key={metric.key} metric={{ ...metric }} />
            ))}
          </div>
          <p className="text-xs text-muted/50 mt-3 text-right">
            Sample data — upload documents in Knowledge Base and click Extract Metrics for live figures
          </p>
        </div>
      )}

      {/* ─── AI Summary Panel ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-surface to-primary/[0.03] p-5 shadow-[var(--warm-shadow-sm)]">
        {/* Panel header row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {/* AI Summary badge */}
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI Summary
            </div>
            {/* Regenerating indicator — shown during generation */}
            {isGenerating && (
              <span className="text-xs text-muted flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Regenerating...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* "Generated X ago" timestamp */}
            {cache?.summaryGeneratedAt != null && cache.summaryGeneratedAt > 0 && (
              <span className="text-xs text-muted">
                Generated {timeAgo(cache.summaryGeneratedAt)}
              </span>
            )}
            {/* Regenerate button — role-gated to admin/manager */}
            {canRegenerate && (
              <button
                onClick={handleGenerateSummary}
                disabled={isGenerating}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5",
                  "px-4 py-1.5 text-sm font-medium text-primary",
                  "hover:bg-primary/10 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  "Regenerate"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Summary content area */}
        {hasSummary ? (
          /* Bullet list — reduced opacity during regeneration (SUM-04: stale content stays visible) */
          <ul className={cn("space-y-2", isGenerating && "opacity-60 transition-opacity")}>
            {cache!.summaryBullets!.map((bullet: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-foreground leading-relaxed">
                <span className="text-primary mt-0.5 shrink-0">&#8226;</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : (
          /* Fallback summary bullets */
          <div>
            <ul className="space-y-2">
              {FALLBACK_KB_SUMMARY_BULLETS.map((bullet, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground leading-relaxed">
                  <span className="text-primary mt-0.5 shrink-0">&#8226;</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted/50 mt-3">
              Sample summary — generate from real KB documents for live insights
            </p>
          </div>
        )}

        {/* Inline error */}
        {summaryError && (
          <p className="text-xs text-danger mt-3">{summaryError}</p>
        )}
      </div>
    </div>
  );
}
