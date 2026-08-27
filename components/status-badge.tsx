import type { ProgramStatus } from "@/types/domain";
import { programStatusLabel } from "@/lib/programs/enrollment";

const STATUS_STYLES: Record<ProgramStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-700",
  SUBMITTED: "bg-amber-50 text-amber-800",
  APPROVED: "bg-teal-50 text-teal-800",
  REJECTED: "bg-red-50 text-red-800",
  PUBLISHED: "bg-sky-50 text-sky-800",
};

export function StatusBadge({ status }: { status: ProgramStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {programStatusLabel(status)}
    </span>
  );
}
