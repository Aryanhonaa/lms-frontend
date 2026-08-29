"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Circle, CircleDot, Lock, X } from "lucide-react";
import { CourseOutcomePanel } from "@/components/course-outcome";
import { ProgressBar } from "@/components/ui/progress-bar";
import { traineeContinueHref, type PathItem } from "@/lib/learning/path";
import {
  assessmentHierarchy,
  isActionableStatus,
  isDoneStatus,
  pathItemStatusCopy,
  progressHeadline,
  quizAttemptLine,
} from "@/lib/learning/ux";
import type { LearnView } from "@/types/learning";

function dayCounts(items: PathItem[]): { done: number; total: number } {
  return {
    done: items.filter((item) => isDoneStatus(item.status)).length,
    total: items.length,
  };
}

function dayMarker(
  items: PathItem[],
  current: PathItem | null,
): { label: string; icon: "done" | "current" | "locked" | "idle" } {
  if (items.some((item) => current?.id === item.id && current.type === item.type)) {
    return { label: "Current day", icon: "current" };
  }
  if (items.length > 0 && items.every((item) => isDoneStatus(item.status))) {
    return { label: "Completed", icon: "done" };
  }
  if (items.length > 0 && items.every((item) => item.status === "LOCKED")) {
    return { label: "Locked", icon: "locked" };
  }
  return { label: "Not started", icon: "idle" };
}

function contentLabel(item: PathItem): string {
  if (item.kind === "FINAL_EXAM") {
    return "Final Exam";
  }
  if (item.kind === "MILESTONE_EXAM") {
    return "Milestone Exam";
  }
  if (item.type === "ASSIGNMENT") {
    return "Assignment";
  }
  if (item.type === "QUIZ") {
    return "Quiz";
  }
  if (item.type === "LESSON") {
    return "Lesson";
  }
  if (item.type === "VIDEO") {
    return "Video";
  }
  if (item.type === "REEL") {
    return "Reel";
  }
  if (item.type === "RESOURCE") {
    return "Reading";
  }
  return "Lesson";
}

