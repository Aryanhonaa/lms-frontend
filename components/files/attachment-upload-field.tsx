"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { ApiClientError } from "@/lib/api/client";
import { formatFileSize, uploadTrainerFile } from "@/lib/api/files";
import type { UploadPurpose, UploadedFile } from "@/types/files";

export const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,application/pdf,image/*";

/** Uploads one trainer file to storage and reports the resulting object reference. */
export function AttachmentUploadField({
  dayId,
  purpose,
  disabled,
  uploaded,
  hint = "PDF, Word, PowerPoint, Excel, or images",
  accept = DOCUMENT_ACCEPT,
  onUploaded,
  onUploadingChange,
}: {
  dayId: string;
  purpose: UploadPurpose;
  disabled?: boolean;
  uploaded: UploadedFile | null;
  hint?: string;
  accept?: string;
  onUploaded: (file: UploadedFile | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const lastFileRef = useRef<File | null>(null);

  async function upload(file: File) {
    lastFileRef.current = file;
    setError(null);
    setProgress(0);
    onUploadingChange?.(true);
    const handle = uploadTrainerFile({ file, purpose, dayId }, setProgress);
    cancelRef.current = handle.cancel;
    try {
      onUploaded(await handle.promise);
    } catch (err: unknown) {
      if (!(err instanceof ApiClientError && err.code === "UPLOAD_CANCELLED")) {
        setError(err instanceof ApiClientError ? err.message : "We couldn't upload this file. Please try again.");
      }
    } finally {
      cancelRef.current = null;
      setProgress(null);
      onUploadingChange?.(false);
    }
  }

  if (uploaded) {
    return (
      <div className="rounded-2xl bg-white px-3 py-3 text-sm ring-1 ring-slate-950/5">
        <p className="flex items-center gap-1.5 font-medium text-slate-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {uploaded.fileName}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(uploaded.fileSize)} · Uploaded</p>
        <button
          type="button"
          className="mt-2 text-xs font-medium text-slate-500 hover:text-red-700"
          disabled={disabled}
          onClick={() => onUploaded(null)}
        >
          Replace file
        </button>
      </div>
    );
  }

  return (
    <FileDropZone
      accept={accept}
      hint={hint}
      disabled={disabled}
      progress={progress}
      error={error}
      onFiles={(files) => void upload(files[0]!)}
      onCancel={() => cancelRef.current?.()}
      onRetry={() => (lastFileRef.current ? void upload(lastFileRef.current) : undefined)}
    />
  );
}
