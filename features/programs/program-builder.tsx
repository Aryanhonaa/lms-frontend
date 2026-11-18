"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Eye, Menu, Sparkles, X } from "lucide-react";
import {
  addAssignment,
  addDay,
  addFinalExam,
  addLesson,
  addPracticeQuiz,
  addReel,
  addResource,
  addVideo,
  addWeek,
  addWeeklyExam,
  addWeeklyQuiz,
  deleteAssignment,
  deleteDay,
  deleteLesson,
  deleteQuiz,
  deleteReel,
  deleteResource,
  deleteVideo,
  getTrainerProgram,
  submitProgram,
  updateDay,
  updateLesson,
  updateProgram,
  updateQuiz,
} from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { ContentEditor, editorTitle, type EditorState } from "@/features/programs/builder/content-editor";
import { AssessmentsPanel } from "@/features/programs/builder/assessments-panel";
import { ContentPanel } from "@/features/programs/builder/content-panel";
import { CurriculumPanel } from "@/features/programs/builder/curriculum-panel";
import { OverviewPanel } from "@/features/programs/builder/overview-panel";
import { ReviewPanel } from "@/features/programs/builder/review-panel";
import { ProgramPreview } from "@/features/programs/program-preview";
import { AttachmentManager } from "@/features/programs/builder/attachment-manager";
import { FileViewer } from "@/components/files/file-viewer";
import { getItemFileAccess } from "@/lib/api/files";
import type { ContentAttachment } from "@/types/program";
import {
  analyzeBuilder,
  BUILDER_SECTIONS,
  dayFileOptions,
  findDay,
  firstDayId,
  NEXT_SECTION,
  type BuilderSection,
  type SectionStatus,
} from "@/features/programs/builder/completion";
import { primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RejectionBanner } from "@/features/programs/rejection-banner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/empty-state";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { StatusBadge } from "@/components/status-badge";
import type { CreateProgramInput, ProgramTree, QuizInput } from "@/types/program";

