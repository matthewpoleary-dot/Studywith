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
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) return Response.json({ error: "Room name is required" }, { status: 400 });

    const code = generateCode();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (getSupabaseAdmin().from("rooms") as any)
      .insert({ code, name, teacher_id: user.id })
      .select("id, code, name")
      .single();

    if (error) {
      console.error("[rooms/create] supabase error:", error);
      return Response.json(
        { error: `DB error ${error.code ?? ""}: ${error.message ?? "unknown"}` },
        { status: 500 },
      );
    }

    return Response.json({ room: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[rooms/create] thrown:", msg);
    return Response.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
