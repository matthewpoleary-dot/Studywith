import Groq from "groq-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { consumeAiAction } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { createAdminSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

type GeneratedCard = {
  question: string;
  answer: string;
  topic: string;
};

type GeneratedQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

function parseJson(text: string) {
  return JSON.parse(
    text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim(),
  ) as Record<string, unknown>;
}

function parseCards(value: unknown, fallbackTopic: string): GeneratedCard[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 10)
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        question: String(item.question ?? "")
          .trim()
          .slice(0, 500),
        answer: String(item.answer ?? "")
          .trim()
          .slice(0, 1000),
        topic: String(item.topic ?? fallbackTopic)
          .trim()
          .slice(0, 80),
      };
    })
    .filter((item) => item.question && item.answer);
}

function parseQuestions(value: unknown): GeneratedQuestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 6)
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const options = Array.isArray(item.options)
        ? item.options.slice(0, 4).map((option) => String(option).trim().slice(0, 300))
        : [];
      const requestedIndex = Number(item.correctIndex ?? 0);
      return {
        question: String(item.question ?? "")
          .trim()
          .slice(0, 700),
        options,
        correct_index: Number.isInteger(requestedIndex) ? Math.max(0, Math.min(3, requestedIndex)) : 0,
        explanation: String(item.explanation ?? "")
          .trim()
          .slice(0, 1000),
      };
    })
    .filter((item) => Boolean(item.question) && item.options.length === 4 && item.options.every(Boolean));
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    kind?: "cards" | "quiz";
  } | null;
  if (body?.kind !== "cards" && body?.kind !== "quiz") {
    return NextResponse.json({ error: "Choose flashcards or quiz." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: material } = await admin
    .from("study_materials")
    .select("id, subject, extracted_text")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const access = await consumeAiAction(user.id, `materials_${body.kind}`);
  if (!access.allowed) {
    return NextResponse.json(
      { error: "Your included AI actions are used. Upgrade to generate more practice." },
      { status: 402 },
    );
  }

  const makingCards = body.kind === "cards";
  const instruction = makingCards
    ? 'Return strict JSON: {"flashcards":[{"question":"","answer":"","topic":""}]}. Create exactly 10 concise active-recall cards.'
    : 'Return strict JSON: {"questions":[{"question":"","options":["","","",""],"correctIndex":0,"explanation":""}]}. Create exactly 6 questions with one unambiguous correct answer.';

  let parsed: Record<string, unknown>;
  try {
    const completion = await new Groq({ apiKey: process.env.GROQ_API_KEY }).chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.25,
      max_completion_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You create Leaving Cert study practice from the student's notes only. Do not invent claims not supported by the notes. ${instruction}`,
        },
        {
          role: "user",
          content: `Subject: ${material.subject}\n\nNOTES:\n${material.extracted_text.slice(0, 16000)}`,
        },
      ],
    });
    parsed = parseJson(completion.choices[0]?.message?.content ?? "{}");
  } catch (error) {
    console.error("Practice generation failed", error);
    return NextResponse.json(
      { error: "Practice could not be generated. Your saved notes are unchanged." },
      { status: 502 },
    );
  }

  if (makingCards) {
    const rows = parseCards(parsed.flashcards, material.subject).map((card) => ({
      ...card,
      material_id: id,
      user_id: user.id,
    }));
    if (!rows.length) {
      return NextResponse.json(
        { error: "No usable flashcards were generated. Your existing deck was kept." },
        { status: 502 },
      );
    }

    const { error: deleteError } = await admin.from("flashcards").delete().eq("material_id", id).eq("user_id", user.id);
    if (deleteError) {
      return NextResponse.json({ error: "Flashcards could not be refreshed." }, { status: 500 });
    }

    const { data, error } = await admin
      .from("flashcards")
      .insert(rows)
      .select("id, question, answer, topic, confidence");
    if (error) {
      return NextResponse.json({ error: "Flashcards could not be saved." }, { status: 500 });
    }
    return NextResponse.json({ flashcards: data, remaining: access.remaining ?? null });
  }

  const rows = parseQuestions(parsed.questions).map((question) => ({
    ...question,
    options: question.options as Json,
    material_id: id,
    user_id: user.id,
  }));
  if (!rows.length) {
    return NextResponse.json({ error: "No usable quiz was generated. Your existing quiz was kept." }, { status: 502 });
  }

  const { error: deleteError } = await admin
    .from("quiz_questions")
    .delete()
    .eq("material_id", id)
    .eq("user_id", user.id);
  if (deleteError) {
    return NextResponse.json({ error: "Quiz could not be refreshed." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("quiz_questions")
    .insert(rows)
    .select("id, question, options, correct_index, explanation");
  if (error) {
    return NextResponse.json({ error: "Quiz could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ quiz: data, remaining: access.remaining ?? null });
}
