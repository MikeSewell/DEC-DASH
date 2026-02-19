"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import NewsletterList from "@/components/newsletter/NewsletterList";

export default function NewsletterPage() {
  const router = useRouter();
  const newsletters = useQuery(api.newsletters.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const createNewsletter = useMutation(api.newsletters.create);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!currentUser?._id) return;
    setCreating(true);
    try {
      const id = await createNewsletter({
        title: `Newsletter - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
        createdBy: currentUser._id,
      });
      router.push(`/newsletter/${id}`);
    } catch (err) {
      console.error("Failed to create newsletter:", err);
    } finally {
      setCreating(false);
    }
  }

  if (newsletters === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading newsletters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">Newsletter</h1>
          <p className="text-sm text-muted mt-1">
            Create and manage email newsletters for Dads Evoking Change
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          loading={creating}
          onClick={handleCreate}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Newsletter
        </Button>
      </div>

      {/* Newsletter list */}
      <NewsletterList newsletters={newsletters} />
    </div>
  );
}
