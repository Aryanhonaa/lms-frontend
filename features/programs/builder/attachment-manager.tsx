"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { DOCUMENT_ACCEPT } from "@/components/files/attachment-upload-field";
import { FileActionsRow } from "@/components/files/file-viewer";
import { ApiClientError } from "@/lib/api/client";
import {
  deleteAttachment,
  getAttachmentAccess,
  listLessonAttachments,
  uploadAttachment,
} from "@/lib/api/files";
import type { AttachmentView } from "@/types/files";

type AttachmentTarget = { kind: "lesson" | "assignment"; id: string; title: string };

/** Trainer file manager for one lesson or assignment: upload, view, download, delete. */
export function AttachmentManager({
  target,
  initial,
  editable,
  onChanged,
}: {
  target: AttachmentTarget;
  initial?: AttachmentView[];
  editable: boolean;
  onChanged?: () => void;
}) {
  const [attachments, setAttachments] = useState<AttachmentView[]>(initial ?? []);
  const [loading, setLoading] = useState(target.kind === "lesson" && !initial);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const lastFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (target.kind !== "lesson" || initial) {
      return;
    }
    let active = true;
    listLessonAttachments(target.id)
      .then((payload) => {
        if (active) {
          setAttachments(payload.attachments);
        }
      })
      .catch(() => {
        if (active) {
          setError("We couldn't load these files.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [target.kind, target.id, initial]);

  async function upload(file: File) {
    lastFileRef.current = file;
    setError(null);
    setProgress(0);
    const handle = uploadAttachment(target, file, undefined, setProgress);
    cancelRef.current = handle.cancel;
    try {
      const attachment = await handle.promise;
      setAttachments((current) => [...current, attachment]);
      onChanged?.();
    } catch (err: unknown) {
      if (!(err instanceof ApiClientError && err.code === "UPLOAD_CANCELLED")) {
        setError(err instanceof ApiClientError ? err.message : "We couldn't upload this file. Please try again.");
      }
    } finally {
      cancelRef.current = null;
      setProgress(null);
    }
  }

  async function remove(attachmentId: string) {
    setBusyId(attachmentId);
    setError(null);
    try {
      await deleteAttachment(attachmentId);
      setAttachments((current) => current.filter((row) => row.id !== attachmentId));
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "We couldn't delete this file.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Attachments</p>
        <p className="mt-0.5 text-xs text-slate-500">{target.title}</p>
      </div>

      {loading ? (
        <ul className="space-y-2" aria-hidden>
          {[0, 1].map((row) => (
            <li key={row} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </ul>
      ) : attachments.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
          <Paperclip className="h-4 w-4" />
          No files attached yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-950/5">
              <FileActionsRow
                loader={() => getAttachmentAccess("trainer", attachment.id)}
                fileName={attachment.fileName}
                fileSize={attachment.fileSize}
              />
              {editable ? (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-700 disabled:opacity-50"
                  disabled={busyId === attachment.id}
                  onClick={() => void remove(attachment.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {busyId === attachment.id ? "Deleting…" : "Delete"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editable ? (
        <FileDropZone
          accept={DOCUMENT_ACCEPT}
          label="Drop a file here"
          hint="PDF, Word, PowerPoint, Excel, images, or text"
          progress={progress}
          error={error}
          onFiles={(files) => void upload(files[0]!)}
          onCancel={() => cancelRef.current?.()}
          onRetry={() => (lastFileRef.current ? void upload(lastFileRef.current) : undefined)}
        />
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
