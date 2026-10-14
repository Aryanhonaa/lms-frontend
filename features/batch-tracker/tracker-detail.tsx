"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  ChevronRight,
  Download,
  LogOut,
  MoreHorizontal,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  getBatchTrackerDetail,
  reinstateEnrollment,
  undoHandover,
  updateTrackedBatch,
  type TrackerRole,
} from "@/lib/api/batch-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { TrackerBatch, TrackerDetail, TrackerTrainee } from "@/types/batch-tracker";
import { BatchStatusBadge, LateTag, LobChip, TraineeStageBadge } from "./badges";
import { GLOSSARY, STAGE_META, batchTitle, downloadCsv, formatDay, formatPct, isExited } from "./format";
import { ExitDialog, HandoverDialog, JoinedDateDialog, RemoveEnrollmentDialog } from "./trainee-actions";

type Filter =
  | "all"
  | "inTraining"
  | "hrAttrition"
  | "day7"
  | "trainingAttrition"
  | "appeared"
  | "certified"
  | "handedOver"
  | "exited"
  | "late";

const FILTERS: Record<Filter, { label: string; match: (row: TrackerTrainee) => boolean }> = {
  all: { label: "All", match: () => true },
  inTraining: { label: "In training", match: (row) => row.stage === "IN_TRAINING" || row.stage === "EXAM_PENDING" },
  hrAttrition: { label: "HR attrition", match: (row) => row.attrition === "HR" || row.attrition === "EARLY" },
  day7: { label: "Day 7 HC", match: (row) => row.attrition !== "HR" && row.attrition !== "EARLY" },
  trainingAttrition: { label: "Training attrition", match: (row) => row.attrition === "TRAINING" },
  appeared: { label: "Appeared", match: (row) => row.appeared },
  certified: { label: "Certified", match: (row) => row.certified },
  handedOver: { label: "Handed over", match: (row) => row.stage === "HANDED_OVER" },
  exited: { label: "Exited", match: (row) => isExited(row) },
  late: { label: "Joined late", match: (row) => row.joinedLate },
};

