"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Award,
  BookOpen,
  Camera,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutGrid,
  Megaphone,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UserAvatar } from "@/components/user-avatar";
import { AdminPageHeader } from "@/features/admin/page-header";
import { changePassword, updateProfile, uploadProfilePicture } from "@/lib/api/auth";
import { getAdminDashboard, getOperationsDashboard } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import { formatRoleLabel } from "@/lib/user-display";
import { useAuth } from "@/providers/auth-provider";
import type { AdminDashboardMetrics, OperationsMetrics } from "@/types/admin";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition duration-150 hover:border-slate-300 focus-visible:border-violet-400";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition duration-150 hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition duration-150 hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

const SUPER_ADMIN_ACTIONS = [
  {
    href: "/admin/approvals",
    label: "Review approvals",
    description: "Check submitted course materials",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/users",
    label: "Manage users",
    description: "Create and manage platform accounts",
    icon: Users,
  },
  {
    href: "/admin/announcements",
    label: "Post announcement",
    description: "Broadcast updates to the platform",
    icon: Megaphone,
  },
  {
    href: "/admin/certificates",
    label: "View certificates",
    description: "Browse issued completion records",
    icon: Award,
  },
] as const;

const ADMIN_ACTIONS = [
  {
    href: "/admin/approvals",
    label: "Review approvals",
    description: "Check submitted course materials",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/courses",
    label: "View programs",
    description: "Browse courses across the platform",
    icon: BookOpen,
  },
  {
    href: "/admin/trainers",
    label: "Manage trainers",
    description: "View trainer accounts and activity",
    icon: GraduationCap,
  },
  {
    href: "/admin/trainees",
    label: "Manage trainees",
    description: "View trainee accounts and progress",
    icon: Users,
  },
] as const;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

function formatJoined(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function WorkspaceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
    </div>
  );
}

