export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createAdminSupabase } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessSummary } from "@/lib/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirectTo=/app");
  const admin = createAdminSupabase();
  await admin.from("users").upsert({ id: user.id, email: user.email ?? "" }, { onConflict: "id" });
  const access = await getAccessSummary(user.id);
  return (
    <AppShell email={user.email ?? ""} planLabel={access.planLabel} hasToolkit={access.hasToolkit}>
      {children}
    </AppShell>
  );
}
