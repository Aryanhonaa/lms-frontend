"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { FileText, Film, Link as LinkIcon, ListChecks, Play, ClipboardCheck, ChevronLeft } from "lucide-react";
import { QuizForm } from "@/features/programs/quiz-form";
import { VideoFields, type VideoDraft } from "@/features/programs/builder/video-fields";
import { AttachmentUploadField } from "@/components/files/attachment-upload-field";
import { RequiredMark } from "@/components/ui/required-mark";
import { fieldClass, ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import type { QuizInput } from "@/types/program";
import type { UploadedFile } from "@/types/files";

export type PickerKind = "VIDEO" | "LESSON" | "RESOURCE" | "REEL" | "QUIZ" | "ASSIGNMENT";

export type EditorState =
  | { view: "picker"; dayId: string }
  | { view: "content"; dayId: string; kind: PickerKind }
  | { view: "week" }
  | { view: "day"; weekId: string }
  | { view: "weekly-quiz"; weekId: string }
  | { view: "weekly-exam"; weekId: string }
  | { view: "final-exam" }
  | { view: "milestone" };

const PICKER_OPTIONS: Array<{ kind: PickerKind; label: string; hint: string; icon: typeof Play }> = [
  { kind: "VIDEO", label: "Video", hint: "Upload a file or paste a URL", icon: Play },
  { kind: "LESSON", label: "Text lesson", hint: "Notes and reading", icon: FileText },
  { kind: "RESOURCE", label: "Link / document", hint: "PDF, article, or site", icon: LinkIcon },
  { kind: "REEL", label: "Reel", hint: "Short-form clip", icon: Film },
  { kind: "QUIZ", label: "Quiz", hint: "Practice questions", icon: ClipboardCheck },
  { kind: "ASSIGNMENT", label: "Assignment", hint: "Work to review", icon: ListChecks },
];

type ContentEditorProps = {
  state: EditorState;
  disabled: boolean;
  onChange: (state: EditorState) => void;
  onClose: () => void;
  onAddWeek: (input: { title: string; description?: string }) => Promise<void>;
  onAddDay: (weekId: string, title: string) => Promise<void>;
  onAddLesson: (dayId: string, input: { title: string; description?: string; durationMin?: number }) => Promise<void>;
  onAddVideo: (
    dayId: string,
    input: {
      title: string;
      source: VideoDraft["source"];
      url?: string;
      fileKey?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    },
  ) => Promise<void>;
  onAddResource: (
    dayId: string,
    input: {
      title: string;
      url?: string;
      kind: "DOCUMENT" | "ARTICLE" | "GITHUB" | "YOUTUBE" | "WEBSITE" | "TUTORIAL";
      fileKey?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    },
  ) => Promise<void>;
  onAddReel: (
    dayId: string,
    input: {
      title: string;
      url?: string;
      fileKey?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    },
  ) => Promise<void>;
  onAddAssignment: (
    dayId: string,
    input: {
      title: string;
      description?: string;
      instructions?: string;
      dueDate?: string;
      maxScore?: number;
      allowFileUpload?: boolean;
      allowTextResponse?: boolean;
      allowLateSubmission?: boolean;
      allowResubmission?: boolean;
      maxAttempts?: number;
      allowedFileTypes?: string;
      maxFileSizeMb?: number;
      status?: "DRAFT" | "PUBLISHED";
      linkedItemType?: "LESSON" | "VIDEO" | "RESOURCE" | "REEL" | null;
      linkedItemId?: string | null;
    },
  ) => Promise<void>;
  onAddPracticeQuiz: (dayId: string, input: QuizInput) => Promise<void>;
  onAddWeeklyQuiz: (weekId: string, input: QuizInput) => Promise<void>;
  onAddWeeklyExam: (weekId: string, input: QuizInput) => Promise<void>;
  onAddFinalExam: (input: QuizInput) => Promise<void>;
  onAddMilestone: (input: { title: string; afterWeekIndex: number }) => Promise<void>;
  fileOptions?: Array<{ type: "LESSON" | "VIDEO" | "RESOURCE" | "REEL"; id: string; title: string }>;
};

function EditorNav({
  onBack,
  onCancel,
  backLabel = "Back",
}: {
  onBack?: () => void;
  onCancel: () => void;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onBack ? (
        <button type="button" className={ghostButtonClass} onClick={onBack}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </button>
      ) : null}
      <button type="button" className={secondaryButtonClass} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-slate-800">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {children}
    </label>
  );
}

