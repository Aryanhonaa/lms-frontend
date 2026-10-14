"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, RotateCcw, Search } from "lucide-react";
import { TrainerShell } from "@/components/trainer-shell";
import { ErrorState, LoadingState } from "@/components/ui/empty-state";
import { CalendarBoard } from "@/features/calendar/calendar-board";
import { listTrainerCalendar } from "@/lib/api/calendar";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { CalendarEvent, TrainerCalendarFilters } from "@/types/calendar";

type CalendarSelections = { courses: string[]; batches: string[]; trainees: string[] };
const NO_FILTERS: TrainerCalendarFilters = { courses: [], batches: [], trainees: [] };
const NO_SELECTIONS: CalendarSelections = { courses: [], batches: [], trainees: [] };

function MultiFilter({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
}: {
  label: string;
  options: Array<{ value: string; label: string; detail?: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  searchPlaceholder: string;
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const visibleOptions = options.filter(
    (option) => !search || `${option.label} ${option.detail ?? ""}`.toLocaleLowerCase().includes(search),
  );
  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  return (
    <details className="group relative min-w-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</span>
          <span className="block truncate text-sm font-medium text-slate-900">
            {selected.length === 0
              ? `All ${label.toLocaleLowerCase()}s`
              : selected.length === 1
                ? selectedLabels[0]
                : `${selected.length} ${label.toLocaleLowerCase()}s selected`}
          </span>
        </span>
        {selected.length > 0 ? (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-100 px-1.5 text-xs font-semibold text-violet-800">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
      </summary>

      <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-2 border-b border-slate-100 p-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="sr-only">Search {label.toLocaleLowerCase()}s</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {selected.length > 0 ? (
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => onChange([])}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
          ) : null}
        </div>
        <ul className="max-h-64 overflow-y-auto p-1.5">
          {visibleOptions.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-slate-500">No matches found.</li>
          ) : (
            visibleOptions.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <li key={option.value}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        checked ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() =>
                        onChange(
                          checked
                            ? selected.filter((value) => value !== option.value)
                            : [...selected, option.value],
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{option.label}</span>
                      {option.detail ? <span className="mt-0.5 block truncate text-xs text-slate-500">{option.detail}</span> : null}
                    </span>
                  </label>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500">
          {selected.length === 0 ? `Showing all ${options.length} ${label.toLocaleLowerCase()}s` : `${selected.length} selected`}
        </div>
      </div>
    </details>
  );
}

export default function TrainerCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [filters, setFilters] = useState<TrainerCalendarFilters>(NO_FILTERS);
  const [selected, setSelected] = useState<CalendarSelections>(NO_SELECTIONS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTrainerCalendar()
      .then((payload) => {
        if (!cancelled) {
          setEvents(payload.events);
          setFilters(payload.filters);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load calendar");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableBatches = filters.batches.filter(
    (batch) => selected.courses.length === 0 || selected.courses.includes(batch.programId),
  );
  const availableTrainees = filters.trainees.filter(
    (trainee) =>
      (selected.courses.length === 0 || selected.courses.includes(trainee.programId)) &&
      (selected.batches.length === 0 || selected.batches.includes(trainee.batchId)),
  );
  const filteredEvents = useMemo(
    () =>
      (events ?? []).filter((event) => {
        const courseMatches =
          selected.courses.length === 0 || !event.program.id || selected.courses.includes(event.program.id);
        const batchMatches =
          selected.batches.length === 0 ||
          !event.program.id ||
          Boolean(event.batch && selected.batches.includes(event.batch.id)) ||
          Boolean(event.batchIds?.some((id) => selected.batches.includes(id)));
        const selectedTraineeIds = selected.trainees.map((value) => value.split(":")[0]);
        const traineeMatches =
          selectedTraineeIds.length === 0 ||
          !event.program.id ||
          Boolean(event.trainee && selectedTraineeIds.includes(event.trainee.id)) ||
          Boolean(event.traineeIds?.some((id) => selectedTraineeIds.includes(id)));
        return courseMatches && batchMatches && traineeMatches;
      }),
    [events, selected],
  );
  const selectedBatchNames = availableBatches
    .filter((batch) => selected.batches.includes(batch.id))
    .map((batch) => ({ id: batch.id, name: batch.name }));
  const selectedTraineeNames = availableTrainees
    .filter((trainee) => selected.trainees.includes(`${trainee.id}:${trainee.programId}:${trainee.batchId}`))
    .map((trainee) => ({ id: trainee.id, name: trainee.name }));

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Calendar" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {events === null && !error ? <LoadingState /> : null}
      {events ? (
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-950/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filter activities</h2>
                <p className="mt-1 text-xs text-slate-500">Choose any combination. Empty filters include all activities.</p>
              </div>
              {selected.courses.length + selected.batches.length + selected.trainees.length > 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-50"
                  onClick={() => setSelected(NO_SELECTIONS)}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Clear all filters
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <MultiFilter
                label="Course"
                searchPlaceholder="Find a course…"
                options={filters.courses.map((course) => ({ value: course.id, label: course.title }))}
                selected={selected.courses}
                onChange={(courses) =>
                  setSelected((current) => ({
                    courses,
                    batches: current.batches.filter((id) => {
                      const batch = filters.batches.find((option) => option.id === id);
                      return batch && (courses.length === 0 || courses.includes(batch.programId));
                    }),
                    trainees: current.trainees.filter((value) => {
                      const [, programId] = value.split(":");
                      return courses.length === 0 || courses.includes(programId ?? "");
                    }),
                  }))
                }
              />
              <MultiFilter
                label="Batch"
                searchPlaceholder="Find a batch…"
                options={availableBatches.map((batch) => ({
                  value: batch.id,
                  label: batch.name,
                  detail: filters.courses.find((course) => course.id === batch.programId)?.title,
                }))}
                selected={selected.batches}
                onChange={(batches) =>
                  setSelected((current) => ({
                    ...current,
                    batches,
                    trainees: current.trainees.filter((value) => {
                      const [, , batchId] = value.split(":");
                      return batches.length === 0 || batches.includes(batchId ?? "");
                    }),
                  }))
                }
              />
              <MultiFilter
                label="Trainee"
                searchPlaceholder="Find a trainee…"
                options={availableTrainees.map((trainee) => {
                  const course = filters.courses.find((option) => option.id === trainee.programId);
                  return {
                    value: `${trainee.id}:${trainee.programId}:${trainee.batchId}`,
                    label: trainee.name,
                    detail: `${course?.title ?? "Course"} · ${trainee.batchName}`,
                  };
                })}
                selected={selected.trainees}
                onChange={(trainees) => setSelected((current) => ({ ...current, trainees }))}
              />
            </div>
          </section>
          <CalendarBoard
            events={filteredEvents}
            selectedBatches={selectedBatchNames}
            selectedTrainees={selectedTraineeNames}
            showDayDetails
          />
        </div>
      ) : null}
    </TrainerShell>
  );
}
