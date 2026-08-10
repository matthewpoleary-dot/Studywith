import { createAdminSupabase } from "./supabase-server";

export type AccessSummary = {
  hasToolkit: boolean;
  hasPro: boolean;
  hasSchoolAccess: boolean;
  planLabel: string;
  creditsRemaining: number;
};

export async function getAccessSummary(userId: string): Promise<AccessSummary> {
  const now = new Date().toISOString();
  const { data } = await createAdminSupabase()
    .from("entitlements")
    .select("kind, status, ends_at, ai_credits, ai_credits_used")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("starts_at", now);

  const active = (data ?? []).filter((row) => !row.ends_at || row.ends_at > now);
  const hasPro = active.some((row) => row.kind === "pro" || row.kind === "trial");
  const hasSchoolAccess = active.some((row) => row.kind === "school");
  const hasToolkit = active.some((row) => row.kind === "toolkit") || hasPro || hasSchoolAccess;
  const creditsRemaining = active.reduce(
    (sum, row) => sum + Math.max(0, row.ai_credits - row.ai_credits_used),
    0,
  );

  return {
    hasToolkit,
    hasPro,
    hasSchoolAccess,
    planLabel: hasPro ? "StudyWith Pro" : hasSchoolAccess ? "School access" : hasToolkit ? "AI Study Toolkit" : "Free",
    creditsRemaining,
  };
}

export async function consumeAiAction(userId: string, feature: string) {
  const { data, error } = await createAdminSupabase().rpc("consume_ai_action", {
    p_user_id: userId,
    p_feature: feature,
  });
  if (error) throw error;
  return data as { allowed: boolean; reason?: string; remaining?: number };
}
