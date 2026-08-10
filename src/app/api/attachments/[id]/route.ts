import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { STUDY_FILES_BUCKET } from "@/lib/study-files";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to open this file." }, { status: 401 });
  const { id } = await context.params;
  const admin = createAdminSupabase();
  const { data: attachment } = await admin
    .from("study_attachments")
    .select("storage_path, file_name, mime_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attachment) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const { data, error } = await admin.storage.from(STUDY_FILES_BUCKET).download(attachment.storage_path);
  if (error || !data) return NextResponse.json({ error: "File could not be opened." }, { status: 404 });
  const safeName = attachment.file_name.replace(/[\r\n"]/g, "").slice(0, 160) || "study-file";
  return new Response(data, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Content-Type": attachment.mime_type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
