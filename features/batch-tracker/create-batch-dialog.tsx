"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Search, Users, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { previewBatchCode } from "@/lib/api/batch-tracker";
import {
  createProgramBatch,
  getBatchCatalog,
  type BatchCatalog,
  type ProgramBatch,
} from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { BatchCodePreview, LineOfBusiness } from "@/types/batch-tracker";
import type { ProgramTrainerAssignment } from "@/types/program";
import { formatDay } from "./format";
import { CourseOrderList } from "./course-order-list";

type Kind = LineOfBusiness | "GENERAL";
type CatalogCourse = BatchCatalog["programs"][number];
type CatalogTrainer = BatchCatalog["trainers"][number];

const KINDS: Array<{ value: Kind; label: string; hint: string }> = [
  { value: "VOICE", label: "Voice", hint: "Sales floor" },
  { value: "NON_VOICE", label: "Non-voice", hint: "Non-sales" },
  { value: "GENERAL", label: "General", hint: "Open run" },
];

const STEPS = [
  { id: 0, label: "Courses", hint: "What they will learn" },
  { id: 1, label: "Schedule", hint: "When this batch runs" },
  { id: 2, label: "Team", hint: "Who runs it" },
];

function skippedText(preview: BatchCodePreview): string | null {
  if (!preview.skipped) {
    return null;
  }
  const parts: string[] = [];
  if (preview.skipped.weeklyOff > 0) {
    parts.push(`${preview.skipped.weeklyOff} weekly off ${preview.skipped.weeklyOff === 1 ? "day" : "days"}`);
  }
  for (const holiday of preview.skipped.holidays) {
    parts.push(holiday.name);
  }
  return parts.length > 0 ? `Skips ${parts.join(", ")}` : null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CreateBatchDialog({
  open,
  programId,
  programTitle,
  programs,
  trainers,
  currentUserId,
  onClose,
  onCreated,
}: {
  open: boolean;
  programId?: string;
  programTitle?: string;
  programs?: Array<{ id: string; title: string; category?: string; durationWeeks?: number; status?: string }>;
  trainers?: ProgramTrainerAssignment[];
  currentUserId: string;
  onClose: () => void;
  onCreated: (batch: ProgramBatch) => void;
}) {
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<BatchCatalog | null>(null);
  const [courseQuery, setCourseQuery] = useState("");
  const [trainerQuery, setTrainerQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(programId ? [programId] : []);
  const [kind, setKind] = useState<Kind>("VOICE");
  const [startDate, setStartDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("25");
  const [notes, setNotes] = useState("");
  const [endDate, setEndDate] = useState("");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [separateBatches, setSeparateBatches] = useState(false);
  const [preview, setPreview] = useState<BatchCodePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracked = kind !== "GENERAL";

  const courseOptions: CatalogCourse[] = useMemo(() => {
    if (catalog?.programs.length) {
      return catalog.programs;
    }
    return (programs ?? []).map((program) => ({
      id: program.id,
      title: program.title,
      category: program.category ?? "Course",
      durationWeeks: program.durationWeeks ?? 0,
      status: program.status ?? "APPROVED",
    }));
  }, [catalog, programs]);

  const trainerOptions: CatalogTrainer[] = useMemo(() => {
    if (catalog?.trainers.length) {
      return catalog.trainers;
    }
    return (trainers ?? []).map((row) => row.user);
  }, [catalog, trainers]);

  const filteredCourses = courseOptions.filter((course) => {
    const needle = courseQuery.trim().toLowerCase();
    return !needle || `${course.title} ${course.category}`.toLowerCase().includes(needle);
  });
  const filteredTrainers = trainerOptions.filter((trainer) => {
    const needle = trainerQuery.trim().toLowerCase();
    return !needle || `${trainer.name} ${trainer.email}`.toLowerCase().includes(needle);
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    getBatchCatalog()
      .then((payload) => {
        if (!cancelled) {
          setCatalog(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !tracked) {
      return;
    }
    const number = Number(batchNumber);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      previewBatchCode("trainer", {
        startDate: startDate || undefined,
        batchNumber: Number.isInteger(number) && number > 0 ? number : undefined,
      })
        .then((payload) => {
          if (!cancelled) {
            setPreview(payload);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPreview(null);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [batchNumber, open, startDate, tracked]);

  function reset() {
    setStep(0);
    setCourseQuery("");
    setTrainerQuery("");
    setSelectedIds(programId ? [programId] : []);
    setKind("VOICE");
    setStartDate("");
    setBatchNumber("");
    setName("");
    setCapacity("25");
    setNotes("");
    setEndDate("");
    setCollaboratorIds([]);
    setSeparateBatches(false);
    setPreview(null);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  function toggleCourse(id: string) {
    if (programId && id === programId) {
      return;
    }
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function canContinue(): boolean {
    if (step === 0) {
      return selectedIds.length > 0;
    }
    if (step === 1) {
      if (tracked) {
        return Boolean(startDate);
      }
      return Boolean(name.trim());
    }
    return true;
  }

  async function submit() {
    const primaryId = selectedIds[0];
    if (!primaryId) {
      setError("Pick at least one approved course.");
      setStep(0);
      return;
    }
    if (tracked && !startDate) {
      setError("NHT batches need a start date so the 25 working days can be counted.");
      setStep(1);
      return;
    }
    if (!tracked && !name.trim()) {
      setError("Give the batch a name.");
      setStep(1);
      return;
    }
    const seats = Number(capacity);
    const parsedBatchNumber = Number.isInteger(Number(batchNumber)) && Number(batchNumber) > 0 ? Number(batchNumber) : undefined;
    setBusy(true);
    setError(null);
    try {
      const shared = {
        name: name.trim() || undefined,
        description: notes.trim() || undefined,
        capacity: Number.isFinite(seats) && seats > 0 ? seats : 25,
        startDate: startDate || undefined,
        endDate: tracked ? (preview?.targetCompletionDate ?? undefined) : endDate || undefined,
        ...(tracked
          ? {
              lineOfBusiness: kind as LineOfBusiness,
              batchNumber: parsedBatchNumber,
            }
          : {}),
        salesTrainerId: currentUserId,
        collaboratorIds: collaboratorIds.filter((id) => id !== currentUserId),
      };
      const courseIds = separateBatches ? selectedIds : [primaryId];
      let last = null as Awaited<ReturnType<typeof createProgramBatch>> | null;
      for (const [index, courseId] of courseIds.entries()) {
        const courseTitle = courseOptions.find((row) => row.id === courseId)?.title ?? "Course";
        // Never send a bare course title as the batch name — that collides on every retry.
        // Tracked batches without a custom name fall back to the unique NHT code on the server.
        const batchName =
          separateBatches && selectedIds.length > 1 && shared.name
            ? `${shared.name} · ${courseTitle}`
            : shared.name;
        last = await createProgramBatch(courseId, {
          ...shared,
          name: batchName,
          batchNumber: tracked && separateBatches && parsedBatchNumber ? parsedBatchNumber + index : parsedBatchNumber,
          programIds: separateBatches ? [courseId] : selectedIds,
        });
      }
      reset();
      if (last) {
        onCreated(last.batch);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to create batch.");
    } finally {
      setBusy(false);
    }
  }

  const skipped = preview ? skippedText(preview) : null;
  const selectedCourses = courseOptions.filter((course) => selectedIds.includes(course.id));
  const leadTrainer = trainerOptions.find((row) => row.id === currentUserId);

  return (
    <Dialog
      open={open}
      title="New batch"
      wide
      onClose={close}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => (step === 0 ? close() : setStep((value) => value - 1))}
            disabled={busy}
          >
            {step === 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                Back
              </>
            )}
          </button>
          {step < 2 ? (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={!canContinue()}
              onClick={() => {
                setError(null);
                setStep((value) => value + 1);
              }}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" className={primaryButtonClass} disabled={busy || !canContinue()} onClick={() => void submit()}>
              {busy ? "Creating…" : "Create batch"}
            </button>
          )}
        </div>
      }
    >
      <ol className="mb-6 grid grid-cols-3 gap-3">
        {STEPS.map((item) => {
          const active = item.id === step;
          const done = item.id < step;
          return (
            <li
              key={item.id}
              className={`flex min-h-[4.75rem] flex-col justify-center rounded-xl px-3.5 py-3 ${
                active ? "bg-violet-50 ring-1 ring-violet-200" : done ? "bg-emerald-50/80" : "bg-slate-50"
              }`}
            >
              <p className={`text-xs font-semibold ${active ? "text-violet-800" : done ? "text-emerald-700" : "text-slate-500"}`}>
                {done ? "Done" : `Step ${item.id + 1}`}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.hint}</p>
            </li>
          );
        })}
      </ol>

      {step === 0 ? (
        <div className="grid gap-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-900">Your approved courses</p>
            <p className="text-sm leading-relaxed text-slate-500">
              Only courses you created that an admin approved. Pick how they should be grouped below.
            </p>
          </div>
          {selectedIds.length > 1 ? (
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3.5 text-sm text-slate-700 ring-1 ring-slate-200">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={separateBatches}
                onChange={(event) => setSeparateBatches(event.target.checked)}
              />
              <span>
                <span className="font-medium text-slate-900">Create a separate batch for each course</span>
                <span className="mt-1 block leading-relaxed text-slate-500">
                  Off: one batch, all selected courses together. On: each course gets its own batch with the same schedule and trainers.
                </span>
              </span>
            </label>
          ) : null}
          <div className="relative">
            <span className="sr-only">Search courses</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={courseQuery}
              onChange={(event) => setCourseQuery(event.target.value)}
              placeholder="Search courses"
              className={`${fieldClass} pl-10`}
            />
          </div>
          {filteredCourses.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {courseOptions.length === 0
                ? "No approved courses of yours yet. Create a course in Programs and wait for admin approval."
                : "No courses match that search."}
            </p>
          ) : (
            <ul className="grid max-h-80 auto-rows-fr grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredCourses.map((course) => {
                const selected = selectedIds.includes(course.id);
                const locked = course.id === programId;
                return (
                  <li key={course.id} className="min-h-[4.5rem]">
                    <button
                      type="button"
                      onClick={() => toggleCourse(course.id)}
                      className={`flex h-full w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                        selected
                          ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {selected ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{course.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {course.category}
                          {locked ? " · required" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selectedIds.length > 0 ? (
            <div className="grid gap-3 border-t border-slate-100 pt-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Learning order</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Trainees take these courses in this order. Drag or change the number. New picks go to the end.
                </p>
              </div>
              <CourseOrderList
                courses={selectedIds.map((id) => ({
                  id,
                  title: courseOptions.find((course) => course.id === id)?.title ?? "Course",
                  locked: Boolean(programId && id === programId),
                }))}
                onChange={setSelectedIds}
                onRemove={(id) => {
                  if (programId && id === programId) {
                    return;
                  }
                  setSelectedIds((current) => current.filter((item) => item !== id));
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4">
          <div role="radiogroup" aria-label="Batch type" className="grid grid-cols-3 gap-2">
            {KINDS.map((option) => {
              const active = kind === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(option.value)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    active ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.hint}</span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-800">
                Start date
                {tracked ? <RequiredMark /> : null}
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required={tracked}
                className={fieldClass}
              />
            </label>
            {tracked ? (
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-800">Batch number</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={batchNumber}
                  onChange={(event) => setBatchNumber(event.target.value)}
                  placeholder={preview ? String(preview.batchNumber) : "Auto"}
                  className={fieldClass}
                />
              </label>
            ) : (
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-800">End date</span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={fieldClass} />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Scheduled courses unlock one day of content per calendar day from the start date.
          </p>
          {tracked ? (
            <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 px-4 py-3 ring-1 ring-violet-100">
              <p className="font-mono text-lg font-semibold tracking-wide text-violet-900">{preview?.code ?? "NHT-…"}</p>
              <p className="mt-0.5 text-sm text-violet-800/80">
                {preview?.targetCompletionDate
                  ? `25 working days · ends ${formatDay(preview.targetCompletionDate, true)}`
                  : "Pick a start date to see the target completion date."}
              </p>
              {skipped ? <p className="mt-0.5 text-xs text-violet-800/60">{skipped}</p> : null}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-800">
                Batch name
                {tracked ? null : <RequiredMark />}
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
                placeholder={tracked ? "Defaults to the batch code" : "March onboarding"}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-800">Seats</span>
              <input
                type="number"
                min={1}
                max={200}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-800">Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className={fieldClass} />
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Who runs this batch?</p>
            <p className="text-sm text-slate-500">
              You are the lead for batches you create. Add co-trainers so they can enroll trainees and manage this roster
              with you.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
              {initials(leadTrainer?.name ?? "You")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Lead trainer</p>
              <p className="truncate text-sm font-medium text-slate-900">{leadTrainer?.name ?? "You"}</p>
              <p className="truncate text-xs text-slate-500">{leadTrainer?.email ?? "You create this batch"}</p>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
              You
            </span>
          </div>

          <label className="relative block">
            <span className="sr-only">Search trainers</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={trainerQuery}
              onChange={(event) => setTrainerQuery(event.target.value)}
              placeholder="Search co-trainers by name or email"
              className={`${fieldClass} pl-9`}
            />
          </label>

          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Co-trainers</p>
              <p className="text-xs text-slate-400">{collaboratorIds.length} selected</p>
            </div>
            {collaboratorIds.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {collaboratorIds.map((id) => {
                  const trainer = trainerOptions.find((row) => row.id === id);
                  if (!trainer) {
                    return null;
                  }
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setCollaboratorIds((current) => current.filter((item) => item !== id))}
                        className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-900 transition hover:bg-violet-200"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">
                          {initials(trainer.name)}
                        </span>
                        {trainer.name}
                        <X className="h-3 w-3 opacity-70" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <TrainerList
              trainers={(filteredTrainers.length > 0 ? filteredTrainers : trainerOptions).filter(
                (row) => row.id !== currentUserId,
              )}
              selectedIds={collaboratorIds}
              mode="multi"
              emptyLabel="No other trainers to add."
              onSelect={(id) =>
                setCollaboratorIds((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
              }
            />
          </section>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-3.5 w-3.5" />
              This batch
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{name || preview?.code || "Untitled batch"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedCourses.map((course) => course.title).join(" · ") || "No courses"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {[
                leadTrainer?.name ? `${leadTrainer.name} (lead)` : "You (lead)",
                ...collaboratorIds.map((id) => trainerOptions.find((row) => row.id === id)?.name).filter(Boolean),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </Dialog>
  );
}

function TrainerList({
  trainers,
  selectedIds,
  mode,
  emptyLabel,
  onSelect,
}: {
  trainers: CatalogTrainer[];
  selectedIds: string[];
  mode: "single" | "multi";
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  if (trainers.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
      {trainers.map((trainer) => {
        const selected = selectedIds.includes(trainer.id);
        return (
          <li key={trainer.id} className="border-b border-slate-100 last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect(trainer.id)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                selected ? "bg-violet-50" : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {initials(trainer.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{trainer.name}</span>
                <span className="block truncate text-xs text-slate-500">{trainer.email}</span>
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "border-violet-600 bg-violet-600 text-white"
                    : mode === "multi"
                      ? "border-slate-300 bg-white"
                      : "border-slate-300 bg-white"
                }`}
                aria-hidden
              >
                {selected ? <Check className="h-3 w-3" /> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
