"use client";

import { useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { moveItem, sequenceLabel } from "@/lib/batches/course-sequence";
import { dangerButtonClass, fieldClass } from "@/lib/ui/form-classes";

export type OrderableCourse = {
  id: string;
  title: string;
  locked?: boolean;
};

export function CourseOrderList({
  courses,
  onChange,
  onRemove,
  disabled,
}: {
  courses: OrderableCourse[];
  onChange: (ids: string[]) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-800">No courses in this batch yet</p>
        <p className="mt-1 text-sm text-slate-500">Add an approved course. Trainees will learn them in this order.</p>
      </div>
    );
  }

  function move(from: number, to: number) {
    onChange(moveItem(courses, from, to).map((course) => course.id));
  }

  return (
    <ul className="space-y-2">
      {courses.map((course, index) => (
        <li
          key={course.id}
          draggable={!disabled}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (dragIndex != null) {
              move(dragIndex, index);
            }
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={`flex items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 ${
            dragIndex === index ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200"
          }`}
        >
          <span className="cursor-grab text-slate-300" aria-hidden>
            <GripVertical className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-semibold text-violet-800">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{course.title}</p>
            <p className="text-[11px] font-medium text-slate-400">{sequenceLabel(index)}</p>
          </div>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <span className="sr-only">Learning order for {course.title}</span>
            <input
              type="number"
              min={1}
              max={courses.length}
              value={index + 1}
              disabled={disabled}
              className={`${fieldClass} w-14 py-1 text-center text-sm`}
              onChange={(event) => {
                const next = Number(event.target.value) - 1;
                if (Number.isInteger(next)) {
                  move(index, Math.min(Math.max(next, 0), courses.length - 1));
                }
              }}
            />
          </label>
          {onRemove && !course.locked ? (
            <button
              type="button"
              className={dangerButtonClass}
              disabled={disabled}
              onClick={() => {
                if (window.confirm(`Remove ${course.title} from this batch?`)) {
                  onRemove(course.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove {course.title}</span>
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
