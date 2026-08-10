import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { removeStoredStudyFiles } from "@/lib/study-files";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const admin = createAdminSupabase();
  const { data: session } = await admin.from("sessions").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const { data: attachments } = await admin.from("study_attachments").select("storage_path").eq("session_id", id).eq("user_id", user.id);
  try {
    await removeStoredStudyFiles((attachments ?? []).map((item) => item.storage_path));
  } catch {
    return NextResponse.json({ error: "The session files could not be removed. Try again." }, { status: 500 });
  }
  const { data } = await admin.from("sessions").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (!data) return NextResponse.json({ error: "Session could not be deleted." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
