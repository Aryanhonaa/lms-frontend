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

export function ProgramForm({ defaultValues, submitLabel, disabled, onSubmit }: ProgramFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      difficulty: "BEGINNER",
      durationWeeks: 4,
      trainingMode: "PROGRESSION",
      startDate: "",
      endDate: "",
      ...defaultValues,
    },
  });

  const trainingMode = watch("trainingMode");
  const scheduled = trainingMode === "SCHEDULED";

  async function submit(values: ProgramFormValues) {
    setFormError(null);
    const scheduledMode = values.trainingMode === "SCHEDULED";
    try {
      await onSubmit({
        title: values.title,
        description: values.description,
        category: values.category,
        difficulty: values.difficulty,
        durationWeeks: values.durationWeeks,
        trainingMode: values.trainingMode,
        startDate: scheduledMode ? values.startDate || null : null,
        endDate: scheduledMode ? values.endDate || null : null,
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
        <span className="font-medium">Category</span>
        <input className={fieldClass} disabled={disabled} {...register("category")} />
        {errors.category ? <span className="text-red-700">{errors.category.message}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          Duration (weeks)
          <RequiredMark />
        </span>
        <input type="number" min={1} className={fieldClass} disabled={disabled} {...register("durationWeeks", { valueAsNumber: true })} />
        {errors.durationWeeks ? <span className="text-red-700">{errors.durationWeeks.message}</span> : null}
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
        <select
          className={fieldClass}
          disabled={disabled}
          {...register("trainingMode", {
            onChange: (event) => {
              if (event.target.value !== "SCHEDULED") {
                setValue("startDate", "");
                setValue("endDate", "");
              }
            },
          })}
        >
          <option value="PROGRESSION">Progression</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
      </label>
      {scheduled ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Start date</span>
            <input type="date" className={fieldClass} disabled={disabled} {...register("startDate")} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">End date</span>
            <input type="date" className={fieldClass} disabled={disabled} {...register("endDate")} />
          </label>
        </>
      ) : null}
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
