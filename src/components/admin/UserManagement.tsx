"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { UserRole } from "@/types";
import { formatDate, roleLabel, getInitials } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import UserForm from "./UserForm";

interface UserDoc {
  _id: Id<"users">;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: number;
}

const roleBadgeVariant: Record<UserRole, "success" | "warning" | "info" | "default"> = {
  admin: "success",
  manager: "warning",
  staff: "info",
  readonly: "default",
};

export default function UserManagement() {
  const users = useQuery(api.users.getAllUsers);
  const deleteUser = useMutation(api.users.deleteUser);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDoc | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<UserDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleEdit(user: UserDoc) {
    setEditingUser(user);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingUser(undefined);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser({ userId: deleteTarget._id });
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (users === undefined) {
    return (
      <Card title="Users">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title={`Users (${users.length})`}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingUser(undefined);
              setShowForm(true);
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add User
          </Button>
        }
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {getInitials(user.name)}
                        </div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={roleBadgeVariant[user.role as UserRole]}>
                        {roleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user as UserDoc)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:text-danger"
                          onClick={() => setDeleteTarget(user as UserDoc)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User form modal */}
      <UserForm
        isOpen={showForm}
        onClose={handleCloseForm}
        user={editingUser}
      />

      {/* Delete confirmation */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        size="sm"
      >
        <p className="text-sm text-foreground mb-2">
          Are you sure you want to delete{" "}
          <strong>{deleteTarget?.name}</strong>?
        </p>
        <p className="text-sm text-muted mb-6">
          This action cannot be undone.
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
            Delete User
          </Button>
        </div>
      </Modal>
    </>
  );
}
