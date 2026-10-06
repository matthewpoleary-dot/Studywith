import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { removeStoredStudyFiles } from "@/lib/study-files";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const admin = createAdminSupabase();
  const { data: material } = await admin
    .from("study_materials")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!material) return NextResponse.json({ error: "Material not found." }, { status: 404 });
  const { data: attachments } = await admin
    .from("study_attachments")
    .select("storage_path")
    .eq("material_id", id)
    .eq("user_id", user.id);
  try {
    await removeStoredStudyFiles((attachments ?? []).map((item) => item.storage_path));
  } catch {
    return NextResponse.json({ error: "The uploaded files could not be removed. Try again." }, { status: 500 });
  }
  const { data } = await admin
    .from("study_materials")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Material could not be deleted." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
