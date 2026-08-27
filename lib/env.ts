const DEFAULT_API_URL = "http://localhost:5000/api/v1";

export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

  if (typeof window === "undefined") {
    return configured;
  }

  try {
    const apiUrl = new URL(configured);
    const pageHost = window.location.hostname;
    const loopback = apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1";
    const visitingLan = pageHost !== "localhost" && pageHost !== "127.0.0.1";
    if (loopback && visitingLan) {
      apiUrl.hostname = pageHost;
      return apiUrl.toString().replace(/\/$/, "");
    }
  } catch {
    return configured;
  }

  return configured;
}
