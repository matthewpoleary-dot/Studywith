export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@/lib/database.types";

interface StudyTopic {
  subject: string;
  topic: string;
  effort: number;
  marksPotential: number;
  priorityScore: number;
  predictionNote: string;
  weekNumber: number;
}

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

  const body = (await request.json()) as {
    exam_type?: string;
    exam_year?: number;
    subjects?: string[];
    start_date?: string;
    sessions_per_week?: number;
    session_duration_mins?: number;
  };

  const { exam_type, exam_year, subjects, start_date, sessions_per_week, session_duration_mins } = body;

  if (!exam_type || !exam_year || !subjects?.length || !start_date || !sessions_per_week || !session_duration_mins) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Calculate exam date
  const examDate =
    exam_type === "LC"
      ? `June 4, ${exam_year}` // LC typically starts first Thursday of June
      : `June 11, ${exam_year}`; // JC typically starts second week of June

  const startDateObj = new Date(start_date);
  const examDateObj = new Date(`${exam_type === "LC" ? "June 4" : "June 11"}, ${exam_year}`);
  const weeksAvailable = Math.max(
    1,
    Math.floor((examDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24 * 7)),
  );
  const totalSessionsPerWeek = sessions_per_week;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are an expert on Irish ${exam_type === "LC" ? "Leaving Certificate" : "Junior Certificate"} examinations for the ${exam_year} academic year.

The student is preparing for their ${exam_type} exams (starting around ${examDate}).
Selected subjects: ${subjects.join(", ")}
Study start date: ${start_date}
Sessions per week: ${totalSessionsPerWeek}
Session duration: ${session_duration_mins} minutes
Total weeks available: ${weeksAvailable}

Your task: Generate a prioritised study plan based on real exam patterns, syllabus weighting, and likely predictions for ${exam_year}.

For EACH subject, identify the 4-8 most important topics/questions that are likely to appear. Consider:
- Historical frequency (topics that appear almost every year)
- Recent cycles (what hasn't come up recently and is overdue)
- Mark allocation (high-mark questions are priority)
- Effort required vs marks gained

For each topic assign:
- effort: integer 1-5 (1 = quick to learn in one session, 5 = requires weeks of study)
- marksPotential: integer 1-5 (1 = few marks possible, 5 = could secure 20+ marks)
- priorityScore: integer, calculate as: round((marksPotential * 20) / effort)
- weekNumber: which week (1 to ${weeksAvailable}) to study this topic. Allocate highest priorityScore topics to earliest weeks. Spread topics so each week has roughly ${totalSessionsPerWeek} topics.

Sort the output array by priorityScore DESCENDING (highest priority first).

Return ONLY a valid JSON array with no markdown formatting, no explanation, no code fences. Just the raw JSON array:
[
  {
    "subject": "Biology",
    "topic": "The Cell",
    "effort": 2,
    "marksPotential": 5,
    "priorityScore": 50,
    "predictionNote": "Core mandatory topic, appears every year for 30+ marks",
    "weekNumber": 1
  }
]`;

  let topics: StudyTopic[] = [];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Strip any accidental markdown fences
    const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    topics = JSON.parse(cleaned) as StudyTopic[];

    if (!Array.isArray(topics)) throw new Error("Response was not an array");
  } catch (err) {
    console.error("Claude generation error:", err);
    return NextResponse.json({ error: "Failed to generate study plan" }, { status: 500 });
  }

  const admin = getSupabaseAdmin();

  // Delete any existing plan for this user
  await admin.from("study_plans").delete().eq("user_id", user.id);

  // Insert new plan
  const { data: plan, error: insertErr } = await admin
    .from("study_plans")
    .insert({
      user_id: user.id,
      exam_type,
      exam_year,
      subjects: subjects,
      start_date,
      sessions_per_week,
      session_duration_mins,
      topics: topics,
    })
    .select()
    .single();

  if (insertErr || !plan) {
    console.error("study_plans insert error:", insertErr);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }

  return NextResponse.json({ plan });
}
