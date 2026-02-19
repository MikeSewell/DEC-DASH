"use client";

import { useState, useMemo } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatCurrencyExact } from "@/lib/utils";
import type { ExpenseItem } from "@/types";

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  potentialSavings: string;
}

interface RecommendationResult {
  overallAssessment: string;
  recommendations: Recommendation[];
  vendorInsights: string;
  accountNotes: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function ExpenseRecommender({ data }: { data: ExpenseItem[] }) {
  const getRecommendations = useAction(api.expenseActions.getRecommendations);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    if (data.length === 0) return "";

    const total = data.reduce((s, e) => s + e.amount, 0);

    // Top vendors by spend
    const vendorMap: Record<string, number> = {};
    for (const e of data) {
      vendorMap[e.vendor] = (vendorMap[e.vendor] || 0) + e.amount;
    }
    const topVendors = Object.entries(vendorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, amount]) => `${name}: ${formatCurrencyExact(amount)}`)
      .join("\n");

    // Top accounts by spend
    const accountMap: Record<string, number> = {};
    for (const e of data) {
      accountMap[e.account] = (accountMap[e.account] || 0) + e.amount;
    }
    const topAccounts = Object.entries(accountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, amount]) => `${name}: ${formatCurrencyExact(amount)}`)
      .join("\n");

    // Date range
    const dates = data.map((e) => e.date).sort();
    const dateRange = `${dates[0]?.slice(0, 10)} to ${dates[dates.length - 1]?.slice(0, 10)}`;

    return `Total Expenses: ${formatCurrencyExact(total)}
Number of Transactions: ${data.length}
Date Range: ${dateRange}

Top Vendors by Spend:
${topVendors}

Top Accounts by Spend:
${topAccounts}`;
  }, [data]);

  async function handleAnalyze() {
    if (!summary) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await getRecommendations({ expenseSummary: summary });
      setResult(res as RecommendationResult);
    } catch (err: any) {
      const msg = err?.message || "Failed to analyze expenses.";
      if (msg.includes("API key not configured")) {
        setError("OpenAI API key not configured. An admin can set it in Admin > Settings.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (data.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-muted text-sm">No expenses to analyze. Adjust your filters to include expenses.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analyze button */}
      {!result && !loading && (
        <Card>
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              AI Expense Analysis
            </h3>
            <p className="text-sm text-muted mb-6 max-w-md mx-auto">
              Analyze {data.length} expenses ({formatCurrencyExact(data.reduce((s, e) => s + e.amount, 0))} total) for cost-saving opportunities using AI.
            </p>
            <Button onClick={handleAnalyze}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Analyze Expenses
            </Button>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <div className="text-center py-12">
            <svg
              className="animate-spin mx-auto h-8 w-8 text-primary mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-muted">Analyzing your expenses with AI...</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={handleAnalyze}>
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Overall Assessment */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Overall Assessment</h3>
                <p className="text-sm text-muted leading-relaxed">{result.overallAssessment}</p>
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
              {result.recommendations.map((rec, i) => (
                <Card key={i}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg font-bold text-muted/40">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.low
                        )}>
                          {rec.priority}
                        </span>
                        {rec.potentialSavings && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Est. savings: {rec.potentialSavings}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted leading-relaxed">{rec.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Vendor Insights & Account Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.vendorInsights && (
              <Card title="Vendor Insights">
                <p className="text-sm text-muted leading-relaxed">{result.vendorInsights}</p>
              </Card>
            )}
            {result.accountNotes && (
              <Card title="Account Distribution">
                <p className="text-sm text-muted leading-relaxed">{result.accountNotes}</p>
              </Card>
            )}
          </div>

          {/* Re-analyze button */}
          <div className="flex justify-center">
            <Button variant="secondary" size="sm" onClick={handleAnalyze}>
              Re-analyze
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
