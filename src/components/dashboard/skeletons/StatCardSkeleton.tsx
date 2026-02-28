"use client";

export function StatCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow-sm)] animate-pulse">
      <div className="h-11 w-11 rounded-xl bg-border/50 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-7 w-24 rounded-md bg-border/50" />
        <div className="h-3 w-16 rounded-md bg-border/30" />
      </div>
    </div>
  );
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
