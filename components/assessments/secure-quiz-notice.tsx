"use client";

import { useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import type { QuizSecurityEvent } from "@/lib/assessments/secure-quiz-policy";

export function SecureQuizIndicator() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-violet-700 ring-1 ring-violet-100 transition hover:bg-violet-100"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Lock className="h-3 w-3" />
        Secure Quiz Mode
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg ring-1 ring-slate-950/5">
          Secure mode is active. Copying, pasting, printing, and content selection are restricted during this quiz.
        </div>
      ) : null}
    </div>
  );
}

export function SecureQuizNotice({
  type,
  message,
  onDismiss,
}: {
  type: QuizSecurityEvent;
  message: string;
  onDismiss: () => void;
}) {
  const capture = type === "SCREEN_CAPTURE_DETECTED";
  return (
    <div
      role="status"
      className={`lms-fade-up pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm shadow-lg ring-1 ${
        capture ? "bg-amber-50 text-amber-900 ring-amber-100" : "bg-slate-900 text-white ring-slate-800"
      }`}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-5">
        {capture ? <span className="font-semibold">Screen capture detected. </span> : null}
        {message}
      </p>
      <button type="button" className="shrink-0 text-xs font-medium opacity-70 hover:opacity-100" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
