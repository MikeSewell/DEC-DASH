"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";

interface NewsletterPreviewProps {
  html: string | null | undefined;
}

type PreviewMode = "desktop" | "mobile";

export default function NewsletterPreview({ html }: NewsletterPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("desktop");

  if (!html) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="w-12 h-12 text-muted mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No Preview Available
          </h3>
          <p className="text-sm text-muted max-w-sm">
            Click &ldquo;Generate Email&rdquo; in the editor to create the
            HTML email content, then return here to preview it.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("desktop")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
            mode === "desktop"
              ? "bg-primary text-white"
              : "bg-surface text-muted hover:text-foreground border border-border"
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Desktop
        </button>
        <button
          onClick={() => setMode("mobile")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
            mode === "mobile"
              ? "bg-primary text-white"
              : "bg-surface text-muted hover:text-foreground border border-border"
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
          Mobile
        </button>
      </div>

      {/* Preview iframe */}
      <div className="flex justify-center">
        <div
          className={cn(
            "border border-border rounded-lg overflow-hidden bg-white shadow-sm transition-all",
            mode === "desktop" ? "w-full" : "w-[375px]"
          )}
        >
          <iframe
            srcDoc={html}
            title="Newsletter Preview"
            className="w-full border-0"
            style={{ height: mode === "desktop" ? 700 : 600 }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
