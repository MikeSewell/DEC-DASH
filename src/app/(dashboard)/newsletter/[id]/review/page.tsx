"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
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
  const sendTestEmail = useAction(api.newsletterActions.sendTestEmail);
  const getContactLists = useAction(api.constantContactActions.getContactLists);
  const updateNewsletter = useMutation(api.newsletters.update);

  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  async function handleSaveHtml(newHtml: string) {
    await updateNewsletter({ id, generatedEmailHtml: newHtml });
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

  async function handleSendTest() {
    if (!testEmailAddress.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      await sendTestEmail({ id, testEmail: testEmailAddress.trim() });
      setTestResult({ success: true, message: `Test email sent to ${testEmailAddress.trim()}` });
    } catch (err) {
      console.error("Test send failed:", err);
      setTestResult({ success: false, message: err instanceof Error ? err.message : "Failed to send test email" });
    } finally {
      setSendingTest(false);
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

      {/* Test email section */}
      <Card title="Send Test Email">
        <p className="text-sm text-muted mb-4">
          Send a review copy to check formatting before publishing to your contact list.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="w-full sm:w-80">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            loading={sendingTest}
            disabled={!testEmailAddress.trim() || !newsletter.generatedEmailHtml}
            onClick={handleSendTest}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Send Test Email
          </Button>
        </div>
        {!newsletter.generatedEmailHtml && (
          <p className="text-xs text-warning mt-2">
            Generate the email HTML first before sending a test.
          </p>
        )}
        {testResult && (
          <div className={`flex items-center gap-2 mt-3 ${testResult.success ? "text-success" : "text-danger"}`}>
            {testResult.success ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}
      </Card>

      {/* Send controls */}
      <Card title="Send to Contact List">
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
              Send to Contact List
            </Button>
          </div>
        )}
      </Card>

      {/* Preview */}
      <NewsletterPreview html={newsletter.generatedEmailHtml} editable onSave={handleSaveHtml} />
    </div>
  );
}
