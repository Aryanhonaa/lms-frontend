"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrackerCapabilities } from "@/features/training-tracker/tracker-capabilities";
import { TrackerSubnav, countPercentLabel, formatDay, trackerBase } from "@/features/training-tracker/tracker-ui";
import {
  createTrackerBatch,
  getTrackerOptions,
  listTrackerBatches,
  percentLabel,
  processLabel,
} from "@/lib/api/training-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { CourseRef, PersonRef, TrackerBatchSummary } from "@/types/training-tracker";

export function TrackerBatchesView() {
  const pathname = usePathname();
  const base = trackerBase(pathname);
  const { user } = useAuth();
  const { canOperate } = useTrackerCapabilities();
  const [batches, setBatches] = useState<TrackerBatchSummary[] | null>(null);
  const [trainers, setTrainers] = useState<PersonRef[]>([]);
  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filterTrainerId, setFilterTrainerId] = useState("");
  const [filterProgramId, setFilterProgramId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  function reload() {
    const params = new URLSearchParams();
    if (filterTrainerId) {
      params.set("trainerId", filterTrainerId);
    }
    if (filterProgramId) {
      params.set("programId", filterProgramId);
    }
    if (filterStatus) {
      params.set("status", filterStatus);
    }
    if (filterDateFrom) {
      params.set("dateFrom", filterDateFrom);
    }
    if (filterDateTo) {
      params.set("dateTo", filterDateTo);
    }
    const query = params.toString();
    return listTrackerBatches(query ? `?${query}` : "")
      .then((payload) => {
        setBatches(payload.batches);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to load batches"));
  }

  useEffect(() => {
    void reload();
    getTrackerOptions()
      .then((payload) => {
        setTrainers(payload.trainers);
        setCourses(payload.courses);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTrainerId, filterProgramId, filterStatus, filterDateFrom, filterDateTo]);

  return (
    <div className="space-y-4">
      <TrackerSubnav />
      {canOperate ? (
        <div className={`${cardClass} px-5 py-4`}>
          <p className="text-sm font-semibold text-slate-900">Create one batch for training + the course(s)</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Pick one or more of your approved courses. When you add people to the batch, they are enrolled in all selected
            courses so they can take lessons and quizzes.
          </p>
        </div>
      ) : (
        <div className={`${cardClass} px-5 py-4`}>
          <p className="text-sm font-semibold text-slate-900">Org-wide batch view</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Trainers create and run batches. Open any batch to inspect progress — create, scores, and people changes happen
            on the trainer side.
          </p>
        </div>
      )}
      {canOperate ? (
        <div className="flex justify-end">
          <button type="button" className={primaryButtonClass} onClick={() => setOpen(true)} disabled={courses.length === 0}>
            Create batch
          </button>
        </div>
      ) : null}
      {canOperate && courses.length === 0 ? (
        <p className="text-sm text-amber-800">
          No approved courses yet. Approve a course first, then come back here to create a batch.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select className={fieldClass} value={filterProgramId} onChange={(event) => setFilterProgramId(event.target.value)}>
          <option value="">All courses</option>
          {courses.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={filterTrainerId} onChange={(event) => setFilterTrainerId(event.target.value)}>
          <option value="">All trainers</option>
          {trainers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
          <option value="">All batch statuses</option>
          <option value="ONGOING">Ongoing</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <label className="text-xs font-medium text-slate-500">
          Start from
          <input type="date" className={`${fieldClass} mt-1`} value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Start to
          <input type="date" className={`${fieldClass} mt-1`} value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} />
        </label>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {!batches && !error ? <LoadingState /> : null}
      {batches && batches.length === 0 ? (
        <EmptyState
          title="No batches yet"
          description="Create a batch for this month’s new hires and link the course they will take."
        />
      ) : null}
      {batches && batches.length > 0 ? (
        <ul className="grid gap-3">
          {batches.map((row) => (
            <li key={row.id} className={`${cardClass} px-5 py-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`${base}/batches/${row.id}`} className="text-base font-semibold text-slate-900 hover:text-violet-700">
                    {row.code}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {processLabel(row.process)} · {row.salesTrainer.name} · started {formatDay(row.trainingStartDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Courses:{" "}
                    <span className="font-medium">
                      {(row.courses?.length ? row.courses : row.course ? [row.course] : [])
                        .map((course) => course.title)
                        .join(", ") || "Not linked"}
                    </span>
                  </p>
                  {row.outcomes ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Active {countPercentLabel(row.outcomes.active)} · Certified{" "}
                      {countPercentLabel(row.outcomes.completedCertified)} · Left{" "}
                      {countPercentLabel(row.outcomes.leftMidBatch)}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {row.trainingDayLabel}
                </span>
              </div>
              {row.status === "ONGOING" ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${row.progressPercent}%` }} />
                </div>
              ) : null}
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-slate-400">Day 1 / Day 7</dt>
                  <dd className="font-medium text-slate-800">
                    {row.day1Hc} / {row.day7Hc ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Left / failed training</dt>
                  <dd className="font-medium text-slate-800">
                    {row.hrAttrition} / {row.trainingAttrition}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Certified</dt>
                  <dd className="font-medium text-slate-800">
                    {row.certified} ({percentLabel(row.certifiedPercent)})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Throughput</dt>
                  <dd className="font-medium text-slate-800">{percentLabel(row.throughputPercent)}</dd>
                </div>
              </dl>
              <Link href={`${base}/batches/${row.id}`} className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline">
                Open batch
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Dialog
        open={open}
        title="Create a batch"
        onClose={() => {
          setOpen(false);
          setSelectedCourseIds([]);
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedCourseIds.length === 0) {
              setError("Select at least one approved course");
              return;
            }
            const data = new FormData(event.currentTarget);
            setBusy(true);
            void createTrackerBatch({
              programIds: selectedCourseIds,
              month: Number(data.get("month")),
              year: Number(data.get("year")),
              batchNumber: Number(data.get("batchNumber")),
              process: String(data.get("process")),
              trainingStartDate: String(data.get("trainingStartDate")),
              targetCompletionDate: String(data.get("targetCompletionDate")),
              salesTrainerId: user?.id ?? String(data.get("salesTrainerId")),
              filesTrainerId: String(data.get("filesTrainerId") || "") || null,
            })
              .then(() => {
                setOpen(false);
                setSelectedCourseIds([]);
                return reload();
              })
              .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to create batch"))
              .finally(() => setBusy(false));
          }}
        >
          <section className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">1 · Courses</p>
            <p className="mt-1 text-sm text-slate-600">
              Select all courses this intake will take. Trainers only see their own approved courses.
            </p>
            <fieldset className="mt-3 grid gap-2">
              <legend className="text-sm font-medium text-slate-800">
                Courses they will learn
                <RequiredMark />
              </legend>
              {courses.length === 0 ? (
                <p className="text-sm text-slate-500">No approved courses available.</p>
              ) : (
                courses.map((row) => {
                  const checked = selectedCourseIds.includes(row.id);
                  return (
                    <label key={row.id} className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => {
                          setSelectedCourseIds((current) =>
                            checked ? current.filter((id) => id !== row.id) : [...current, row.id],
                          );
                        }}
                      />
                      <span className="font-medium text-slate-900">{row.title}</span>
                    </label>
                  );
                })
              )}
              {selectedCourseIds.length > 0 ? (
                <p className="text-xs text-slate-500">{selectedCourseIds.length} selected</p>
              ) : null}
            </fieldset>
          </section>

          <section className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">2 · Batch code</p>
            <p className="mt-1 text-sm text-slate-600">
              Code is created automatically, for example <span className="font-medium text-slate-700">NHT-SEP-2026-05</span>.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-medium text-slate-800">
                Month (1–12)
                <RequiredMark />
                <input name="month" type="number" min={1} max={12} defaultValue={new Date().getMonth() + 1} className={`${fieldClass} mt-1`} required />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Year
                <RequiredMark />
                <input name="year" type="number" min={2020} defaultValue={new Date().getFullYear()} className={`${fieldClass} mt-1`} required />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Batch number
                <RequiredMark />
                <input name="batchNumber" type="number" min={1} max={99} defaultValue={1} className={`${fieldClass} mt-1`} required />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium text-slate-800">
              Process / role track
              <RequiredMark />
              <select name="process" className={`${fieldClass} mt-1`} required>
                <option value="VOICE_SALES">Voice / Sales</option>
                <option value="NON_VOICE_SALES_SUPPORT">Non-Voice / Sales Support</option>
              </select>
            </label>
          </section>

          <section className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">3 · Schedule & trainers</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-800">
                Training start date
                <RequiredMark />
                <input name="trainingStartDate" type="date" className={`${fieldClass} mt-1`} required />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Target completion date
                <RequiredMark />
                <input name="targetCompletionDate" type="date" className={`${fieldClass} mt-1`} required />
              </label>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              You are the sales trainer for this batch{user?.name ? ` (${user.name})` : ""}.
            </p>
            <label className="mt-3 block text-sm font-medium text-slate-800">
              Sales support / files trainer
              <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
              <select name="filesTrainerId" className={`${fieldClass} mt-1`}>
                <option value="">None</option>
                {trainers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <p className="text-xs text-slate-500">
            <span className="font-semibold text-red-600">*</span> Required fields
          </p>

          <button type="submit" className={primaryButtonClass} disabled={busy}>
            {busy ? "Saving…" : "Create batch"}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
