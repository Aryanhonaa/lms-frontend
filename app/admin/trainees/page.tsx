"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/page-header";
import {
  CreateUserDialog,
  addUserButtonClass,
  createUserSuccessMessage,
} from "@/features/admin/create-user-dialog";
import {
  DeleteUserDialog,
  USER_DELETED_MESSAGE,
  USER_DELETED_NOTICE_KEY,
  deleteUserButtonClass,
  type DeletableUser,
} from "@/features/admin/delete-user-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useAdminChrome } from "@/components/admin-shell";
import { listAdminTrainees } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { canDeleteRole } from "@/lib/auth/create-user-schema";
import type { AdminDirectoryUser } from "@/types/admin";

export default function AdminTraineesPage() {
  const { user } = useAuth();
  const { searchQuery } = useAdminChrome();
  const [trainees, setTrainees] = useState<AdminDirectoryUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeletableUser | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (sessionStorage.getItem(USER_DELETED_NOTICE_KEY) === "1") {
        sessionStorage.removeItem(USER_DELETED_NOTICE_KEY);
        setSuccess(USER_DELETED_MESSAGE);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    listAdminTrainees()
      .then((payload) => {
        setTrainees(payload.trainees);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load trainees.");
      });
  }, []);

  const visible = useMemo(() => {
    if (!trainees) {
      return [];
    }
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return trainees;
    }
    return trainees.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(needle));
  }, [searchQuery, trainees]);

  return (
    <>
      <AdminPageHeader
        title="Trainees"
        subtitle="People with trainee accounts."
        actions={
          user ? (
            <button type="button" className={addUserButtonClass} onClick={() => setCreateOpen(true)}>
              + Add User
            </button>
          ) : null
        }
      />
      {success ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">{success}</p>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {trainees === null && !error ? <LoadingState label="Loading trainees..." /> : null}
      {trainees && visible.length === 0 ? (
        <EmptyState title="No trainees found" description="Try a different search." />
      ) : null}
      {visible.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <ul className="divide-y divide-slate-100">
            {visible.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <Link href={`/admin/trainees/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-sm font-semibold text-violet-700">
                    {item.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0] ?? "")
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="truncate text-sm text-slate-500">{item.email}</p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-slate-500">{item.enrollmentCount ?? 0} programs</span>
                  {user && canDeleteRole(user.role, "TRAINEE") && user.id !== item.id ? (
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
          defaultRole="TRAINEE"
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            if (created.role === "TRAINEE") {
              setTrainees((current) =>
                current ? [...current, { ...created, enrollmentCount: 0 }] : [{ ...created, enrollmentCount: 0 }],
              );
            }
            setSuccess(createUserSuccessMessage(created.role));
            setCreateOpen(false);
          }}
        />
      ) : null}
      <DeleteUserDialog
        user={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={(userId) => {
          setTrainees((current) => current?.filter((row) => row.id !== userId) ?? null);
          setSuccess(USER_DELETED_MESSAGE);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
