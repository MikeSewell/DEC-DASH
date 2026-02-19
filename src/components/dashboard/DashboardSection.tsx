"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleHide?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function DashboardSection({
  id,
  title,
  children,
  onMoveUp,
  onMoveDown,
  onToggleHide,
  isFirst,
  isLast,
}: DashboardSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card
      className="overflow-hidden"
      title={undefined}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-gradient-to-r from-surface to-surface-hover/30">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-left group"
          aria-expanded={!collapsed}
          aria-controls={`section-${id}`}
        >
          <svg
            className={cn(
              "h-4 w-4 text-muted transition-transform duration-200",
              collapsed ? "-rotate-90" : "rotate-0"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors font-[family-name:var(--font-fraunces)]">
            {title}
          </h3>
        </button>

        <div className="flex items-center gap-1">
          {/* Move Up */}
          {onMoveUp && !isFirst && (
            <button
              onClick={onMoveUp}
              className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              title="Move section up"
              aria-label="Move section up"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}

          {/* Move Down */}
          {onMoveDown && !isLast && (
            <button
              onClick={onMoveDown}
              className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              title="Move section down"
              aria-label="Move section down"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* Hide */}
          {onToggleHide && (
            <button
              onClick={onToggleHide}
              className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-light/10 transition-colors"
              title="Hide section"
              aria-label="Hide section"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.972 9.972 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.657 4.656L17.657 17.657M17.657 17.657L21 21m-3.343-3.343l-2.829-2.829m-4.656-4.656l4.656 4.656"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Section Content */}
      <div
        id={`section-${id}`}
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          collapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        )}
      >
        <div className="px-6 py-4">{children}</div>
      </div>
    </Card>
  );
}
