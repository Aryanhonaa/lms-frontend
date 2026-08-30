"use client";

import { useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { uploadProfilePicture } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { formatRoleLabel } from "@/lib/user-display";
import { useAuth } from "@/providers/auth-provider";

const CARD =
  "rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition duration-150 hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_NAME = /\.(jpe?g|png|webp)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

function isAcceptedImage(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) {
    return true;
  }
  return !file.type && ACCEPTED_NAME.test(file.name);
}

function formatJoined(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function ProfileCard() {
  const { user, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function onFileChange(file: File | undefined) {
    if (!file) {
      return;
    }
    if (!isAcceptedImage(file)) {
      setError("Use a JPG, PNG, or WEBP image.");
      setNotice(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Profile picture must be 5 MB or smaller.");
      setNotice(null);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await uploadProfilePicture(file);
      updateUser(payload.user);
      setNotice("Profile picture updated.");
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to upload profile picture");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const fields = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: formatRoleLabel(user.role) },
    { label: "Member since", value: formatJoined(user.createdAt) },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className={CARD}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <UserRound className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Profile picture</h2>
            <p className="text-sm text-slate-500">The only detail you can update on your account.</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 px-6 py-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="lg"
              className="ring-4 ring-violet-50 ring-offset-2 ring-offset-white"
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold tracking-tight text-slate-900">{user.name}</p>
            <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
            <span className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-medium tracking-wide text-violet-700 uppercase">
              {formatRoleLabel(user.role)}
            </span>

            <div className="mt-5 flex flex-col items-center gap-2 sm:items-start">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  void onFileChange(event.target.files?.[0]);
                }}
              />
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" strokeWidth={1.75} />
                {user.avatarUrl ? (busy ? "Uploading…" : "Change photo") : busy ? "Uploading…" : "Add photo"}
              </button>
              <span className="text-xs text-slate-500">JPG, PNG, or WEBP · up to 5 MB</span>
            </div>

            {notice ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100">{error}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className={CARD}>
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-base font-semibold text-slate-900">Account details</h2>
          <p className="mt-1 text-sm text-slate-500">Your account information is managed by your organization.</p>
        </div>

        <dl className="divide-y divide-slate-100">
          {fields.map((field) => (
            <div
              key={field.label}
              className="grid gap-1 px-6 py-4 transition duration-150 hover:bg-slate-50/60 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
            >
              <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">{field.label}</dt>
              <dd className="text-sm font-medium text-slate-900">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
