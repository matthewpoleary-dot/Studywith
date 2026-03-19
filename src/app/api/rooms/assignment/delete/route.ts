import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = (await request.json()) as { assignmentId: string };
  if (!assignmentId) return Response.json({ error: "Assignment ID required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Verify this user is the teacher of the room this assignment belongs to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignment } = await (admin.from("room_assignments") as any)
    .select("id, room_id, file_url")
    .eq("id", assignmentId)
    .single();

  if (!assignment) return Response.json({ error: "Assignment not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: room } = await (admin.from("rooms") as any)
    .select("teacher_id")
    .eq("id", assignment.room_id)
    .single();

  if (!room || room.teacher_id !== user.id) {
    return Response.json({ error: "Only the room teacher can delete assignments" }, { status: 403 });
  }

  // Delete from storage if file_url exists
  if (assignment.file_url) {
    try {
      const url = new URL(assignment.file_url);
      const pathParts = url.pathname.split("/room-files/");
      if (pathParts[1]) {
        await admin.storage.from("room-files").remove([pathParts[1]]);
      }
    } catch {
      // Non-critical, continue with DB delete
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("room_assignments") as any).delete().eq("id", assignmentId);

  return Response.json({ success: true });
}
