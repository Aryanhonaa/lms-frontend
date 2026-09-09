"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrackerCapabilities } from "@/features/training-tracker/tracker-capabilities";
import {
  KpiCard,
  SectionTitle,
  TrackerSubnav,
  certificationLabel,
  completionLabel,
  countPercentLabel,
  formatDay,
  outcomeLabel,
  statusLabel,
} from "@/features/training-tracker/tracker-ui";
import {
  addTrackerTrainee,
  getTrackerBatch,
  getTrackerOptions,
  percentLabel,
  processLabel,
  recordTrackerAttrition,
  recordTrackerExam,
  recordTrackerHandover,
  updateTrackerBatch,
} from "@/lib/api/training-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type {
  CourseRef,
  OutcomeCategory,
  PersonRef,
  TrackerBatchSummary,
  TrackerTrainee,
} from "@/types/training-tracker";

export function TrackerBatchDetailView({ batchId }: { batchId: string }) {
  const { canOperate } = useTrackerCapabilities();
  const [batch, setBatch] = useState<TrackerBatchSummary | null>(null);
  const [trainees, setTrainees] = useState<TrackerTrainee[]>([]);
  const [people, setPeople] = useState<PersonRef[]>([]);
  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [action, setAction] = useState<{ type: "attrition" | "exam" | "handover"; trainee: TrackerTrainee } | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [certFilter, setCertFilter] = useState("");
  const [completionFilter, setCompletionFilter] = useState("");
  const [joinedMidOnly, setJoinedMidOnly] = useState(false);
  const [trainerFilter, setTrainerFilter] = useState("");

  const reload = useCallback(() => {
    return getTrackerBatch(batchId)
      .then((payload) => {
        setBatch(payload.batch);
        setTrainees(payload.trainees);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to load batch"));
  }, [batchId]);

  useEffect(() => {
    void reload();
    getTrackerOptions()
      .then((payload) => {
        setPeople(payload.trainees);
        setCourses(payload.courses);
      })
      .catch(() => undefined);
  }, [reload]);

  const trainers = useMemo(
    () => [...new Set(trainees.map((row) => row.trainer?.name).filter(Boolean))] as string[],
    [trainees],
  );

  const visibleTrainees = useMemo(() => {
    return trainees.filter((row) => {
      const outcome = row.outcomeCategory ?? "ACTIVE";
      const cert = row.certificationStatus ?? "PENDING";
      const completion = row.completionStatus ?? "IN_PROGRESS";
      if (outcomeFilter && outcome !== outcomeFilter) {
        return false;
      }
      if (certFilter && cert !== certFilter) {
        return false;
      }
      if (completionFilter && completion !== completionFilter) {
        return false;
      }
      if (joinedMidOnly && !row.joinedMidBatch) {
        return false;
      }
      if (trainerFilter && row.trainer?.name !== trainerFilter) {
        return false;
      }
      return true;
    });
  }, [trainees, outcomeFilter, certFilter, completionFilter, joinedMidOnly, trainerFilter]);

  if (error) {
    return <ErrorState message={error} />;
  }
  if (!batch) {
    return <LoadingState />;
  }

  const linkedCourses = batch.courses?.length ? batch.courses : batch.course ? [batch.course] : [];
  const o = batch.outcomes;

  return (
    <div className="space-y-4">
      <TrackerSubnav />
      <div className={`${cardClass} px-5 py-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">{batch.code}</p>
            <p className="mt-1 text-sm text-slate-500">
              {processLabel(batch.process)} · Trainer {batch.salesTrainer.name}
            </p>
            <p className="mt-1 text-sm text-slate-800">
              Courses:{" "}
              <span className="font-medium">{linkedCourses.map((row) => row.title).join(", ") || "Not linked yet"}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDay(batch.trainingStartDate)} → target {formatDay(batch.targetCompletionDate)} · {batch.trainingDayLabel}
            </p>
            {linkedCourses.length > 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                Adding a person here also enrolls them in {linkedCourses.length === 1 ? "this course" : "these courses"} for
                lessons and quizzes.
              </p>
            ) : (
              <p className="mt-2 text-sm text-amber-800">
                Link approved course(s) so new trainees get course access automatically.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canOperate ? (
              <>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setSelectedCourseIds(linkedCourses.map((row) => row.id));
                    setLinkOpen(true);
                  }}
                >
                  {linkedCourses.length ? "Edit courses" : "Link courses"}
                </button>
                <button type="button" className={primaryButtonClass} onClick={() => setAddOpen(true)}>
                  Add trainee
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-500">View only — trainers manage people and courses.</p>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-violet-600" style={{ width: `${batch.progressPercent}%` }} />
        </div>
      </div>
      <div>
        <SectionTitle
          title="Batch outcomes"
          hint={`% of total enrolled in this batch (${o?.totalEnrolled ?? trainees.length}).`}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active" value={countPercentLabel(o?.active)} />
          <KpiCard label="Completed & certified" value={countPercentLabel(o?.completedCertified)} />
          <KpiCard label="Completed – not certified" value={countPercentLabel(o?.completedNotCertified)} />
          <KpiCard label="Left mid-batch" value={countPercentLabel(o?.leftMidBatch)} />
          <KpiCard label="Terminated" value={countPercentLabel(o?.terminated)} />
          <KpiCard label="Joined mid-batch" value={countPercentLabel(o?.joinedMidBatch)} hint="After Day 1" />
        </div>
      </div>
      <div>
        <SectionTitle title="Headcount" hint="Day 7 is the final class size after the first week. People who left in the first 3 days are not counted." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Started (Day 1)" value={batch.day1Hc} />
          <KpiCard label="Still in training" value={batch.currentHc} />
          <KpiCard label="Day 7 headcount" value={batch.day7Hc ?? "Not yet"} />
          <KpiCard label="Left in first 3 days" value={batch.hrAttrition} />
          <KpiCard label="Did not pass training" value={batch.trainingAttrition} />
        </div>
      </div>
      <div>
        <SectionTitle title="Exam & handover" hint="Certified % is of people who sat the exam. Throughput is certified ÷ Day 7 headcount." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Ready for exam" value={batch.examEligible} />
          <KpiCard label="Sat the exam" value={batch.appeared} />
          <KpiCard label="Certified" value={`${batch.certified} · ${percentLabel(batch.certifiedPercent)}`} />
          <KpiCard label="Waiting for handover" value={batch.handoverPending} />
          <KpiCard label="Throughput" value={percentLabel(batch.throughputPercent)} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select className={fieldClass} value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)}>
          <option value="">All outcome statuses</option>
          {(
            [
              "ACTIVE",
              "COMPLETED_CERTIFIED",
              "COMPLETED_NOT_CERTIFIED",
              "LEFT_MID_BATCH",
              "TERMINATED",
            ] as OutcomeCategory[]
          ).map((item) => (
            <option key={item} value={item}>
              {outcomeLabel(item)}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={completionFilter} onChange={(event) => setCompletionFilter(event.target.value)}>
          <option value="">All completion</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="LEFT">Left</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <select className={fieldClass} value={certFilter} onChange={(event) => setCertFilter(event.target.value)}>
          <option value="">All certification</option>
          <option value="PENDING">Pending</option>
          <option value="CERTIFIED">Certified</option>
          <option value="NOT_CERTIFIED">Not certified</option>
          <option value="NOT_APPLICABLE">N/A</option>
        </select>
        <select className={fieldClass} value={trainerFilter} onChange={(event) => setTrainerFilter(event.target.value)}>
          <option value="">All trainers</option>
          {trainers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={joinedMidOnly} onChange={(event) => setJoinedMidOnly(event.target.checked)} />
          Joined mid-batch only
        </label>
      </div>
      {trainees.length === 0 ? (
        <EmptyState
          title="No trainees in this batch"
          description={
            linkedCourses.length
              ? `Add people here. They will also be enrolled in ${linkedCourses.map((row) => row.title).join(", ")}.`
              : "Link course(s) first, then add people so they get both batch tracking and course access."
          }
        />
      ) : visibleTrainees.length === 0 ? (
        <EmptyState title="No matching trainees" description="Try clearing filters." />
      ) : (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                {[
                  "Trainee",
                  "Enrollment",
                  "Outcome",
                  "Completion",
                  "Certification",
                  "Course %",
                  "Exit date",
                  "Exit reason",
                  ...(canOperate ? ["Actions"] : []),
                ].map((label) => (
                  <th key={label} className="px-3 py-2 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTrainees.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{row.user.name}</p>
                    <p className="text-xs text-slate-500">{row.user.email}</p>
                    {row.joinedMidBatch ? <p className="text-xs font-medium text-amber-700">Joined mid-batch</p> : null}
                  </td>
                  <td className="px-3 py-2">{formatDay(row.enrollmentDate ?? row.joiningDate)}</td>
                  <td className="px-3 py-2">
                    <p>{outcomeLabel(row.outcomeCategory ?? "ACTIVE")}</p>
                    <p className="text-xs text-slate-500">{statusLabel(row.status)}</p>
                  </td>
                  <td className="px-3 py-2">{completionLabel(row.completionStatus ?? "IN_PROGRESS")}</td>
                  <td className="px-3 py-2">{certificationLabel(row.certificationStatus ?? "PENDING")}</td>
                  <td className="px-3 py-2">
                    {row.courseCompletionPercent === null || row.courseCompletionPercent === undefined
                      ? "—"
                      : `${row.courseCompletionPercent}%`}
                  </td>
                  <td className="px-3 py-2">{formatDay(row.exitDate)}</td>
                  <td className="px-3 py-2 text-slate-600">{row.exitReason || "—"}</td>
                  {canOperate ? (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className={secondaryButtonClass} onClick={() => setAction({ type: "attrition", trainee: row })}>
                          Record leave
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => setAction({ type: "exam", trainee: row })}>
                          Exam result
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => setAction({ type: "handover", trainee: row })}>
                          Handover
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canOperate ? (
        <>
      <Dialog open={addOpen} title="Add trainee to batch" onClose={() => setAddOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void addTrackerTrainee(batchId, {
              userId: String(data.get("userId")),
              joiningDate: String(data.get("joiningDate")),
              team: String(data.get("team") ?? ""),
            })
              .then(() => {
                setAddOpen(false);
                return reload();
              })
              .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to add trainee"));
          }}
        >
          {linkedCourses.length > 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              They will be tracked in this batch <span className="font-medium text-slate-800">and</span> enrolled in{" "}
              <span className="font-medium text-slate-800">{linkedCourses.map((row) => row.title).join(", ")}</span>.
            </p>
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No courses are linked yet. They will only appear in the batch tracker until you link courses.
            </p>
          )}
          <label className="text-sm font-medium text-slate-800">
            Trainee (LMS user)
            <RequiredMark />
            <select name="userId" className={`${fieldClass} mt-1`} required>
              <option value="">Select person</option>
              {people.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Joining date
            <RequiredMark />
            <input name="joiningDate" type="date" className={`${fieldClass} mt-1`} required />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Team
            <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
            <input name="team" className={`${fieldClass} mt-1`} placeholder="e.g. Team A" />
          </label>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-red-600">*</span> Required fields
          </p>
          <button type="submit" className={primaryButtonClass}>
            Add
          </button>
        </form>
      </Dialog>
      <Dialog
        open={linkOpen}
        title="Link courses"
        onClose={() => {
          setLinkOpen(false);
          setSelectedCourseIds([]);
        }}
      >
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedCourseIds.length === 0) {
              setError("Select at least one approved course");
              return;
            }
            void updateTrackerBatch(batchId, { programIds: selectedCourseIds })
              .then(() => {
                setLinkOpen(false);
                setSelectedCourseIds([]);
                return reload();
              })
              .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to link courses"));
          }}
        >
          <p className="text-sm text-slate-600">
            Choose one or more approved courses this batch should use. Trainers can only pick their own courses.
          </p>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-800">
              Courses
              <RequiredMark />
            </legend>
            {courses.map((row) => {
              const checked = selectedCourseIds.includes(row.id);
              return (
                <label key={row.id} className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
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
            })}
          </fieldset>
          <button type="submit" className={primaryButtonClass}>
            Save courses
          </button>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(action)}
        title={
          action
            ? action.type === "attrition"
              ? `Record leave · ${action.trainee.user.name}`
              : action.type === "exam"
                ? `Exam result · ${action.trainee.user.name}`
                : `Handover · ${action.trainee.user.name}`
            : ""
        }
        onClose={() => setAction(null)}
      >
        {action?.type === "attrition" ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void recordTrackerAttrition(action.trainee.id, {
                kind: String(data.get("kind")),
                date: String(data.get("date")),
                reason: String(data.get("reason")),
                remarks: String(data.get("remarks") ?? ""),
              })
                .then(() => {
                  setAction(null);
                  return reload();
                })
                .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to save"));
            }}
          >
            <p className="text-sm text-slate-600">
              Use this when someone leaves the batch. Early leave (first 3 working days) is HR attrition; later leave is
              training attrition.
            </p>
            <label className="text-sm font-medium text-slate-800">
              Why they left
              <RequiredMark />
              <select name="kind" className={`${fieldClass} mt-1`} required>
                <option value="HR">Left in first 3 working days (HR attrition)</option>
                <option value="TRAINING">Left after day 3 / did not pass training</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-800">
              Leave date
              <RequiredMark />
              <input name="date" type="date" className={`${fieldClass} mt-1`} required />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Reason
              <RequiredMark />
              <input name="reason" placeholder="e.g. Did not join" className={`${fieldClass} mt-1`} required />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Remarks
              <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
              <textarea name="remarks" placeholder="Extra notes" className={`${fieldClass} mt-1`} />
            </label>
            <button type="submit" className={primaryButtonClass}>
              Save leave
            </button>
          </form>
        ) : null}
        {action?.type === "exam" ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const appeared = String(data.get("appeared")) === "yes";
              void recordTrackerExam(action.trainee.id, {
                appeared,
                passed: appeared ? String(data.get("passed")) === "yes" : undefined,
                examDate: String(data.get("examDate")),
              })
                .then(() => {
                  setAction(null);
                  return reload();
                })
                .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to save"));
            }}
          >
            <label className="text-sm font-medium text-slate-800">
              Did they sit the exam?
              <RequiredMark />
              <select name="appeared" className={`${fieldClass} mt-1`} required>
                <option value="yes">Yes — appeared</option>
                <option value="no">No — did not appear</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-800">
              Exam result
              <RequiredMark />
              <select name="passed" className={`${fieldClass} mt-1`} required>
                <option value="yes">Passed / certified</option>
                <option value="no">Failed</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-800">
              Exam date
              <RequiredMark />
              <input name="examDate" type="date" className={`${fieldClass} mt-1`} required />
            </label>
            <button type="submit" className={primaryButtonClass}>
              Save exam
            </button>
          </form>
        ) : null}
        {action?.type === "handover" ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void recordTrackerHandover(action.trainee.id, {
                handoverDate: String(data.get("handoverDate")),
                team: String(data.get("team")),
                supervisorName: String(data.get("supervisorName") ?? ""),
                remarks: String(data.get("remarks") ?? ""),
              })
                .then(() => {
                  setAction(null);
                  return reload();
                })
                .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to save"));
            }}
          >
            <label className="text-sm font-medium text-slate-800">
              Handover date
              <RequiredMark />
              <input name="handoverDate" type="date" className={`${fieldClass} mt-1`} required />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Operations team
              <RequiredMark />
              <input name="team" placeholder="Team name" className={`${fieldClass} mt-1`} required />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Supervisor name
              <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
              <input name="supervisorName" placeholder="Supervisor" className={`${fieldClass} mt-1`} />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Remarks
              <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
              <textarea name="remarks" placeholder="Notes" className={`${fieldClass} mt-1`} />
            </label>
            <button type="submit" className={primaryButtonClass}>
              Mark handed over
            </button>
          </form>
        ) : null}
      </Dialog>
        </>
      ) : null}
    </div>
  );
}
