"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { UserRole } from "@/types";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface UserData {
  _id: Id<"users">;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserData;
}

export default function UserForm({ isOpen, onClose, user }: UserFormProps) {
  const createUser = useMutation(api.users.createUser);
  const updateRole = useMutation(api.users.updateUserRole);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setMustChangePassword(user.mustChangePassword);
    } else {
      setName("");
      setEmail("");
      setRole("staff");
      setMustChangePassword(true);
    }
    setError("");
  }, [user, isOpen]);

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isEditing) {
        // Update user role
        await updateRole({
          userId: user._id,
          role,
        });
      } else {
        // Create new user
        await createUser({
          name: name.trim(),
          email: email.trim(),
          role,
          mustChangePassword,
        });
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save user";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit User" : "Add User"}
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-danger-light text-danger text-sm">
            {error}
          </div>
        )}

        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          disabled={isEditing}
          required
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={isEditing}
          required
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="admin">Administrator</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="readonly">Read Only</option>
          </select>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mustChangePassword"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label
              htmlFor="mustChangePassword"
              className="text-sm text-foreground"
            >
              Must change password on first login
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={saving}
            onClick={handleSubmit}
          >
            {isEditing ? "Update" : "Create User"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
