"use client";

import {
  ClipboardCheck,
  FileText,
  Film,
  Link as LinkIcon,
  ListChecks,
  Play,
  Plus,
} from "lucide-react";
import { dayItemCount, findDay } from "@/features/programs/builder/completion";
import type { EditorState, PickerKind } from "@/features/programs/builder/content-editor";
import { CARD, dangerButtonClass, ghostButtonClass } from "@/features/programs/builder/ui";
import { InlineTitle } from "@/components/ui/inline-title";
import { formatFileSize } from "@/lib/api/files";
import type { ContentAttachment, Day, ProgramTree } from "@/types/program";

function externalHref(url: string): string | undefined {
  return url && !url.startsWith("storage:") ? url : undefined;
}

const LEARNING: Array<{ kind: PickerKind; label: string; hint: string; icon: typeof Play }> = [
  { kind: "VIDEO", label: "Video", hint: "Upload or paste a URL", icon: Play },
  { kind: "LESSON", label: "Text lesson", hint: "Notes trainees can read", icon: FileText },
  { kind: "RESOURCE", label: "Link / document", hint: "PDF, article, or site", icon: LinkIcon },
  { kind: "REEL", label: "Reel", hint: "Short clip", icon: Film },
];

const ACTIVITIES: Array<{ kind: PickerKind; label: string; hint: string; icon: typeof Play }> = [
  { kind: "ASSIGNMENT", label: "Assignment", hint: "Work to submit and review", icon: ListChecks },
  { kind: "QUIZ", label: "Quiz", hint: "Practice questions", icon: ClipboardCheck },
];