export function ContentEditor(props: ContentEditorProps) {
  const { state, disabled, onChange, onClose } = props;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [video, setVideo] = useState<VideoDraft>({ mode: "upload", title: "", url: "", source: "UPLOADED" });
  const [reel, setReel] = useState<VideoDraft>({ mode: "upload", title: "", url: "", source: "UPLOADED" });
  const [resourceFile, setResourceFile] = useState<UploadedFile | null>(null);
  const [resourceMode, setResourceMode] = useState<"upload" | "url">("upload");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }

  if (state.view === "picker") {
    return (
      <div className="grid gap-3">
        <EditorNav onCancel={onClose} />
        <ul className="grid gap-2 sm:grid-cols-2">
        {PICKER_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <li key={option.kind}>
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-left transition duration-150 hover:border-violet-200 hover:bg-violet-50/60"
                onClick={() => onChange({ view: "content", dayId: state.dayId, kind: option.kind })}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
        </ul>
      </div>
    );
  }

  if (state.view === "week" || state.view === "day") {
    return (
      <form
        className="grid gap-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const title = String(new FormData(event.currentTarget).get("title") ?? "").trim();
          const description = String(new FormData(event.currentTarget).get("description") ?? "").trim();
          if (!title) {
            setError("A title is required");
            return;
          }
          void run(async () => {
            if (state.view === "week") {
              await props.onAddWeek({ title, description: description || undefined });
            } else {
              await props.onAddDay(state.weekId, title);
            }
          });
        }}
      >
        <Field label="Title" required>
          <input name="title" className={fieldClass} placeholder={state.view === "week" ? "Network Security" : "Introduction to Firewalls"} disabled={disabled || busy} />
        </Field>
        {state.view === "week" ? (
          <Field label="Description">
            <textarea name="description" rows={2} className={fieldClass} placeholder="What trainees will learn this week" disabled={disabled || busy} />
          </Field>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <EditorNav onCancel={onClose} />
          <button type="submit" className={primaryButtonClass} disabled={disabled || busy}>
            {busy ? "Adding…" : state.view === "week" ? "Add week" : "Add day"}
          </button>
        </div>
      </form>
    );
  }

  if (state.view === "milestone") {
    return (
      <form
        className="grid gap-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const title = String(data.get("title") ?? "").trim();
          if (!title) {
            setError("A title is required");
            return;
          }
          void run(() =>
            props.onAddMilestone({
              title,
              afterWeekIndex: Number(data.get("afterWeekIndex") || 0),
            }),
          );
        }}
      >
        <Field label="Title" required>
          <input name="title" className={fieldClass} placeholder="Checkpoint" disabled={disabled || busy} />
        </Field>
        <Field label="After week number">
          <input name="afterWeekIndex" type="number" min={0} defaultValue={0} className={fieldClass} disabled={disabled || busy} />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <EditorNav onCancel={onClose} />
          <button type="submit" className={primaryButtonClass} disabled={disabled || busy}>
            {busy ? "Adding…" : "Add milestone"}
          </button>
        </div>
      </form>
    );
  }

  if (state.view === "weekly-quiz" || state.view === "weekly-exam" || state.view === "final-exam") {
    return (
      <div className="grid gap-3">
        <EditorNav onCancel={onClose} />
        <QuizForm
        submitLabel={state.view === "final-exam" ? "Create final exam" : state.view === "weekly-exam" ? "Create weekly exam" : "Create weekly quiz"}
        disabled={disabled || busy}
        onSubmit={async (input) => {
          if (state.view === "final-exam") {
            await props.onAddFinalExam(input);
          } else if (state.view === "weekly-exam") {
            await props.onAddWeeklyExam(state.weekId, input);
          } else {
            await props.onAddWeeklyQuiz(state.weekId, input);
          }
          onClose();
        }}
      />
      </div>
    );
  }

  if (state.view !== "content") {
    return null;
  }

  if (state.kind === "QUIZ") {
    return (
      <div className="grid gap-3">
        <EditorNav onBack={() => onChange({ view: "picker", dayId: state.dayId })} onCancel={onClose} />
        <QuizForm
        submitLabel="Create practice quiz"
        disabled={disabled || busy}
        onSubmit={async (input) => {
          await props.onAddPracticeQuiz(state.dayId, input);
          onClose();
        }}
      />
      </div>
    );
  }

  if (state.kind === "VIDEO" || state.kind === "REEL") {
    const isReel = state.kind === "REEL";
    const draft = isReel ? reel : video;
    const setDraft = isReel ? setReel : setVideo;
    return (
      <form
        className="grid gap-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const title = draft.title.trim();
          if (!title || (!draft.fileKey && !draft.url)) {
            setError(`Add a title and a ${isReel ? "reel" : "video"} file or URL`);
            return;
          }
          if (uploading) {
            setError("Wait for the upload to finish before saving.");
            return;
          }
          const payload = {
            title,
            url: draft.fileKey ? undefined : draft.url,
            fileKey: draft.fileKey,
            fileName: draft.fileName,
            mimeType: draft.mimeType,
            fileSize: draft.fileSize,
          };
          void run(() =>
            isReel
              ? props.onAddReel(state.dayId, payload)
              : props.onAddVideo(state.dayId, { ...payload, source: draft.source }),
          );
        }}
      >
        <Field label="Title" required>
          <input
            className={fieldClass}
            value={draft.title}
            disabled={disabled || busy}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </Field>
        <VideoFields
          value={draft}
          dayId={state.dayId}
          purpose={isReel ? "REEL" : "VIDEO"}
          hint={isReel ? "MP4, WebM, or MOV · short clip" : "MP4, WebM, or MOV"}
          disabled={disabled || busy}
          onChange={setDraft}
          onUploadingChange={setUploading}
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <EditorNav onBack={() => onChange({ view: "picker", dayId: state.dayId })} onCancel={onClose} />
          <button type="submit" className={primaryButtonClass} disabled={disabled || busy || uploading}>
            {busy ? "Adding…" : uploading ? "Uploading…" : isReel ? "Add reel" : "Add video"}
          </button>
        </div>
      </form>
    );
  }

  if (state.kind === "RESOURCE") {
    return (
      <form
        className="grid gap-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const title = String(data.get("title") ?? "").trim();
          const url = String(data.get("url") ?? "").trim();
          if (!title) {
            setError("A title is required");
            return;
          }
          if (resourceMode === "upload" && !resourceFile) {
            setError("Upload a file or switch to a URL");
            return;
          }
          if (resourceMode === "url" && !url) {
            setError("A URL is required");
            return;
          }
          if (uploading) {
            setError("Wait for the upload to finish before saving.");
            return;
          }
          void run(() =>
            props.onAddResource(state.dayId, {
              title,
              kind: String(data.get("kind") || "DOCUMENT") as
                | "DOCUMENT"
                | "ARTICLE"
                | "GITHUB"
                | "YOUTUBE"
                | "WEBSITE"
                | "TUTORIAL",
              url: resourceMode === "upload" ? undefined : url,
              fileKey: resourceMode === "upload" ? resourceFile?.key : undefined,
              fileName: resourceMode === "upload" ? resourceFile?.fileName : undefined,
              mimeType: resourceMode === "upload" ? resourceFile?.mimeType : undefined,
              fileSize: resourceMode === "upload" ? resourceFile?.fileSize : undefined,
            }),
          );
        }}
      >
        <Field label="Title" required>
          <input name="title" className={fieldClass} disabled={disabled || busy} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`${resourceMode === "upload" ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white"} rounded-md border px-3 py-2 text-sm`}
            disabled={disabled || busy}
            onClick={() => setResourceMode("upload")}
          >
            Upload file
          </button>
          <button
            type="button"
            className={`${resourceMode === "url" ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white"} rounded-md border px-3 py-2 text-sm`}
            disabled={disabled || busy}
            onClick={() => {
              setResourceMode("url");
              setResourceFile(null);
            }}
          >
            Paste URL
          </button>
        </div>
        {resourceMode === "upload" ? (
          <div className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">
              File
              <RequiredMark />
            </span>
            <AttachmentUploadField
              dayId={state.dayId}
              purpose="RESOURCE"
              disabled={disabled || busy}
              uploaded={resourceFile}
              onUploaded={setResourceFile}
              onUploadingChange={setUploading}
            />
          </div>
        ) : (
          <Field label="URL" required>
            <input name="url" className={fieldClass} disabled={disabled || busy} />
          </Field>
        )}
        <Field label="Type">
          <select name="kind" className={fieldClass} defaultValue="DOCUMENT" disabled={disabled || busy}>
            <option value="DOCUMENT">Document</option>
            <option value="ARTICLE">Article</option>
            <option value="GITHUB">GitHub</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="WEBSITE">Website</option>
            <option value="TUTORIAL">Tutorial</option>
          </select>
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <EditorNav onBack={() => onChange({ view: "picker", dayId: state.dayId })} onCancel={onClose} />
          <button type="submit" className={primaryButtonClass} disabled={disabled || busy || uploading}>
            {busy ? "Adding…" : uploading ? "Uploading…" : "Add to day"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const title = String(data.get("title") ?? "").trim();
        if (!title) {
          setError("A title is required");
          return;
        }
        void run(async () => {
          if (state.kind === "LESSON") {
            await props.onAddLesson(state.dayId, {
              title,
              description: String(data.get("description") ?? "").trim() || undefined,
              durationMin: data.get("durationMin") ? Number(data.get("durationMin")) : undefined,
            });
          }
          if (state.kind === "ASSIGNMENT") {
            const linkedKey = String(data.get("linkedKey") ?? "").trim();
            const [linkedItemType, linkedItemId] = linkedKey.includes(":")
              ? (linkedKey.split(":") as ["LESSON" | "VIDEO" | "RESOURCE" | "REEL", string])
              : [null, null];
            await props.onAddAssignment(state.dayId, {
              title,
              description: String(data.get("description") ?? "").trim() || undefined,
              instructions: String(data.get("instructions") ?? "").trim() || undefined,
              dueDate: String(data.get("dueDate") ?? "").trim() || undefined,
              maxScore: data.get("maxScore") ? Number(data.get("maxScore")) : undefined,
              allowFileUpload: data.get("allowFileUpload") === "on",
              allowTextResponse: data.get("allowTextResponse") === "on",
              allowLateSubmission: data.get("allowLateSubmission") === "on",
              allowResubmission: data.get("allowResubmission") === "on",
              maxAttempts: data.get("maxAttempts") ? Number(data.get("maxAttempts")) : undefined,
              allowedFileTypes: String(data.get("allowedFileTypes") ?? "").trim() || undefined,
              maxFileSizeMb: data.get("maxFileSizeMb") ? Number(data.get("maxFileSizeMb")) : undefined,
              status: String(data.get("lifecycle") ?? "PUBLISHED") === "DRAFT" ? "DRAFT" : "PUBLISHED",
              linkedItemType,
              linkedItemId,
            });
          }
        });
      }}
    >
      <Field label="Title" required>
        <input name="title" className={fieldClass} disabled={disabled || busy} />
      </Field>
      {state.kind === "LESSON" ? (
        <>
          <Field label="Notes">
            <textarea name="description" rows={5} className={fieldClass} disabled={disabled || busy} />
          </Field>
          <Field label="Minutes">
            <input name="durationMin" type="number" min={0} className={fieldClass} disabled={disabled || busy} />
          </Field>
        </>
      ) : null}
      {state.kind === "ASSIGNMENT" ? (
        <>
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Assignment details</p>
          <Field label="After which file?">
            <select name="linkedKey" className={fieldClass} defaultValue="" disabled={disabled || busy}>
              <option value="">End of day (after all files)</option>
              {(props.fileOptions ?? []).map((item) => (
                <option key={`${item.type}-${item.id}`} value={`${item.type}:${item.id}`}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
          {(props.fileOptions ?? []).length === 0 ? (
            <p className="text-xs text-slate-500">
              Add PDFs or other files to this day first if this assignment should follow a specific file.
            </p>
          ) : null}
          <Field label="Brief">
            <textarea name="description" rows={3} className={fieldClass} disabled={disabled || busy} />
          </Field>
          <Field label="Instructions">
            <textarea name="instructions" rows={4} className={fieldClass} disabled={disabled || busy} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Due date">
              <input name="dueDate" type="date" className={fieldClass} disabled={disabled || busy} />
            </Field>
            <Field label="Max score">
              <input name="maxScore" type="number" min={1} defaultValue={100} className={fieldClass} disabled={disabled || busy} />
            </Field>
          </div>
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Submission settings</p>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input name="allowTextResponse" type="checkbox" defaultChecked disabled={disabled || busy} />
            Allow text response
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input name="allowFileUpload" type="checkbox" defaultChecked disabled={disabled || busy} />
            Allow file upload
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input name="allowLateSubmission" type="checkbox" defaultChecked disabled={disabled || busy} />
            Allow late submission
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input name="allowResubmission" type="checkbox" disabled={disabled || busy} />
            Allow resubmission
          </label>
          <Field label="Maximum attempts">
            <input name="maxAttempts" type="number" min={1} defaultValue={1} className={fieldClass} disabled={disabled || busy} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Allowed file types">
              <input
                name="allowedFileTypes"
                defaultValue="pdf,doc,docx,png,jpg,jpeg,zip,txt"
                className={fieldClass}
                disabled={disabled || busy}
              />
            </Field>
            <Field label="Max file size (MB)">
              <input name="maxFileSizeMb" type="number" min={1} max={100} defaultValue={25} className={fieldClass} disabled={disabled || busy} />
            </Field>
          </div>
        </>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <EditorNav onBack={() => onChange({ view: "picker", dayId: state.dayId })} onCancel={onClose} />
      {state.kind === "ASSIGNMENT" ? (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="submit" name="lifecycle" value="DRAFT" className={secondaryButtonClass} disabled={disabled || busy}>
            {busy ? "Saving…" : "Save draft"}
          </button>
          <button type="submit" name="lifecycle" value="PUBLISHED" className={primaryButtonClass} disabled={disabled || busy}>
            {busy ? "Publishing…" : "Publish assignment"}
          </button>
        </div>
      ) : (
        <button type="submit" className={primaryButtonClass} disabled={disabled || busy}>
          {busy ? "Adding…" : "Add to day"}
        </button>
      )}
    </form>
  );
}

export function editorTitle(state: EditorState): string {
  if (state.view === "picker") {
    return "Add content";
  }
  if (state.view === "week") {
    return "Add week";
  }
  if (state.view === "day") {
    return "Add day";
  }
  if (state.view === "milestone") {
    return "Add milestone";
  }
  if (state.view === "weekly-quiz") {
    return "Weekly quiz";
  }
  if (state.view === "weekly-exam") {
    return "Weekly exam";
  }
  if (state.view === "final-exam") {
    return "Final exam";
  }
  return `Add ${state.kind.toLowerCase()}`;
}
