import type { ProgramStatus } from "@/types/domain";

export function programAllowsEnrollment(status: ProgramStatus): boolean {
  return status === "APPROVED" || status === "PUBLISHED";
}

export function programAllowsBuilder(status: ProgramStatus): boolean {
  return status === "DRAFT" || status === "REJECTED";
}

export function programAllowsTrainerDelete(status: ProgramStatus): boolean {
  return status === "DRAFT" || status === "REJECTED";
}

export function programAllowsAdminDelete(status: ProgramStatus): boolean {
  return status === "APPROVED" || status === "PUBLISHED";
}

export function programStatusLabel(status: ProgramStatus): string {
  if (status === "SUBMITTED") {
    return "Pending";
  }
  if (status === "DRAFT") {
    return "Draft";
  }
  if (status === "APPROVED") {
    return "Approved";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  return "Published";
}