export function ContentPanel({
  program,
  dayId,
  editable,
  busy,
  onSelectDay,
  onRenameDay,
  onOpenEditor,
  onRenameLesson,
  onDuplicateLesson,
  onDeleteLesson,
  onDuplicateVideo,
  onDeleteVideo,
  onDuplicateResource,
  onDeleteResource,
  onDuplicateReel,
  onDeleteReel,
  onDeleteAssignment,
  onDeleteQuiz,
  onManageFiles,
  onPreviewFile,
}: {
  program: ProgramTree;
  dayId: string | null;
  editable: boolean;
  busy: boolean;
  onSelectDay: (dayId: string) => void;
  onRenameDay: (title: string) => Promise<void>;
  onOpenEditor: (state: EditorState) => void;
  onRenameLesson: (id: string, current: string) => void;
  onDuplicateLesson: (day: Day, item: Day["lessons"][number]) => void;
  onDeleteLesson: (id: string) => void;
  onDuplicateVideo: (day: Day, item: Day["videos"][number]) => void;
  onDeleteVideo: (id: string) => void;
  onDuplicateResource: (day: Day, item: Day["resources"][number]) => void;
  onDeleteResource: (id: string) => void;
  onDuplicateReel: (day: Day, item: Day["reels"][number]) => void;
  onDeleteReel: (id: string) => void;
  onDeleteAssignment: (id: string) => void;
  onDeleteQuiz: (id: string) => void;
  onManageFiles: (target: { kind: "lesson" | "assignment"; id: string; title: string; attachments?: ContentAttachment[] }) => void;
  onPreviewFile: (item: {
    type: "VIDEO" | "RESOURCE" | "REEL";
    id: string;
    title: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) => void;
}) {
  const located = dayId ? findDay(program, dayId) : null;
  const days = program.weeks.flatMap((week, weekIndex) =>
    week.days.map((day, dayIndex) => ({
      id: day.id,
      label: `Week ${weekIndex + 1} · Day ${dayIndex + 1} · ${day.title}`,
    })),
  );

  if (days.length === 0) {
    return (
      <div className="lms-fade-up mx-auto max-w-3xl">
        <div className={`${CARD} px-6 py-12 text-center`}>
          <h2 className="text-base font-semibold text-slate-900">Add a day first</h2>
          <p className="mt-1 text-sm text-slate-500">Content lives inside a day. Build a week in Curriculum, then come back here.</p>
        </div>
      </div>
    );
  }

  if (!located) {
    return (
      <div className="lms-fade-up mx-auto max-w-3xl">
        <div className={`${CARD} px-6 py-12 text-center`}>
          <h2 className="text-base font-semibold text-slate-900">Choose a day</h2>
          <p className="mt-1 text-sm text-slate-500">Pick where trainees should learn next.</p>
          <ul className="mx-auto mt-4 max-w-md space-y-1 text-left">
            {days.map((item) => (
              <li key={item.id}>
                <button type="button" className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-violet-50" onClick={() => onSelectDay(item.id)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const { week, day, weekIndex, dayIndex } = located;
  const empty = dayItemCount(day) === 0;

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Week {weekIndex + 1} / Day {dayIndex + 1}
          </p>
          <InlineTitle as="h2" value={day.title} disabled={!editable || busy} onSave={onRenameDay} />
          <p className="mt-1 text-sm text-slate-500">
            {week.title}. What will trainees learn today?
          </p>
        </div>
        {days.length > 1 ? (
          <label className="text-sm text-slate-600">
            <span className="sr-only">Jump to day</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={day.id}
              onChange={(event) => onSelectDay(event.target.value)}
            >
              {days.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {editable ? (
        <>
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Learning content</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {LEARNING.map((option) => (
                <TypeCard key={option.kind} {...option} onClick={() => onOpenEditor({ view: "content", dayId: day.id, kind: option.kind })} />
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Activities</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {ACTIVITIES.map((option) => (
                <TypeCard key={option.kind} {...option} onClick={() => onOpenEditor({ view: "content", dayId: day.id, kind: option.kind })} />
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className={CARD}>
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">In this day</h3>
        </div>
        {empty ? (
          <p className="px-5 py-8 text-sm text-slate-500">Nothing here yet. Choose a content type above.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {day.videos.map((item) => (
              <ItemRow
                key={item.id}
                icon={Play}
                title={item.title}
                meta={`Video · ${item.source.toLowerCase()}${item.fileKey ? ` · ${formatFileSize(item.fileSize ?? 0)}` : ""}${item.durationMin ? ` · ${item.durationMin} min` : ""}`}
                href={externalHref(item.url)}
                editable={editable}
                busy={busy}
                onPreviewFile={
                  item.fileKey
                    ? () =>
                        onPreviewFile({
                          type: "VIDEO",
                          id: item.id,
                          title: item.title,
                          fileName: item.fileName ?? item.title,
                          mimeType: item.mimeType ?? "video/mp4",
                          fileSize: item.fileSize ?? 0,
                        })
                    : undefined
                }
                onDuplicate={item.fileKey ? undefined : () => onDuplicateVideo(day, item)}
                onDelete={() => onDeleteVideo(item.id)}
              />
            ))}
            {day.lessons.map((item) => (
              <ItemRow
                key={item.id}
                icon={FileText}
                title={item.title}
                meta={`Lesson${item.durationMin ? ` · ${item.durationMin} min` : ""}${
                  item.attachments?.length ? ` · ${item.attachments.length} file${item.attachments.length > 1 ? "s" : ""}` : ""
                }`}
                editable={editable}
                busy={busy}
                onRename={() => onRenameLesson(item.id, item.title)}
                onManageFiles={() =>
                  onManageFiles({ kind: "lesson", id: item.id, title: item.title, attachments: item.attachments })
                }
                onDuplicate={() => onDuplicateLesson(day, item)}
                onDelete={() => onDeleteLesson(item.id)}
              />
            ))}
            {day.resources.map((item) => (
              <ItemRow
                key={item.id}
                icon={LinkIcon}
                title={item.title}
                meta={`${item.kind.toLowerCase()}${item.fileKey ? ` · ${formatFileSize(item.fileSize ?? 0)}` : ""}`}
                href={externalHref(item.url)}
                editable={editable}
                busy={busy}
                onPreviewFile={
                  item.fileKey
                    ? () =>
                        onPreviewFile({
                          type: "RESOURCE",
                          id: item.id,
                          title: item.title,
                          fileName: item.fileName ?? item.title,
                          mimeType: item.mimeType ?? "application/octet-stream",
                          fileSize: item.fileSize ?? 0,
                        })
                    : undefined
                }
                onDuplicate={item.fileKey ? undefined : () => onDuplicateResource(day, item)}
                onDelete={() => onDeleteResource(item.id)}
              />
            ))}
            {day.reels.map((item) => (
              <ItemRow
                key={item.id}
                icon={Film}
                title={item.title}
                meta={`Reel${item.durationSec ? ` · ${item.durationSec}s` : ""}${item.fileKey ? ` · ${formatFileSize(item.fileSize ?? 0)}` : ""}`}
                href={externalHref(item.url)}
                editable={editable}
                busy={busy}
                onPreviewFile={
                  item.fileKey
                    ? () =>
                        onPreviewFile({
                          type: "REEL",
                          id: item.id,
                          title: item.title,
                          fileName: item.fileName ?? item.title,
                          mimeType: item.mimeType ?? "video/mp4",
                          fileSize: item.fileSize ?? 0,
                        })
                    : undefined
                }
                onDuplicate={item.fileKey ? undefined : () => onDuplicateReel(day, item)}
                onDelete={() => onDeleteReel(item.id)}
              />
            ))}
            {day.assignments.map((item) => (
              <ItemRow
                key={item.id}
                icon={ListChecks}
                title={item.title}
                meta={`Assignment · ${(item.status ?? "PUBLISHED").toLowerCase()}${
                  item.attachments?.length ? ` · ${item.attachments.length} file${item.attachments.length > 1 ? "s" : ""}` : ""
                }`}
                editable={editable}
                busy={busy}
                onManageFiles={() =>
                  onManageFiles({ kind: "assignment", id: item.id, title: item.title, attachments: item.attachments })
                }
                onDelete={() => onDeleteAssignment(item.id)}
              />
            ))}
            {day.quizzes.map((item) => (
              <ItemRow
                key={item.id}
                icon={ClipboardCheck}
                title={item.title}
                meta="Practice quiz"
                editable={editable}
                busy={busy}
                onDelete={() => onDeleteQuiz(item.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TypeCard({
  label,
  hint,
  icon: Icon,
  onClick,
}: {
  kind: PickerKind;
  label: string;
  hint: string;
  icon: typeof Play;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CARD} flex items-start gap-3 p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:ring-violet-200`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>
      <Plus className="ml-auto h-4 w-4 text-slate-300" />
    </button>
  );
}

function ItemRow({
  icon: Icon,
  title,
  meta,
  href,
  editable,
  busy,
  onRename,
  onDuplicate,
  onDelete,
  onManageFiles,
  onPreviewFile,
}: {
  icon: typeof Play;
  title: string;
  meta: string;
  href?: string;
  editable: boolean;
  busy: boolean;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  onManageFiles?: () => void;
  onPreviewFile?: () => void;
}) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className={ghostButtonClass}>
            Preview
          </a>
        ) : null}
        {onPreviewFile ? (
          <button type="button" className={ghostButtonClass} disabled={busy} onClick={onPreviewFile}>
            Preview
          </button>
        ) : null}
        {onManageFiles ? (
          <button type="button" className={ghostButtonClass} disabled={busy} onClick={onManageFiles}>
            Files
          </button>
        ) : null}
        {onRename ? (
          <button type="button" className={ghostButtonClass} disabled={!editable || busy} onClick={onRename}>
            Rename
          </button>
        ) : null}
        {onDuplicate ? (
          <button type="button" className={ghostButtonClass} disabled={!editable || busy} onClick={onDuplicate}>
            Duplicate
          </button>
        ) : null}
        <button type="button" className={dangerButtonClass} disabled={!editable || busy} onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}
