import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export async function PATCH(request: Request) {
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

  const { sessionId, title } = (await request.json()) as {
    sessionId: string;
    title: string;
  };

  if (!sessionId || typeof title !== "string") {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  await getSupabaseAdmin()
    .from("sessions")
    .update({ title: title.trim() || null })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  return Response.json({ ok: true });
}
