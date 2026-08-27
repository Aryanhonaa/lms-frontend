import type { ProgramSummary } from "@/types/program";

export function RejectionBanner({ program }: { program: Pick<ProgramSummary, "status" | "rejectionReason" | "rejectedAt" | "rejectedBy"> }) {
  if (program.status !== "REJECTED" || !program.rejectionReason) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
      <p className="font-medium text-red-800">This program was rejected</p>
      <p className="mt-1 text-red-700">{program.rejectionReason}</p>
      <p className="mt-2 text-xs text-red-600">
        {program.rejectedBy ? `Rejected by ${program.rejectedBy.name}` : "Rejected"}
        {program.rejectedAt ? ` · ${new Date(program.rejectedAt).toLocaleString()}` : ""}
      </p>
    </section>
  );
}
