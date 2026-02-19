"use client";

import { useState } from "react";
import { useQuickBooksConfig, useQuickBooksSync } from "@/hooks/useQuickBooks";
import { formatDate, timeAgo } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

export default function QuickBooksConnect() {
  const config = useQuickBooksConfig();
  const { triggerSync } = useQuickBooksSync();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await triggerSync();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  if (config === undefined) {
    return (
      <Card title="QuickBooks Online">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  const isConnected = config !== null;

  return (
    <Card title="QuickBooks Online">
      <div className="space-y-6">
        {/* Connection status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-success" : "bg-danger"
            }`}
          />
          <span className="text-sm font-medium text-foreground">
            {isConnected ? "Connected" : "Not Connected"}
          </span>
          {isConnected && (
            <Badge variant={config.isExpired ? "danger" : "success"}>
              {config.isExpired ? "Token Expired" : "Active"}
            </Badge>
          )}
        </div>

        {isConnected ? (
          <>
            {/* Connection details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted uppercase">Company Name</p>
                <p className="text-sm text-foreground mt-1">
                  {config.companyName || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted uppercase">Connected</p>
                <p className="text-sm text-foreground mt-1">
                  {formatDate(config.connectedAt, "long")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted uppercase">Realm ID</p>
                <p className="text-sm text-muted mt-1 font-mono text-xs">
                  {config.realmId}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button
                variant="primary"
                size="sm"
                loading={syncing}
                onClick={handleSync}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh Now
              </Button>
              {config.isExpired && (
                <a href="/api/quickbooks/auth">
                  <Button variant="secondary" size="sm">
                    Reconnect
                  </Button>
                </a>
              )}
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm text-muted mb-4">
              Connect your QuickBooks Online account to sync financial data
              including expenses, vendors, accounts, and reports.
            </p>
            <a href="/api/quickbooks/auth">
              <Button variant="primary" size="md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Connect QuickBooks
              </Button>
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
