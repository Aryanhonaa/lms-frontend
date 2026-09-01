"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Flag, Radio } from "lucide-react";
import { ContentTypeChip, ContentTypeIcon } from "@/components/learning/content-type-chip";
import { FileActionsRow, FileViewer } from "@/components/files/file-viewer";
import { StatusBadge } from "@/components/status-badge";
import { RejectionBanner } from "@/features/programs/rejection-banner";
import { getAttachmentAccess, getItemFileAccess, type FileAudience } from "@/lib/api/files";
import { programTrainerNames } from "@/lib/programs/enrollment";
import { isYoutubeShortsUrl, youtubeEmbedSrc, youtubeVideoId } from "@/lib/media/youtube";
import type {
  Assignment,
  ContentAttachment,
  Lesson,
  ProgramTree,
  Quiz,
  Reel,
  Resource,
  StoredFileFields,
  TrainingSession,
  Video,
} from "@/types/program";

type ReviewKind = "LESSON" | "VIDEO" | "RESOURCE" | "REEL" | "ASSIGNMENT" | "QUIZ" | "SESSION" | "MILESTONE";

type ReviewItem = {
  key: string;
  kind: ReviewKind;
  title: string;
  location: string;
  weekIndex: number;
  dayIndex: number | null;
  scope: "day" | "week" | "program";
  lesson?: Lesson;
  video?: Video;
  resource?: Resource;
  reel?: Reel;
  assignment?: Assignment;
  quiz?: Quiz;
  session?: TrainingSession;
  milestoneTitle?: string;
  milestoneRequirements?: string[];
};

const CARD = "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

function hasStoredFile(item?: StoredFileFields | null): item is StoredFileFields & { fileKey: string } {
  return Boolean(item?.fileKey);
}

function isExternalUrl(url?: string | null): url is string {
  return Boolean(url && !url.startsWith("storage:"));
}

function flattenProgram(program: ProgramTree): ReviewItem[] {
  const items: ReviewItem[] = [];

  program.weeks.forEach((week, weekIndex) => {
    week.days.forEach((day, dayIndex) => {
      const location = `Week ${weekIndex + 1} · Day ${dayIndex + 1}`;
      day.videos.forEach((video) => {
        items.push({
          key: `video-${video.id}`,
          kind: "VIDEO",
          title: video.title,
          location,
          weekIndex,
          dayIndex,
          scope: "day",
          video,
        });
      });
      day.lessons.forEach((lesson) => {
        items.push({
          key: `lesson-${lesson.id}`,
          kind: "LESSON",
          title: lesson.title,
          location,
          weekIndex,
          dayIndex,
          scope: "day",
          lesson,
        });
      });
      day.resources.forEach((resource) => {
        items.push({
          key: `resource-${resource.id}`,
          kind: "RESOURCE",
          title: resource.title,
          location,
          weekIndex,
          dayIndex,
          scope: "day",
          resource,
        });
      });
      day.reels.forEach((reel) => {
        items.push({
          key: `reel-${reel.id}`,
          kind: "REEL",
          title: reel.title,
          location,
          weekIndex,
          dayIndex,
          scope: "day",
          reel,
        });
      });
      day.assignments.forEach((assignment) => {
        items.push({
          key: `assignment-${assignment.id}`,
          kind: "ASSIGNMENT",
          title: assignment.title,
          location,
          weekIndex,
          dayIndex,
          scope: "day",
          assignment,
        });
      });
      day.quizzes.forEach((quiz) => {
        items.push({
          key: `quiz-${quiz.id}`,
          kind: "QUIZ",
          title: quiz.title,
          location,
          weekIndex,
          dayIndex,
          scope: "day",
          quiz,
        });
      });
    });

    week.quizzes.forEach((quiz) => {
      items.push({
        key: `week-quiz-${quiz.id}`,
        kind: "QUIZ",
        title: quiz.title,
        location: `Week ${weekIndex + 1}`,
        weekIndex,
        dayIndex: null,
        scope: "week",
        quiz,
      });
    });
    week.trainingSessions.forEach((session) => {
      items.push({
        key: `session-${session.id}`,
        kind: "SESSION",
        title: session.title,
        location: `Week ${weekIndex + 1}`,
        weekIndex,
        dayIndex: null,
        scope: "week",
        session,
      });
    });
  });

  program.milestones.forEach((milestone) => {
    items.push({
      key: `milestone-${milestone.id}`,
      kind: "MILESTONE",
      title: milestone.title,
      location: `After week ${milestone.afterWeekIndex + 1}`,
      weekIndex: milestone.afterWeekIndex,
      dayIndex: null,
      scope: "program",
      milestoneTitle: milestone.title,
      milestoneRequirements: milestone.requirements.map((requirement) => requirement.label),
    });
    if (milestone.exam) {
      items.push({
        key: `milestone-exam-${milestone.exam.id}`,
        kind: "QUIZ",
        title: milestone.exam.title,
        location: `Milestone · ${milestone.title}`,
        weekIndex: milestone.afterWeekIndex,
        dayIndex: null,
        scope: "program",
        quiz: milestone.exam,
      });
    }
  });

  program.quizzes.forEach((quiz) => {
    items.push({
      key: `program-quiz-${quiz.id}`,
      kind: "QUIZ",
      title: quiz.title,
      location: "Program",
      weekIndex: program.weeks.length,
      dayIndex: null,
      scope: "program",
      quiz,
    });
  });

  return items;
}

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