function PasswordField({
  label,
  visible,
  onToggle,
  error,
  registration,
}: {
  label: string;
  visible: boolean;
  onToggle: () => void;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm<PasswordFormValues>>["register"]>;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          autoComplete={label === "Current password" ? "current-password" : "new-password"}
          className={`${fieldClass} pr-11`}
          {...registration}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition duration-150 hover:text-violet-700"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <span className="mt-1 block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

export function AdminSettings() {
  const { user, updateUser } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [superMetrics, setSuperMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [adminMetrics, setAdminMetrics] = useState<OperationsMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name });
    }
  }, [user, profileForm]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loader = user.role === "SUPER_ADMIN" ? getAdminDashboard() : getOperationsDashboard();
    loader
      .then((payload) => {
        if (user.role === "SUPER_ADMIN") {
          setSuperMetrics(payload.dashboard.metrics as AdminDashboardMetrics);
          setAdminMetrics(null);
        } else {
          setAdminMetrics(payload.dashboard.metrics as OperationsMetrics);
          setSuperMetrics(null);
        }
        setMetricsError(null);
      })
      .catch((err: unknown) => {
        setMetricsError(err instanceof ApiClientError ? err.message : "Unable to load workspace summary");
      });
  }, [user]);

  if (!user) {
    return null;
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file) {
      return;
    }
    if (!ACCEPTED_TYPES.has(file.type)) {
      setAvatarError("Use a JPG, PNG, or WEBP image.");
      setAvatarNotice(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setAvatarError("Profile picture must be 5 MB or smaller.");
      setAvatarNotice(null);
      return;
    }

    setAvatarBusy(true);
    setAvatarError(null);
    setAvatarNotice(null);
    try {
      const payload = await uploadProfilePicture(file);
      updateUser(payload.user);
      setAvatarNotice("Profile picture updated.");
    } catch (err: unknown) {
      setAvatarError(err instanceof ApiClientError ? err.message : "Unable to upload profile picture");
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function onProfileSubmit(values: ProfileFormValues) {
    setProfileNotice(null);
    setProfileError(null);
    try {
      const payload = await updateProfile(values.name);
      updateUser(payload.user);
      setProfileNotice("Display name updated.");
    } catch (err: unknown) {
      setProfileError(err instanceof ApiClientError ? err.message : "Unable to update profile");
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    setPasswordNotice(null);
    setPasswordError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      setPasswordNotice("Password updated.");
    } catch (err: unknown) {
      setPasswordError(err instanceof ApiClientError ? err.message : "Unable to change password");
    }
  }

  const readOnlyFields = [
    { label: "Email", value: user.email },
    { label: "Role", value: formatRoleLabel(user.role) },
    { label: "Member since", value: formatJoined(user.createdAt) },
    { label: "Account ID", value: user.id },
  ];

  const quickActions = isSuperAdmin ? SUPER_ADMIN_ACTIONS : ADMIN_ACTIONS;
  const roleLabel = isSuperAdmin ? "super admin" : "admin";

  const profileSection = (
    <section className={CARD}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <UserRound className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Profile</h2>
          <p className="text-sm text-slate-500">Update how you appear across Learn Lab.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-4 sm:flex-row lg:w-[280px] lg:shrink-0 lg:flex-col lg:items-start">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="min-w-0 text-center sm:text-left lg:w-full">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:items-start">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  void onAvatarChange(event.target.files?.[0]);
                }}
              />
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={avatarBusy}
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                {avatarBusy ? "Uploading…" : user.avatarUrl ? "Change photo" : "Add photo"}
              </button>
              <span className="text-xs text-slate-500">JPG, PNG, or WEBP up to 5 MB</span>
            </div>
            {avatarNotice ? <p className="mt-2 text-sm text-emerald-700">{avatarNotice}</p> : null}
            {avatarError ? <p className="mt-2 text-sm text-red-700">{avatarError}</p> : null}
          </div>
        </div>

        <form
          className="min-w-0 flex-1 border-t border-slate-100 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          noValidate
        >
          <label className="block text-sm font-medium text-slate-800">
            Display name
            <input type="text" autoComplete="name" className={fieldClass} {...profileForm.register("name")} />
          </label>
          {profileForm.formState.errors.name ? (
            <p className="mt-1 text-sm text-red-700">{profileForm.formState.errors.name.message}</p>
          ) : null}
          {profileNotice ? <p className="mt-2 text-sm text-emerald-700">{profileNotice}</p> : null}
          {profileError ? <p className="mt-2 text-sm text-red-700">{profileError}</p> : null}
          <button
            type="submit"
            className={`${primaryButtonClass} mt-4`}
            disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}
          >
            {profileForm.formState.isSubmitting ? "Saving…" : "Save name"}
          </button>
        </form>
      </div>
    </section>
  );

  const accountDetailsSection = (
    <section className={CARD}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Account details</h2>
        <p className="mt-1 text-sm text-slate-500">Read-only information for your {roleLabel} account.</p>
      </div>
      <dl className="divide-y divide-slate-100">
        {readOnlyFields.map((field) => (
          <div key={field.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-baseline">
            <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">{field.label}</dt>
            <dd className="break-all text-sm text-slate-900">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  const workspaceSection = (
    <section className={CARD}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <LayoutGrid className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Workspace</h2>
          <p className="text-sm text-slate-500">Live platform snapshot and quick links.</p>
        </div>
      </div>

      <div className="px-5 py-5">
        {metricsError ? (
          <p className="text-sm text-red-700">{metricsError}</p>
        ) : isSuperAdmin && superMetrics ? (
          <div className="grid grid-cols-2 gap-3">
            <WorkspaceStat label="Pending approvals" value={superMetrics.pendingApprovals.total} />
            <WorkspaceStat label="Courses" value={superMetrics.courses.total} />
            <WorkspaceStat label="Trainees" value={superMetrics.trainees.total} />
            <WorkspaceStat label="Trainers" value={superMetrics.trainers.total} />
          </div>
        ) : !isSuperAdmin && adminMetrics ? (
          <div className="grid grid-cols-2 gap-3">
            <WorkspaceStat label="Pending approvals" value={adminMetrics.pendingApprovals} />
            <WorkspaceStat label="Active programs" value={adminMetrics.activePrograms} />
            <WorkspaceStat label="Trainees" value={adminMetrics.trainees} />
            <WorkspaceStat label="Trainers" value={adminMetrics.trainers} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[72px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}

        <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="flex items-center gap-3 px-4 py-3 transition duration-150 hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{action.label}</span>
                    <span className="block text-xs text-slate-500">{action.description}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );

  const securitySection = isSuperAdmin ? (
    <section className={CARD}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Shield className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Security</h2>
          <p className="text-sm text-slate-500">Change your password to keep the account secure.</p>
        </div>
      </div>

      <form className="space-y-4 px-5 py-5" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate>
        <PasswordField
          label="Current password"
          visible={showCurrentPassword}
          onToggle={() => setShowCurrentPassword((open) => !open)}
          error={passwordForm.formState.errors.currentPassword?.message}
          registration={passwordForm.register("currentPassword")}
        />
        <PasswordField
          label="New password"
          visible={showNewPassword}
          onToggle={() => setShowNewPassword((open) => !open)}
          error={passwordForm.formState.errors.newPassword?.message}
          registration={passwordForm.register("newPassword")}
        />
        <PasswordField
          label="Confirm new password"
          visible={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((open) => !open)}
          error={passwordForm.formState.errors.confirmPassword?.message}
          registration={passwordForm.register("confirmPassword")}
        />
        {passwordNotice ? <p className="text-sm text-emerald-700">{passwordNotice}</p> : null}
        {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
        <button type="submit" className={primaryButtonClass} disabled={passwordForm.formState.isSubmitting}>
          {passwordForm.formState.isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  ) : null;

  return (
    <>
      <AdminPageHeader
        title="Settings"
        subtitle={
          isSuperAdmin
            ? "Manage your super admin account and jump to common workspace tasks."
            : "Manage your admin account and jump to common workspace tasks."
        }
      />

      <div className="mx-auto max-w-6xl space-y-6">
        {profileSection}

        {isSuperAdmin ? (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              {accountDetailsSection}
              {securitySection}
            </div>
            {workspaceSection}
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {accountDetailsSection}
            {workspaceSection}
          </div>
        )}
      </div>
    </>
  );
}
