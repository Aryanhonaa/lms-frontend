export type StoredFileMeta = {
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type AttachmentView = StoredFileMeta & {
  id: string;
  title: string;
  createdAt?: string;
};

export type UploadedFile = {
  key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageProvider: string;
  url: string | null;
};

export type FileAccess = {
  url: string;
  strategy: "signed" | "stream" | "public";
  fileName: string;
  mimeType: string;
  fileSize: number;
  expiresAt: string | null;
};

export type UploadPurpose =
  | "VIDEO"
  | "REEL"
  | "RESOURCE"
  | "LESSON_ATTACHMENT"
  | "ASSIGNMENT_ATTACHMENT";

export type CurriculumFileItemType = "VIDEO" | "RESOURCE" | "REEL";
