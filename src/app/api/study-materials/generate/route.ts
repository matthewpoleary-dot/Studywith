export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import { generateFlashcards, generateQuiz } from "@/lib/generation_logic";
import type { Database } from "@/lib/database.types";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { text?: string; fileName?: string };
  const { text, fileName } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Create the study material record first
  const { data: material, error: matErr } = await admin
    .from("study_materials")
    .insert({ user_id: user.id, file_name: fileName ?? "Untitled" })
    .select("id")
    .single();

  if (matErr || !material) {
    console.error("study_materials insert error:", matErr);
    return NextResponse.json({ error: "Failed to create material record" }, { status: 500 });
  }

  // Generate flashcards and quiz questions in parallel
  let flashcards, quizQuestions;
  try {
    [flashcards, quizQuestions] = await Promise.all([
      generateFlashcards(text),
      generateQuiz(text),
    ]);
  } catch (err) {
    // Clean up the orphaned material record
    await admin.from("study_materials").delete().eq("id", material.id);
    console.error("generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 },
    );
  }

  // Persist both sets
  const [flashErr, quizErr] = await Promise.all([
    admin.from("flashcards").insert(
      flashcards.map((f) => ({
        material_id: material.id,
        user_id: user.id,
        question: f.question,
        answer: f.answer,
        topic: f.topic,
        confidence: 0,
      })),
    ).then(({ error }) => error),

    admin.from("quiz_questions").insert(
      quizQuestions.map((q) => ({
        material_id: material.id,
        user_id: user.id,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation,
      })),
    ).then(({ error }) => error),
  ]);

  if (flashErr) console.error("flashcards insert error:", flashErr);
  if (quizErr) console.error("quiz_questions insert error:", quizErr);

  return NextResponse.json({
    materialId: material.id,
    flashcards: flashcards.length,
    questions: quizQuestions.length,
  });
}
