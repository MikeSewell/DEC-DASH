"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { NewsletterStatus, NewsletterSections } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDate, truncate } from "@/lib/utils";

interface NewsletterDoc {
  _id: Id<"newsletters">;
  title: string;
  status: NewsletterStatus;
  sections: string;
  createdAt: number;
  updatedAt: number;
}

interface NewsletterListProps {
  newsletters: NewsletterDoc[];
}

const statusBadgeVariant: Record<NewsletterStatus, "default" | "warning" | "success"> = {
  draft: "default",
  review: "warning",
  published: "success",
};

export default function NewsletterList({ newsletters }: NewsletterListProps) {
  const router = useRouter();
  const remove = useMutation(api.newsletters.remove);
  const [deleteTarget, setDeleteTarget] = useState<Id<"newsletters"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove({ id: deleteTarget });
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function getExcerpt(sectionsJson: string): string {
    try {
      const sections: NewsletterSections = JSON.parse(sectionsJson);
      const text =
        sections.dadOfMonthStory ||
        sections.programHighlights ||
        sections.programUpdates ||
        sections.participantTestimonials ||
        "";
      return text ? truncate(text, 120) : "No content yet";
    } catch {
      return "No content yet";
    }
  }

  if (newsletters.length === 0) {
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
              d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18.75z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No Newsletters Yet
          </h3>
          <p className="text-sm text-muted">
            Create your first newsletter to get started.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {newsletters.map((newsletter) => (
          <Card key={newsletter._id} className="hover:shadow-md transition-shadow">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground leading-tight line-clamp-2">
                  {newsletter.title}
                </h3>
                <Badge variant={statusBadgeVariant[newsletter.status]}>
                  {newsletter.status}
                </Badge>
              </div>

              <p className="text-sm text-muted mb-4 flex-1">
                {getExcerpt(newsletter.sections)}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted">
                  {formatDate(newsletter.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/newsletter/${newsletter._id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(newsletter._id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Newsletter"
        size="sm"
      >
        <p className="text-sm text-foreground mb-6">
          Are you sure you want to delete this newsletter? This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
