import { apiClient, ApiClientError } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/env";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";
import type {
  AttachmentView,
  CurriculumFileItemType,
  FileAccess,
  UploadPurpose,
  UploadedFile,
} from "@/types/files";

export type UploadHandle = {
  promise: Promise<UploadedFile>;
  cancel: () => void;
};

type UploadTicket = {
  direct: boolean;
  key: string | null;
  upload: { url: string; method: "PUT"; headers: Record<string, string>; expiresAt: string } | null;
};

function xhrUpload<T>(
  url: string,
  body: FormData,
  onProgress?: (percent: number) => void,
): { promise: Promise<T>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as ApiResponse<T> | ApiErrorResponse;
        if (xhr.status >= 200 && xhr.status < 300 && "success" in payload && payload.success) {
          resolve(payload.data);
          return;
        }
        const errorPayload = payload as ApiErrorResponse;
        reject(
          new ApiClientError(
            xhr.status,
            errorPayload.error?.message ?? "We couldn't upload this file. Please try again.",
            errorPayload.error?.code ?? "REQUEST_FAILED",
          ),
        );
      } catch {
        reject(new ApiClientError(xhr.status, "We couldn't upload this file. Please try again.", "REQUEST_FAILED"));
      }
    };
    xhr.onerror = () =>
      reject(new ApiClientError(0, "Network problem while uploading. Please try again.", "NETWORK_ERROR"));
    xhr.onabort = () => reject(new ApiClientError(0, "Upload cancelled.", "UPLOAD_CANCELLED"));
    xhr.send(body);
  });

  return { promise, cancel: () => xhr.abort() };
}

function putDirect(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): { promise: Promise<void>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new ApiClientError(xhr.status, "We couldn't upload this file. Please try again.", "UPLOAD_FAILED"));
    };
    xhr.onerror = () =>
      reject(new ApiClientError(0, "Network problem while uploading. Please try again.", "NETWORK_ERROR"));
    xhr.onabort = () => reject(new ApiClientError(0, "Upload cancelled.", "UPLOAD_CANCELLED"));
    xhr.send(file);
  });

  return { promise, cancel: () => xhr.abort() };
}

/**
 * Uploads trainer content. Large files go straight to storage with a short-lived
 * server-issued URL; otherwise the file is streamed through the API.
 */
