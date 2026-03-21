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
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { assignment, messages } = (await request.json()) as {
    assignment: string;
    messages: Database["public"]["Tables"]["sessions"]["Insert"]["messages"];
  };

  const { data: session } = await getSupabaseAdmin()
    .from("sessions")
    .insert({
      user_id: user.id,
      assignment_text: assignment,
      messages,
    })
    .select("id")
    .single();

  return Response.json({ sessionId: session?.id ?? null });
}
