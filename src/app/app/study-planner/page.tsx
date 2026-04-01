export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";
import StudyPlannerClient from "@/components/StudyPlannerClient";

export default async function StudyPlannerPage() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = getSupabaseAdmin();
  const { data: plan } = await admin
    .from("study_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="w-full px-6 md:px-10 py-10 md:py-16 pb-24 md:pb-16">
      <StudyPlannerClient initialPlan={plan ?? null} />
    </div>
  );
}
