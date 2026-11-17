"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { programAllowsBuilder, programAllowsTrainerDelete } from "@/lib/programs/enrollment";
import { deleteCourseButtonClass } from "@/features/programs/delete-program-dialog";
import { duplicateCourseButtonClass } from "@/features/programs/duplicate-program-dialog";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { ProgramStatus } from "@/types/domain";
import type { ProgramSummary } from "@/types/program";

const STATUS_TABS: Array<{ id: "ALL" | ProgramStatus; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

const AUDIENCE_TABS = [
  { id: "ALL", label: "All types" },
  { id: "Sales", label: "Sales" },
  { id: "Files", label: "Files" },
  { id: "Other", label: "Other" },
] as const;

function audienceOf(category: string): "Sales" | "Files" | "Other" {
  const value = category.trim().toLowerCase();
  if (value === "sales") {
    return "Sales";
  }
  if (value === "files" || value === "file") {
    return "Files";
  }
  return "Other";
}

export function ProgramList({
  programs,
  currentUserId,
  onDelete,
  onDuplicate,
}: {
  programs: ProgramSummary[];
  currentUserId?: string;
  onDelete?: (program: ProgramSummary) => void;
  onDuplicate?: (program: ProgramSummary) => void;
}) {
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]["id"]>("ALL");
  const [audienceTab, setAudienceTab] = useState<(typeof AUDIENCE_TABS)[number]["id"]>("ALL");

  const visible = useMemo(
    () =>
      programs.filter((program) => {
        const statusMatch =
          statusTab === "ALL"
            ? true
            : statusTab === "APPROVED"
              ? program.status === "APPROVED" || program.status === "PUBLISHED"
              : program.status === statusTab;
        const audienceMatch = audienceTab === "ALL" || audienceOf(program.category) === audienceTab;
        return statusMatch && audienceMatch;
      }),
    [audienceTab, programs, statusTab],
  );

  if (programs.length === 0) {
    return (
      <EmptyState
        title="No programs yet"
        description="Name a program and start with week 1. You can fill in catalog details later."
        actionHref="/trainer/programs/new"
        actionLabel="Create program"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.id === "ALL"
              ? programs.length
              : programs.filter((program) =>
                  tab.id === "APPROVED"
                    ? program.status === "APPROVED" || program.status === "PUBLISHED"
                    : program.status === tab.id,
                ).length;
          const active = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {AUDIENCE_TABS.map((tab) => {
          const active = audienceTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAudienceTab(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-800 hover:bg-violet-100"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No programs in this view" description="Try another status or course type." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((program) => {
                const isOwner = !currentUserId || program.createdByUserId === currentUserId;
                return (
                  <tr key={program.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{program.title}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{audienceOf(program.category)}</td>
                    <td className="px-4 py-4 text-slate-600">{program.trainingMode}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={program.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/trainer/programs/${program.id}`} className={secondaryButtonClass}>
                          Preview
                        </Link>
                        {isOwner && programAllowsBuilder(program.status) ? (
                          <Link href={`/trainer/programs/${program.id}/builder`} className={primaryButtonClass}>
                            Builder
                          </Link>
                        ) : null}
                        {onDuplicate ? (
                          <button
                            type="button"
                            className={duplicateCourseButtonClass}
                            title="Make an editable copy of this course"
                            onClick={() => onDuplicate(program)}
                          >
                            Duplicate
                          </button>
                        ) : null}
                        {isOwner && onDelete && programAllowsTrainerDelete(program.status) ? (
                          <button type="button" className={deleteCourseButtonClass} onClick={() => onDelete(program)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
