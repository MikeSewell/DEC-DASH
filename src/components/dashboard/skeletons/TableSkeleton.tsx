"use client";

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Header row */}
      <div className="flex gap-4 pb-2 border-b border-border/50">
        <div className="h-3 w-24 rounded-md bg-border/40" />
        <div className="h-3 w-32 rounded-md bg-border/40" />
        <div className="h-3 w-20 rounded-md bg-border/40" />
        <div className="h-3 w-16 rounded-md bg-border/40" />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <div className="h-4 w-28 rounded-md bg-border/30" />
          <div className="h-4 w-36 rounded-md bg-border/20" />
          <div className="h-4 w-20 rounded-md bg-border/20" />
          <div className="h-4 w-16 rounded-md bg-border/30" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-border/30 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-3/4 rounded-md bg-border/30" />
            <div className="h-3 w-1/2 rounded-md bg-border/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
