"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/page-header";
import {
  CreateUserDialog,
  addUserButtonClass,
  createUserSuccessMessage,
} from "@/features/admin/create-user-dialog";
import {
  DeleteUserDialog,
  USER_DELETED_MESSAGE,
  deleteUserButtonClass,
  type DeletableUser,
} from "@/features/admin/delete-user-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { getAdminUsers } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { useAdminChrome } from "@/components/admin-shell";
import { useAuth } from "@/providers/auth-provider";
import { canDeleteRole, type CreatableRole } from "@/lib/auth/create-user-schema";
import type { AdminUsersResponse } from "@/types/api";
import type { Role } from "@/types/domain";

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-50 text-violet-700",
  ADMIN: "bg-slate-100 text-slate-700",
  TRAINER: "bg-sky-50 text-sky-800",
  TRAINEE: "bg-emerald-50 text-emerald-800",
};

function UsersDirectory() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { searchQuery } = useAdminChrome();
  const roleFilter = searchParams.get("role") as Role | null;
  const [users, setUsers] = useState<AdminUsersResponse["users"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeletableUser | null>(null);

  useEffect(() => {
    getAdminUsers()
      .then((payload) => {
        setUsers(payload.users);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load users");
      });
  }, []);

  const visible = useMemo(() => {
    if (!users) {
      return [];
    }
    return users.filter((item) => {
      if (roleFilter && item.role !== roleFilter) {
        return false;
      }
      const needle = searchQuery.trim().toLowerCase();
      if (!needle) {
        return true;
      }
      return `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(needle);
    });
  }, [roleFilter, searchQuery, users]);

  const title =
    roleFilter === "ADMIN"
      ? "Admins"
      : roleFilter === "TRAINER"
        ? "Trainers"
        : roleFilter === "TRAINEE"
          ? "Trainees"
          : "Users";
  const addLabel =
    roleFilter === "ADMIN"
      ? "+ Add Admin"
      : roleFilter === "TRAINER"
        ? "+ Add Trainer"
        : roleFilter === "TRAINEE"
          ? "+ Add Trainee"
          : "+ Add User";
  const subtitle =
    roleFilter === "ADMIN"
      ? "Platform admins who can review programs and manage trainers and trainees."
      : "People with access to the platform.";
  const defaultRole: CreatableRole | undefined =
    roleFilter === "TRAINER" || roleFilter === "TRAINEE" || roleFilter === "ADMIN" ? roleFilter : undefined;

  return (
    <>
      <AdminPageHeader
        title={title}
        subtitle={subtitle}
        actions={
          user ? (
            <button type="button" className={addUserButtonClass} onClick={() => setCreateOpen(true)}>
              {addLabel}
            </button>
          ) : null
        }
      />
      {success ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">{success}</p>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {users === null && !error ? <LoadingState /> : null}
      {users && visible.length === 0 ? (
        <EmptyState title="No people found" description="Try a different filter or search." />
      ) : null}
      {visible.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <ul className="divide-y divide-slate-100">
            {visible.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-sm font-semibold text-violet-700">
                    {item.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0] ?? "")
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${ROLE_BADGE[item.role] ?? "bg-slate-50 text-slate-600"}`}
                  >
                    {item.role.replaceAll("_", " ")}
                  </span>
                  {user && canDeleteRole(user.role, item.role) && user.id !== item.id ? (
                    <button type="button" className={deleteUserButtonClass} onClick={() => setPendingDelete(item)}>
                      Delete User
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {user ? (
        <CreateUserDialog
          open={createOpen}
          actorRole={user.role}
          defaultRole={defaultRole}
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setUsers((current) => {
              const row = {
                id: created.id,
                name: created.name,
                email: created.email,
                role: created.role as Role,
                createdAt: created.createdAt,
                isActive: created.isActive,
                updatedAt: created.updatedAt,
              };
              return current ? [...current, row] : [row];
            });
            setSuccess(createUserSuccessMessage(created.role));
            setCreateOpen(false);
          }}
        />
      ) : null}
      <DeleteUserDialog
        user={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={(userId) => {
          setUsers((current) => current?.filter((row) => row.id !== userId) ?? null);
          setSuccess(USER_DELETED_MESSAGE);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UsersDirectory />
    </Suspense>
  );
}