export function uploadTrainerFile(
  input: { file: File; purpose: UploadPurpose; dayId: string; contentId?: string },
  onProgress?: (percent: number) => void,
): UploadHandle {
  let cancelInner: (() => void) | null = null;
  let cancelled = false;

  const promise = (async (): Promise<UploadedFile> => {
    let ticket: UploadTicket | null = null;
    try {
      ticket = await apiClient<UploadTicket>("/trainer/uploads/tickets", {
        method: "POST",
        body: {
          purpose: input.purpose,
          dayId: input.dayId,
          contentId: input.contentId,
          fileName: input.file.name,
          mimeType: input.file.type || "application/octet-stream",
          fileSize: input.file.size,
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 400) {
        throw error;
      }
      ticket = null;
    }

    if (cancelled) {
      throw new ApiClientError(0, "Upload cancelled.", "UPLOAD_CANCELLED");
    }

    if (ticket?.direct && ticket.upload && ticket.key) {
      try {
        const direct = putDirect(ticket.upload.url, input.file, ticket.upload.headers, onProgress);
        cancelInner = direct.cancel;
        await direct.promise;
        return apiClient<{ file: UploadedFile }>("/trainer/uploads/confirm", {
          method: "POST",
          body: {
            key: ticket.key,
            dayId: input.dayId,
            fileName: input.file.name,
            mimeType: input.file.type || "application/octet-stream",
            fileSize: input.file.size,
          },
        }).then((payload) => payload.file);
      } catch (error) {
        if (error instanceof ApiClientError && error.code === "UPLOAD_CANCELLED") {
          throw error;
        }
        cancelInner = null;
      }
    }

    const body = new FormData();
    body.append("file", input.file);
    body.append("purpose", input.purpose);
    body.append("dayId", input.dayId);
    if (input.contentId) {
      body.append("contentId", input.contentId);
    }
    const request = xhrUpload<{ file: UploadedFile }>(`${getApiBaseUrl()}/trainer/uploads/files`, body, onProgress);
    cancelInner = request.cancel;
    const payload = await request.promise;
    return payload.file;
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      cancelInner?.();
    },
  };
}

export function uploadAttachment(
  target: { kind: "lesson" | "assignment"; id: string },
  file: File,
  title?: string,
  onProgress?: (percent: number) => void,
): { promise: Promise<AttachmentView>; cancel: () => void } {
  const body = new FormData();
  body.append("file", file);
  if (title) {
    body.append("title", title);
  }
  const path =
    target.kind === "lesson"
      ? `/trainer/lessons/${target.id}/attachments`
      : `/trainer/assignments/${target.id}/attachments`;
  const request = xhrUpload<{ attachment: AttachmentView }>(`${getApiBaseUrl()}${path}`, body, onProgress);
  return { promise: request.promise.then((payload) => payload.attachment), cancel: request.cancel };
}

export async function listLessonAttachments(lessonId: string): Promise<{ attachments: AttachmentView[] }> {
  return apiClient<{ attachments: AttachmentView[] }>(`/trainer/lessons/${lessonId}/attachments`);
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient(`/trainer/attachments/${attachmentId}`, { method: "DELETE" });
}

export type FileAudience = "trainer" | "trainee" | "admin";

export async function getAttachmentAccess(
  role: FileAudience,
  attachmentId: string,
  batchId?: string,
): Promise<FileAccess> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  return apiClient<FileAccess>(`/${role}/attachments/${attachmentId}/file${query}`);
}

export async function getItemFileAccess(
  role: FileAudience,
  itemType: CurriculumFileItemType,
  itemId: string,
  batchId?: string,
): Promise<FileAccess> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  return apiClient<FileAccess>(`/${role}/items/${itemType}/${itemId}/file${query}`);
}

export async function getSubmissionFileAccess(
  role: "trainer" | "trainee",
  submissionId: string,
  fileId: string,
): Promise<FileAccess> {
  return apiClient<FileAccess>(`/${role}/submissions/${submissionId}/files/${fileId}/access`);
}

/** Resolves a file access payload to a URL the browser can open. */
export function resolveAccessUrl(access: FileAccess): string {
  if (access.strategy === "signed" || access.url.startsWith("http")) {
    return access.url;
  }
  const base = getApiBaseUrl().replace(/\/api\/v1$/, "");
  return `${base}${access.url}`;
}

/**
 * Streamed files come from the API on another origin, so they are fetched with the
 * session cookie and handed to the browser as a blob URL. Signed URLs are used as-is.
 */
export async function objectUrlFromAccess(access: FileAccess): Promise<string> {
  if (access.strategy === "signed") {
    return access.url;
  }
  const response = await fetch(resolveAccessUrl(access), { credentials: "include" });
  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      response.status === 403 ? "You don't have access to this file." : "This file is currently unavailable.",
      "REQUEST_FAILED",
    );
  }
  return URL.createObjectURL(await response.blob());
}

export async function openFromAccess(access: FileAccess): Promise<void> {
  const url = await objectUrlFromAccess(access);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function downloadFromAccess(access: FileAccess): Promise<void> {
  const url = resolveAccessUrl(access);
  const response = await fetch(access.strategy === "signed" ? url : `${url}?download=1`, {
    credentials: access.strategy === "signed" ? "omit" : "include",
  });
  if (!response.ok) {
    throw new ApiClientError(response.status, "This file is currently unavailable.", "REQUEST_FAILED");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = access.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
