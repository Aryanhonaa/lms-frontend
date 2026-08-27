export type CertificateStatus = "VALID" | "REVOKED";

export type OwnedCertificate = {
  certificateId: string;
  program: { id: string; title: string };
  trainerName: string;
  traineeName: string;
  completionDate: string;
  issuedAt: string;
  status: CertificateStatus;
  verificationUrl: string;
};

export type CertificateRequirement = {
  key: string;
  label: string;
  met: boolean;
};

export type PendingCourseReview = {
  enrollmentId: string;
  programId: string;
  programTitle: string;
  batchId: string;
  batchName: string;
};

export type PublicCertificate = {
  certificateId: string;
  traineeName: string;
  program: string;
  trainer: string;
  completionDate: string;
  status: CertificateStatus;
};
