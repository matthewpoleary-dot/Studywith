import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    assignmentId: string;
    title?: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  };

  if (!body.assignmentId) return Response.json({ error: "Assignment ID required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Verify teacher owns this room
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignment } = await (admin.from("room_assignments") as any)
    .select("id, room_id")
    .eq("id", body.assignmentId)
    .single();

  if (!assignment) return Response.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: room } = await (admin.from("rooms") as any)
    .select("teacher_id")
    .eq("id", assignment.room_id)
    .single();

  if (!room || room.teacher_id !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (admin.from("room_assignments") as any)
    .update({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.fileUrl !== undefined ? { file_url: body.fileUrl, file_name: body.fileName ?? null, file_type: body.fileType ?? null } : {}),
    })
    .eq("id", body.assignmentId)
    .select("id, title, content, image_url, file_url, file_name, file_type, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ assignment: updated });
}
