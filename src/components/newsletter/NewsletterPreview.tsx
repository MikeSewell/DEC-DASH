"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";

interface NewsletterPreviewProps {
  html: string | null | undefined;
  editable?: boolean;
  onSave?: (html: string) => void;
}

type PreviewMode = "desktop" | "mobile";

export default function NewsletterPreview({ html, editable, onSave }: NewsletterPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [isEditing, setIsEditing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = useCallback(() => {
    if (!isEditing) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.body.contentEditable = "true";
    // Inject hover outline style for visual feedback
    const style = doc.createElement("style");
    style.textContent = `
      [contenteditable="true"] *:hover {
        outline: 2px dashed rgba(52,92,114,0.3);
        outline-offset: 2px;
      }
      [contenteditable="true"] *:focus {
        outline: 2px solid rgba(52,92,114,0.5);
        outline-offset: 2px;
      }
    `;
    doc.head.appendChild(style);
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !onSave) return;
    const fullHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    onSave(fullHtml);
    setIsEditing(false);
  }, [onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setIframeKey((k) => k + 1);
  }, []);

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
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("desktop")}
          disabled={isEditing}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
            isEditing && "opacity-50 cursor-not-allowed",
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
          disabled={isEditing}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
            isEditing && "opacity-50 cursor-not-allowed",
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

        {editable && html && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-surface text-muted hover:text-foreground border border-border transition-colors ml-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Preview
          </button>
        )}
      </div>

      {/* Editing banner + save/cancel */}
      {isEditing && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Editing — click on text to modify or delete
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm rounded-md bg-white text-foreground border border-border hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Rendering accuracy note */}
      {html && !isEditing && (
        <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <svg
            className="w-3.5 h-3.5 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <span>
            Preview shows Gmail/Apple Mail rendering. Outlook may differ slightly (square corners, minor spacing). Send a test email for the definitive check.
          </span>
        </div>
      )}

      {/* Preview iframe */}
      <div className="flex justify-center">
        <div
          className={cn(
            "border border-border rounded-lg overflow-hidden bg-white shadow-sm transition-all",
            mode === "desktop" ? "w-full" : "w-[375px]"
          )}
        >
          <iframe
            key={iframeKey}
            ref={iframeRef}
            srcDoc={html}
            title="Newsletter Preview"
            className="w-full border-0"
            style={{ height: mode === "desktop" ? 700 : 600 }}
            sandbox={isEditing ? "allow-same-origin allow-scripts" : "allow-same-origin"}
            onLoad={handleIframeLoad}
          />
        </div>
      </div>
    </div>
  );
}
