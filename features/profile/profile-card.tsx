"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { uploadProfilePicture } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { secondaryButtonClass } from "@/lib/ui/form-classes";
import { formatRoleLabel } from "@/lib/user-display";
import { useAuth } from "@/providers/auth-provider";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

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
    if (!ACCEPTED_TYPES.has(file.type)) {
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
    <section className="max-w-2xl bg-white">
      <div className="flex flex-col gap-6 border-b border-stone-100 px-5 py-6 sm:flex-row sm:items-center">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-stone-950">Profile picture</h2>
          <p className="mt-1 text-sm text-stone-600">
            This is the only detail you can change. JPG, PNG, or WEBP, up to 5 MB.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
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
              <Camera className="mr-2 h-4 w-4" />
              {user.avatarUrl ? (busy ? "Uploading…" : "Change photo") : busy ? "Uploading…" : "Add photo"}
            </button>
          </div>
          {notice ? <p className="mt-2 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>

      <dl className="divide-y divide-stone-100">
        {fields.map((field) => (
          <div key={field.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline">
            <dt className="text-xs font-medium tracking-wide text-stone-500 uppercase">{field.label}</dt>
            <dd className="text-sm text-stone-900">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
