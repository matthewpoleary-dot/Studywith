import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { TutorWorkspace } from "@/components/TutorWorkspace";
import type { Json } from "@/lib/database.types";

export default async function TutorPage() {
  const user = await getCurrentUser(); if (!user) return null;
  const { data } = await createAdminSupabase().from("sessions").select("id, title, subject, messages").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30);
  const sessions = (data ?? []).map((item) => ({ id: item.id, title: item.title, subject: item.subject, messages: (item.messages as Json[] ?? []) as { role: "student" | "tutor"; content: string }[] }));
  return <TutorWorkspace initialSessions={sessions} />;
}
