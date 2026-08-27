import { getApiBaseUrl } from "@/lib/env";
import { ApiClientError } from "@/lib/api/client";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";

export type UploadedVideo = {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export function uploadTrainerVideo(file: File, onProgress?: (percent: number) => void): Promise<UploadedVideo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiBaseUrl()}/trainer/uploads/video`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as ApiResponse<UploadedVideo> | ApiErrorResponse;
        if (xhr.status >= 200 && xhr.status < 300 && "success" in payload && payload.success) {
          resolve(payload.data);
          return;
        }
        const errorPayload = payload as ApiErrorResponse;
        reject(
          new ApiClientError(
            xhr.status,
            errorPayload.error?.message ?? "Upload failed",
            errorPayload.error?.code ?? "REQUEST_FAILED",
          ),
        );
      } catch {
        reject(new ApiClientError(xhr.status, "Upload failed", "REQUEST_FAILED"));
      }
    };

    xhr.onerror = () => {
      reject(new ApiClientError(0, "Upload failed", "REQUEST_FAILED"));
    };

    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}
