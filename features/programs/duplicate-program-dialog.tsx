"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { ApiClientError } from "@/lib/api/client";
import { duplicateProgram } from "@/lib/api/programs";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { ProgramSummary } from "@/types/program";

export const duplicateCourseButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition duration-150 hover:bg-slate-50 disabled:opacity-50";

export function DuplicateProgramDialog({
  program,
  onClose,
}: {
  program: Pick<ProgramSummary, "id" | "title"> | null;
  onClose: () => void;
}) {
  return program ? <DuplicateForm key={program.id} program={program} onClose={onClose} /> : null;
}

function DuplicateForm({ program, onClose }: { program: Pick<ProgramSummary, "id" | "title">; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(`${program.title} (copy)`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (!busy) {
      onClose();
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give the new course a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await duplicateProgram(program.id, title.trim());
      router.push(`/trainer/programs/${payload.program.id}/builder`);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to duplicate this course. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      title="Duplicate course"
      onClose={close}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={close}>
            Cancel
          </button>
          <button type="submit" form="duplicate-course-form" className={primaryButtonClass} disabled={busy}>
            {busy ? "Copying course…" : "Duplicate and edit"}
          </button>
        </div>
      }
    >
      <form id="duplicate-course-form" className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">
          Makes an editable draft copy of <span className="font-medium text-slate-900">{program.title}</span> with all
          weeks, lessons, files, assignments, quizzes and exams. The original stays as it is, so batches already
          running on it are not affected.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Name of the new course
          <input
            value={title}
            maxLength={200}
            autoFocus
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>Trainees, batches, attempts and submissions are not copied.</li>
          <li>Course dates and assignment due dates are cleared so you can set new ones.</li>
          <li>Quizzes that revealed answers on a schedule are set to hidden until you pick a new date.</li>
          <li>The copy is a draft: submit it for approval when it&apos;s ready.</li>
        </ul>
        {busy ? <p className="text-xs text-slate-500">Copying uploaded files can take a moment for large videos.</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Dialog>
  );
}
