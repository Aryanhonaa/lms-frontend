"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { uploadTrainerFile, formatFileSize } from "@/lib/api/files";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, ghostButtonClass } from "@/lib/ui/form-classes";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { RequiredMark } from "@/components/ui/required-mark";

export type VideoDraft = {
  mode: "upload" | "url";
  title: string;
  url: string;
  source: "YOUTUBE" | "UPLOADED" | "EXTERNAL";
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

function sourceFromUrl(url: string): "YOUTUBE" | "EXTERNAL" {
  return /youtu\.be|youtube\.com/i.test(url) ? "YOUTUBE" : "EXTERNAL";
}

export function VideoFields({
  value,
  dayId,
  purpose = "VIDEO",
  accept = "video/mp4,video/webm,video/quicktime",
  hint = "MP4, WebM, or MOV",
  disabled,
  onChange,
  onUploadingChange,
}: {
  value: VideoDraft;
  dayId: string;
  purpose?: "VIDEO" | "REEL";
  accept?: string;
  hint?: string;
  disabled?: boolean;
  onChange: (next: VideoDraft) => void;
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
      const uploaded = await handle.promise;
      onChange({
        ...value,
        mode: "upload",
        source: "UPLOADED",
        url: "",
        fileKey: uploaded.key,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        title: value.title || uploaded.fileName.replace(/\.[^.]+$/, ""),
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === "UPLOAD_CANCELLED") {
        setError(null);
      } else {
        setError(err instanceof ApiClientError ? err.message : "We couldn't upload this file. Please try again.");
      }
    } finally {
      cancelRef.current = null;
      setProgress(null);
      onUploadingChange?.(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${value.mode === "upload" ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-200 bg-white text-slate-700"} rounded-xl border px-3 py-2.5 text-sm font-medium`}
          disabled={disabled || progress !== null}
          onClick={() => onChange({ ...value, mode: "upload", source: "UPLOADED" })}
        >
          Upload file
        </button>
        <button
          type="button"
          className={`${value.mode === "url" ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-200 bg-white text-slate-700"} rounded-xl border px-3 py-2.5 text-sm font-medium`}
          disabled={disabled || progress !== null}
          onClick={() =>
            onChange({
              ...value,
              mode: "url",
              source: sourceFromUrl(value.url),
              fileKey: undefined,
              fileName: undefined,
              fileSize: undefined,
              mimeType: undefined,
            })
          }
        >
          Paste URL
        </button>
      </div>

      {value.mode === "upload" ? (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-800">
            {purpose === "REEL" ? "Reel file" : "Video file"}
            <RequiredMark />
          </p>
          {value.fileKey ? (
            <div className="rounded-2xl bg-white px-3 py-3 text-sm ring-1 ring-slate-950/5">
              <p className="flex items-center gap-1.5 font-medium text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {value.fileName ?? "Uploaded file"}
              </p>
              {value.fileSize ? <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(value.fileSize)} · Uploaded</p> : null}
              <button
                type="button"
                className={`${ghostButtonClass} mt-2`}
                disabled={disabled}
                onClick={() =>
                  onChange({ ...value, fileKey: undefined, fileName: undefined, fileSize: undefined, mimeType: undefined })
                }
              >
                Replace file
              </button>
            </div>
          ) : (
            <FileDropZone
              accept={accept}
              label={`Drop a ${purpose === "REEL" ? "reel" : "video"} here`}
              hint={hint}
              disabled={disabled}
              progress={progress}
              error={error}
              onFiles={(files) => void upload(files[0]!)}
              onCancel={() => cancelRef.current?.()}
              onRetry={() => (lastFileRef.current ? void upload(lastFileRef.current) : undefined)}
            />
          )}
        </div>
      ) : (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">
            Video URL
            <RequiredMark />
          </span>
          <input
            className={fieldClass}
            placeholder="YouTube or hosted video URL"
            value={value.url}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                url: event.target.value,
                source: sourceFromUrl(event.target.value),
              })
            }
          />
          <span className="text-xs text-slate-500">
            {value.source === "YOUTUBE" ? "Detected as YouTube." : "Stored as an external URL."}
          </span>
        </label>
      )}
    </div>
  );
}
