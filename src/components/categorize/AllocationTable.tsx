"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

interface GrantOption {
  class_id: string;
  class_name: string;
}

interface Allocation {
  _id: Id<"expenseAllocations">;
  purchaseId: string;
  lineId: string;
  vendorName: string;
  accountName: string;
  amount: number;
  txnDate: string;
  memo?: string;
  suggestedClassId?: string;
  suggestedClassName?: string;
  suggestedScore?: number;
  confidence: string;
  explanation: string;
  scoringDetail?: string;
  runnerUpClassName?: string;
  runnerUpScore?: number;
  qualifyingGrants?: string;
  finalClassId?: string;
  finalClassName?: string;
  action: string;
  status: string;
  errorMessage?: string;
}

interface AllocationTableProps {
  allocations: Allocation[];
  grantOptions: GrantOption[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdateAssignment: (id: Id<"expenseAllocations">, classId: string, className: string) => void;
  onApprove: (id: Id<"expenseAllocations">) => void;
  onSkip: (id: Id<"expenseAllocations">) => void;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function ConfidenceDot({ confidence }: { confidence: string }) {
  const colorMap: Record<string, string> = {
    high: "bg-emerald-500",
    medium: "bg-amber-500",
    low: "bg-red-500",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", colorMap[confidence] || "bg-gray-400")} />
      <span className="capitalize text-xs">{confidence}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const color = score >= 70 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    : score >= 50 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  return <span className={cn("inline-block px-1.5 py-0.5 text-xs font-semibold rounded-md ml-1.5", color)}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string }> = {
    pending: { cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    approved: { cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    submitted: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    error: { cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    skipped: { cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  };
  const c = config[status] || config.pending;
  return <span className={cn("inline-block px-2 py-0.5 text-xs font-semibold rounded-full capitalize", c.cls)}>{status}</span>;
}

export default function AllocationTable({
  allocations,
  grantOptions,
  selectedIds,
  onToggleSelect,
  onUpdateAssignment,
  onApprove,
  onSkip,
}: AllocationTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (allocations.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-sm">No allocations match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-3 px-3 w-10"></th>
            <th className="py-3 px-3 font-semibold text-muted">Vendor</th>
            <th className="py-3 px-3 font-semibold text-muted">Account</th>
            <th className="py-3 px-3 font-semibold text-muted text-right">Amount</th>
            <th className="py-3 px-3 font-semibold text-muted">AI Suggestion</th>
            <th className="py-3 px-3 font-semibold text-muted">Confidence</th>
            <th className="py-3 px-3 font-semibold text-muted">Final Assignment</th>
            <th className="py-3 px-3 font-semibold text-muted">Status</th>
            <th className="py-3 px-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((alloc) => {
            const isExpanded = expandedId === alloc._id;
            const isEditable = alloc.status === "pending" || alloc.status === "approved";
            let qualGrants: { class_id: string; class_name: string; score: number; pacing: string; concentration: number }[] = [];
            try {
              qualGrants = alloc.qualifyingGrants ? JSON.parse(alloc.qualifyingGrants) : [];
            } catch { /* ignore */ }

            return (
              <tr key={alloc._id} className="group">
                <td colSpan={9} className="p-0">
                  <div className={cn("border-b border-border/50", isExpanded && "bg-surface-hover/30")}>
                    {/* Main row */}
                    <div className="flex items-center">
                      <div className="py-3 px-3 w-10 shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(alloc._id)}
                          onChange={() => onToggleSelect(alloc._id)}
                          disabled={!isEditable}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 disabled:opacity-30"
                        />
                      </div>
                      <div className="py-3 px-3 min-w-[120px] flex-1">
                        <p className="font-medium text-foreground truncate">{alloc.vendorName}</p>
                        <p className="text-xs text-muted">{alloc.txnDate}</p>
                      </div>
                      <div className="py-3 px-3 min-w-[140px] flex-1">
                        <p className="text-foreground truncate">{alloc.accountName}</p>
                      </div>
                      <div className="py-3 px-3 min-w-[90px] text-right font-medium text-foreground whitespace-nowrap">
                        {formatCurrency(alloc.amount)}
                      </div>
                      <div className="py-3 px-3 min-w-[160px] flex-1">
                        {alloc.suggestedClassName ? (
                          <span className="inline-flex items-center">
                            <span className="truncate max-w-[120px]">{alloc.suggestedClassName}</span>
                            <ScoreBadge score={alloc.suggestedScore} />
                          </span>
                        ) : (
                          <span className="text-muted italic">Review needed</span>
                        )}
                      </div>
                      <div className="py-3 px-3 min-w-[90px]">
                        <ConfidenceDot confidence={alloc.confidence} />
                      </div>
                      <div className="py-3 px-3 min-w-[170px]">
                        {isEditable ? (
                          <select
                            value={alloc.finalClassId || ""}
                            onChange={(e) => {
                              const opt = grantOptions.find((g) => g.class_id === e.target.value);
                              if (opt) onUpdateAssignment(alloc._id, opt.class_id, opt.class_name);
                            }}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <option value="">Unassigned</option>
                            {grantOptions.map((g) => (
                              <option key={g.class_id} value={g.class_id}>
                                {g.class_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-foreground">{alloc.finalClassName || "—"}</span>
                        )}
                      </div>
                      <div className="py-3 px-3 min-w-[80px]">
                        <StatusBadge status={alloc.status} />
                      </div>
                      <div className="py-3 px-3 w-20 shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : alloc._id)}
                          className="p-1 rounded-md hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                          title="Show details"
                        >
                          <svg className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isEditable && alloc.status === "pending" && alloc.finalClassId && (
                          <button
                            onClick={() => onApprove(alloc._id)}
                            className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-muted hover:text-emerald-600 transition-colors"
                            title="Approve"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {isEditable && alloc.status === "pending" && (
                          <button
                            onClick={() => onSkip(alloc._id)}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-muted hover:text-gray-600 transition-colors"
                            title="Skip"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <div className="px-14 pb-4 space-y-3">
                        <div className="bg-background rounded-lg border border-border/70 p-3 text-xs space-y-2">
                          <div>
                            <span className="font-semibold text-foreground">AI Reasoning: </span>
                            <span className="text-muted">{alloc.explanation}</span>
                          </div>
                          {alloc.memo && (
                            <div>
                              <span className="font-semibold text-foreground">Memo: </span>
                              <span className="text-muted">{alloc.memo}</span>
                            </div>
                          )}
                          {alloc.runnerUpClassName && (
                            <div>
                              <span className="font-semibold text-foreground">Runner-up: </span>
                              <span className="text-muted">
                                {alloc.runnerUpClassName}
                                {alloc.runnerUpScore != null && ` (score: ${alloc.runnerUpScore})`}
                              </span>
                            </div>
                          )}
                          {alloc.errorMessage && (
                            <div>
                              <span className="font-semibold text-red-600">Error: </span>
                              <span className="text-red-600">{alloc.errorMessage}</span>
                            </div>
                          )}
                        </div>

                        {qualGrants.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1.5">Alternative Options</p>
                            <div className="flex flex-wrap gap-2">
                              {qualGrants.map((g) => (
                                <button
                                  key={g.class_id}
                                  disabled={!isEditable}
                                  onClick={() => {
                                    if (isEditable) onUpdateAssignment(alloc._id, g.class_id, g.class_name);
                                  }}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors",
                                    alloc.finalClassId === g.class_id
                                      ? "border-primary bg-primary/10 text-primary font-semibold"
                                      : "border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground",
                                    !isEditable && "opacity-60 cursor-not-allowed"
                                  )}
                                >
                                  {g.class_name}
                                  <span className={cn(
                                    "px-1 py-0.5 rounded text-[10px] font-bold",
                                    g.score >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : g.score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  )}>
                                    {g.score}
                                  </span>
                                  {g.pacing && (
                                    <span className="text-[10px] text-muted capitalize">
                                      {g.pacing.replace(/_/g, " ")}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
