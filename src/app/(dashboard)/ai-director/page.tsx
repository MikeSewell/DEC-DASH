"use client";

import { useState, useCallback } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { timeAgo, truncate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import ChatInterface from "@/components/ai-director/ChatInterface";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AIDirectorPage() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const [sessionId, setSessionId] = useState<string>(() => generateUUID());
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messages = useQuery(
    api.aiDirector.getMessages,
    sessionId ? { sessionId } : "skip"
  );

  const sessions = useQuery(
    api.aiDirector.getSessions,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const sendMessage = useAction(api.aiDirectorActions.sendMessage);
  const deleteSession = useMutation(api.aiDirector.deleteSession);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentUser?._id) return;
      setIsLoading(true);
      try {
        await sendMessage({
          sessionId,
          content,
          userId: currentUser._id,
        });
      } catch (err) {
        console.error("Send failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, currentUser, sendMessage]
  );

  function handleNewChat() {
    setSessionId(generateUUID());
  }

  function handleSelectSession(id: string) {
    setSessionId(id);
  }

  async function handleDeleteSession(id: string) {
    try {
      await deleteSession({ sessionId: id });
      if (id === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  if (currentUser === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-border overflow-hidden bg-surface shadow-[var(--warm-shadow-md)]">
      {/* Left sidebar - Sessions */}
      <div
        className={cn(
          "border-r border-border bg-background flex flex-col transition-all duration-200",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-border">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleNewChat}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Chat
          </Button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions === undefined ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">
              No previous chats
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                className={cn(
                  "group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                  session.sessionId === sessionId
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-surface-hover text-foreground"
                )}
                onClick={() => handleSelectSession(session.sessionId)}
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.preview || "New conversation"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {timeAgo(session.createdAt)} &middot; {session.messageCount} msgs
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.sessionId);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-danger transition-all"
                  title="Delete chat"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-surface border border-border rounded-r-lg shadow-sm text-muted hover:text-foreground transition-colors md:hidden"
      >
        <svg
          className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-sm font-semibold text-foreground font-[family-name:var(--font-fraunces)]">AI Director</h2>
              <p className="text-xs text-muted">DEC Knowledge Assistant</p>
            </div>
          </div>
        </div>

        {/* Chat interface */}
        <ChatInterface
          messages={messages ?? []}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
