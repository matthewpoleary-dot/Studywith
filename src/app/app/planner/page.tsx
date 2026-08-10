import { Planner } from "@/components/Planner";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";

type SavedTopics = { weeklyContext?: unknown };

export default async function PlannerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await createAdminSupabase()
    .from("study_plans")
    .select("exam_year, sessions_per_week, session_duration_mins, subjects, topics, schedule")
    .eq("user_id", user.id)
    .maybeSingle();

  const topics = data?.topics && typeof data.topics === "object" && !Array.isArray(data.topics)
    ? data.topics as SavedTopics
    : null;

  return (
    <Planner
      initial={data ? {
        exam_year: data.exam_year,
        sessions_per_week: data.sessions_per_week,
        session_duration_mins: data.session_duration_mins,
        subjects: Array.isArray(data.subjects) ? data.subjects as { name: string; confidence: number; priority: number }[] : [],
        schedule: Array.isArray(data.schedule) ? data.schedule as { day: string; time?: string; subject: string; focus: string; minutes: number; status?: "planned" | "completed" }[] : [],
        weekly_context: typeof topics?.weeklyContext === "string" ? topics.weeklyContext : "",
      } : null}
    />
  );
}
