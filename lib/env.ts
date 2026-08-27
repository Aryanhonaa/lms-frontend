const DEFAULT_API_URL = "http://localhost:5000/api/v1";

export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

  // Browser calls same-origin /api/v1 so the session cookie is first-party.
  // next.config.ts rewrites that path to NEXT_PUBLIC_API_URL.
  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  return configured;
}
