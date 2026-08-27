"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Lock,
  Play,
} from "lucide-react";
import { completeTraineeItem } from "@/lib/api/learning";
import { ApiClientError } from "@/lib/api/client";
import { requestCourseReviewCheck } from "@/lib/course-review";
import { isYoutubeShortsUrl, youtubeEmbedSrc, youtubeVideoId } from "@/lib/media/youtube";
import { nextPathItem, traineePathHref, traineeWorkHref, type PathItem } from "@/lib/learning/path";
import {
  contentTypeLabel,
  currentDayItems,
  doThisFirst,
  flattenLearnPath,
  friendlyLockReason,
  isActionableStatus,
  isDoneStatus,
  locationLabel,
  nextUnlockItem,
  progressHeadline,
  statusCopy,
} from "@/lib/learning/ux";
import { ContentTypeChip, ContentTypeIcon } from "@/components/learning/content-type-chip";
import { FileActionsRow, FileViewer } from "@/components/files/file-viewer";
import { getAttachmentAccess, getItemFileAccess } from "@/lib/api/files";
import type { AttachmentView } from "@/types/files";
import { LockCard, UnlocksNextCard } from "@/components/learning/lock-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import type { LearnItem, LearnPathType, LearnView } from "@/types/learning";

function YoutubeEmbed({ title, url, vertical }: { title: string; url: string; vertical?: boolean }) {
  const id = youtubeVideoId(url);
  if (!id) {
    return null;
  }
  return (
    <div
      className={
        vertical
          ? "mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-lg"
          : "aspect-video overflow-hidden rounded-2xl bg-black shadow-lg"
      }
    >
      <iframe
        title={title}
        src={youtubeEmbedSrc(id)}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function AttachmentList({ attachments, batchId }: { attachments: AttachmentView[]; batchId?: string }) {
  return (
    <div className={`${traineeCardClass} px-5 py-4 md:px-6`}>
      <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Attachments</p>
      <ul className="mt-3 space-y-3">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="rounded-xl bg-slate-50 px-3 py-3">
            <FileActionsRow
              loader={() => getAttachmentAccess("trainee", attachment.id, batchId)}
              fileName={attachment.title || attachment.fileName}
              fileSize={attachment.fileSize}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemBody({ item, batchId }: { item: LearnItem; batchId?: string }) {
  if (item.status === "LOCKED") {
    return null;
  }

  if (item.type === "LESSON") {
    return (
      <div className="space-y-4">
        <article className={`${traineeCardClass} px-5 py-5 text-sm leading-7 text-slate-700 md:px-6`}>
          {item.description ? <p className="whitespace-pre-wrap">{item.description}</p> : <p>Notes for this lesson will show up here.</p>}
        </article>
        {item.attachments?.length ? <AttachmentList attachments={item.attachments} batchId={batchId} /> : null}
      </div>
    );
  }

  // Files stored by the LMS resolve through a short-lived authorized URL.
  if (item.file && (item.type === "VIDEO" || item.type === "REEL" || item.type === "RESOURCE")) {
    return (
      <div className="space-y-4">
        {item.type === "RESOURCE" && item.description ? (
          <p className={`${traineeCardClass} px-5 py-4 text-sm whitespace-pre-wrap text-slate-700 md:px-6`}>{item.description}</p>
        ) : null}
        <FileViewer
          loader={() => getItemFileAccess("trainee", item.type as "VIDEO" | "RESOURCE" | "REEL", item.id, batchId)}
          fileName={item.file.fileName}
          mimeType={item.file.mimeType}
          fileSize={item.file.fileSize}
          title={item.title}
        />
      </div>
    );
  }

  if (item.type === "VIDEO" && item.url) {
    if (youtubeVideoId(item.url)) {
      return <YoutubeEmbed title={item.title} url={item.url} vertical={isYoutubeShortsUrl(item.url)} />;
    }
    return (
      <video className="w-full overflow-hidden rounded-2xl bg-black shadow-lg" src={item.url} controls>
        <a href={item.url} className="text-sm underline">
          Open video
        </a>
      </video>
    );
  }

  if (item.type === "REEL" && item.url) {
    if (youtubeVideoId(item.url)) {
      return <YoutubeEmbed title={item.title} url={item.url} vertical />;
    }
    return <video className="mx-auto max-h-[70vh] w-full overflow-hidden rounded-2xl bg-black shadow-lg" src={item.url} controls />;
  }

  if (item.type === "RESOURCE") {
    return (
      <div className={`${traineeCardClass} space-y-3 px-5 py-5 text-sm`}>
        {item.description ? <p className="whitespace-pre-wrap text-slate-700">{item.description}</p> : null}
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={`${traineePrimaryCtaClass} w-fit`}
          >
            Open reading
          </a>
        ) : null}
      </div>
    );
  }

  return <p className="text-sm text-slate-500">This item has no preview yet.</p>;
}

function ActivityCard({
  item,
  programId,
  batchId,
}: {
  item: PathItem;
  programId: string;
  batchId?: string;
}) {
  const done = isDoneStatus(item.status);
  const action =
    item.type === "ASSIGNMENT"
      ? done
        ? "Review assignment"
        : item.status === "IN_PROGRESS"
          ? "Continue assignment"
          : "Start assignment"
      : done
        ? "Review quiz"
        : item.status === "IN_PROGRESS" || item.status === "FAILED"
          ? "Continue quiz"
          : "Start quiz";

  return (
    <div className={`${traineeCardClass} overflow-hidden`}>
      <div className="bg-gradient-to-br from-white via-white to-violet-50/50 px-5 py-5 md:px-6">
        <ContentTypeChip type={item.type} kind={item.kind} />
        {item.description ? <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600">{item.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
          {item.dueDate ? <span>Due {new Date(item.dueDate).toLocaleDateString()}</span> : null}
          {item.maxScore ? <span>{item.maxScore} points</span> : null}
        </div>
        <Link href={traineeWorkHref(programId, item, batchId)} className={`${traineePrimaryCtaClass} mt-5`}>
          <Play className="h-4 w-4 fill-current" />
          {action}
        </Link>
      </div>
    </div>
  );
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
  const href = traineePathHref(programId, { type: item.type, id: item.id }, batchId);
  const done = isDoneStatus(item.status);
  const locked = item.status === "LOCKED";
  const now = isActionableStatus(item.status);

  return (
    <Link
      ref={rowRef}
      href={href}
      onClick={onClick}
      className={`group flex items-start gap-2.5 rounded-xl px-2 py-2 text-sm transition duration-150 ${
        active
          ? "bg-violet-50 ring-1 ring-violet-100"
          : locked
            ? "opacity-70 hover:bg-slate-50 hover:opacity-100"
            : "hover:bg-slate-50"
      }`}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {done ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : locked ? (
          <Lock className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${now && active ? "lms-now-pulse bg-violet-500" : now ? "bg-violet-400" : "bg-slate-300"}`} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${active ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
          {item.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          {contentTypeLabel(item.type, item.kind)}
          <span aria-hidden>·</span>
          {statusCopy(item.status).label}
        </span>
      </span>
    </Link>
  );
}

function dayCounts(items: PathItem[]): { done: number; total: number } {
  return {
    done: items.filter((item) => isDoneStatus(item.status)).length,
    total: items.length,
  };
}

type LearnWorkspaceProps = {
  view: LearnView;
  batchId?: string;
  currentType?: LearnPathType | null;
  currentId?: string | null;
  onViewChange: (view: LearnView) => void;
  toolbar?: ReactNode;
};

export function LearnWorkspace({ view, batchId, currentType, currentId, onViewChange, toolbar }: LearnWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  const path = useMemo(() => flattenLearnPath(view), [view]);
  const current =
    path.find((item) => item.type === currentType && item.id === currentId) ??
    path.find((item) => isActionableStatus(item.status)) ??
    path.find((item) => isDoneStatus(item.status)) ??
    path[0] ??
    null;
  const next = nextPathItem(path, current) ?? view.nextActivity;
  const unlocks = nextUnlockItem(path, current);
  const firstAction = doThisFirst(path);
  const today = currentDayItems(view, path);
  const todayStats = dayCounts(today);
  const contentItem =
    current && current.type !== "QUIZ" && current.type !== "ASSIGNMENT"
      ? view.weeks.flatMap((week) => week.days).flatMap((day) => day.items).find((item) => item.id === current.id && item.type === current.type)
      : null;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current?.id, current?.type]);

  async function complete() {
    if (!current || current.status === "LOCKED" || current.type === "QUIZ" || current.type === "ASSIGNMENT") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const nextView = await completeTraineeItem(current.type, current.id, batchId);
      onViewChange(nextView);
      requestCourseReviewCheck();
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1200);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to save completion");
    } finally {
      setPending(false);
    }
  }

  const headline = progressHeadline(view.progress.completedRequired, view.progress.totalRequired, view.progress.percent);
  const currentStatus = current ? statusCopy(current.status) : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#f6f7fb] md:flex-row">
      {celebrate ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-24">
          <div className="lms-check-pop flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20">
            <Check className="h-4 w-4" strokeWidth={3} />
            Completed
          </div>
        </div>
      ) : null}

      <div className="border-b border-slate-200/80 bg-white px-4 py-3 md:hidden">
        <button type="button" className={traineeSecondaryCtaClass} onClick={() => setSidebarOpen((open) => !open)}>
          {sidebarOpen ? "Hide journey" : "Your Journey"}
        </button>
      </div>

      <aside
        className={`${sidebarOpen ? "block" : "hidden"} flex w-full shrink-0 flex-col overflow-hidden border-slate-200/80 bg-white md:flex md:w-80 md:border-r`}
      >
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">Your Journey</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{view.program.title}</p>
          <p className="mt-2 text-sm text-slate-500">{headline}</p>
          <div className="mt-3">
            <ProgressBar value={view.progress.percent} tone="violet" size="md" />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {view.progress.completedRequired} of {view.progress.totalRequired} completed
          </p>
          {toolbar ? <div className="mt-4">{toolbar}</div> : null}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Your journey">
          {view.weeks.map((week) => {
            const weekItems = path.filter((item) => item.weekTitle === week.title && item.dayTitle);
            const weekQuizzes = path.filter((item) => item.weekTitle === week.title && !item.dayTitle && item.kind !== "FINAL_EXAM");
            const stats = dayCounts([...weekItems, ...weekQuizzes]);
            return (
              <div key={week.id} className="mb-5">
                <div className="flex items-center justify-between gap-2 px-2">
                  <p className="text-sm font-semibold text-slate-900">{week.title}</p>
                  <span className="text-[11px] font-medium text-slate-400">
                    {week.status === "LOCKED" ? "Locked" : `${stats.done} of ${stats.total}`}
                  </span>
                </div>
                {week.status === "LOCKED" && week.reason ? (
                  <p className="mt-1 px-2 text-xs leading-5 text-slate-500">{friendlyLockReason(week.reason)}</p>
                ) : null}
                {week.days.map((day) => {
                  const items = path.filter((item) => item.weekTitle === week.title && item.dayTitle === day.title);
                  const counts = dayCounts(items);
                  return (
                    <div key={day.id} className="mt-3">
                      <div className="flex items-center justify-between px-2">
                        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{day.title}</p>
                        {counts.total > 0 ? (
                          <span className="text-[11px] text-slate-400">
                            {counts.done === counts.total && counts.total > 0 ? "Done" : `${counts.done} of ${counts.total}`}
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
                              onClick={() => setSidebarOpen(false)}
                              rowRef={current?.id === item.id && current.type === item.type ? (node) => { activeRef.current = node; } : undefined}
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
                          onClick={() => setSidebarOpen(false)}
                          rowRef={current?.id === item.id && current.type === item.type ? (node) => { activeRef.current = node; } : undefined}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
          {view.finalExam ? (
            <div className="mb-4">
              <p className="px-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Final stretch</p>
              <ul className="mt-1 space-y-0.5">
                {path
                  .filter((item) => item.kind === "FINAL_EXAM")
                  .map((item) => (
                    <li key={`final-${item.id}`}>
                      <PathRow
                        item={item}
                        active={current?.id === item.id && current.type === item.type}
                        programId={view.program.id}
                        batchId={batchId}
                        onClick={() => setSidebarOpen(false)}
                        rowRef={current?.id === item.id && current.type === item.type ? (node) => { activeRef.current = node; } : undefined}
                      />
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </nav>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7">
        {current ? (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="lms-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <ContentTypeChip type={current.type} kind={current.kind} />
                {currentStatus ? (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${currentStatus.className}`}>
                    {currentStatus.label}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.75rem]">{current.title}</h2>
              <p className="mt-1.5 text-sm text-slate-500">{locationLabel(current.weekTitle, current.dayTitle)}</p>
              {todayStats.total > 0 ? (
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {progressHeadline(todayStats.done, todayStats.total, todayStats.total ? (todayStats.done / todayStats.total) * 100 : 0)}
                  <span className="font-normal text-slate-400"> · today</span>
                </p>
              ) : null}
            </div>

            <div className="lms-fade-up">
              {current.status === "LOCKED" ? (
                <LockCard
                  reason={current.reason}
                  doFirst={firstAction && firstAction.id !== current.id ? firstAction : null}
                  doFirstHref={
                    firstAction && firstAction.id !== current.id
                      ? traineePathHref(view.program.id, firstAction, batchId)
                      : undefined
                  }
                  unlocksTitle={current.title}
                />
              ) : current.type === "QUIZ" || current.type === "ASSIGNMENT" ? (
                <ActivityCard item={current} programId={view.program.id} batchId={batchId} />
              ) : contentItem ? (
                <ItemBody item={contentItem} batchId={batchId} />
              ) : (
                <p className="text-sm text-slate-500">This item has no preview yet.</p>
              )}
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            {current.status !== "LOCKED" ? (
              <div className="flex flex-wrap items-center gap-3">
                {current.type !== "QUIZ" && current.type !== "ASSIGNMENT" ? (
                  <button
                    type="button"
                    className={isDoneStatus(current.status) ? traineeSecondaryCtaClass : traineePrimaryCtaClass}
                    disabled={pending || isDoneStatus(current.status)}
                    onClick={() => void complete()}
                  >
                    {isDoneStatus(current.status) ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
                        Completed
                      </>
                    ) : pending ? (
                      "Saving…"
                    ) : (
                      "Mark complete"
                    )}
                  </button>
                ) : null}
                {next && (next.id !== current.id || next.type !== current.type) ? (
                  <Link
                    href={traineePathHref(view.program.id, next, batchId)}
                    className={
                      current.type === "QUIZ" || current.type === "ASSIGNMENT" || isDoneStatus(current.status)
                        ? traineePrimaryCtaClass
                        : traineeSecondaryCtaClass
                    }
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            ) : null}

            {next && current.status !== "LOCKED" && (next.id !== current.id || next.type !== current.type) ? (
              <Link
                href={traineePathHref(view.program.id, next, batchId)}
                className={`${traineeCardClass} group flex items-center gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-violet-200`}
              >
                <ContentTypeIcon type={next.type} kind={"kind" in next ? next.kind : undefined} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">Up Next</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{next.title}</p>
                  {"weekTitle" in next ? (
                    <p className="truncate text-xs text-slate-500">{locationLabel(next.weekTitle, next.dayTitle)}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-violet-600" />
              </Link>
            ) : null}

            {unlocks && current.status !== "LOCKED" ? (
              <UnlocksNextCard
                href={traineePathHref(view.program.id, unlocks, batchId)}
                type={unlocks.type}
                kind={unlocks.kind}
                title={unlocks.title}
              />
            ) : null}

            {!next && current.status !== "LOCKED" ? (
              <p className="text-sm text-slate-500">You&apos;re caught up on everything currently available.</p>
            ) : null}
          </div>
        ) : (
          <div className={`${traineeCardClass} mx-auto max-w-lg px-6 py-10 text-center`}>
            <p className="text-sm font-semibold text-slate-900">Nothing to learn yet</p>
            <p className="mt-2 text-sm text-slate-500">Content will show up here once your course is ready.</p>
          </div>
        )}
      </section>
    </div>
  );
}
