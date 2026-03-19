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

  const { code } = (await request.json()) as { code: string };
  if (!code?.trim()) return Response.json({ error: "Room code is required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Find room
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: room, error: roomErr } = await (admin.from("rooms") as any)
    .select("id, code, name")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (roomErr || !room) {
    return Response.json({ error: "Room not found. Check the code and try again." }, { status: 404 });
  }

  // Upsert membership (idempotent)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("room_members") as any)
    .upsert({ room_id: room.id, user_id: user.id }, { onConflict: "room_id,user_id" });

  return Response.json({ room });
}
