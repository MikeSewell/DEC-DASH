"use client";

import { cn } from "@/lib/utils";

interface NewsletterSectionFormProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function NewsletterSectionForm({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: NewsletterSectionFormProps) {
  const maxChars = 2000;
  const charCount = value.length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <span
          className={cn(
            "text-xs",
            charCount > maxChars * 0.9 ? "text-warning" : "text-muted"
          )}
        >
          {charCount} / {maxChars}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxChars}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm resize-y",
          "bg-surface border border-border text-foreground placeholder:text-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          "transition-colors duration-150"
        )}
      />
    </div>
  );
}
