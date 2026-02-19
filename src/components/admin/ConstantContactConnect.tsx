"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";

export default function ConstantContactConnect() {
  const config = useQuery(api.constantContact.getConfig);
  const disconnect = useMutation(api.constantContact.disconnect);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnect();
    } catch (err) {
      console.error("Disconnect failed:", err);
    } finally {
      setDisconnecting(false);
      setShowDisconnect(false);
    }
  }

  if (config === undefined) {
    return (
      <Card title="Constant Contact">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  const isConnected = config !== null;

  return (
    <>
      <Card title="Constant Contact">
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
                  <p className="text-xs font-medium text-muted uppercase">
                    Connected Since
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    {formatDate(config.connectedAt, "long")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                {config.isExpired && (
                  <a href="/api/constant-contact/auth">
                    <Button variant="primary" size="sm">
                      Reconnect
                    </Button>
                  </a>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDisconnect(true)}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-muted mb-4">
                Connect your Constant Contact account to send newsletters
                directly to your contact lists.
              </p>
              <a href="/api/constant-contact/auth">
                <Button variant="primary" size="md">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  Connect Constant Contact
                </Button>
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Disconnect confirmation */}
      <Modal
        isOpen={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        title="Disconnect Constant Contact"
        size="sm"
      >
        <p className="text-sm text-foreground mb-2">
          Are you sure you want to disconnect Constant Contact?
        </p>
        <p className="text-sm text-muted mb-6">
          You will need to re-authorize to send newsletters again.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDisconnect(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={disconnecting}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </Modal>
    </>
  );
}
