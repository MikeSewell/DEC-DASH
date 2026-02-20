"use client";

import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useBudgetVsActuals, useQuickBooksConfig } from "@/hooks/useQuickBooks";
import type { Id } from "../../../convex/_generated/dataModel";

interface Grant {
  _id: Id<"grants">;
  grantKey: string;
  fundingStage: string;
  fundingSource: string;
  programType?: string;
  programName?: string;
  amountAwarded?: number;
  startDate?: string;
  endDate?: string;
  arStatus?: string;
}

function matchGrantToClass(
  grantName: string,
  bvaData: Array<{ className?: string; expenses?: { actual?: number } }>
): number | null {
  const grantLower = grantName.toLowerCase().trim();
  for (const entry of bvaData) {
    const classLower = (entry.className ?? "").toLowerCase().trim();
    if (!classLower || classLower === "all") continue;
    if (grantLower.includes(classLower) || classLower.includes(grantLower)) {
      return entry.expenses?.actual ?? 0;
    }
  }
  return null;
}

const arVariant: Record<string, "success" | "warning" | "info" | "default"> = {
  received: "success",
  quarterly: "info",
  pending: "warning",
};

export default function GrantsTable({ grants }: { grants: Grant[] }) {
  const router = useRouter();
  const qbConfig = useQuickBooksConfig();
  const bva = useBudgetVsActuals();

  const qbConnected = qbConfig !== undefined && qbConfig !== null && !(qbConfig as any).isExpired;
  const bvaData: Array<{ className?: string; expenses?: { actual?: number } }> =
    qbConnected && bva?.data ? bva.data : [];

  if (grants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <svg className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">No grants in this stage.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border/60">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Funder</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Program</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Awarded</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Dates</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">AR Status</th>
            {bvaData.length > 0 && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">QB Spent</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {grants.map((grant, i) => {
            const qbSpent = bvaData.length > 0
              ? matchGrantToClass(grant.programName || grant.fundingSource, bvaData)
              : null;

            return (
              <tr
                key={grant._id}
                onClick={() => router.push(`/grants/${grant._id}`)}
                className={`cursor-pointer transition-colors duration-100 hover:bg-surface-hover ${
                  i % 2 === 1 ? "bg-surface-hover/30" : ""
                }`}
              >
                <td className="px-4 py-3 text-foreground font-medium max-w-[250px] truncate">
                  {grant.fundingSource}
                </td>
                <td className="px-4 py-3 text-muted max-w-[200px] truncate">
                  {grant.programName || grant.programType || "—"}
                </td>
                <td className="px-4 py-3 text-right text-foreground font-medium tabular-nums">
                  {grant.amountAwarded ? formatCurrency(grant.amountAwarded) : "—"}
                </td>
                <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                  {grant.startDate ? formatDate(grant.startDate) : "—"}
                  {grant.endDate ? ` – ${formatDate(grant.endDate)}` : ""}
                </td>
                <td className="px-4 py-3">
                  {grant.arStatus ? (
                    <Badge variant={arVariant[grant.arStatus.toLowerCase()] ?? "default"}>
                      {grant.arStatus}
                    </Badge>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                {bvaData.length > 0 && (
                  <td className="px-4 py-3 text-right tabular-nums">
                    {qbSpent !== null ? (
                      <span className="text-foreground">
                        {formatCurrency(qbSpent)}
                        <span className="ml-1 text-[10px] text-success" title="From QuickBooks">QB</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
