"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { updateAdminUser } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import type { AdminDirectoryUser } from "@/types/admin";
import type { Role } from "@/types/domain";

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition duration-150 hover:border-slate-300 focus-visible:border-violet-400";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition duration-150 hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition duration-150 hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50";

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TRAINER: "Trainer",
  TRAINEE: "Trainee",
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-50 text-violet-700",
  ADMIN: "bg-slate-100 text-slate-700",
  TRAINER: "bg-sky-50 text-sky-800",
  TRAINEE: "bg-emerald-50 text-emerald-800",
};

export const editUserButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition duration-150 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50";

export const USER_UPDATED_MESSAGE = "User updated successfully.";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const editUserFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  email: z.string().trim().pipe(z.email("Please enter a valid email address.")),
  password: z
    .string()
    .optional()
    .refine((value) => !value || value.length >= 8, "Password must be at least 8 characters")
    .refine((value) => !value || value.length <= 128, "Password is too long"),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

function updateError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 409 || error.code === "CONFLICT") {
      return "An account with this email already exists.";
    }
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return "You don't have permission to edit this account.";
    }
    if (error.message.includes("Route not found")) {
      return "User update is unavailable on this server. Deploy the latest backend and try again.";
    }
    if (error.message) {
      return error.message;
    }
    if (error.status === 404 || error.code === "NOT_FOUND") {
      return "User not found.";
    }
  }
  return "Unable to update this user. Please try again.";
}

export function EditUserDialog({
  user,
  onClose,
  onUpdated,
}: {
  user: EditableUser | null;
  onClose: () => void;
  onUpdated: (user: AdminDirectoryUser) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    reset({ name: user.name, email: user.email, password: "" });
    setShowPassword(false);
  }, [user, reset]);

  function close() {
    if (isSubmitting) {
      return;
    }
    onClose();
  }

  async function onSubmit(values: EditUserFormValues) {
    if (!user) {
      return;
    }

    try {
      const payload = await updateAdminUser(user.id, {
        name: values.name,
        email: values.email,
        ...(values.password?.trim() ? { password: values.password.trim() } : {}),
      });
      onUpdated(payload.user);
      onClose();
    } catch (error) {
      setError("root", { message: updateError(error) });
    }
  }

  return (
    <Dialog open={Boolean(user)} title="Edit User" onClose={close}>
      {user ? (
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${ROLE_BADGE[user.role] ?? "bg-slate-50 text-slate-600"}`}
          >
            {ROLE_LABEL[user.role]}
          </span>
          <span className="text-xs text-slate-500">Role cannot be changed here</span>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block text-sm font-medium text-slate-800">
          Full name
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
          New password
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              className={`${fieldClass} pr-11 placeholder:text-slate-400`}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition duration-150 hover:text-violet-700"
              onClick={() => setShowPassword((open) => !open)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <span className="mt-1 block text-sm text-red-700">{errors.password.message}</span> : null}
          <span className="mt-1 block text-xs text-slate-500">Set a new password only when you want to reset it.</span>
        </label>

        {errors.root ? <p className="text-sm text-red-700">{errors.root.message}</p> : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={close} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass} disabled={isSubmitting || !user}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