export function ProgramBuilder({ initialProgram }: { initialProgram: ProgramTree }) {
  const router = useRouter();
  const [program, setProgram] = useState(initialProgram);
  const [section, setSection] = useState<BuilderSection>("overview");
  const [focusedDayId, setFocusedDayId] = useState<string | null>(firstDayId(initialProgram));
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const editorDirtyRef = useRef(false);
  const [closeEditorConfirm, setCloseEditorConfirm] = useState(false);
  const [fileManager, setFileManager] = useState<{
    kind: "lesson" | "assignment";
    id: string;
    title: string;
    attachments?: ContentAttachment[];
  } | null>(null);
  const [filePreview, setFilePreview] = useState<{
    type: "VIDEO" | "RESOURCE" | "REEL";
    id: string;
    title: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [busy, setBusy] = useState(false);
  const [continueRequest, setContinueRequest] = useState(0);
  const outlineDays = program.weeks.flatMap((week) => week.days);
  const editable = program.status === "DRAFT" || program.status === "REJECTED";
  const analysis = useMemo(() => analyzeBuilder(program), [program]);
  const nextSection = NEXT_SECTION[section];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOutlineOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleEditorDirtyChange = useCallback((dirty: boolean) => {
    editorDirtyRef.current = dirty;
  }, []);

  function closeEditor() {
    setCloseEditorConfirm(false);
    editorDirtyRef.current = false;
    setEditor(null);
  }

  function requestCloseEditor() {
    if (editorDirtyRef.current) {
      setCloseEditorConfirm(true);
      return;
    }
    closeEditor();
  }

  async function mutate(action: () => Promise<{ program: ProgramTree }>) {
    setError(null);
    setBusy(true);
    setSaveState("saving");
    try {
      const payload = await action();
      setProgram(payload.program);
      setSaveState("saved");
      return payload.program;
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Request failed";
      setError(message);
      setSaveState("unsaved");
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setBusy(false);
    }
  }

  function go(next: BuilderSection) {
    setSection(next);
    setOutlineOpen(false);
  }

  function openDay(dayId: string) {
    setFocusedDayId(dayId);
    go("content");
  }

  function onPrimary() {
    if (section === "review") {
      if (!editable || busy || !analysis.canSubmit) {
        return;
      }
      void mutate(() => submitProgram(program.id))
        .then((next) => {
          router.replace(`/trainer/programs/${next.id}`);
        })
        .catch(() => undefined);
      return;
    }
    if (section === "overview" && editable) {
      setContinueRequest((value) => value + 1);
      return;
    }
    if (nextSection) {
      go(nextSection);
    }
  }

  async function saveOverview(values: CreateProgramInput) {
    await mutate(() => updateProgram(program.id, values));
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#f8f7ff] text-slate-900">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-violet-100/80 bg-white/85 px-3 py-3 shadow-[0_1px_20px_rgba(67,45,135,0.04)] backdrop-blur-xl md:px-5">
        <button
          type="button"
          className="rounded-xl p-2 text-slate-600 transition duration-150 hover:bg-violet-50 lg:hidden"
          aria-label="Open steps"
          onClick={() => setOutlineOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          href="/trainer/programs"
          aria-label="Back to programs"
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-1.5 text-sm font-medium text-slate-600 transition duration-150 hover:bg-violet-50 hover:text-violet-800"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden lg:inline">Programs</span>
        </Link>
        <span className="hidden h-4 w-px shrink-0 bg-violet-100 lg:block" aria-hidden />
        <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#211a42] text-violet-100 shadow-sm md:flex">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="hidden text-[9px] font-bold tracking-[0.16em] text-violet-500 uppercase md:block">Program studio</p>
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">{program.title}</h1>
        </div>
        <span className="hidden shrink-0 md:inline-flex">
          <StatusBadge status={program.status} />
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="mr-2 hidden w-32 items-center gap-2 rounded-full bg-violet-50 px-2.5 py-1.5 lg:flex" title={analysis.completedLabel}>
            <div className="min-w-0 flex-1">
              <ProgressBar value={analysis.percent} tone="violet" />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-violet-700">{analysis.percent}%</span>
          </div>
          <span className="hidden sm:inline">
            <SaveStatus state={saveState} />
          </span>
          <button type="button" className={secondaryButtonClass} aria-label="Preview" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            <span className="hidden lg:inline">Preview</span>
          </button>
          {section === "review" ? (
            editable ? (
              <button type="button" className={primaryButtonClass} disabled={busy || !analysis.canSubmit} onClick={onPrimary}>
                {busy ? "Sending…" : "Send for review"}
              </button>
            ) : null
          ) : (
            <button type="button" className={primaryButtonClass} disabled={busy} onClick={onPrimary}>
              Continue
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {outlineOpen ? (
          <button type="button" className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" aria-label="Close steps" onClick={() => setOutlineOpen(false)} />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col border-r border-violet-100 bg-white/75 shadow-[12px_0_40px_rgba(67,45,135,0.03)] backdrop-blur-xl transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 ${
            outlineOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 lg:hidden">
            <p className="text-sm font-semibold text-slate-900">Steps</p>
            <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-white" onClick={() => setOutlineOpen(false)} aria-label="Close steps">
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="px-3 py-5" aria-label="Program steps">
            <div className="mb-4 hidden px-2 lg:block">
              <p className="text-[10px] font-bold tracking-[0.18em] text-violet-500 uppercase">Your build</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Five steps from idea to launch.</p>
            </div>
            <ol className="space-y-1">
              {BUILDER_SECTIONS.map((item, index) => (
                <li key={item.id}>
                  <OutlineButton
                    index={index + 1}
                    label={item.label}
                    hint={item.hint}
                    active={section === item.id}
                    status={analysis.statuses[item.id]}
                    onClick={() => go(item.id)}
                  />
                </li>
              ))}
            </ol>
          </nav>
          {section === "content" && outlineDays.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-violet-100 px-3 py-4">
              <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wide text-slate-400 uppercase">Jump to day</p>
              {outlineDays.map((day, dayIndex) => {
                const active = focusedDayId === day.id;
                const filled = day.lessons.length + day.videos.length + day.resources.length + day.reels.length > 0;
                return (
                  <button
                    key={day.id}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition duration-150 ${
                      active ? "bg-white font-medium text-violet-800 shadow-sm ring-1 ring-violet-100" : "text-slate-600 hover:bg-white/80"
                    }`}
                    onClick={() => openDay(day.id)}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${filled ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="truncate">
                      <span className={active ? "text-violet-400" : "text-slate-400"}>{dayIndex + 1}</span> {day.title}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </aside>

        <main className="relative min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-9">
            <div className="pointer-events-none absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-violet-200/25 blur-3xl" />
            <div className="pointer-events-none absolute top-[40%] -left-20 h-64 w-64 rounded-full bg-fuchsia-100/30 blur-3xl" />
            <div className="relative">
            <RejectionBanner program={program} />
            {error ? (
              <div className="mb-4">
                <ErrorState message={error} />
              </div>
            ) : null}

            {section === "overview" ? (
              <OverviewPanel
                key={program.id}
                program={program}
                disabled={!editable}
                continueRequest={continueRequest}
                onSave={saveOverview}
                onContinue={() => go("curriculum")}
              />
            ) : null}
            {section === "curriculum" ? (
              <CurriculumPanel
                program={program}
                editable={editable}
                busy={busy}
                onRenameDay={async (id, title) => {
                  await mutate(() => updateDay(id, { title }));
                }}
                onDeleteDay={(id) => {
                  if (window.confirm("Delete this day?")) {
                    void mutate(() => deleteDay(id)).catch(() => undefined);
                  }
                }}
                onAddWeek={(input) => mutate(() => addWeek(program.id, input)).then(() => undefined)}
                onAddDay={async (weekId, title) => {
                  let targetWeekId = weekId;
                  if (!targetWeekId) {
                    const withWeek = await mutate(() => addWeek(program.id, { title: "Plan" }));
                    targetWeekId = withWeek.weeks.at(-1)?.id ?? "";
                  }
                  if (!targetWeekId) {
                    return;
                  }
                  const next = await mutate(() => addDay(targetWeekId, { title }));
                  const created = next.weeks.find((week) => week.id === targetWeekId)?.days.at(-1);
                  if (created) {
                    setFocusedDayId(created.id);
                  }
                }}
                onOpenDay={openDay}
                onAddWeeklyQuiz={(weekId) => setEditor({ view: "weekly-quiz", weekId })}
                onAddFinalExam={() => setEditor({ view: "final-exam" })}
              />
            ) : null}
            {section === "content" ? (
              <ContentPanel
                program={program}
                dayId={focusedDayId}
                editable={editable}
                busy={busy}
                onSelectDay={setFocusedDayId}
                onRenameDay={async (title) => {
                  if (focusedDayId) {
                    await mutate(() => updateDay(focusedDayId, { title }));
                  }
                }}
                onOpenEditor={setEditor}
                onBackToCurriculum={() => go("curriculum")}
                onRenameLesson={(id, current) => {
                  const next = window.prompt("Rename lesson", current)?.trim();
                  if (!next || next === current) {
                    return;
                  }
                  void mutate(() => updateLesson(id, { title: next })).catch(() => undefined);
                }}
                onDuplicateLesson={(day, item) =>
                  void mutate(() => addLesson(day.id, { title: `${item.title} copy`, description: item.description, durationMin: item.durationMin })).catch(() => undefined)
                }
                onDeleteLesson={(id) => void mutate(() => deleteLesson(id)).catch(() => undefined)}
                onDuplicateVideo={(day, item) =>
                  void mutate(() => addVideo(day.id, { title: `${item.title} copy`, source: item.source, url: item.url, durationMin: item.durationMin })).catch(() => undefined)
                }
                onDeleteVideo={(id) => void mutate(() => deleteVideo(id)).catch(() => undefined)}
                onDuplicateResource={(day, item) =>
                  void mutate(() => addResource(day.id, { title: `${item.title} copy`, url: item.url, kind: item.kind, description: item.description })).catch(() => undefined)
                }
                onDeleteResource={(id) => void mutate(() => deleteResource(id)).catch(() => undefined)}
                onDuplicateReel={(day, item) => void mutate(() => addReel(day.id, { title: `${item.title} copy`, url: item.url, durationSec: item.durationSec })).catch(() => undefined)}
                onDeleteReel={(id) => void mutate(() => deleteReel(id)).catch(() => undefined)}
                onDeleteAssignment={(id) => void mutate(() => deleteAssignment(id)).catch(() => undefined)}
                onDeleteQuiz={(id) => void mutate(() => deleteQuiz(id)).catch(() => undefined)}
                onEditQuiz={(quiz) => setEditor({ view: "edit-quiz", quiz })}
                onManageFiles={setFileManager}
                onPreviewFile={setFilePreview}
              />
            ) : null}
            {section === "assessments" ? (
              <AssessmentsPanel
                program={program}
                editable={editable}
                busy={busy}
                onOpenDay={openDay}
                onAddPracticeFromHint={() => go("content")}
                onAddFinalExam={() => setEditor({ view: "final-exam" })}
                onEditQuiz={(quiz) => setEditor({ view: "edit-quiz", quiz })}
                onDeleteQuiz={(id) => void mutate(() => deleteQuiz(id)).catch(() => undefined)}
                onDeleteAssignment={(id) => void mutate(() => deleteAssignment(id)).catch(() => undefined)}
              />
            ) : null}
            {section === "review" ? <ReviewPanel program={program} editable={editable} onGo={go} /> : null}
            </div>
          </main>
      </div>

      <Dialog open={previewOpen} title="Trainee preview" wide onClose={() => setPreviewOpen(false)}>
        <ProgramPreview program={program} />
      </Dialog>

      <Dialog open={Boolean(fileManager)} title="Files" side onClose={() => setFileManager(null)}>
        {fileManager ? (
          <AttachmentManager
            key={fileManager.id}
            target={fileManager}
            initial={fileManager.attachments}
            editable={editable}
            onChanged={() => {
              void getTrainerProgram(program.id)
                .then((payload) => setProgram(payload.program))
                .catch(() => undefined);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(filePreview)} title={filePreview?.title ?? ""} wide onClose={() => setFilePreview(null)}>
        {filePreview ? (
          <FileViewer
            key={`${filePreview.type}-${filePreview.id}`}
            resourceKey={`${filePreview.type}-${filePreview.id}`}
            loader={() => getItemFileAccess("trainer", filePreview.type, filePreview.id)}
            fileName={filePreview.fileName}
            mimeType={filePreview.mimeType}
            fileSize={filePreview.fileSize}
            title={filePreview.title}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(editor)} title={editor ? editorTitle(editor) : ""} side wide onClose={requestCloseEditor}>
        {editor ? (
          <ContentEditor
            programId={program.id}
            state={editor}
            disabled={!editable || busy}
            onChange={setEditor}
            onClose={requestCloseEditor}
            onDirtyChange={handleEditorDirtyChange}
            onAddWeek={(input) => mutate(() => addWeek(program.id, input)).then(() => undefined)}
            onAddDay={(weekId, title) => mutate(() => addDay(weekId, { title })).then(() => undefined)}
            onAddLesson={(dayId, input) => mutate(() => addLesson(dayId, input)).then(() => undefined)}
            onAddVideo={(dayId, input) => mutate(() => addVideo(dayId, input)).then(() => undefined)}
            onAddResource={(dayId, input) => mutate(() => addResource(dayId, input)).then(() => undefined)}
            onAddReel={(dayId, input) => mutate(() => addReel(dayId, input)).then(() => undefined)}
            onAddAssignment={(dayId, input) => mutate(() => addAssignment(dayId, input)).then(() => undefined)}
            onAddPracticeQuiz={(dayId, input: QuizInput) => mutate(() => addPracticeQuiz(dayId, input)).then(() => undefined)}
            onAddWeeklyQuiz={(weekId, input) => mutate(() => addWeeklyQuiz(weekId, input)).then(() => undefined)}
            onAddWeeklyExam={(weekId, input) => mutate(() => addWeeklyExam(weekId, input)).then(() => undefined)}
            onAddFinalExam={(input) => mutate(() => addFinalExam(program.id, input)).then(() => undefined)}
            onUpdateQuiz={(quizId, input) => mutate(() => updateQuiz(quizId, input)).then(() => undefined)}
            fileOptions={(() => {
              if (editor.view !== "content" && editor.view !== "picker") {
                return [];
              }
              const match = findDay(program, editor.dayId);
              return match ? dayFileOptions(match.day) : [];
            })()}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={closeEditorConfirm}
        title="Close without finishing?"
        description="A draft is saved on this device. You can reopen this quiz anytime and pick up where you left off."
        cancelLabel="Keep editing"
        confirmLabel="Close"
        onCancel={() => setCloseEditorConfirm(false)}
        onConfirm={closeEditor}
      />
    </div>
  );
}

function OutlineButton({
  index,
  label,
  hint,
  active,
  status,
  onClick,
}: {
  index: number;
  label: string;
  hint: string;
  active: boolean;
  status: SectionStatus;
  onClick: () => void;
}) {
  const done = status === "complete";
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition duration-150 ${
        active
          ? "bg-[#211a42] py-3 font-medium text-white shadow-lg shadow-violet-200/70"
          : "text-slate-600 hover:bg-violet-50/80 hover:text-violet-900"
      }`}
      onClick={onClick}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
          active ? "bg-violet-500 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-400 ring-1 ring-slate-200"
        }`}
      >
        {done && !active ? <Check className="h-3 w-3" /> : index}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm ${active ? "font-semibold text-white" : "text-slate-700"}`}>{label}</span>
        <span className={`block truncate text-xs ${active ? "text-violet-200/70" : "text-slate-400"}`}>{hint}</span>
      </span>
    </button>
  );
}
