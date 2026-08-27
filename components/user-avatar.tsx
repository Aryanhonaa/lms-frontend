import { formatRoleLabel, initialsFromName, resolvePublicAssetUrl } from "@/lib/user-display";

const SIZE_CLASS = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
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

  if (src) {
    return (
      <span className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-violet-600 ${dim} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${name} profile picture`} className="h-full w-full object-cover" />
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
