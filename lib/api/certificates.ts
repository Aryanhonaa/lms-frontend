import { apiClient } from "@/lib/api/client";
import type {
  CertificateRequirement,
  OwnedCertificate,
  PendingCourseReview,
  PublicCertificate,
} from "@/types/certificate";

export async function listTraineeCertificates(): Promise<{
  certificates: OwnedCertificate[];
  pendingReviews: PendingCourseReview[];
}> {
  return apiClient("/trainee/certificates");
}

export async function getTraineeCertificate(certificateId: string): Promise<{ certificate: OwnedCertificate }> {
  return apiClient(`/trainee/certificates/${encodeURIComponent(certificateId)}`);
}

export async function getProgramCertificate(
  programId: string,
  batchId?: string,
): Promise<{
  eligible: boolean;
  requirements: CertificateRequirement[];
  pendingReview: boolean;
  certificate: OwnedCertificate | null;
}> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  return apiClient(`/trainee/programs/${programId}/certificate${query}`);
}

export async function listTrainerCertificates(): Promise<{ certificates: OwnedCertificate[] }> {
  return apiClient("/trainer/certificates");
}

export async function listAdminCertificates(): Promise<{ certificates: OwnedCertificate[] }> {
  return apiClient("/admin/certificates");
}

export async function revokeCertificate(
  certificateId: string,
  reason?: string,
): Promise<{ certificate: OwnedCertificate }> {
  return apiClient(`/admin/certificates/${encodeURIComponent(certificateId)}`, {
    method: "PATCH",
    body: { reason },
  });
}

export async function verifyCertificate(certificateId: string): Promise<{ certificate: PublicCertificate }> {
  return apiClient(`/verify/${encodeURIComponent(certificateId)}`);
}
