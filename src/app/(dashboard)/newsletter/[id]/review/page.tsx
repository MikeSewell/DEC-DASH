"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import NewsletterPreview from "@/components/newsletter/NewsletterPreview";

interface ContactList {
  list_id: string;
  name: string;
  membership_count: number;
}

export default function NewsletterReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as Id<"newsletters">;

  const newsletter = useQuery(api.newsletters.getById, { id });
  const ccConfig = useQuery(api.constantContact.getConfig);
  const sendNewsletter = useAction(api.newsletterActions.sendNewsletter);
  const getContactLists = useAction(api.constantContactActions.getContactLists);

  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (ccConfig && !ccConfig.isExpired) {
      setLoadingLists(true);
      getContactLists()
        .then((lists: ContactList[]) => {
          setContactLists(lists);
          if (lists.length > 0) {
            setSelectedList(lists[0].list_id);
          }
        })
        .catch((err: Error) => {
          console.error("Failed to load contact lists:", err);
        })
        .finally(() => setLoadingLists(false));
    }
  }, [ccConfig, getContactLists]);

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
        <Button variant="secondary" onClick={() => router.push("/newsletter")}>
          Back to Newsletters
        </Button>
      </div>
    );
  }

  async function handleSend() {
    if (!selectedList) return;
    setSending(true);
    try {
      await sendNewsletter({ id, contactListId: selectedList });
      setSent(true);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push(`/newsletter/${id}`)}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Editor
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{newsletter.title}</h1>
          <p className="text-sm text-muted mt-1">Review and send your newsletter</p>
        </div>
        <Badge
          variant={
            newsletter.status === "published"
              ? "success"
              : newsletter.status === "review"
                ? "warning"
                : "default"
          }
        >
          {newsletter.status}
        </Badge>
      </div>

      {/* Send controls */}
      <Card title="Send via Constant Contact">
        {!ccConfig ? (
          <p className="text-sm text-muted">
            Constant Contact is not connected. Go to Admin &gt; Constant Contact to set it up.
          </p>
        ) : ccConfig.isExpired ? (
          <p className="text-sm text-warning">
            Constant Contact connection has expired. Please reconnect in Admin settings.
          </p>
        ) : sent ? (
          <div className="flex items-center gap-3 py-2">
            <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-success">
              Newsletter sent successfully!
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-full sm:w-64">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Contact List
              </label>
              {loadingLists ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Loading lists...</span>
                </div>
              ) : (
                <select
                  value={selectedList}
                  onChange={(e) => setSelectedList(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {contactLists.length === 0 ? (
                    <option value="">No contact lists found</option>
                  ) : (
                    contactLists.map((list) => (
                      <option key={list.list_id} value={list.list_id}>
                        {list.name} ({list.membership_count} contacts)
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              loading={sending}
              disabled={!selectedList || !newsletter.generatedEmailHtml}
              onClick={handleSend}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Send via Constant Contact
            </Button>
          </div>
        )}
      </Card>

      {/* Preview */}
      <NewsletterPreview html={newsletter.generatedEmailHtml} />
    </div>
  );
}
