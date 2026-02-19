"use client";

import { useState, useMemo, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ExpenseByVendor from "@/components/expenses/ExpenseByVendor";
import ExpenseByAccount from "@/components/expenses/ExpenseByAccount";
import BudgetComparison from "@/components/expenses/BudgetComparison";
import { useExpenses } from "@/hooks/useQuickBooks";
import { cn } from "@/lib/utils";
import { formatCurrencyExact } from "@/lib/utils";
import type { ExpenseItem } from "@/types";

type TabId = "vendor" | "account" | "class";

const TABS: { id: TabId; label: string }[] = [
  { id: "vendor", label: "By Vendor" },
  { id: "account", label: "By Account" },
  { id: "class", label: "By Class" },
];

export default function ExpensesPage() {
  const expensesData = useExpenses();
  const [activeTab, setActiveTab] = useState<TabId>("vendor");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const allExpenses: ExpenseItem[] = useMemo(() => {
    if (!expensesData?.data) return [];
    return Array.isArray(expensesData.data) ? expensesData.data : [];
  }, [expensesData]);

  const filteredExpenses = useMemo(() => {
    let result = allExpenses;

    // Date range filter
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter((e) => new Date(e.date).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // Include the end date
      result = result.filter((e) => new Date(e.date).getTime() < end);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.vendor.toLowerCase().includes(q) ||
          e.account.toLowerCase().includes(q) ||
          (e.class && e.class.toLowerCase().includes(q)) ||
          (e.memo && e.memo.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allExpenses, startDate, endDate, search]);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("DEC - Expense Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      const dateRange =
        startDate || endDate
          ? `Date range: ${startDate || "Start"} - ${endDate || "End"}`
          : "All dates";
      doc.text(dateRange, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);
      doc.text(`Total: ${formatCurrencyExact(filteredExpenses.reduce((s, e) => s + e.amount, 0))}`, 14, 40);

      doc.setTextColor(0);
      doc.setFontSize(9);

      // Table headers
      let y = 50;
      doc.setFont("helvetica", "bold");
      doc.text("Date", 14, y);
      doc.text("Vendor", 40, y);
      doc.text("Account", 90, y);
      doc.text("Amount", 145, y);
      doc.text("Class", 170, y);

      doc.setFont("helvetica", "normal");
      y += 6;

      for (const expense of filteredExpenses.slice(0, 100)) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(expense.date.slice(0, 10), 14, y);
        doc.text(expense.vendor.slice(0, 25), 40, y);
        doc.text(expense.account.slice(0, 25), 90, y);
        doc.text(formatCurrencyExact(expense.amount), 145, y);
        doc.text((expense.class || "").slice(0, 15), 170, y);
        y += 5;
      }

      if (filteredExpenses.length > 100) {
        y += 5;
        doc.setFont("helvetica", "italic");
        doc.text(`... and ${filteredExpenses.length - 100} more expenses`, 14, y);
      }

      doc.save("dec-expense-report.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [filteredExpenses, startDate, endDate]);

  if (expensesData === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Management</h1>
          <p className="text-sm text-muted mt-1">
            {filteredExpenses.length} expenses | Total:{" "}
            {formatCurrencyExact(filteredExpenses.reduce((s, e) => s + e.amount, 0))}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={exporting}
          onClick={handleExportPdf}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Search"
              placeholder="Search vendor, account, class, memo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-44">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-full md:w-44">
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSearch("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "vendor" && (
        <div className="space-y-6">
          <ExpenseByVendor data={filteredExpenses} />
          <Card title="All Expenses">
            <ExpenseTable data={filteredExpenses} />
          </Card>
        </div>
      )}

      {activeTab === "account" && (
        <div className="space-y-6">
          <ExpenseByAccount data={filteredExpenses} />
          <Card title="All Expenses">
            <ExpenseTable data={filteredExpenses} />
          </Card>
        </div>
      )}

      {activeTab === "class" && (
        <BudgetComparison />
      )}
    </div>
  );
}
