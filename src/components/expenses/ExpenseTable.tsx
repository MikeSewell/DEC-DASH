"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyExact, formatDate } from "@/lib/utils";
import type { ExpenseItem } from "@/types";

type SortKey = "date" | "vendor" | "account" | "class" | "amount" | "memo";
type SortDir = "asc" | "desc";

interface ExpenseTableProps {
  data: ExpenseItem[];
}

const PAGE_SIZE = 25;

export default function ExpenseTable({ data }: ExpenseTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortKey) {
        case "date":
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case "vendor":
          aVal = a.vendor.toLowerCase();
          bVal = b.vendor.toLowerCase();
          break;
        case "account":
          aVal = a.account.toLowerCase();
          bVal = b.account.toLowerCase();
          break;
        case "class":
          aVal = (a.class || "").toLowerCase();
          bVal = (b.class || "").toLowerCase();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "memo":
          aVal = (a.memo || "").toLowerCase();
          bVal = (b.memo || "").toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return (
        <svg className="w-3 h-3 ml-1 inline opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="w-3 h-3 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  }

  const columns: { key: SortKey; header: string }[] = [
    { key: "date", header: "Date" },
    { key: "vendor", header: "Vendor" },
    { key: "account", header: "Account" },
    { key: "class", header: "Class" },
    { key: "amount", header: "Amount" },
    { key: "memo", header: "Memo" },
  ];

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort(col.key)}
                >
                  {col.header}
                  <SortIcon column={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  No expenses found
                </td>
              </tr>
            ) : (
              pageData.map((item, idx) => (
                <tr
                  key={item.id}
                  className={cn(
                    "transition-colors duration-100",
                    idx % 2 === 1 && "bg-surface-hover/50"
                  )}
                >
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {item.vendor}
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {item.account}
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {item.class || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap font-medium">
                    {formatCurrencyExact(item.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted max-w-[200px] truncate">
                    {item.memo || "\u2014"}
                  </td>
                </tr>
              ))
            )}
            {/* Total row */}
            {pageData.length > 0 && (
              <tr className="border-t-2 border-border bg-surface-hover/30">
                <td colSpan={4} className="px-4 py-3 text-foreground font-semibold text-right">
                  Total ({data.length} expenses)
                </td>
                <td className="px-4 py-3 text-foreground font-bold whitespace-nowrap">
                  {formatCurrencyExact(total)}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted">
            Showing {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-sm rounded-md border border-border text-foreground hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-sm rounded-md border border-border text-foreground hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
