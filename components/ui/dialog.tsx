"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  side?: boolean;
};

export function Dialog({ open, title, onClose, children, wide, side }: DialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="absolute inset-0 bg-slate-900/30" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={
          side
            ? "relative ml-auto flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl"
            : `relative m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl ${wide ? "max-w-2xl" : "max-w-lg"}`
        }
      >
        <div className={`flex items-start justify-between gap-3 ${side ? "border-b border-slate-200 px-5 py-4" : "mb-4"}`}>
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button ref={closeRef} type="button" className="rounded-lg px-2 py-1 text-sm text-slate-500 transition duration-150 hover:bg-slate-50 hover:text-slate-900" onClick={onClose}>
            Close
          </button>
        </div>
        <div className={side ? "flex-1 overflow-y-auto px-5 py-4" : undefined}>{children}</div>
      </div>
    </div>
  );
}