function StatusGlyph({ item, active }: { item: PathItem; active: boolean }) {
  const now = isActionableStatus(item.status, item.canRetry);
  if (isDoneStatus(item.status)) {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden>
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (item.status === "FAILED") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white" aria-hidden>
        <X className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (item.status === "LOCKED") {
    return <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
  }
  if (active || now) {
    return (
      <span className={`flex h-5 w-5 items-center justify-center ${active ? "lms-now-pulse" : ""}`} aria-hidden>
        <CircleDot className="h-4 w-4 text-violet-600" />
      </span>
    );
  }
  return <Circle className="h-3.5 w-3.5 text-slate-300" aria-hidden />;
}

function PathRow({
  item,
  active,
  programId,
  batchId,
  onClick,
  rowRef,
}: {
  item: PathItem;
  active: boolean;
  programId: string;
  batchId?: string;
  onClick: () => void;
  rowRef?: (node: HTMLAnchorElement | null) => void;
}) {
  const href = traineeContinueHref(programId, item, batchId);
  const locked = item.status === "LOCKED";
  const hierarchy = assessmentHierarchy(item.kind);
  const status = pathItemStatusCopy(item, active);
  const detail = item.status === "FAILED" || hierarchy === "final" ? quizAttemptLine(item) : null;

  return (
    <Link
      ref={rowRef}
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={`${item.title}, ${contentLabel(item)}, ${status.label}`}
      className={`group flex items-start gap-2.5 rounded-xl px-2 py-2 text-sm transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
        active
          ? hierarchy === "final"
            ? "bg-amber-50 ring-1 ring-amber-200"
            : "bg-violet-50 ring-1 ring-violet-100"
          : locked
            ? "opacity-70 hover:bg-slate-50 hover:opacity-100"
            : hierarchy === "final"
              ? "hover:bg-amber-50/70"
              : "hover:bg-slate-50"
      }`}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <StatusGlyph item={item} active={active} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${active ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
          {item.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500">
          {contentLabel(item)}
          <span aria-hidden>·</span>
          {status.label}
        </span>
        {detail ? <span className="mt-0.5 block text-[11px] text-slate-500">{detail}</span> : null}
      </span>
    </Link>
  );
}

function FinalCallout({
  exam,
  programId,
  batchId,
  active,
  onClick,
  rowRef,
}: {
  exam: PathItem;
  programId: string;
  batchId?: string;
  active: boolean;
  onClick: () => void;
  rowRef?: (node: HTMLAnchorElement | null) => void;
}) {
  const status = pathItemStatusCopy(exam, active);
  const detail = quizAttemptLine(exam);
  return (
    <div className="mx-1 mb-3 rounded-2xl bg-amber-50/80 p-3 ring-1 ring-amber-100">
      <p className="px-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase">Final assessment</p>
      <PathRow
        item={exam}
        active={active}
        programId={programId}
        batchId={batchId}
        onClick={onClick}
        rowRef={rowRef}
      />
      {exam.status === "AVAILABLE" && exam.passingScore != null ? (
        <p className="px-2 text-[11px] text-amber-900/80">
          {exam.passingScore}% required · {status.label}
        </p>
      ) : null}
      {exam.status === "FAILED" && detail ? <p className="px-2 text-[11px] text-rose-800">{detail}</p> : null}
    </div>
  );
}

export function LearnSidebar({
  view,
  path,
  current,
  batchId,
  sidebarOpen,
  toolbar,
  onNavigate,
  activeRef,
}: {
  view: LearnView;
  path: PathItem[];
  current: PathItem | null;
  batchId?: string;
  sidebarOpen: boolean;
  toolbar?: ReactNode;
  onNavigate: () => void;
  activeRef: (node: HTMLAnchorElement | null) => void;
}) {
  const currentWeekId =
    view.weeks.find((week) => week.title === current?.weekTitle)?.id ?? view.currentWeek?.id ?? view.weeks[0]?.id;
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentWeekId) {
      return;
    }
    setOpenWeeks((currentOpen) => ({ ...currentOpen, [currentWeekId]: true }));
  }, [currentWeekId]);

  const headline = progressHeadline(
    view.progress.completedRequired,
    view.progress.totalRequired,
    view.progress.percent,
    view.course.outcome,
  );
  const finalItem = useMemo(() => path.find((item) => item.kind === "FINAL_EXAM") ?? null, [path]);

  function weekOpen(weekId: string, isCurrent: boolean): boolean {
    if (openWeeks[weekId] != null) {
      return openWeeks[weekId];
    }
    return isCurrent;
  }

  return (
    <aside
      className={`${sidebarOpen ? "block" : "hidden"} flex w-full shrink-0 flex-col overflow-hidden border-slate-200/80 bg-white md:flex md:w-80 md:border-r`}
    >
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">My Course</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{view.program.title}</p>
        <p className="mt-2 text-sm text-slate-500">{headline}</p>
        <div className="mt-3">
          <ProgressBar value={view.progress.percent} tone="violet" size="md" />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Progress {Math.round(view.progress.percent)}% · {view.progress.completedRequired} of {view.progress.totalRequired}{" "}
          completed
        </p>
        <div className="mt-3">
          <CourseOutcomePanel course={view.course} />
        </div>
        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Course roadmap">
        {finalItem ? (
          <FinalCallout
            exam={finalItem}
            programId={view.program.id}
            batchId={batchId}
            active={current?.id === finalItem.id && current.type === finalItem.type}
            onClick={onNavigate}
            rowRef={current?.id === finalItem.id && current.type === finalItem.type ? activeRef : undefined}
          />
        ) : null}
        {view.weeks.map((week) => {
          const weekItems = path.filter(
            (item) => item.weekTitle === week.title && item.dayTitle && item.kind !== "FINAL_EXAM",
          );
          const weekQuizzes = path.filter(
            (item) =>
              item.weekTitle === week.title &&
              !item.dayTitle &&
              item.kind !== "FINAL_EXAM" &&
              item.kind !== "MILESTONE_EXAM",
          );
          const weekMilestones = path.filter(
            (item) => item.weekTitle === week.title && item.kind === "MILESTONE_EXAM",
          );
          const stats = dayCounts([...weekItems, ...weekQuizzes, ...weekMilestones]);
          const isCurrent = week.id === currentWeekId;
          const expanded = weekOpen(week.id, isCurrent);
          return (
            <div
              key={week.id}
              className={`mb-3 rounded-2xl ${isCurrent ? "bg-violet-50/60 ring-1 ring-violet-100" : ""}`}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-2xl px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-expanded={expanded}
                onClick={() => setOpenWeeks((value) => ({ ...value, [week.id]: !expanded }))}
              >
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? "" : "-rotate-90"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{week.title}</span>
                  <span className="block text-[11px] font-medium text-slate-500">
                    {week.status === "LOCKED" ? "Locked" : `${stats.done} / ${stats.total} completed`}
                    {isCurrent ? " · Current week" : ""}
                  </span>
                </span>
              </button>
              {week.status === "LOCKED" && week.reason && expanded ? (
                <p className="px-2 pb-2 text-xs leading-5 text-slate-500">
                  {week.reason.replace(/\bprogram\b/gi, "course")}
                </p>
              ) : null}
              {expanded ? (
                <div className="px-1 pb-2">
                  {week.days.map((day) => {
                    const items = path.filter(
                      (item) =>
                        item.weekTitle === week.title && item.dayTitle === day.title && item.kind !== "FINAL_EXAM",
                    );
                    const counts = dayCounts(items);
                    const marker = dayMarker(items, current);
                    return (
                      <div key={day.id} className="mt-2">
                        <div className="flex items-center justify-between px-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            {marker.icon === "done" ? <Check className="h-3 w-3 text-emerald-600" aria-hidden /> : null}
                            {marker.icon === "current" ? (
                              <CircleDot className="h-3 w-3 text-violet-600" aria-hidden />
                            ) : null}
                            {marker.icon === "locked" ? <Lock className="h-3 w-3 text-slate-400" aria-hidden /> : null}
                            {marker.icon === "idle" ? <Circle className="h-3 w-3 text-slate-300" aria-hidden /> : null}
                            <span>{day.title}</span>
                            <span className="sr-only">{marker.label}</span>
                          </p>
                          {counts.total > 0 ? (
                            <span className="text-[11px] text-slate-400">
                              {counts.done === counts.total ? "Done" : `${counts.done} of ${counts.total}`}
                            </span>
                          ) : null}
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {items.map((item) => (
                            <li key={`${item.type}-${item.id}`}>
                              <PathRow
                                item={item}
                                active={current?.id === item.id && current.type === item.type}
                                programId={view.program.id}
                                batchId={batchId}
                                onClick={onNavigate}
                                rowRef={
                                  current?.id === item.id && current.type === item.type ? activeRef : undefined
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {weekQuizzes.length > 0 ? (
                    <ul className="mt-2 space-y-0.5">
                      {weekQuizzes.map((item) => (
                        <li key={`week-quiz-${item.id}`}>
                          <PathRow
                            item={item}
                            active={current?.id === item.id && current.type === item.type}
                            programId={view.program.id}
                            batchId={batchId}
                            onClick={onNavigate}
                            rowRef={current?.id === item.id && current.type === item.type ? activeRef : undefined}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {weekMilestones.length > 0 ? (
                    <div className="mt-2 rounded-xl bg-fuchsia-50/70 p-1 ring-1 ring-fuchsia-100">
                      <p className="px-2 pt-1 text-[11px] font-semibold tracking-wide text-fuchsia-800 uppercase">
                        Milestone
                      </p>
                      <ul className="space-y-0.5">
                        {weekMilestones.map((item) => (
                          <li key={`milestone-${item.id}`}>
                            <PathRow
                              item={item}
                              active={current?.id === item.id && current.type === item.type}
                              programId={view.program.id}
                              batchId={batchId}
                              onClick={onNavigate}
                              rowRef={current?.id === item.id && current.type === item.type ? activeRef : undefined}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
