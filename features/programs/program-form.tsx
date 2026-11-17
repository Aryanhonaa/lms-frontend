"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { RequiredMark } from "@/components/ui/required-mark";
import { fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import { programFormSchema, type ProgramFormValues } from "@/lib/programs/program-form-schema";
import type { CreateProgramInput } from "@/types/program";

type ProgramFormProps = {
  defaultValues?: Partial<ProgramFormValues>;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (values: CreateProgramInput) => Promise<void>;
};

function normalizeCategory(value?: string): "Sales" | "Files" | "Other" {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "sales") {
    return "Sales";
  }
  if (normalized === "files" || normalized === "file") {
    return "Files";
  }
  return "Other";
}

export function ProgramForm({ defaultValues, submitLabel, disabled, onSubmit }: ProgramFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Other",
      difficulty: "BEGINNER",
      trainingMode: "PROGRESSION",
      examScoreThreshold: 60,
      ...defaultValues,
      category: normalizeCategory(defaultValues?.category),
    },
  });

  async function submit(values: ProgramFormValues) {
    setFormError(null);
    try {
      await onSubmit({
        title: values.title,
        description: values.description,
        category: values.category,
        difficulty: values.difficulty,
        trainingMode: values.trainingMode,
        startDate: null,
        endDate: null,
        examScoreThreshold: values.examScoreThreshold,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save program");
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        <span className="font-medium">
          Title
          <RequiredMark />
        </span>
        <input className={fieldClass} disabled={disabled} {...register("title")} />
        {errors.title ? <span className="text-red-700">{errors.title.message}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        <span className="font-medium">Description</span>
        <textarea className={fieldClass} rows={4} disabled={disabled} {...register("description")} />
        {errors.description ? <span className="text-red-700">{errors.description.message}</span> : null}
      </label>
      <details className="md:col-span-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Advanced options</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Course type</span>
        <select className={fieldClass} disabled={disabled} {...register("category")}>
          <option value="Sales">Sales</option>
          <option value="Files">Files</option>
          <option value="Other">Other</option>
        </select>
        {errors.category ? <span className="text-red-700">{errors.category.message}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Difficulty</span>
        <select className={fieldClass} disabled={disabled} {...register("difficulty")}>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Training mode</span>
        <select className={fieldClass} disabled={disabled} {...register("trainingMode")}>
          <option value="PROGRESSION">Progression</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
        <span className="text-xs text-slate-500">
          Progression: next day unlocks as soon as the current day is finished. Scheduled: one day of content per
          calendar day from the batch start date.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Overall score required (%)</span>
        <input type="number" min={0} max={100} className={fieldClass} disabled={disabled} {...register("examScoreThreshold", { valueAsNumber: true })} />
        <span className="text-xs text-slate-500">Minimum exam score used for course outcome and interventions.</span>
      </label>
        </div>
      </details>
      {formError ? <p className="text-sm text-red-700 md:col-span-2">{formError}</p> : null}
      {disabled ? null : (
        <div className="md:col-span-2">
          <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
