export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  const [{ data: material }, { data: flashcards }, { data: quizQuestions }] =
    await Promise.all([
      admin
        .from("study_materials")
        .select("id, file_name, topic, created_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .single(),

      admin
        .from("flashcards")
        .select("id, question, answer, topic, confidence")
        .eq("material_id", id)
        .eq("user_id", user.id)
        .order("created_at"),

      admin
        .from("quiz_questions")
        .select("id, question, options, correct_index, explanation")
        .eq("material_id", id)
        .eq("user_id", user.id)
        .order("created_at"),
    ]);

  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    material,
    flashcards: flashcards ?? [],
    quiz_questions: (quizQuestions ?? []).map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })),
  });
}
