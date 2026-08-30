"use client";

import { useEffect, useState } from "react";
import { formatRoleLabel, initialsFromName, resolvePublicAssetUrl } from "@/lib/user-display";

const SIZE_CLASS = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  row: "h-10 w-10 text-sm",
  lg: "h-24 w-24 text-2xl",
} as const;

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function UserAvatar({ name, avatarUrl, size = "md", className = "" }: UserAvatarProps) {
  const src = resolvePublicAssetUrl(avatarUrl);
  const dim = SIZE_CLASS[size];
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <span className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-violet-600 ${dim} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={`${name} profile picture`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-violet-600 font-semibold text-white ${dim} ${className}`}
      aria-hidden="true"
    >
      {initialsFromName(name)}
    </span>
  );
}

export { formatRoleLabel };
