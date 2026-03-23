import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return Response.json({ error: "Code required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: room } = await (admin.from("rooms") as any)
    .select("id, code, name, teacher_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!room) return Response.json({ error: "Room not found" }, { status: 404 });

  // Fetch assignments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignments } = await (admin.from("room_assignments") as any)
    .select("id, title, content, image_url, file_url, file_name, file_type, created_at")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false });

  // Fetch members with their latest session receipt + grit (teacher view only)
  let members: unknown[] = [];
  if (room.teacher_id === user.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberRows } = await (admin.from("room_members") as any)
      .select("user_id, joined_at")
      .eq("room_id", room.id);

    if (memberRows && memberRows.length > 0) {
      const memberIds = (memberRows as { user_id: string; joined_at: string }[]).map((m) => m.user_id);

      // Get latest session receipt per member
      const memberData = await Promise.all(
        memberIds.map(async (uid) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: sessions } = await (admin.from("sessions") as any)
            .select("receipt, created_at")
            .eq("user_id", uid)
            .not("receipt", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);

          // Get user email from auth
          const { data: { user: authUser } } = await admin.auth.admin.getUserById(uid);
          const meta = authUser?.user_metadata ?? {};

          return {
            user_id: uid,
            email: authUser?.email ?? uid,
            grit_streak: meta.grit_streak ?? 0,
            total_grit_points: meta.total_grit_points ?? 0,
            latest_score: sessions?.[0]?.receipt?.score ?? null,
            latest_session_at: sessions?.[0]?.created_at ?? null,
          };
        }),
      );
      members = memberData;
    }
  }

  const isTeacher = room.teacher_id === user.id;

  return Response.json({ room, assignments: assignments ?? [], members, isTeacher });
}
