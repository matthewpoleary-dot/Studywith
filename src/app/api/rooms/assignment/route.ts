import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    roomId: string;
    title: string;
    content: string;
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  };

  if (!body.roomId || !body.title?.trim()) {
    return Response.json({ error: "Room ID and title are required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Verify this user is the teacher
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: room } = await (admin.from("rooms") as any)
    .select("teacher_id")
    .eq("id", body.roomId)
    .single();

  if (!room || room.teacher_id !== user.id) {
    return Response.json({ error: "Only the room teacher can upload assignments" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from("room_assignments") as any)
    .insert({
      room_id: body.roomId,
      title: body.title.trim(),
      content: body.content ?? "",
      ...(body.imageUrl ? { image_url: body.imageUrl } : {}),
      ...(body.fileUrl ? { file_url: body.fileUrl, file_name: body.fileName ?? "", file_type: body.fileType ?? "" } : {}),
    })
    .select("id, title, content, image_url, file_url, file_name, file_type, created_at")
    .single();

  if (error) {
    console.error("[rooms/assignment]", error);
    return Response.json({ error: "Failed to save assignment" }, { status: 500 });
  }

  return Response.json({ assignment: data });
}
