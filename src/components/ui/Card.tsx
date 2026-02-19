import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export default function Card({ children, className, title, action }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-2xl border border-border shadow-[var(--warm-shadow-sm)] hover-lift",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70">
          <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-fraunces)]">{title}</h3>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(title ? "px-6 py-4" : "p-6")}>{children}</div>
    </div>
  );
}
