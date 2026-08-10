import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { MaterialsWorkspace } from "@/components/MaterialsWorkspace";

export default async function MaterialsPage() {
  const user = await getCurrentUser(); if (!user) return null; const admin = createAdminSupabase();
  const { data: materials } = await admin.from("study_materials").select("id, title, subject, extracted_text").eq("user_id", user.id).order("created_at", { ascending: false });
  const ids = (materials ?? []).map((item) => item.id);
  const [{ data: cards }, { data: quiz }] = ids.length ? await Promise.all([admin.from("flashcards").select("id, material_id, question, answer, topic, confidence").in("material_id", ids).eq("user_id", user.id), admin.from("quiz_questions").select("id, material_id, question, options, correct_index, explanation").in("material_id", ids).eq("user_id", user.id)]) : [{ data: [] }, { data: [] }];
  const shaped = (materials ?? []).map((material) => ({ ...material, flashcards: (cards ?? []).filter((card) => card.material_id === material.id), quiz: (quiz ?? []).filter((question) => question.material_id === material.id).map((question) => ({ ...question, options: Array.isArray(question.options) ? question.options.map(String) : [] })) }));
  return <MaterialsWorkspace initialMaterials={shaped} />;
}
