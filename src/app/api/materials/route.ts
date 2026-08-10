import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { consumeAiAction } from "@/lib/access";
import { createAdminSupabase } from "@/lib/supabase-server";
import {
  claimStudyFiles,
  combineExtractedText,
  prepareStoredStudyFiles,
  removeStoredStudyFiles,
  type PendingStudyUpload,
} from "@/lib/study-files";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseUploads(value: unknown): PendingStudyUpload[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const uploads = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const upload = item as Record<string, unknown>;
    if ([upload.id, upload.name, upload.mimeType, upload.storagePath].some((field) => typeof field !== "string") || typeof upload.size !== "number") return [];
    return [{ id: upload.id as string, name: upload.name as string, mimeType: upload.mimeType as string, size: upload.size, storagePath: upload.storagePath as string }];
  });
  return uploads.length === value.length ? uploads : null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { title?: string; subject?: string; notes?: string; uploads?: unknown } | null;
  const uploads = parseUploads(body?.uploads);
  if (!body || uploads === null) return NextResponse.json({ error: "The material details were invalid." }, { status: 400 });

  const title = String(body.title ?? "").trim().slice(0, 120);
  const subject = String(body.subject ?? "General").trim().slice(0, 60) || "General";
  const notes = String(body.notes ?? "").trim().slice(0, 60_000);
  if (!title || (!uploads.length && notes.length < 20)) {
    return NextResponse.json({ error: "Add a title and either a file, photo or a few lines of notes." }, { status: 400 });
  }

  if (uploads.some((item) => item.mimeType.startsWith("image/"))) {
    const access = await consumeAiAction(user.id, "materials_import");
    if (!access.allowed) {
      return NextResponse.json({ error: "Your included AI actions are used. Upgrade to read more photos or screenshots." }, { status: 402 });
    }
  }

  let preparedFiles;
  try {
    preparedFiles = await prepareStoredStudyFiles(user.id, uploads);
  } catch (error) {
    await removeStoredStudyFiles(uploads.map((item) => item.storagePath)).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "StudyWith could not read those files." }, { status: 400 });
  }

  const extractedText = [notes, combineExtractedText(preparedFiles)].filter(Boolean).join("\n\n").slice(0, 60_000);
  if (extractedText.length < 20) {
    await removeStoredStudyFiles(preparedFiles.map((item) => item.storagePath)).catch(() => undefined);
    return NextResponse.json({ error: "StudyWith could not find enough readable text in that material." }, { status: 400 });
  }

  const sourceTypes = new Set<string>(preparedFiles.map((item) => (item.mimeType.startsWith("image/") ? "image" : item.mimeType === "application/pdf" ? "pdf" : "file")));
  if (notes) sourceTypes.add("text");
  const sourceType = sourceTypes.size > 1 ? "mixed" : [...sourceTypes][0] ?? "text";
  const materialId = crypto.randomUUID();
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("study_materials")
    .insert({
      id: materialId,
      user_id: user.id,
      title,
      file_name: preparedFiles[0]?.name ?? title,
      subject,
      topic: subject,
      source_type: sourceType,
      extracted_text: extractedText,
    })
    .select("id, title, subject, extracted_text, source_type, created_at")
    .single();
  if (error || !data) {
    await removeStoredStudyFiles(preparedFiles.map((item) => item.storagePath)).catch(() => undefined);
    return NextResponse.json({ error: "The material could not be saved." }, { status: 500 });
  }

  try {
    const attachmentRows = await claimStudyFiles({ files: preparedFiles, userId: user.id, materialId });
    return NextResponse.json(
      {
        material: {
          ...data,
          attachments: attachmentRows.map((item) => ({ id: item.id, kind: "file", name: item.file_name, mimeType: item.mime_type, size: item.size_bytes })),
          flashcards: [],
          quiz: [],
        },
      },
      { status: 201 },
    );
  } catch {
    await admin.from("study_materials").delete().eq("id", materialId).eq("user_id", user.id);
    await removeStoredStudyFiles(preparedFiles.map((item) => item.storagePath)).catch(() => undefined);
    return NextResponse.json({ error: "The notes were read but their files could not be secured. Add them again." }, { status: 500 });
  }
}
