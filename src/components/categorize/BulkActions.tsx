"use client";

import Button from "@/components/ui/Button";

interface GrantOption {
  class_id: string;
  class_name: string;
}

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  allSelected: boolean;
  grantOptions: GrantOption[];
  selectedGrantId: string;
  onGrantChange: (id: string) => void;
  onApply: () => void;
}

export default function BulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  allSelected,
  grantOptions,
  selectedGrantId,
  onGrantChange,
  onApply,
}: BulkActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3 px-4 bg-surface rounded-xl border border-border">
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={allSelected && totalCount > 0}
          onChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
        />
        <span className="text-muted font-medium">
          {selectedCount > 0 ? `${selectedCount} selected` : "Select All"}
        </span>
      </label>

      {selectedCount > 0 && (
        <>
          <select
            value={selectedGrantId}
            onChange={(e) => onGrantChange(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-xl border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Assign grant...</option>
            {grantOptions.map((g) => (
              <option key={g.class_id} value={g.class_id}>
                {g.class_name}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="primary"
            disabled={!selectedGrantId}
            onClick={onApply}
          >
            Apply to Selected
          </Button>
        </>
      )}
    </div>
  );
}
