"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  side?: boolean;
};

export function Dialog({ open, title, onClose, children, footer, wide, side }: DialogProps) {
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
            ? `relative ml-auto flex h-full w-full ${wide ? "max-w-3xl" : "max-w-lg"} flex-col border-l border-slate-200 bg-white shadow-xl`
            : `relative m-auto flex max-h-[90vh] w-[calc(100%-2rem)] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl ${wide ? "max-w-2xl" : "max-w-lg"} ${footer ? "overflow-hidden" : "overflow-y-auto"}`
        }
      >
        <div className={`flex shrink-0 items-start justify-between gap-3 ${side ? "border-b border-slate-200 px-5 py-4" : "mb-4"}`}>
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button ref={closeRef} type="button" className="rounded-lg px-2 py-1 text-sm text-slate-500 transition duration-150 hover:bg-slate-50 hover:text-slate-900" onClick={onClose}>
            Close
          </button>
        </div>
        <div className={side ? "min-h-0 flex-1 overflow-y-auto px-5 py-4" : footer ? "min-h-0 flex-1 overflow-y-auto" : undefined}>{children}</div>
        {footer ? (
          <div className={`shrink-0 border-t border-slate-200 bg-white shadow-[0_-6px_16px_rgba(15,23,42,0.04)] ${side ? "px-5 py-4" : "pt-4"}`}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
