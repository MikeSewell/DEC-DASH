import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T, index: number) => void;
  emptyMessage?: string;
  className?: string;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data available",
  className,
}: TableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-xl", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={onRowClick ? () => onRowClick(item, rowIndex) : undefined}
                className={cn(
                  "transition-colors duration-100",
                  rowIndex % 2 === 1 && "bg-surface-hover/30",
                  onRowClick &&
                    "cursor-pointer hover:bg-surface-hover"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-foreground whitespace-nowrap"
                  >
                    {col.render
                      ? col.render(item, rowIndex)
                      : (item[col.key] as ReactNode) ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
