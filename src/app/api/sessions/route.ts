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
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sessions, error } = await getSupabaseAdmin()
    .from("sessions")
    .select("id, assignment_text, title, created_at, receipt")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // title column may not exist — fall back without it
    const { data: sessionsFallback } = await getSupabaseAdmin()
      .from("sessions")
      .select("id, assignment_text, created_at, receipt")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return Response.json({
      sessions: (sessionsFallback ?? []).map((s) => ({ ...s, title: null })),
    });
  }

  return Response.json({ sessions: sessions ?? [] });
}