function AttachmentBlock({ attachments, viewer }: { attachments?: ContentAttachment[]; viewer: FileAudience }) {
  if (!attachments?.length) {
    return null;
  }
  return (
    <div className={`${CARD} px-5 py-4`}>
      <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Attachments</p>
      <ul className="mt-3 space-y-3">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="rounded-xl bg-slate-50 px-3 py-3">
            <FileActionsRow
              loader={() => getAttachmentAccess(viewer, attachment.id)}
              fileName={attachment.title || attachment.fileName}
              fileSize={attachment.fileSize}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoredMedia({
  type,
  id,
  title,
  file,
  viewer,
}: {
  type: "VIDEO" | "RESOURCE" | "REEL";
  id: string;
  title: string;
  file: StoredFileFields;
  viewer: FileAudience;
}) {
  return (
    <FileViewer
      key={`${type}-${id}`}
      loader={() => getItemFileAccess(viewer, type, id)}
      fileName={file.fileName ?? title}
      mimeType={file.mimeType ?? "application/octet-stream"}
      fileSize={file.fileSize ?? undefined}
      title={title}
    />
  );
}

function QuizReview({ quiz }: { quiz: Quiz }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {quiz.questions.length} questions · pass {quiz.passingScore}%
        {quiz.timeLimitMin ? ` · ${quiz.timeLimitMin} min` : ""}
        {quiz.maxAttempts ? ` · ${quiz.maxAttempts} attempts` : ""}
      </p>
      {quiz.description ? <p className="whitespace-pre-wrap text-sm text-slate-600">{quiz.description}</p> : null}
      <ol className="space-y-3">
        {quiz.questions.map((question, index) => (
          <li key={question.id} className={`${CARD} px-4 py-4`}>
            <p className="text-sm font-medium text-slate-900">
              {index + 1}. {question.prompt}
              <span className="ml-2 text-xs font-normal text-slate-400">{question.points} pts</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {question.options.map((option) => (
                <li
                  key={option.id}
                  className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                    option.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  {option.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                  )}
                  <span>
                    {option.label}
                    {option.isCorrect ? <span className="ml-2 text-[11px] font-semibold uppercase">Correct</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ItemBody({ item, viewer }: { item: ReviewItem; viewer: FileAudience }) {
  if (item.kind === "LESSON" && item.lesson) {
    return (
      <div className="space-y-4">
        <article className={`${CARD} px-5 py-5 text-sm leading-7 text-slate-700`}>
          {item.lesson.description ? (
            <p className="whitespace-pre-wrap">{item.lesson.description}</p>
          ) : (
            <p className="text-slate-500">No reading notes were added to this lesson.</p>
          )}
        </article>
        <AttachmentBlock attachments={item.lesson.attachments} viewer={viewer} />
      </div>
    );
  }

  if (item.kind === "VIDEO" && item.video) {
    if (hasStoredFile(item.video)) {
      return <StoredMedia type="VIDEO" id={item.video.id} title={item.video.title} file={item.video} viewer={viewer} />;
    }
    if (isExternalUrl(item.video.url) && youtubeVideoId(item.video.url)) {
      return <YoutubeEmbed title={item.video.title} url={item.video.url} vertical={isYoutubeShortsUrl(item.video.url)} />;
    }
    if (isExternalUrl(item.video.url)) {
      return (
        <video className="w-full overflow-hidden rounded-2xl bg-black shadow-lg" src={item.video.url} controls>
          <a href={item.video.url}>Open video</a>
        </video>
      );
    }
    return <p className="text-sm text-slate-500">This video has no file or URL yet.</p>;
  }

  if (item.kind === "REEL" && item.reel) {
    if (hasStoredFile(item.reel)) {
      return <StoredMedia type="REEL" id={item.reel.id} title={item.reel.title} file={item.reel} viewer={viewer} />;
    }
    if (isExternalUrl(item.reel.url) && youtubeVideoId(item.reel.url)) {
      return <YoutubeEmbed title={item.reel.title} url={item.reel.url} vertical />;
    }
    if (isExternalUrl(item.reel.url)) {
      return <video className="mx-auto max-h-[70vh] w-full overflow-hidden rounded-2xl bg-black" src={item.reel.url} controls />;
    }
    return <p className="text-sm text-slate-500">This reel has no file or URL yet.</p>;
  }

  if (item.kind === "RESOURCE" && item.resource) {
    return (
      <div className="space-y-4">
        {item.resource.description ? (
          <p className={`${CARD} px-5 py-4 text-sm whitespace-pre-wrap text-slate-700`}>{item.resource.description}</p>
        ) : null}
        {hasStoredFile(item.resource) ? (
          <StoredMedia type="RESOURCE" id={item.resource.id} title={item.resource.title} file={item.resource} viewer={viewer} />
        ) : isExternalUrl(item.resource.url) ? (
          <a
            href={item.resource.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <ExternalLink className="h-4 w-4" />
            Open reading
          </a>
        ) : (
          <p className="text-sm text-slate-500">This resource has no file or link yet.</p>
        )}
      </div>
    );
  }

  if (item.kind === "ASSIGNMENT" && item.assignment) {
    return (
      <div className="space-y-4">
        <article className={`${CARD} space-y-3 px-5 py-5 text-sm leading-7 text-slate-700`}>
          {item.assignment.description ? <p className="whitespace-pre-wrap">{item.assignment.description}</p> : null}
          {item.assignment.instructions ? (
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Instructions</p>
              <p className="mt-1 whitespace-pre-wrap">{item.assignment.instructions}</p>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">
            {item.assignment.maxScore} points
            {item.assignment.dueDate ? ` · due ${new Date(item.assignment.dueDate).toLocaleDateString()}` : ""}
          </p>
        </article>
        <AttachmentBlock attachments={item.assignment.attachments} viewer={viewer} />
      </div>
    );
  }

  if (item.kind === "QUIZ" && item.quiz) {
    return <QuizReview quiz={item.quiz} />;
  }

  if (item.kind === "SESSION" && item.session) {
    const meeting = item.session.meetingUrl ?? item.session.meetingLink;
    return (
      <article className={`${CARD} space-y-2 px-5 py-5 text-sm text-slate-700`}>
        {item.session.description ? <p className="whitespace-pre-wrap">{item.session.description}</p> : null}
        <p>
          {new Date(item.session.startsAt).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {item.session.endsAt
            ? ` – ${new Date(item.session.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </p>
        {meeting ? (
          <a href={meeting} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-violet-700">
            <Radio className="h-4 w-4" />
            Meeting link
          </a>
        ) : null}
      </article>
    );
  }

  if (item.kind === "MILESTONE") {
    return (
      <article className={`${CARD} px-5 py-5`}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {(item.milestoneRequirements ?? []).map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        {!item.milestoneRequirements?.length ? <p className="text-sm text-slate-500">No requirements listed.</p> : null}
      </article>
    );
  }

  return <p className="text-sm text-slate-500">Nothing to preview for this item.</p>;
}

export function ProgramReview({
  program,
  viewer = "admin",
}: {
  program: ProgramTree;
  viewer?: FileAudience;
}) {
  const items = useMemo(() => flattenProgram(program), [program]);
  const firstKey = items[0]?.key ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(firstKey);

  useEffect(() => {
    setSelectedKey(firstKey);
  }, [program.id, firstKey]);

  const selected = items.find((item) => item.key === selectedKey) ?? items[0] ?? null;
  const weeks = program.weeks;

  return (
    <div className="space-y-4">
      <section className={`${CARD} px-5 py-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">{program.title}</h2>
              <StatusBadge status={program.status} />
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {program.description || "No description was provided."}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {programTrainerNames(program)} · {program.category} · {program.difficulty.toLowerCase()} · {weeks.length} week
              {weeks.length === 1 ? "" : "s"} · {items.length} item{items.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {program.learningObjectives?.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {program.learningObjectives.map((objective) => (
              <li key={objective} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
                {objective}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <RejectionBanner program={program} />

      {items.length === 0 ? (
        <div className={`${CARD} px-6 py-12 text-center text-sm text-slate-500`}>
          This program has no lessons, videos, or readings yet.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <nav className={`${CARD} max-h-[70vh] overflow-y-auto py-2`}>
            {weeks.map((week, weekIndex) => {
              const weekOnly = items.filter((item) => item.scope === "week" && item.weekIndex === weekIndex);
              return (
                <div key={week.id} className="px-2 py-1">
                  <p className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Week {weekIndex + 1} · {week.title}
                  </p>
                  {week.days.map((day, dayIndex) => {
                    const dayItems = items.filter((item) => item.scope === "day" && item.weekIndex === weekIndex && item.dayIndex === dayIndex);
                    return (
                      <div key={day.id}>
                        <p className="px-3 py-1 text-[11px] font-medium text-slate-500">
                          Day {dayIndex + 1} · {day.title}
                        </p>
                        {dayItems.length === 0 ? (
                          <p className="px-3 pb-2 text-xs text-slate-400">Empty day</p>
                        ) : (
                          dayItems.map((item) => (
                            <OutlineButton key={item.key} item={item} active={item.key === selected?.key} onSelect={setSelectedKey} />
                          ))
                        )}
                      </div>
                    );
                  })}
                  {weekOnly.map((item) => (
                    <OutlineButton key={item.key} item={item} active={item.key === selected?.key} onSelect={setSelectedKey} />
                  ))}
                </div>
              );
            })}
            {items.filter((item) => item.scope === "program").length > 0 ? (
              <div className="px-2 py-1">
                <p className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Program</p>
                {items
                  .filter((item) => item.scope === "program")
                  .map((item) => (
                    <OutlineButton key={item.key} item={item} active={item.key === selected?.key} onSelect={setSelectedKey} />
                  ))}
              </div>
            ) : null}
          </nav>

          {selected ? (
            <section className="min-w-0 space-y-4">
              <div className={`${CARD} px-5 py-4`}>
                <div className="flex items-start gap-3">
                  <ContentTypeIcon type={selected.kind === "SESSION" ? "LESSON" : selected.kind === "MILESTONE" ? "QUIZ" : selected.kind} />
                  <div className="min-w-0">
                    <ContentTypeChip type={selected.kind === "SESSION" ? "LESSON" : selected.kind === "MILESTONE" ? "QUIZ" : selected.kind} />
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{selected.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{selected.location}</p>
                  </div>
                </div>
              </div>
              <ItemBody item={selected} viewer={viewer} />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function OutlineButton({
  item,
  active,
  onSelect,
}: {
  item: ReviewItem;
  active: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
        active ? "bg-violet-50 font-medium text-violet-900" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {item.kind === "MILESTONE" ? <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> : null}
      <span className="min-w-0">
        <span className="block truncate">{item.title}</span>
        <span className="block text-[11px] font-normal text-slate-400">{item.kind.replaceAll("_", " ").toLowerCase()}</span>
      </span>
    </button>
  );
}
