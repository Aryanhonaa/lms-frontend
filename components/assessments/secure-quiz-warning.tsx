"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";

const POINTS = [
  "Copying quiz content is disabled.",
  "Copy and paste are disabled.",
  "Text selection is restricted.",
  "Right-click / shortcut menu is disabled.",
  "Cutting content from answer fields is disabled.",
  "Printing the quiz is disabled.",
  "Screen capture may be restricted where supported by your browser or device.",
  "Stay on this page while completing the quiz.",
];

export function SecureQuizWarning({
  title,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="flex flex-1 items-start justify-center px-4 py-8 md:px-8">
      <div className={`${traineeCardClass} w-full max-w-xl overflow-hidden`}>
        <div className="bg-gradient-to-br from-violet-50 via-white to-white px-6 py-6 md:px-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-violet-700 ring-1 ring-violet-100">
            <Lock className="h-3.5 w-3.5" />
            Secure Quiz
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This quiz uses secure mode to help maintain a fair learning environment.
          </p>
          <ul className="mt-5 space-y-2.5">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-5 text-slate-400">
            Screen capture may be restricted where supported by your browser or device. Operating-system screenshots
            cannot be fully prevented in a normal browser.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className={traineePrimaryCtaClass} disabled={busy} onClick={onConfirm}>
              {busy ? "Starting…" : "I understand — Start Quiz"}
            </button>
            <button type="button" className={traineeSecondaryCtaClass} disabled={busy} onClick={onCancel}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
