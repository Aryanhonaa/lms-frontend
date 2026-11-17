"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { CourseOrderList } from "@/features/batch-tracker/course-order-list";
import { getBatchCatalog, updateProgramBatch } from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";

type CourseOption = {
  id: string;
  title: string;
  category: string;
  durationWeeks: number;
};

export function EditBatchCoursesDialog({
  open,
  batchId,
  primaryProgramId,
  currentCourseIds,
  onClose,
  onSaved,
}: {
  open: boolean;
  batchId: string;
  primaryProgramId: string;
  currentCourseIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedIds, setSelectedIds] = useState(currentCourseIds);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIds(currentCourseIds.length > 0 ? currentCourseIds : [primaryProgramId]);
      setQuery("");
      setError(null);
    }
  }, [open, currentCourseIds, primaryProgramId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    getBatchCatalog()
      .then((payload) => {
        if (!cancelled) {
          setCourses(payload.programs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCourses([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function addCourse(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current : [...current, id]));
  }

  async function save() {
    const ids = selectedIds.includes(primaryProgramId) ? selectedIds : [primaryProgramId, ...selectedIds];
    setBusy(true);
    setError(null);
    try {
      await updateProgramBatch(batchId, { programIds: ids });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to update courses.");
    } finally {
      setBusy(false);
    }
  }

  const byId = new Map(courses.map((course) => [course.id, course]));
  const ordered = selectedIds.map((id) => ({
    id,
    title: byId.get(id)?.title ?? (id === primaryProgramId ? "Home course" : "Course"),
    locked: id === primaryProgramId,
  }));
  const filtered = courses.filter((course) => {
    const needle = query.trim().toLowerCase();
    return !needle || `${course.title} ${course.category}`.toLowerCase().includes(needle);
  });

  return (
    <Dialog
      open={open}
      title="Courses in this batch"
      wide
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save order"}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        Drag to set the learning order. New courses join at the bottom. Trainees already enrolled are added to any new
        course automatically.
      </p>
      <CourseOrderList
        courses={ordered}
        disabled={busy}
        onChange={setSelectedIds}
        onRemove={(id) => setSelectedIds((current) => current.filter((item) => item !== id))}
      />
      <p className="mt-5 mb-2 text-sm font-medium text-slate-900">Add a course</p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search approved courses"
        className={`${fieldClass} mb-3`}
      />
      {filtered.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {courses.length === 0 ? "No approved courses available." : "No courses match that search."}
        </p>
      ) : (
        <ul className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((course) => {
            const selected = selectedIds.includes(course.id);
            return (
              <li key={course.id}>
                <button
                  type="button"
                  onClick={() => (selected ? undefined : addCourse(course.id))}
                  disabled={selected || busy}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    selected
                      ? "border-violet-200 bg-violet-50 text-slate-400"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selected ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{course.title}</span>
                    <span className="block text-xs text-slate-500">
                      {course.category}
                      {selected ? " · in this batch" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </Dialog>
  );
}
