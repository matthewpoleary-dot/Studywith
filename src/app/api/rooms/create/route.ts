// Required Supabase SQL (run once in SQL editor):
// CREATE TABLE rooms (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   code text UNIQUE NOT NULL,
//   name text NOT NULL,
//   teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   created_at timestamptz DEFAULT now()
// );
// CREATE TABLE room_members (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
//   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   joined_at timestamptz DEFAULT now(),
//   UNIQUE(room_id, user_id)
// );
// CREATE TABLE room_assignments (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
//   title text NOT NULL,
//   content text NOT NULL DEFAULT '',
//   image_base64 text,
//   image_mime text,
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
// ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
// ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "rooms_all" ON rooms FOR ALL USING (true) WITH CHECK (true);
// CREATE POLICY "members_all" ON room_members FOR ALL USING (true) WITH CHECK (true);
// CREATE POLICY "assignments_all" ON room_assignments FOR ALL USING (true) WITH CHECK (true);

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = (await request.json()) as { name: string };
  if (!name?.trim()) return Response.json({ error: "Room name is required" }, { status: 400 });

  const code = generateCode();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin().from("rooms") as any)
    .insert({ code, name: name.trim(), teacher_id: user.id })
    .select("id, code, name")
    .single();

  if (error) {
    console.error("[rooms/create]", error);
    return Response.json({ error: "Failed to create room" }, { status: 500 });
  }

  return Response.json({ room: data });
}
