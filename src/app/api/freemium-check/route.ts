import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const FREE_SESSION_LIMIT = 3;

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ allowed: false, reason: "unauthenticated" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // Check subscription status
  const { data: userData } = await admin
    .from("users")
    .select("subscribed")
    .eq("id", user.id)
    .single();

  if (userData?.subscribed) {
    return Response.json({ allowed: true });
  }

  // Count completed sessions (has a receipt)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin.from("sessions") as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("receipt", "is", null);

  const completedCount = count ?? 0;

  if (completedCount >= FREE_SESSION_LIMIT) {
    return Response.json({
      allowed: false,
      reason: "limit_reached",
      completed: completedCount,
      limit: FREE_SESSION_LIMIT,
    });
  }

  return Response.json({
    allowed: true,
    completed: completedCount,
    limit: FREE_SESSION_LIMIT,
    remaining: FREE_SESSION_LIMIT - completedCount,
  });
}
