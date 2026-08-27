"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  GraduationCap,
  Menu,
  Plus,
  X,
} from "lucide-react";
import {
  addAssignment,
  addDay,
  addFinalExam,
  addLesson,
  addMilestone,
  addMilestoneExam,
  addPracticeQuiz,
  addReel,
  addRequirement,
  addResource,
  addVideo,
  addWeek,
  addWeeklyExam,
  addWeeklyQuiz,
  deleteAssignment,
  deleteDay,
  deleteLesson,
  deleteMilestone,
  deleteQuiz,
  deleteReel,
  deleteRequirement,
  deleteResource,
  deleteVideo,
  deleteWeek,
  getTrainerProgram,
  submitProgram,
  updateDay,
  updateLesson,
  updateProgram,
  updateWeek,
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
  firstDayId,
  NEXT_SECTION,
  type BuilderSection,
  type SectionStatus,
} from "@/features/programs/builder/completion";
import { ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import { programStatusLabel } from "@/lib/programs/enrollment";
import { RejectionBanner } from "@/features/programs/rejection-banner";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { StatusBadge } from "@/components/status-badge";
import type { CreateProgramInput, ProgramTree, QuizInput } from "@/types/program";

function StatusGlyph({ status }: { status: SectionStatus }) {
  if (status === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (status === "attention") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <Circle className="h-4 w-4 text-slate-300" />;
}

export function ProgramBuilder({ initialProgram }: { initialProgram: ProgramTree }) {
  const router = useRouter();
  const [program, setProgram] = useState(initialProgram);
  const [section, setSection] = useState<BuilderSection>("overview");
  const [focusedDayId, setFocusedDayId] = useState<string | null>(firstDayId(initialProgram));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
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

  function toggle(id: string) {
    setCollapsed((current) => ({ ...current, [id]: !current[id] }));
  }

  async function saveOverview(values: CreateProgramInput) {
    await mutate(() => updateProgram(program.id, values));
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#f6f7fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link href="/trainer/programs" className="flex items-center gap-2 rounded-xl pr-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </span>
            </Link>
            <button type="button" className="rounded-xl p-2 text-slate-600 hover:bg-slate-50 lg:hidden" aria-label="Open outline" onClick={() => setOutlineOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <PageBreadcrumb entityLabel={program.title} className="mb-1" />
              <p className="truncate text-sm font-semibold text-slate-900">{program.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={program.status} />
                <SaveStatus state={saveState} />
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <div className="w-44">
              <p className="mb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">{analysis.completedLabel}</p>
              <ProgressBar value={analysis.percent} tone="violet" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {outlineOpen ? (
          <button type="button" className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" aria-label="Close outline" onClick={() => setOutlineOpen(false)} />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200/80 bg-[#f3f4f8] pt-16 transition-transform duration-200 lg:static lg:z-0 lg:w-[260px] lg:translate-x-0 lg:pt-0 ${
            outlineOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 lg:hidden">
            <p className="text-sm font-semibold">Program outline</p>
            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white" onClick={() => setOutlineOpen(false)} aria-label="Close outline">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="border-b border-slate-200/80 px-4 py-4 lg:hidden">
            <p className="mb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">{analysis.completedLabel}</p>
            <ProgressBar value={analysis.percent} tone="violet" />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Program outline">
            <p className="px-2 pb-2 text-[11px] font-medium tracking-wide text-slate-400 uppercase">Program</p>
            <OutlineButton label="Overview" active={section === "overview"} status={analysis.overview} onClick={() => go("overview")} />

            <p className="mt-4 px-2 pb-2 text-[11px] font-medium tracking-wide text-slate-400 uppercase">Curriculum</p>
            <OutlineButton label="Weeks & days" active={section === "curriculum"} status={analysis.curriculum} onClick={() => go("curriculum")} />
            {program.weeks.map((week, weekIndex) => {
              const open = !collapsed[week.id];
              return (
                <div key={week.id} className="mt-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 rounded-xl px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-white"
                    onClick={() => {
                      toggle(week.id);
                      go("curriculum");
                    }}
                  >
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span className="truncate">
                      Week {weekIndex + 1}
                      {week.title ? ` · ${week.title}` : ""}
                    </span>
                  </button>
                  {open
                    ? week.days.map((day, dayIndex) => (
                        <button
                          key={day.id}
                          type="button"
                          className={`ml-6 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm ${
                            section === "content" && focusedDayId === day.id ? "bg-violet-50 font-medium text-violet-700" : "text-slate-600 hover:bg-white"
                          }`}
                          onClick={() => openDay(day.id)}
                        >
                          {day.lessons.length + day.videos.length + day.resources.length + day.reels.length > 0 ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-slate-300" />
                          )}
                          <span className="truncate">
                            Day {dayIndex + 1} · {day.title}
                          </span>
                        </button>
                      ))
                    : null}
                </div>
              );
            })}
            {editable ? (
              <button type="button" className={`${ghostButtonClass} mt-1 w-full justify-start`} onClick={() => go("curriculum")}>
                <Plus className="h-3.5 w-3.5" />
                Add week
              </button>
            ) : null}

            <p className="mt-4 px-2 pb-2 text-[11px] font-medium tracking-wide text-slate-400 uppercase">Build</p>
            <OutlineButton label="Content" active={section === "content"} status={analysis.content} onClick={() => go("content")} />
            <OutlineButton label="Assessments" active={section === "assessments"} status={analysis.assessments} onClick={() => go("assessments")} />
            <OutlineButton label="Review & submit" active={section === "review"} status={analysis.review} onClick={() => go("review")} />
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-28 md:px-8 md:py-8">
            <RejectionBanner program={program} />
            {error ? (
              <div className="mb-4">
                <ErrorState message={error} />
              </div>
            ) : null}

            {section === "overview" ? (
              <OverviewPanel key={program.id} program={program} disabled={!editable} onSave={saveOverview} onContinue={() => go("curriculum")} />
            ) : null}
            {section === "curriculum" ? (
              <CurriculumPanel
                program={program}
                editable={editable}
                busy={busy}
                collapsed={collapsed}
                onToggle={toggle}
                onRenameWeek={async (id, title) => {
                  await mutate(() => updateWeek(id, { title }));
                }}
                onRenameDay={async (id, title) => {
                  await mutate(() => updateDay(id, { title }));
                }}
                onDeleteWeek={(id) => {
                  if (window.confirm("Delete this week and its content?")) {
                    void mutate(() => deleteWeek(id)).catch(() => undefined);
                  }
                }}
                onDeleteDay={(id) => {
                  if (window.confirm("Delete this day?")) {
                    void mutate(() => deleteDay(id)).catch(() => undefined);
                  }
                }}
                onAddWeek={(input) => mutate(() => addWeek(program.id, input)).then(() => undefined)}
                onAddDay={async (weekId, title) => {
                  const next = await mutate(() => addDay(weekId, { title }));
                  const created = next.weeks.find((week) => week.id === weekId)?.days.at(-1);
                  if (created) {
                    setFocusedDayId(created.id);
                  }
                }}
                onOpenDay={openDay}
                onAddWeeklyQuiz={(weekId) => setEditor({ view: "weekly-quiz", weekId })}
                onAddWeeklyExam={(weekId) => setEditor({ view: "weekly-exam", weekId })}
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
                onAddWeeklyQuiz={(weekId) => setEditor({ view: "weekly-quiz", weekId })}
                onAddWeeklyExam={(weekId) => setEditor({ view: "weekly-exam", weekId })}
                onAddFinalExam={() => setEditor({ view: "final-exam" })}
                onAddMilestone={(input) => mutate(() => addMilestone(program.id, input)).then(() => undefined)}
                onAddMilestoneExam={(milestoneId, input) => mutate(() => addMilestoneExam(milestoneId, input)).then(() => undefined)}
                onAddRequirement={(milestoneId, input) => mutate(() => addRequirement(milestoneId, input)).then(() => undefined)}
                onDeleteQuiz={(id) => void mutate(() => deleteQuiz(id)).catch(() => undefined)}
                onDeleteAssignment={(id) => void mutate(() => deleteAssignment(id)).catch(() => undefined)}
                onDeleteMilestone={(id) => void mutate(() => deleteMilestone(id)).catch(() => undefined)}
                onDeleteRequirement={(id) => void mutate(() => deleteRequirement(id)).catch(() => undefined)}
              />
            ) : null}
            {section === "review" ? (
              <ReviewPanel
                program={program}
                editable={editable}
                busy={busy}
                onGo={go}
                onSubmit={() =>
                  void mutate(() => submitProgram(program.id))
                    .then((next) => {
                      router.replace(`/trainer/programs/${next.id}`);
                    })
                    .catch(() => undefined)
                }
              />
            ) : null}
          </main>

          <footer className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {program.status === "DRAFT" ? "Draft" : programStatusLabel(program.status)}
                  <span className="ml-2 font-normal text-slate-500">· {BUILDER_SECTIONS.find((item) => item.id === section)?.label}</span>
                </p>
                <SaveStatus state={saveState} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondaryButtonClass} onClick={() => setPreviewOpen(true)}>
                  Preview
                </button>
                {section !== "review" && nextSection ? (
                  <button type="button" className={primaryButtonClass} onClick={() => go(nextSection)}>
                    Continue
                  </button>
                ) : editable ? (
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={busy || !analysis.canSubmit}
                    onClick={() =>
                      void mutate(() => submitProgram(program.id))
                        .then((next) => {
                          router.replace(`/trainer/programs/${next.id}`);
                        })
                        .catch(() => undefined)
                    }
                  >
                    {busy ? "Sending…" : "Send for Review"}
                  </button>
                ) : null}
              </div>
            </div>
          </footer>
        </div>
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
            loader={() => getItemFileAccess("trainer", filePreview.type, filePreview.id)}
            fileName={filePreview.fileName}
            mimeType={filePreview.mimeType}
            fileSize={filePreview.fileSize}
            title={filePreview.title}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(editor)} title={editor ? editorTitle(editor) : ""} side onClose={() => setEditor(null)}>
        {editor ? (
          <ContentEditor
            state={editor}
            disabled={!editable || busy}
            onChange={setEditor}
            onClose={() => setEditor(null)}
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
            onAddMilestone={(input) => mutate(() => addMilestone(program.id, input)).then(() => undefined)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function OutlineButton({
  label,
  active,
  status,
  onClick,
}: {
  label: string;
  active: boolean;
  status: SectionStatus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition duration-150 ${
        active ? "bg-violet-50 font-medium text-violet-700" : "text-slate-600 hover:bg-white hover:text-slate-900"
      }`}
      onClick={onClick}
    >
      <StatusGlyph status={status} />
      {label}
    </button>
  );
}
