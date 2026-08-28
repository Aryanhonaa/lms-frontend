import type { AuthUser } from "@/types/api";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatRoleLabel(role: AuthUser["role"]): string {
  if (role === "SUPER_ADMIN") {
    return "Super Admin";
  }
  if (role === "ADMIN") {
    return "Admin";
  }
  if (role === "TRAINER") {
    return "Trainer";
  }
  return "Trainee";
}

export function resolvePublicAssetUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  const marker = "/uploads/";
  const uploadIndex = url.indexOf(marker);
  if (uploadIndex !== -1) {
    return url.slice(uploadIndex);
  }
  if (typeof window === "undefined") {
    return url;
  }
  try {
    const parsed = new URL(url);
    const pageHost = window.location.hostname;
    const loopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const visitingLan = pageHost !== "localhost" && pageHost !== "127.0.0.1";
    if (loopback && visitingLan) {
      parsed.hostname = pageHost;
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}
