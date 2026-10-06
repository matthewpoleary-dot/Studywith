"use client";

import type { FileUIPart } from "ai";
import { createBrowserSupabase } from "./supabase-browser";
import {
  MAX_STUDY_FILE_BYTES,
  MAX_STUDY_FILES,
  MAX_STUDY_REQUEST_BYTES,
  STUDY_FILES_BUCKET,
  studyFileMimeType,
  studyStoragePath,
  type PendingStudyUpload,
} from "./study-file-shared";

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]);

export async function uploadStudyFileParts(
  userId: string,
  parts: FileUIPart[],
  onProgress?: (current: number, total: number) => void,
) {
  if (parts.length > MAX_STUDY_FILES) throw new Error(`Add up to ${MAX_STUDY_FILES} files at a time.`);
  const prepared = await Promise.all(
    parts.map(async (part) => {
      if (!part.url) throw new Error("One of the selected files could not be read.");
      const response = await fetch(part.url);
      if (!response.ok) throw new Error("One of the selected files could not be read.");
      const blob = await response.blob();
      const name = part.filename || "study-file";
      const mimeType = studyFileMimeType(name, part.mediaType || blob.type);
      if (!supportedTypes.has(mimeType)) throw new Error(`${name} is not supported. Use JPG, PNG, WebP, PDF or TXT.`);
      if (blob.size > MAX_STUDY_FILE_BYTES) throw new Error(`${name} is over the 8 MB limit.`);
      return { blob, name, mimeType };
    }),
  );
  if (prepared.reduce((total, item) => total + item.blob.size, 0) > MAX_STUDY_REQUEST_BYTES) {
    throw new Error("Keep the combined upload under 20 MB.");
  }

  const supabase = createBrowserSupabase();
  const uploaded: PendingStudyUpload[] = [];
  try {
    for (const [index, item] of prepared.entries()) {
      onProgress?.(index + 1, prepared.length);
      const id = crypto.randomUUID();
      const storagePath = studyStoragePath(userId, { id, name: item.name });
      const { error } = await supabase.storage.from(STUDY_FILES_BUCKET).upload(storagePath, item.blob, {
        contentType: item.mimeType,
        upsert: false,
      });
      if (error) throw new Error(`Could not upload ${item.name}. ${error.message}`);
      uploaded.push({ id, name: item.name, mimeType: item.mimeType, size: item.blob.size, storagePath });
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) {
      await supabase.storage.from(STUDY_FILES_BUCKET).remove(uploaded.map((item) => item.storagePath));
    }
    throw error;
  }
}

export async function discardPendingUploads(uploads: PendingStudyUpload[]) {
  if (!uploads.length) return;
  await createBrowserSupabase()
    .storage.from(STUDY_FILES_BUCKET)
    .remove(uploads.map((item) => item.storagePath));
}
