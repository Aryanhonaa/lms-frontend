"use client";

import { useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";

type FileDropZoneProps = {
  accept?: string;
  hint: string;
  label?: string;
  multiple?: boolean;
  disabled?: boolean;
  progress?: number | null;
  error?: string | null;
  status?: ReactNode;
  onFiles: (files: File[]) => void;
  onCancel?: () => void;
  onRetry?: () => void;
};

/** Shared drag-and-drop upload surface with progress, cancel, and retry. */
export function FileDropZone({
  accept,
  hint,
  label = "Drop a file here",
  multiple,
  disabled,
  progress,
  error,
  status,
  onFiles,
  onCancel,
  onRetry,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = progress !== null && progress !== undefined;

  function handle(list: FileList | null) {
    if (!list || list.length === 0) {
      return;
    }
    onFiles(Array.from(list));
  }

  return (
    <div>
      <div
        className={`flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center text-sm transition ${
          dragOver ? "border-violet-400 bg-violet-50" : "border-slate-300 bg-slate-50"
        } ${disabled ? "opacity-60" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!disabled && !uploading) {
            handle(event.dataTransfer.files);
          }
        }}
      >
        <UploadCloud className="h-6 w-6 text-slate-400" aria-hidden />
        <span className="mt-2 font-medium text-slate-900">{label}</span>
        <span className="mt-1 text-xs text-slate-500">{hint}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(event) => {
            handle(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="mt-3 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </button>
      </div>

      {uploading ? (
        <div className="mt-3">
          <ProgressBar value={progress ?? 0} tone="violet" label={`Uploading… ${progress ?? 0}%`} />
          {onCancel ? (
            <button type="button" className="mt-2 text-xs font-medium text-slate-500 hover:text-red-700" onClick={onCancel}>
              Cancel upload
            </button>
          ) : null}
        </div>
      ) : null}

      {status && !uploading ? <div className="mt-3 text-sm text-emerald-700">{status}</div> : null}

      {error ? (
        <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          <p className="font-medium">Upload failed</p>
          <p className="mt-0.5">{error}</p>
          {onRetry ? (
            <button type="button" className="mt-2 text-xs font-semibold text-red-800 underline" onClick={onRetry}>
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
