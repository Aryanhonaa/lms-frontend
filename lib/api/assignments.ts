import { apiClient } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/env";
import { ApiClientError } from "@/lib/api/client";
import { trainerScopeQuery, type TrainerWorkScope } from "@/lib/api/scope";
import type {
  AssignmentCatalog,
  SubmissionFileView,
  TrainerAssignmentDetail,
  TrainerAssignmentSummary,
  TrainerRosterRow,
  TrainerSubmission,
} from "@/types/assignment";

export async function listTraineeAssignments(): Promise<{ assignments: AssignmentCatalog[] }> {
  return apiClient<{ assignments: AssignmentCatalog[] }>("/trainee/assignments");
}

export async function getTraineeAssignment(id: string, batchId?: string): Promise<AssignmentCatalog> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  return apiClient<AssignmentCatalog>(`/trainee/assignments/${id}${query}`);
}

export async function saveAssignmentSubmission(
  id: string,
  body: string,
  submit = true,
  batchId?: string,
): Promise<{ submission: AssignmentCatalog["submission"]; catalog?: AssignmentCatalog }> {
  return apiClient<{ submission: AssignmentCatalog["submission"]; catalog?: AssignmentCatalog }>(
    `/trainee/assignments/${id}/submissions`,
    {
      method: "POST",
      body: { body, submit, batchId },
    },
  );
}

/** Uploads one submission file with progress reporting and cancellation support. */
export function uploadSubmissionFile(
  submissionId: string,
  file: File,
  onProgress?: (percent: number) => void,
): { promise: Promise<{ file: SubmissionFileView }>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ file: SubmissionFileView }>((resolve, reject) => {
    xhr.open("POST", `${getApiBaseUrl()}/trainee/submissions/${submissionId}/files`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          success: boolean;
          data?: { file: SubmissionFileView };
          error?: { message: string; code: string };
        };
        if (xhr.status >= 200 && xhr.status < 300 && payload.success && payload.data) {
          resolve(payload.data);
          return;
        }
        reject(
          new ApiClientError(
            xhr.status,
            payload.error?.message ?? "Unable to upload the file.",
            payload.error?.code ?? "REQUEST_FAILED",
          ),
        );
      } catch {
        reject(new ApiClientError(xhr.status, "Unable to upload the file.", "REQUEST_FAILED"));
      }
    };
    xhr.onerror = () =>
      reject(new ApiClientError(0, "Network problem while uploading. Please try again.", "NETWORK_ERROR"));
    xhr.onabort = () => reject(new ApiClientError(0, "Upload cancelled.", "UPLOAD_CANCELLED"));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });

  return { promise, cancel: () => xhr.abort() };
}

export async function deleteSubmissionFile(submissionId: string, fileId: string): Promise<void> {
  await apiClient(`/trainee/submissions/${submissionId}/files/${fileId}`, { method: "DELETE" });
}

export async function downloadSubmissionFile(
  role: "trainee" | "trainer",
  submissionId: string,
  fileId: string,
  fileName: string,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/${role}/submissions/${submissionId}/files/${fileId}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiClientError(response.status, "Unable to download that file.", "REQUEST_FAILED");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function listTrainerAssignments(scope?: TrainerWorkScope): Promise<{ assignments: TrainerAssignmentSummary[] }> {
  return apiClient<{ assignments: TrainerAssignmentSummary[] }>(`/trainer/assignments${trainerScopeQuery(scope)}`);
}

export async function getTrainerAssignment(
  id: string,
  scope?: TrainerWorkScope,
): Promise<{
  assignment: TrainerAssignmentDetail & { maxAttempts?: number; allowFileUpload?: boolean; instructions?: string };
  submissions: TrainerSubmission[];
  roster: TrainerRosterRow[];
}> {
  return apiClient(`/trainer/assignments/${id}${trainerScopeQuery(scope)}`);
}

export async function reviewAssignmentSubmission(
  id: string,
  input: { status: "GRADED" | "CHANGES_REQUESTED" | "COMPLETED"; score?: number | null; comment?: string },
): Promise<{ submission: TrainerSubmission }> {
  return apiClient(`/trainer/submissions/${id}/review`, { method: "POST", body: input });
}
