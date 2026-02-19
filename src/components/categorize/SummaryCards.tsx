"use client";

import Card from "@/components/ui/Card";

interface Stats {
  total: number;
  high: number;
  medium: number;
  low: number;
  approved: number;
  submitted: number;
  pending: number;
  skipped: number;
  errors: number;
}

export default function SummaryCards({ stats }: { stats: Stats | undefined }) {
  const cards = [
    {
      label: "AI Suggestions",
      value: stats?.total ?? 0,
      color: "text-foreground",
      bg: "bg-surface",
    },
    {
      label: "High Confidence",
      value: stats?.high ?? 0,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Medium Confidence",
      value: stats?.medium ?? 0,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Low Confidence",
      value: stats?.low ?? 0,
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Ready to Submit",
      value: stats?.approved ?? 0,
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={card.bg}>
          <div className="text-center">
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted mt-1 font-medium">{card.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
