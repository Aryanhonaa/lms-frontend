"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { fieldClass } from "@/lib/ui/form-classes";
import type { TraineeCourseOption, TraineeJourneyOption } from "@/lib/learning/enrollment-priority";

type BatchOption = { id: string; name: string };

type Props = {
  programs: TraineeCourseOption[];
  batches: BatchOption[];
  programId: string;
  batchId: string;
  onProgramChange: (programId: string) => void;
  onBatchChange: (batchId: string) => void;
  journeys?: TraineeJourneyOption[];
  journeyId?: string;
  onJourneyChange?: (journeyId: string) => void;
};

const selectClass = `${fieldClass} rounded-xl border-slate-200 font-normal normal-case shadow-sm`;

function CoursePicker({
  programs,
  programId,
  onProgramChange,
}: {
  programs: TraineeCourseOption[];
  programId: string;
  onProgramChange: (programId: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = programs.find((program) => program.id === programId) ?? programs[0] ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (programs.length <= 1) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative block min-w-0">
      <span className="text-xs font-medium text-slate-500">Course</span>
      <button
        type="button"
        id={`${listId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listId}-list`}
        className={`${selectClass} mt-1 flex w-full items-center gap-2 text-left`}
        onClick={() => setOpen((value) => !value)}
      >
        {selected?.locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /> : null}
        <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{selected?.title ?? "Select a course"}</span>
        {selected?.available ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
            Available
          </span>
        ) : null}
        {selected?.locked ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Locked
          </span>
        ) : null}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-labelledby={`${listId}-trigger`}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
        >
          {programs.map((program) => {
            const active = program.id === programId;
            return (
              <li key={program.id} role="option" aria-selected={active} aria-disabled={program.locked || undefined}>
                <button
                  type="button"
                  disabled={program.locked}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition ${
                    active ? "bg-violet-50" : "hover:bg-slate-50"
                  } ${program.locked ? "cursor-not-allowed bg-slate-50/70 opacity-80" : ""}`}
                  onClick={() => {
                    onProgramChange(program.id);
                    setOpen(false);
                  }}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    {program.locked ? (
                      <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    ) : active ? (
                      <Check className="h-3.5 w-3.5 text-violet-600" aria-hidden />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${active ? "font-semibold text-slate-900" : "text-slate-800"}`}>
                      {program.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {program.locked
                        ? program.lockReason ?? "Finish the previous course first"
                        : program.outcome === "PASSED"
                          ? "Completed"
                          : program.available
                            ? "Available now"
                            : "Open"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function TraineeCourseFilters({
  programs,
  batches,
  programId,
  batchId,
  onProgramChange,
  onBatchChange,
  journeys = [],
  journeyId = "",
  onJourneyChange,
}: Props) {
  const showCourse = programs.length > 1;
  const showClass = batches.length > 1;
  const showJourney = journeys.length > 1 && Boolean(onJourneyChange);
  if (!showCourse && !showClass && !showJourney) {
    return null;
  }

  return (
    <div className={`grid items-end gap-3 ${[showJourney, showCourse, showClass].filter(Boolean).length > 1 ? "sm:grid-cols-2" : ""}`}>
      {showJourney ? (
        <label className="block min-w-0 text-xs font-medium text-slate-500" htmlFor="trainee-journey">
          Learning journey
          <select
            id="trainee-journey"
            className={`${selectClass} mt-1`}
            value={journeyId}
            onChange={(event) => onJourneyChange?.(event.target.value)}
          >
            {journeys.map((journey) => (
              <option key={journey.id} value={journey.id}>
                {journey.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showCourse ? (
        <CoursePicker programs={programs} programId={programId} onProgramChange={onProgramChange} />
      ) : null}
      {showClass ? (
        <label className="block min-w-0 text-xs font-medium text-slate-500" htmlFor="trainee-class">
          Class
          <select
            id="trainee-class"
            className={`${selectClass} mt-1`}
            value={batchId}
            onChange={(event) => onBatchChange(event.target.value)}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
