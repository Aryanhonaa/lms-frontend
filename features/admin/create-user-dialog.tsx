"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { ApiClientError } from "@/lib/api/client";
import { createAdminUser } from "@/lib/api/admin";
import {
  createUserFormSchema,
  creatableRolesFor,
  type CreateUserFormValues,
  type CreatableRole,
} from "@/lib/auth/create-user-schema";
import type { AdminDirectoryUser } from "@/types/admin";
import type { Role } from "@/types/domain";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-violet-400";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-violet-600/25 hover:bg-violet-700 disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

const ROLE_LABEL: Record<CreatableRole, string> = {
  ADMIN: "Admin",
  TRAINER: "Trainer",
  TRAINEE: "Trainee",
};

function creationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 409 || error.code === "CONFLICT") {
      return "An account with this email already exists.";
    }
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return "You don't have permission to create this account.";
    }
    if (error.status === 400 || error.code === "BAD_REQUEST") {
      return "Please enter a valid email address.";
    }
  }
  return "Unable to create the account. Please try again.";
}

export function CreateUserDialog({
  open,
  actorRole,
  defaultRole,
  onClose,
  onCreated,
}: {
  open: boolean;
  actorRole: Role;
  defaultRole?: CreatableRole;
  onClose: () => void;
  onCreated: (user: AdminDirectoryUser) => void;
}) {
  const allowedRoles = useMemo(() => creatableRolesFor(actorRole), [actorRole]);
  const initialRole = defaultRole && allowedRoles.includes(defaultRole) ? defaultRole : allowedRoles[0];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { name: "", email: "", role: initialRole ?? "TRAINEE", password: "" },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({ name: "", email: "", role: initialRole ?? "TRAINEE", password: "" });
  }, [initialRole, open, reset]);

  async function onSubmit(values: CreateUserFormValues) {
    if (!allowedRoles.includes(values.role)) {
      setError("role", { message: "You don't have permission to create this account." });
      return;
    }

    try {
      const payload = await createAdminUser(values);
      onCreated(payload.user);
    } catch (error) {
      setError("root", { message: creationError(error) });
    }
  }

  if (allowedRoles.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} title={defaultRole ? `Create ${ROLE_LABEL[defaultRole]}` : "Create User"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block text-sm font-medium text-slate-800">
          Full Name
          <RequiredMark />
          <input className={fieldClass} autoComplete="name" {...register("name")} />
          {errors.name ? <span className="mt-1 block text-sm text-red-700">{errors.name.message}</span> : null}
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Email
          <RequiredMark />
          <input type="email" className={fieldClass} autoComplete="email" {...register("email")} />
          {errors.email ? <span className="mt-1 block text-sm text-red-700">{errors.email.message}</span> : null}
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Role
          <RequiredMark />
          <select className={fieldClass} {...register("role")}>
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          {errors.role ? <span className="mt-1 block text-sm text-red-700">{errors.role.message}</span> : null}
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Password
          <RequiredMark />
          <input type="password" className={fieldClass} autoComplete="new-password" {...register("password")} />
          {errors.password ? <span className="mt-1 block text-sm text-red-700">{errors.password.message}</span> : null}
        </label>
        {errors.root ? <p className="text-sm text-red-700">{errors.root.message}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : defaultRole ? `Create ${ROLE_LABEL[defaultRole]}` : "Create User"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function createUserSuccessMessage(role: string): string {
  if (role === "ADMIN") {
    return "Admin account created successfully.";
  }
  if (role === "TRAINER") {
    return "Trainer account created successfully.";
  }
  if (role === "TRAINEE") {
    return "Trainee account created successfully.";
  }
  return "Account created successfully.";
}

export const addUserButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-violet-600/25 hover:bg-violet-700";
