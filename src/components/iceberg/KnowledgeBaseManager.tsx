"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";

interface KnowledgeBaseManagerProps {
  userId: Id<"users">;
}

export default function KnowledgeBaseManager({ userId }: KnowledgeBaseManagerProps) {
  const files = useQuery(api.knowledgeBase.listFiles);
  const getUploadUrl = useMutation(api.knowledgeBase.getUploadUrl);
  const uploadToOpenAI = useAction(api.knowledgeBaseActions.uploadToOpenAI);
  const removeFromOpenAI = useAction(api.knowledgeBaseActions.removeFromOpenAI);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload to Convex storage
      const uploadUrl = await getUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // Upload to OpenAI vector store
      await uploadToOpenAI({
        storageId,
        fileName: file.name,
        fileType: file.type,
        sizeBytes: file.size,
        uploadedBy: userId,
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(fileId: Id<"knowledgeBase">) {
    setDeleting(fileId);
    try {
      await removeFromOpenAI({ id: fileId });
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleting(null);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (files === undefined) return <Spinner size="md" />;

  return (
    <Card title="Knowledge Base" action={
      <label className="cursor-pointer">
        <Button variant="primary" size="sm" loading={uploading} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.txt,.md,.csv"
          className="hidden"
          disabled={uploading}
        />
      </label>
    }>
      <div className="space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">
            No files uploaded yet. Upload documents to give Iceberg context about your organization.
          </p>
        ) : (
          files.map((file) => (
            <div
              key={file._id}
              className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                  <p className="text-xs text-muted">
                    {formatFileSize(file.sizeBytes)} &middot; {formatDate(file.uploadedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(file._id)}
                disabled={deleting === file._id}
                className="flex-shrink-0 p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-light transition-colors disabled:opacity-50"
                title="Remove file"
              >
                {deleting === file._id ? (
                  <Spinner size="sm" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
