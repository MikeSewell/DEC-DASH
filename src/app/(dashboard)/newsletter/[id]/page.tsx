"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { NewsletterSections, NewsletterStatus } from "@/types";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import NewsletterEditor from "@/components/newsletter/NewsletterEditor";

const statusBadgeVariant: Record<NewsletterStatus, "default" | "warning" | "success"> = {
  draft: "default",
  review: "warning",
  published: "success",
};

export default function NewsletterEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as Id<"newsletters">;

  const newsletter = useQuery(api.newsletters.getById, { id });
  const update = useMutation(api.newsletters.update);
  const generateHtml = useAction(api.newsletterActions.generateEmailHtml);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [blankWarning, setBlankWarning] = useState(false);

  if (newsletter === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading newsletter...</p>
        </div>
      </div>
    );
  }

  if (newsletter === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-semibold text-foreground mb-2">Newsletter Not Found</h2>
        <p className="text-sm text-muted mb-4">This newsletter may have been deleted.</p>
        <Button variant="secondary" onClick={() => router.push("/newsletter")}>
          Back to Newsletters
        </Button>
      </div>
    );
  }

  const sections: NewsletterSections = (() => {
    try {
      return JSON.parse(newsletter.sections);
    } catch {
      return {};
    }
  })();

  // Content size for 400KB Constant Contact limit
  const WARN_KB = 350;  // 87.5% of limit
  const ERROR_KB = 390; // 97.5% of limit
  const sizeBytes = newsletter.generatedEmailHtml
    ? new TextEncoder().encode(newsletter.generatedEmailHtml).length
    : 0;
  const sizeKB = Math.round(sizeBytes / 1024);

  async function handleTitleSave() {
    if (titleValue.trim() && titleValue !== newsletter!.title) {
      await update({ id, title: titleValue.trim() });
    }
    setEditingTitle(false);
  }

  async function handleGenerate() {
    // Guard: at least one section field must have content
    const hasAnyContent = Object.values(sections).some(
      (v) => typeof v === "string" && v.trim().length > 0
    );
    if (!hasAnyContent) {
      setBlankWarning(true);
      return;
    }
    setBlankWarning(false);
    setGenerating(true);
    try {
      await generateHtml({ id });
    } catch (err) {
      console.error("Generate failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(status: NewsletterStatus) {
    await update({ id, status });
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push("/newsletter")}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Newsletters
      </button>

      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="text-lg font-bold"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleTitleSave}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingTitle(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <h1
                className="text-xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  setTitleValue(newsletter.title);
                  setEditingTitle(true);
                }}
                title="Click to edit title"
              >
                {newsletter.title}
              </h1>
            )}
            <Badge variant={statusBadgeVariant[newsletter.status as NewsletterStatus]}>
              {newsletter.status}
            </Badge>
            {newsletter.generatedEmailHtml && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  sizeKB >= ERROR_KB
                    ? "bg-red-100 text-red-700"
                    : sizeKB >= WARN_KB
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                )}
              >
                {sizeKB >= ERROR_KB && "Near limit \u2014 "}
                {sizeKB >= WARN_KB && sizeKB < ERROR_KB && "Approaching limit \u2014 "}
                {sizeKB} KB / 400 KB
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {newsletter.status === "draft" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange("review")}
              >
                Move to Review
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              loading={generating}
              onClick={handleGenerate}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              Generate Email
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/newsletter/${id}/review`)}
              disabled={!newsletter.generatedEmailHtml}
            >
              Preview
            </Button>
          </div>
        </div>
      </Card>

      {/* Blank-content warning */}
      {blankWarning && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300">
          Please fill in at least one section before generating the email.
        </div>
      )}

      {/* Editor */}
      <NewsletterEditor
        newsletterId={id}
        sections={sections}
        title={newsletter.title}
      />
    </div>
  );
}
