"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ClipboardCheck,
  Eye,
  ExternalLink,
  FileText,
  Film,
  Link as LinkIcon,
  ListChecks,
  Play,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { assignmentsForItem, dayItemCount, findDay, unlinkedAssignments } from "@/features/programs/builder/completion";
import type { EditorState, PickerKind } from "@/features/programs/builder/content-editor";
import { ActionMenu, type MenuAction } from "@/features/programs/builder/chrome";
import { CARD, ghostButtonClass, iconButtonClass, primaryButtonClass } from "@/features/programs/builder/ui";
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
  { kind: "CALL_RECORDING", label: "Call recording", hint: "Upload an audio recording", icon: AudioLines },
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
  onBackToCurriculum,
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
  onEditQuiz,
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
  onBackToCurriculum: () => void;
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
  onEditQuiz: (quiz: Day["quizzes"][number]) => void;
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
  const days = program.weeks.flatMap((week) => week.days).map((day, dayIndex) => ({
    id: day.id,
    label: `Day ${dayIndex + 1} · ${day.title}`,
    number: dayIndex + 1,
  }));

  if (days.length === 0) {
    return (
      <div className="lms-fade-up mx-auto max-w-3xl">
        <div className={`${CARD} px-6 py-12 text-center`}>
          <h2 className="text-sm font-semibold text-slate-900">Add a day first</h2>
          <p className="mt-1 text-sm text-slate-500">Content lives on a day. Add one under Days, then come back.</p>
          <button type="button" className={`${ghostButtonClass} mt-4`} onClick={onBackToCurriculum}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back to days
          </button>
        </div>
      </div>
    );
  }

  if (!located) {
    return (
      <div className="lms-fade-up mx-auto max-w-3xl">
        <div className={`${CARD} px-6 py-12 text-center`}>
          <h2 className="text-sm font-semibold text-slate-900">Choose a day</h2>
          <p className="mt-1 text-sm text-slate-500">Pick where trainees should learn next.</p>
          <ul className="mx-auto mt-4 max-w-md space-y-1 text-left">
            {days.map((item) => (
              <li key={item.id}>
                <button type="button" className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition duration-150 hover:bg-violet-50 hover:text-violet-800" onClick={() => onSelectDay(item.id)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={`${ghostButtonClass} mt-4`} onClick={onBackToCurriculum}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back to days
          </button>
        </div>
      </div>
    );
  }

  const { week, day } = located;
  const empty = dayItemCount(day) === 0;
  const dayNumber = days.find((item) => item.id === day.id)?.number ?? 1;

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <button type="button" className="inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-medium text-violet-700 transition duration-150 hover:bg-violet-50" onClick={onBackToCurriculum}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Days
          </button>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs font-medium text-slate-400">Day {dayNumber}</span>
            <InlineTitle as="h2" value={day.title} disabled={!editable || busy} onSave={onRenameDay} />
          </div>
          {week.title && week.title !== "Plan" ? <p className="mt-0.5 text-xs text-slate-400">{week.title}</p> : null}
        </div>
        {days.length > 1 ? (
          <label className="text-sm text-slate-600">
            <span className="sr-only">Jump to day</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition duration-150 hover:border-slate-300"
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

      <section className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">In this day</h3>
          {editable ? (
            <AddContentMenu onPick={(kind) => onOpenEditor({ view: "content", dayId: day.id, kind })} />
          ) : null}
        </div>
        {empty ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Nothing here yet.{editable ? " Use Add to put a lesson, video, or quiz on this day." : ""}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {day.videos.map((item) => (
              <Fragment key={item.id}>
                <ItemRow
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
                {assignmentsForItem(day, "VIDEO", item.id).map((assignment) => (
                  <AssignmentItemRow
                    key={assignment.id}
                    item={assignment}
                    nested
                    editable={editable}
                    busy={busy}
                    onManageFiles={onManageFiles}
                    onDeleteAssignment={onDeleteAssignment}
                  />
                ))}
              </Fragment>
            ))}
            {day.lessons.map((item) => (
              <Fragment key={item.id}>
                <ItemRow
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
                {assignmentsForItem(day, "LESSON", item.id).map((assignment) => (
                  <AssignmentItemRow
                    key={assignment.id}
                    item={assignment}
                    nested
                    editable={editable}
                    busy={busy}
                    onManageFiles={onManageFiles}
                    onDeleteAssignment={onDeleteAssignment}
                  />
                ))}
              </Fragment>
            ))}
            {day.resources.map((item) => (
              <Fragment key={item.id}>
                <ItemRow
                  icon={item.kind === "CALL_RECORDING" ? AudioLines : LinkIcon}
                  title={item.title}
                  meta={`${item.kind === "CALL_RECORDING" ? "Call recording" : item.kind.toLowerCase()}${item.fileKey ? ` · ${formatFileSize(item.fileSize ?? 0)}` : ""}`}
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
                {assignmentsForItem(day, "RESOURCE", item.id).map((assignment) => (
                  <AssignmentItemRow
                    key={assignment.id}
                    item={assignment}
                    nested
                    editable={editable}
                    busy={busy}
                    onManageFiles={onManageFiles}
                    onDeleteAssignment={onDeleteAssignment}
                  />
                ))}
              </Fragment>
            ))}
            {day.reels.map((item) => (
              <Fragment key={item.id}>
                <ItemRow
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
                {assignmentsForItem(day, "REEL", item.id).map((assignment) => (
                  <AssignmentItemRow
                    key={assignment.id}
                    item={assignment}
                    nested
                    editable={editable}
                    busy={busy}
                    onManageFiles={onManageFiles}
                    onDeleteAssignment={onDeleteAssignment}
                  />
                ))}
              </Fragment>
            ))}
            {unlinkedAssignments(day).map((item) => (
              <AssignmentItemRow
                key={item.id}
                item={item}
                editable={editable}
                busy={busy}
                onManageFiles={onManageFiles}
                onDeleteAssignment={onDeleteAssignment}
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
                onEdit={() => onEditQuiz(item)}
                onDelete={() => onDeleteQuiz(item.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AddContentMenu({ onPick }: { onPick: (kind: PickerKind) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = [
    { label: "Learn", items: LEARNING },
    { label: "Practice", items: ACTIVITIES },
  ];

  return (
    <div ref={root} className="relative">
      <button type="button" className={primaryButtonClass} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Plus className="h-4 w-4" />
        Add
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-950/5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">{group.label}</p>
              {group.items.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.kind}
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition duration-150 hover:bg-violet-50/70"
                    onClick={() => {
                      setOpen(false);
                      onPick(option.kind);
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                      <span className="block truncate text-xs text-slate-500">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AssignmentItemRow({
  item,
  nested,
  editable,
  busy,
  onManageFiles,
  onDeleteAssignment,
}: {
  item: Day["assignments"][number];
  nested?: boolean;
  editable: boolean;
  busy: boolean;
  onManageFiles: (target: { kind: "lesson" | "assignment"; id: string; title: string; attachments?: ContentAttachment[] }) => void;
  onDeleteAssignment: (id: string) => void;
}) {
  return (
    <ItemRow
      icon={ListChecks}
      title={item.title}
      meta={`${nested ? "Assignment for this file" : "Assignment"} · ${(item.status ?? "PUBLISHED").toLowerCase()}${
        item.attachments?.length ? ` · ${item.attachments.length} file${item.attachments.length > 1 ? "s" : ""}` : ""
      }`}
      nested={nested}
      editable={editable}
      busy={busy}
      onManageFiles={() =>
        onManageFiles({ kind: "assignment", id: item.id, title: item.title, attachments: item.attachments })
      }
      onDelete={() => onDeleteAssignment(item.id)}
    />
  );
}

function ItemRow({
  icon: Icon,
  title,
  meta,
  href,
  nested,
  editable,
  busy,
  onRename,
  onEdit,
  onDuplicate,
  onDelete,
  onManageFiles,
  onPreviewFile,
}: {
  icon: typeof Play;
  title: string;
  meta: string;
  href?: string;
  nested?: boolean;
  editable: boolean;
  busy: boolean;
  onRename?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  onManageFiles?: () => void;
  onPreviewFile?: () => void;
}) {
  const menuItems: MenuAction[] = [];
  if (onManageFiles) {
    menuItems.push({ label: "Files", disabled: busy, onClick: onManageFiles });
  }
  if (editable && onEdit) {
    menuItems.push({ label: "Edit", disabled: busy, onClick: onEdit });
  }
  if (editable && onRename) {
    menuItems.push({ label: "Rename", disabled: busy, onClick: onRename });
  }
  if (editable && onDuplicate) {
    menuItems.push({ label: "Duplicate", disabled: busy, onClick: onDuplicate });
  }
  if (editable) {
    menuItems.push({ label: "Delete", danger: true, disabled: busy, onClick: onDelete });
  }

  return (
    <li className={`flex items-center gap-3 py-2.5 ${nested ? "bg-slate-50/80 pr-3 pl-10" : "px-4"}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className={iconButtonClass} aria-label={`Open ${title}`}>
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
        {onPreviewFile ? (
          <button type="button" className={iconButtonClass} disabled={busy} aria-label={`Preview ${title}`} onClick={onPreviewFile}>
            <Eye className="h-4 w-4" />
          </button>
        ) : null}
        <ActionMenu label={`Actions for ${title}`} items={menuItems} />
      </div>
    </li>
  );
}
