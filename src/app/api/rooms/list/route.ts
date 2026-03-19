import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // Rooms where user is teacher
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teachingRooms } = await (admin.from("rooms") as any)
    .select("id, code, name, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // Rooms where user is a member (student)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships } = await (admin.from("room_members") as any)
    .select("room_id, rooms(id, code, name, created_at)")
    .eq("user_id", user.id);

  const studentRooms = (memberships ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => m.rooms)
    .filter(Boolean)
    // exclude rooms where user is also teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => !(teachingRooms ?? []).find((t: any) => t.id === r.id));

  return Response.json({
    teachingRooms: teachingRooms ?? [],
    studentRooms,
  });
}
