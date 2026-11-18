"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";

const dangerConfirmClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-medium text-red-700 transition duration-150 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Close",
  cancelLabel = "Keep editing",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancelRef.current();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10"
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className={danger ? secondaryButtonClass : primaryButtonClass}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? dangerConfirmClass : secondaryButtonClass}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
