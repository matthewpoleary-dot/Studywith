export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import AppSidebar from "@/components/AppSidebar";
import type { Database } from "@/lib/database.types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Fetch sessions for the sidebar
  const { data: sessions } = await getSupabaseAdmin()
    .from("sessions")
    .select("id, assignment_text, title, created_at, receipt")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex h-screen bg-[#FDFCF8] overflow-hidden">
      <AppSidebar
        sessions={(sessions ?? []) as {
          id: string;
          assignment_text: string;
          title: string | null;
          created_at: string;
          receipt: Record<string, unknown> | null;
        }[]}
        userEmail={user?.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
