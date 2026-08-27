const YOUTUBE_HOST = /(?:^|\.)youtube(?:-nocookie)?\.com$/i;
const YOUTU_BE_HOST = /(?:^|\.)youtu\.be$/i;
const PATH_ID_PREFIXES = new Set(["shorts", "embed", "live", "v", "e"]);

function cleanId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const id = value.replace(/[^a-zA-Z0-9_-]/g, "");
  return id.length > 0 ? id : null;
}

export function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();

    if (YOUTU_BE_HOST.test(host)) {
      return cleanId(parsed.pathname.split("/").filter(Boolean)[0]);
    }

    if (!YOUTUBE_HOST.test(host)) {
      return null;
    }

    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) {
      return cleanId(fromQuery);
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && PATH_ID_PREFIXES.has(parts[0].toLowerCase())) {
      return cleanId(parts[1]);
    }

    return null;
  } catch {
    return null;
  }
}

export function isYoutubeShortsUrl(url: string): boolean {
  try {
    return new URL(url.trim()).pathname.toLowerCase().includes("/shorts/");
  } catch {
    return false;
  }
}

export function youtubeEmbedSrc(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}
