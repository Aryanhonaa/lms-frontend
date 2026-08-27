import { getApiBaseUrl } from "@/lib/env";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiErrorResponse;
    throw new ApiClientError(
      response.status,
      errorPayload.error?.message ?? "Request failed",
      errorPayload.error?.code ?? "REQUEST_FAILED",
    );
  }

  return payload.data;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function apiUpload<T>(path: string, body: FormData): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
    body,
  });
  return parseResponse<T>(response);
}