const CHIPS: Filter[] = ["all", "inTraining", "certified", "exited", "late"];

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function Timeline({ batch }: { batch: TrackerBatch }) {
  const marks = [
    { day: 3, label: "Joining closes", date: batch.milestones.joinWindowCloses },
    { day: 7, label: "HC locked", date: batch.milestones.headcountLocks },
    { day: 15, label: "Evaluation", date: batch.milestones.evaluation },
    { day: 25, label: "Final exam", date: batch.milestones.exam },
  ];
  const progress = (batch.trainingDay / batch.totalDays) * 100;
  return (
    <div className={`${cardClass} px-5 pt-5 pb-4`}>
      <div className="relative h-1.5 rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
          style={{ width: `${progress}%` }}
        />
        {marks.map((mark) => {
          const reached = batch.trainingDay >= mark.day;
          return (
            <span
              key={mark.day}
              className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${
                reached ? "bg-violet-600" : "bg-slate-300"
              }`}
              style={{ left: `${(mark.day / batch.totalDays) * 100}%` }}
              aria-hidden
            />
          );
        })}
      </div>
      <ol className="relative mt-3 h-9 text-xs">
        {marks.map((mark) => (
          <li
            key={mark.day}
            className={`absolute -translate-x-1/2 text-center whitespace-nowrap ${mark.day === 25 ? "-translate-x-full text-right" : ""}`}
            style={{ left: `${(mark.day / batch.totalDays) * 100}%` }}
          >
            <span className="block font-medium text-slate-700">
              Day {mark.day} · {formatDay(mark.date)}
            </span>
            <span className="block text-slate-400">{mark.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FunnelStrip({
  batch,
  active,
  onSelect,
}: {
  batch: TrackerBatch;
  active: Filter;
  onSelect: (filter: Filter) => void;
}) {
  const funnel = batch.funnel;
  const exitsBefore7 = funnel.hrAttrition + funnel.earlyExits;
  const steps: Array<{ filter: Filter; label: string; value: string; detail?: string; hint: string; loss?: boolean }> = [
    { filter: "all", label: "Received", value: String(funnel.actualHc), detail: funnel.joinedLate ? `${funnel.joinedLate} late` : undefined, hint: GLOSSARY.actualHc },
    {
      filter: "hrAttrition",
      label: "HR attrition",
      value: exitsBefore7 ? `−${exitsBefore7}` : "0",
      detail: funnel.earlyExits ? `${funnel.earlyExits} after day 3` : undefined,
      hint: GLOSSARY.hrAttrition,
      loss: true,
    },
    {
      filter: "day7",
      label: "Day 7 HC",
      value: String(funnel.day7Hc),
      detail: funnel.day7Locked ? undefined : "Not locked yet",
      hint: GLOSSARY.day7Hc,
    },
    {
      filter: "trainingAttrition",
      label: "Training attrition",
      value: funnel.trainingAttrition ? `−${funnel.trainingAttrition}` : "0",
      hint: GLOSSARY.trainingAttrition,
      loss: true,
    },
    { filter: "appeared", label: "Appeared", value: String(funnel.appeared), hint: GLOSSARY.appeared },
    {
      filter: "certified",
      label: "Certified",
      value: String(funnel.certified),
      detail: formatPct(funnel.certifiedPct),
      hint: GLOSSARY.certified,
    },
    {
      filter: "handedOver",
      label: "Handed over",
      value: String(funnel.handover),
      detail: funnel.handoverPending ? `${funnel.handoverPending} pending` : undefined,
      hint: GLOSSARY.handover,
    },
  ];
  return (
    <section className={`${cardClass} overflow-x-auto`} aria-label="Batch funnel">
      <ol className="flex min-w-max items-stretch">
        {steps.map((step, index) => {
          const selected = active === step.filter;
          return (
            <li key={step.filter} className="flex items-center">
              {index > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden /> : null}
              <button
                type="button"
                title={step.hint}
                aria-pressed={selected}
                onClick={() => onSelect(selected ? "all" : step.filter)}
                className={`m-1.5 rounded-xl px-4 py-3 text-left transition duration-150 ${
                  selected ? "bg-violet-50 ring-1 ring-violet-200" : "hover:bg-slate-50"
                }`}
              >
                <span className="block text-xs text-slate-500">{step.label}</span>
                <span
                  className={`mt-1 block text-xl font-semibold tabular-nums ${
                    step.loss && step.value !== "0" ? "text-rose-600" : "text-slate-900"
                  }`}
                >
                  {step.value}
                </span>
                <span className="block h-4 text-xs text-slate-400 tabular-nums">{step.detail ?? ""}</span>
              </button>
            </li>
          );
        })}
        <li className="ml-auto flex items-center border-l border-slate-100 px-5">
          <div title={GLOSSARY.throughput}>
            <span className="block text-xs text-slate-500">Throughput</span>
            <span className="mt-1 block text-xl font-semibold text-violet-700 tabular-nums">
              {formatPct(funnel.throughputPct)}
            </span>
            <span className="block h-4 text-xs text-slate-400">Certified ÷ Day 7</span>
          </div>
        </li>
      </ol>
    </section>
  );
}

type MenuAction = {
  label: string;
  hint?: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
};

const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

function RowMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!open || !button || !menu) {
      return;
    }
    function place() {
      if (!button || !menu) {
        return;
      }
      const anchor = button.getBoundingClientRect();
      const { width, height } = menu.getBoundingClientRect();
      const roomBelow = window.innerHeight - anchor.bottom;
      const openUp = roomBelow < height + MENU_GAP + VIEWPORT_MARGIN && anchor.top > roomBelow;
      const top = openUp ? anchor.top - height - MENU_GAP : anchor.bottom + MENU_GAP;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, anchor.right - width),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      menu.style.top = `${Math.max(VIEWPORT_MARGIN, top)}px`;
      menu.style.left = `${left}px`;
      menu.style.transformOrigin = openUp ? "bottom right" : "top right";
      menu.style.visibility = "visible";
    }
    place();
    menu.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();

    function close() {
      setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!menu?.contains(target) && !button?.contains(target)) {
        close();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        button?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      event.preventDefault();
      const items = Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "ArrowDown" ? current + 1 : current - 1;
      items[(next + items.length) % items.length]?.focus();
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (actions.length === 0) {
    return null;
  }

  const safe = actions.filter((action) => !action.danger);
  const danger = actions.filter((action) => action.danger);

  function item(action: MenuAction) {
    const Icon = action.icon;
    return (
      <button
        key={action.label}
        type="button"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          action.onSelect();
        }}
        className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition duration-150 ${
          action.danger
            ? "text-rose-700 hover:bg-rose-50 focus-visible:bg-rose-50"
            : "text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50"
        }`}
      >
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${action.danger ? "text-rose-500" : "text-slate-400"}`} />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{action.label}</span>
          {action.hint ? (
            <span className={`block text-xs ${action.danger ? "text-rose-600/70" : "text-slate-500"}`}>{action.hint}</span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${label}`}
        onClick={() => setOpen((value) => !value)}
        className={`rounded-lg p-1.5 transition duration-150 hover:bg-slate-100 hover:text-slate-700 ${
          open ? "bg-slate-100 text-slate-700" : "text-slate-400"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Actions for ${label}`}
              style={{ position: "fixed", top: 0, left: 0, visibility: "hidden" }}
              className="z-50 w-64 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-950/10"
              onClick={(event) => event.stopPropagation()}
            >
              {safe.map(item)}
              {safe.length > 0 && danger.length > 0 ? <div className="my-1 h-px bg-slate-100" role="separator" /> : null}
              {danger.map(item)}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function JourneyStep({ done, title, detail }: { done: boolean; title: string; detail?: string }) {
  return (
    <li className="relative pb-5 pl-6 last:pb-0">
      <span
        className={`absolute top-1 left-0 h-2.5 w-2.5 rounded-full ${done ? "bg-violet-600" : "bg-slate-200"}`}
        aria-hidden
      />
      <p className={`text-sm font-medium ${done ? "text-slate-900" : "text-slate-400"}`}>{title}</p>
      {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
    </li>
  );
}

function TraineeJourney({ row, batch }: { row: TrackerTrainee; batch: TrackerBatch }) {
  const exited = isExited(row);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <TraineeStageBadge stage={row.stage} />
        {row.joinedLate ? <LateTag /> : null}
      </div>
      <p className="text-sm text-slate-600">{STAGE_META[row.stage].hint}</p>
      <ol className="border-l border-slate-100 pl-0">
        <JourneyStep done title="Joined" detail={`${formatDay(row.joinedAt, true)} · Day ${row.joinDay} of the batch`} />
        {exited ? (
          <JourneyStep
            done
            title={row.stage === "TERMINATED" ? "Terminated" : row.stage === "HR_ATTRITION" ? "Left (HR attrition)" : "Left"}
            detail={[
              row.exitedAt ? `${formatDay(row.exitedAt, true)}${row.exitDay ? ` · Day ${row.exitDay}` : ""}` : null,
              row.exitReason || null,
              row.exitedBy ? `Recorded by ${row.exitedBy.name}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : (
          <>
            <JourneyStep
              done={batch.funnel.day7Locked}
              title="Counted in Day 7 HC"
              detail={formatDay(batch.milestones.headcountLocks, true)}
            />
            <JourneyStep done={row.progress >= 100} title="Training" detail={`${Math.round(row.progress)}% complete`} />
            <JourneyStep
              done={row.appeared}
              title="Final exam"
              detail={
                row.exam
                  ? row.exam.needsReview
                    ? "Waiting for grading"
                    : `${row.exam.score ?? "–"}% · ${row.exam.passed ? "Passed" : "Not passed"}`
                  : formatDay(batch.milestones.exam, true)
              }
            />
            <JourneyStep
              done={row.certified}
              title="Certified"
              detail={row.certificate ? `${row.certificate.certificateId} · ${formatDay(row.certificate.issuedAt.slice(0, 10), true)}` : row.certified ? "Certificate issues when the trainee opens it" : undefined}
            />
            <JourneyStep
              done={Boolean(row.handedOverAt)}
              title="Handed over"
              detail={row.handedOverAt ? `${row.team?.name ?? "Team"} · ${formatDay(row.handedOverAt, true)}` : undefined}
            />
          </>
        )}
      </ol>
      <p className="text-xs text-slate-400">{row.trainee.email}</p>
    </div>
  );
}

export function BatchTrackerDetail({
  role,
  batchId,
  onLoaded,
}: {
  role: TrackerRole;
  batchId: string;
  onLoaded?: (title: string) => void;
}) {
  const [data, setData] = useState<TrackerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<TrackerTrainee | null>(null);
  const [exitTarget, setExitTarget] = useState<{ row: TrackerTrainee; type: "LEFT" | "TERMINATED" } | null>(null);
  const [joinedTarget, setJoinedTarget] = useState<TrackerTrainee | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ enrollmentId: string; name: string } | null>(null);
  const [handover, setHandover] = useState<{ key: number; preselected: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const payload = await getBatchTrackerDetail(role, batchId);
    setData(payload);
    setError(null);
    onLoaded?.(batchTitle(payload.batch));
  }, [batchId, onLoaded, role]);

  useEffect(() => {
    let cancelled = false;
    getBatchTrackerDetail(role, batchId)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
          onLoaded?.(batchTitle(payload.batch));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(errorText(err, "Unable to load this batch."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [batchId, onLoaded, role]);

  const refresh = useCallback(
    async (message?: string) => {
      try {
        await load();
        setNotice(message ?? null);
      } catch (err: unknown) {
        setError(errorText(err, "Unable to refresh."));
      }
    },
    [load],
  );

  const rows = useMemo(() => (data ? data.trainees.filter(FILTERS[filter].match) : []), [data, filter]);
  const handoverCandidates = useMemo(
    () => (data ? data.trainees.filter((row) => row.certified && !row.handedOverAt) : []),
    [data],
  );

  async function runAction(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh(message);
    } catch (err: unknown) {
      setError(errorText(err, "Unable to save."));
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return <ErrorState message={error} />;
  }
  if (!data) {
    return <LoadingState label="Loading batch…" />;
  }

  const { batch, today } = data;
  const evaluationSoon =
    batch.status === "ONGOING" && batch.trainingDay >= 12 && batch.trainingDay < 15 && batch.milestones.evaluation;
  const trainingOver = batch.status === "ONGOING" && batch.trainingDay >= batch.totalDays;

  function actionsFor(row: TrackerTrainee): MenuAction[] {
    if (isExited(row)) {
      return [
        {
          label: "Reinstate",
          hint: "Bring them back into this batch",
          icon: RotateCcw,
          onSelect: () =>
            void runAction(() => reinstateEnrollment(role, row.enrollmentId), `${row.trainee.name} is back in the batch.`),
        },
      ];
    }
    const actions: MenuAction[] = [
      { label: "Change joining date", icon: CalendarClock, onSelect: () => setJoinedTarget(row) },
    ];
    if (row.certified && !row.handedOverAt) {
      actions.push({
        label: "Hand over",
        hint: "Move to a sales floor team",
        icon: Send,
        onSelect: () => setHandover({ key: Date.now(), preselected: [row.enrollmentId] }),
      });
    }
    if (row.handedOverAt) {
      actions.push({
        label: "Undo handover",
        icon: Undo2,
        onSelect: () =>
          void runAction(() => undoHandover(role, row.enrollmentId), `Handover undone for ${row.trainee.name}.`),
      });
    }
    actions.push(
      {
        label: "Mark as left",
        hint: "Resigned or stopped attending",
        icon: LogOut,
        onSelect: () => setExitTarget({ row, type: "LEFT" }),
        danger: true,
      },
      {
        label: "Terminate",
        hint: "Removed from training",
        icon: UserX,
        onSelect: () => setExitTarget({ row, type: "TERMINATED" }),
        danger: true,
      },
    );
    if (row.canRemove) {
      actions.push({
        label: "Remove from batch",
        hint: "Enrolled by mistake · no attrition",
        icon: Trash2,
        onSelect: () => setRemoveTarget({ enrollmentId: row.enrollmentId, name: row.trainee.name }),
        danger: true,
      });
    }
    return actions;
  }

  function exportTrainees() {
    downloadCsv(
      `${batchTitle(batch)}-trainees.csv`,
      ["Name", "Email", "Batch", "Sales Trainer", "Support Trainer", "Joined", "Status", "Progress %", "Final Exam", "Certified", "Team", "Handed Over", "Exit Date", "Exit Reason"],
      data!.trainees.map((row) => [
        row.trainee.name,
        row.trainee.email,
        batchTitle(batch),
        batch.salesTrainer?.name ?? "",
        batch.supportTrainer?.name ?? "",
        row.joinedAt ?? "",
        STAGE_META[row.stage].label,
        Math.round(row.progress),
        row.exam?.score ?? "",
        row.certified ? "Yes" : "No",
        row.team?.name ?? "",
        row.handedOverAt ?? "",
        row.exitedAt ?? "",
        row.exitReason,
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{batchTitle(batch)}</h2>
            <LobChip value={batch.lineOfBusiness} />
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[
              batch.program.title,
              batch.salesTrainer ? `${batch.salesTrainer.name} (Sales)` : null,
              batch.supportTrainer ? `${batch.supportTrainer.name} (Support)` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
            {batch.startDate ? `Started ${formatDay(batch.startDate, true)}` : "No start date"}
            {batch.targetCompletionDate ? ` · Target ${formatDay(batch.targetCompletionDate, true)}` : ""}
            {batch.actualCompletionDate
              ? ` · Completed ${formatDay(batch.actualCompletionDate, true)}`
              : batch.status === "ONGOING"
                ? ` · Day ${batch.trainingDay} of ${batch.totalDays}`
                : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={secondaryButtonClass} onClick={exportTrainees}>
            <Download className="h-4 w-4" />
            Export
          </button>
          {batch.actualCompletionDate ? (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => updateTrackedBatch(role, batch.id, { actualCompletionDate: null }),
                  "Batch reopened.",
                )
              }
            >
              Reopen
            </button>
          ) : batch.status === "ONGOING" ? (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => updateTrackedBatch(role, batch.id, { actualCompletionDate: today }),
                  "Batch marked as completed.",
                )
              }
            >
              Mark completed
            </button>
          ) : null}
          {data.canManage ? (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={handoverCandidates.length === 0}
              onClick={() =>
                setHandover({ key: Date.now(), preselected: handoverCandidates.map((row) => row.enrollmentId) })
              }
            >
              Hand over{handoverCandidates.length > 0 ? ` (${handoverCandidates.length})` : ""}
            </button>
          ) : null}
        </div>
      </header>

      {!data.canManage ? (
        <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
          You can view this batch. Only its assigned trainers can mark trainees as left, terminate, reinstate or hand
          them over.
        </p>
      ) : null}

      {batch.startDate ? <Timeline batch={batch} /> : null}

      {evaluationSoon ? (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Day-15 evaluation is on {formatDay(batch.milestones.evaluation)}. Review{" "}
          {batch.funnel.inTraining + batch.funnel.examPending} trainees in training.
        </p>
      ) : null}
      {trainingOver ? (
        <p className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
          All 25 training days are done. Mark the batch completed once the final exam is over.
        </p>
      ) : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <ErrorState message={error} /> : null}

      <FunnelStrip batch={batch} active={filter} onSelect={setFilter} />

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
          {CHIPS.map((chip) => {
            const count = data.trainees.filter(FILTERS[chip].match).length;
            const active = filter === chip;
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(chip)}
                className={`rounded-full px-3 py-1 text-sm transition duration-150 ${
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {FILTERS[chip].label} <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
          {!CHIPS.includes(filter) ? (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-700">
              {FILTERS[filter].label} <span className="tabular-nums opacity-70">{rows.length}</span>
            </span>
          ) : null}
        </div>

        {data.trainees.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No trainees in this batch yet"
              description="Enroll trainees from the program's Trainees page. Their joining date starts the count."
            />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Nobody in this group.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th scope="col" className="px-5 py-2.5 font-medium">Name</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Joined</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Progress</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Final exam</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Team</th>
                  <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const exited = isExited(row);
                  return (
                    <tr
                      key={row.enrollmentId}
                      className="cursor-pointer transition duration-150 hover:bg-slate-50/80"
                      onClick={() => setViewing(row)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{row.trainee.name}</span>
                          {row.joinedLate ? <LateTag /> : null}
                        </div>
                        {exited && (row.exitedAt || row.exitReason) ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {[row.exitedAt ? `Left ${formatDay(row.exitedAt)}` : null, row.exitReason || null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                        {formatDay(row.joinedAt)}
                        <span className="text-slate-400"> · Day {row.joinDay}</span>
                      </td>
                      <td className="px-3 py-3">
                        <TraineeStageBadge stage={row.stage} />
                      </td>
                      <td className="px-3 py-3">
                        {exited ? (
                          <span className="text-slate-400 tabular-nums">{Math.round(row.progress)}%</span>
                        ) : (
                          <div className="flex w-32 items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar value={row.progress} />
                            </div>
                            <span className="w-9 text-right text-xs text-slate-600 tabular-nums">
                              {Math.round(row.progress)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                        {row.exam ? (row.exam.needsReview ? "Grading" : `${row.exam.score ?? "–"}%`) : "–"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.team?.name ?? "–"}</td>
                      <td className="px-3 py-3 text-right">
                        {data.canManage ? <RowMenu actions={actionsFor(row)} label={row.trainee.name} /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={Boolean(viewing)} title={viewing?.trainee.name ?? ""} onClose={() => setViewing(null)} side>
        {viewing ? <TraineeJourney row={viewing} batch={batch} /> : null}
      </Dialog>

      <ExitDialog
        role={role}
        trainee={exitTarget?.row ?? null}
        type={exitTarget?.type ?? "LEFT"}
        today={today}
        onClose={() => setExitTarget(null)}
        onDone={() => {
          const name = exitTarget?.row.trainee.name ?? "Trainee";
          const terminated = exitTarget?.type === "TERMINATED";
          setExitTarget(null);
          void refresh(terminated ? `${name} was terminated.` : `${name} was marked as left.`);
        }}
      />
      <RemoveEnrollmentDialog
        role={role}
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onDone={() => {
          const name = removeTarget?.name ?? "Trainee";
          setRemoveTarget(null);
          setViewing(null);
          void refresh(`${name} was removed from this batch.`);
        }}
      />
      <JoinedDateDialog
        role={role}
        trainee={joinedTarget}
        today={today}
        onClose={() => setJoinedTarget(null)}
        onDone={() => {
          setJoinedTarget(null);
          void refresh("Joining date updated.");
        }}
      />
      {handover ? (
        <HandoverDialog
          key={handover.key}
          role={role}
          batchId={batch.id}
          open
          candidates={handoverCandidates}
          preselected={handover.preselected}
          today={today}
          canManageTeams={role === "admin"}
          onClose={() => setHandover(null)}
          onDone={() => {
            setHandover(null);
            void refresh("Handed over to the sales floor.");
          }}
        />
      ) : null}
    </div>
  );
}
