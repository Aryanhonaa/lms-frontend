"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Maximize2, RefreshCw } from "lucide-react";
import { downloadFromAccess, formatFileSize, objectUrlFromAccess, openFromAccess } from "@/lib/api/files";
import { ApiClientError } from "@/lib/api/client";
import type { FileAccess } from "@/types/files";

export type AccessLoader = () => Promise<FileAccess>;

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

function isAudio(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

function accessErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403) {
      return "You don't have access to this file.";
    }
    return error.message;
  }
  return "This file is currently unavailable.";
}

/** Loads a short-lived authorized URL and refreshes it on demand or after expiry. */
export function useFileAccess(loader: AccessLoader, enabled = true) {
  const loaderRef = useRef(loader);
  const [state, setState] = useState<{ access: FileAccess | null; loading: boolean; error: string | null }>({
    access: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const fetchAccess = useCallback(async () => {
    try {
      const access = await loaderRef.current();
      setState({ access, loading: false, error: null });
    } catch (error: unknown) {
      setState({ access: null, loading: false, error: accessErrorMessage(error) });
    }
  }, []);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    return fetchAccess();
  }, [fetchAccess]);

  useEffect(() => {
    if (enabled) {
      void fetchAccess();
    }
  }, [enabled, fetchAccess]);

  return { access: state.access, loading: state.loading, error: state.error, reload };
}

function ViewerFrame({ children, tall }: { children: React.ReactNode; tall?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-slate-900/95 ${tall ? "h-[70vh] min-h-80" : ""}`}>{children}</div>
  );
}

export function FileViewer({
  loader,
  fileName,
  mimeType,
  fileSize,
  title,
  autoLoad = true,
}: {
  loader: AccessLoader;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  title?: string;
  autoLoad?: boolean;
}) {
  const { access, loading, error, reload } = useFileAccess(loader, autoLoad);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [blob, setBlob] = useState<{ for: FileAccess; url: string } | null>(null);
  const [blobError, setBlobError] = useState<string | null>(null);

  // Streamed files need the session cookie, so they are fetched and rendered from a blob URL.
  useEffect(() => {
    if (!access || access.strategy === "signed") {
      return;
    }
    let active = true;
    let created: string | null = null;
    objectUrlFromAccess(access)
      .then((url) => {
        created = url;
        if (active) {
          setBlob({ for: access, url });
          setBlobError(null);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => {
        if (active) {
          setBlobError("This file is currently unavailable.");
        }
      });
    return () => {
      active = false;
      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [access]);

  const blobUrl = blob && blob.for === access ? blob.url : null;
  const url = access ? (access.strategy === "signed" ? access.url : blobUrl) : null;
  const sizeLabel = fileSize ? formatFileSize(fileSize) : "";

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const fresh = access ?? (await loader());
      await downloadFromAccess(fresh);
    } catch {
      setDownloadError("We couldn't download this file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if ((loading && !access) || (access && access.strategy !== "signed" && !blobUrl && !blobError)) {
    return (
      <div className="rounded-2xl bg-white px-4 py-6 text-sm text-slate-500 ring-1 ring-slate-950/5">
        <p className="animate-pulse">{isVideo(mimeType) ? "Preparing video…" : "Loading document…"}</p>
        <div className="mt-3 h-2 w-40 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  if (error || blobError || !url) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-700 ring-1 ring-red-100">
        <p className="font-medium">{error ?? blobError ?? "This file is currently unavailable."}</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-800 underline"
          onClick={() => void reload()}
        >
          <RefreshCw className="h-3 w-3" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isPdf(mimeType) ? (
        <ViewerFrame tall>
          <object data={url} type="application/pdf" className="h-full w-full">
            <iframe title={title ?? fileName} src={url} className="h-full w-full bg-white" />
          </object>
        </ViewerFrame>
      ) : isVideo(mimeType) ? (
        <ViewerFrame>
          <video className="w-full" src={url} controls controlsList="nodownload" preload="metadata" playsInline>
            <a href={url} className="text-sm text-white underline">
              Open video
            </a>
          </video>
        </ViewerFrame>
      ) : isImage(mimeType) ? (
        <div className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-950/5">
          {/* Signed storage URLs are short-lived, so the native img tag is used instead of next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={title ?? fileName} className="mx-auto max-h-[70vh] w-auto max-w-full" />
        </div>
      ) : isAudio(mimeType) ? (
        <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-950/5">
          <audio className="w-full" src={url} controls preload="metadata" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-600 ring-1 ring-slate-950/5">
          <p className="font-medium text-slate-900">{fileName}</p>
          <p className="mt-1">This file type opens outside the viewer.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto min-w-0 truncate text-xs text-slate-500">
          {fileName}
          {sizeLabel ? ` · ${sizeLabel}` : ""}
        </p>
        {isPdf(mimeType) || isImage(mimeType) ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fullscreen
          </a>
        ) : null}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          disabled={downloading}
          onClick={() => void download()}
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? "Preparing…" : "Download"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-900"
          onClick={() => void reload()}
          title="Refresh access"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
      {downloadError ? <p className="text-sm text-red-700">{downloadError}</p> : null}
    </div>
  );
}

export function FileActionsRow({
  loader,
  fileName,
  fileSize,
  onOpen,
}: {
  loader: AccessLoader;
  fileName: string;
  fileSize?: number;
  onOpen?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (onOpen) {
      onOpen();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await openFromAccess(await loader());
    } catch {
      setError("This file is currently unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadFromAccess(await loader());
    } catch {
      setError("We couldn't download this file. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-auto min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{fileName}</p>
        {fileSize ? <p className="text-xs text-slate-500">{formatFileSize(fileSize)}</p> : null}
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        disabled={busy}
        onClick={() => void open()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        View
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        disabled={busy}
        onClick={() => void download()}
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </button>
    </div>
  );
}
