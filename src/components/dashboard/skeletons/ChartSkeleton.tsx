"use client";

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)]">
            <div className="h-3 w-20 rounded-md bg-border/30 mb-2" />
            <div className="h-7 w-24 rounded-md bg-border/50" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="h-4 w-32 rounded-md bg-border/30" />
      <div className="rounded-xl bg-border/20" style={{ height }} />
    </div>
  );
}

export function BarChartSkeleton({ bars = 5, height = 200 }: { bars?: number; height?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-end gap-3 justify-around" style={{ height }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-lg bg-border/30"
            style={{ height: `${30 + (i * 13 + 17) % 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}
