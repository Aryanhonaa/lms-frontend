"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ApiClientError } from "@/lib/api/client";
import { deleteAdminUser } from "@/lib/api/admin";
import type { Role } from "@/types/domain";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50";

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TRAINER: "Trainer",
  TRAINEE: "Trainee",
};

export const deleteUserButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition duration-150 hover:bg-red-50 disabled:opacity-50";

export const USER_DELETED_MESSAGE = "User deleted successfully.";
export const USER_DELETED_NOTICE_KEY = "lms-admin-user-deleted";

export type DeletableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const BLOCKER_HINTS: Record<string, string> = {
  "This user created programs and cannot be deleted.":
    "Courses keep their original author. Delete those courses first (only if they have no enrollments), then try again.",
  "This user posted announcements and cannot be deleted.":
    "Remove those announcements first, then try again.",
  "This user issued certificates and cannot be deleted.":
    "Certificates keep the trainer who issued them. This account cannot be deleted while those certificates exist.",
  "This user marked attendance records and cannot be deleted.":
    "Attendance records keep the person who marked them.",
  "This user assigned individual requirements and cannot be deleted.":
    "Extra requirements keep the trainer who assigned them.",
};

function deletionError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 404 || error.code === "NOT_FOUND") {
      return "User not found.";
    }
    const hint = BLOCKER_HINTS[error.message];
    return hint ? `${error.message} ${hint}` : error.message;
  }
  return "Unable to delete this user. Please try again.";
}

export function DeleteUserDialog({
  user,
  onClose,
  onDeleted,
}: {
  user: DeletableUser | null;
  onClose: () => void;
  onDeleted: (userId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) {
      return;
    }
    setError(null);
    onClose();
  }

  function confirm() {
    if (!user || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    deleteAdminUser(user.id)
      .then(() => {
        onDeleted(user.id);
        setError(null);
        onClose();
      })
      .catch((err: unknown) => {
        setError(deletionError(err));
      })
      .finally(() => {
        setBusy(false);
      });
  }

  return (
    <Dialog open={Boolean(user)} title="Delete User?" onClose={close}>
      <p className="text-sm text-slate-600">
        Are you sure you want to permanently delete this user? This action cannot be undone.
      </p>
      {user ? (
        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Name</dt>
            <dd className="font-medium text-slate-900">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Email</dt>
            <dd className="text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Role</dt>
            <dd className="text-slate-800">{ROLE_LABEL[user.role]}</dd>
          </div>
        </dl>
      ) : null}
      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
        <p className="font-medium">This account cannot be deleted if they:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
          <li>Created any course</li>
          <li>Posted announcements</li>
          <li>Are the trainer on issued certificates</li>
          <li>Marked attendance</li>
          <li>Assigned extra requirements</li>
        </ul>
        <p className="mt-2 text-amber-900">
          Unused accounts can be deleted. Deleting a trainee removes their enrollments; the course and other
          trainees stay. There is no transfer of course ownership.
        </p>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={close}>
          Cancel
        </button>
        <button type="button" className={dangerButtonClass} disabled={busy || !user} onClick={confirm}>
          {busy ? "Deleting…" : "Delete User"}
        </button>
      </div>
    </Dialog>
  );
}
