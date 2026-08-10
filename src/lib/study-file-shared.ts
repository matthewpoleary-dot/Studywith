export const STUDY_FILES_BUCKET = "study-files";
export const MAX_STUDY_FILES = 5;
export const MAX_STUDY_FILE_BYTES = 8_000_000;
export const MAX_STUDY_REQUEST_BYTES = 20_000_000;

const extensionMimeTypes: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

export type PendingStudyUpload = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

export function safeFileName(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return cleaned || "study-file";
}

export function studyStoragePath(userId: string, file: Pick<PendingStudyUpload, "id" | "name">) {
  return `${userId}/${file.id}/${safeFileName(file.name)}`;
}

export function studyFileMimeType(name: string, providedType?: string) {
  if (providedType) return providedType.toLowerCase();
  const lowerName = name.toLowerCase();
  const extension = Object.keys(extensionMimeTypes).find((item) => lowerName.endsWith(item));
  return extension ? extensionMimeTypes[extension] : "application/octet-stream";
}
