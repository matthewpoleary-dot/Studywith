import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database, LearningReceipt } from "@/lib/database.types";
import { calculateGrit } from "@/lib/grit";

export const dynamic = "force-dynamic";

// Inline type to avoid importing from a 'use client' boundary
type TutorMessage = { id: string; role: "student" | "tutor" | "system"; content: string };

type RequestBody = {
  sessionId: string;
  assignment: string;
  messages: TutorMessage[];
};

export async function POST(request: Request) {
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
  const body = (await request.json()) as RequestBody;

  // Authenticate user
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
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build transcript for the AI to analyse
  const transcript = body.messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "student" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n");

  const receiptPrompt = `You are Sage, a study tutor. A student just completed a session. Return ONLY a valid JSON object with no markdown or preamble:
{
  "title": "3-5 word topic title",
  "subject": "detected subject area",
  "closingMessage": "A warm 1-2 sentence message. If the student clearly worked it out themselves, say so genuinely. If they struggled, be encouraging. Never be generic.",
  "directAnswer": "A 2-4 sentence session overview: which questions or parts of the assignment were actually worked through this session (be specific), and where the student's understanding currently stands. Do NOT reveal answers — describe progress only. If the student only covered a small fraction of the questions, say so honestly.",
  "conceptsCovered": ["concept 1", "concept 2"],
  "understoodWell": ["thing student showed clear grasp of 1", "thing 2"],
  "toRevisit": ["topic worth revisiting 1", "topic 2"],
  "followUpQuestion": "One thought-provoking question for the student to think about next.",
  "gaps": ["gap 1"],
  "score": 75,
  "summary": "One paragraph summarising learning progress and what to review."
}

Assignment:
${body.assignment}

Transcript:
${transcript}

SCORING RULES: this is a LEARNING score (0-100), not a knowledge test score. You are rewarding growth and effort, not prior knowledge.

CRITICAL: First, assess coverage. If the assignment has many questions and the student only touched one or two without completing them, the score MUST reflect that — do not award a generous score for an incomplete session regardless of attitude.

Score based on these factors (in order of importance):
1. COVERAGE: How much of the assignment was actually worked through? If 15 questions exist and only 1 was partially attempted, the score ceiling is around 25-35 regardless of other factors.
2. PROGRESSION: Did the student's understanding visibly improve within what they did cover?
3. RESPONSIVENESS: Did they pick up on hints and build from them?
4. EFFORT & ENGAGEMENT: Did they keep trying even when stuck?
5. CONSOLIDATION: By the end of what they covered, could they explain ideas in their own words?

Scoring benchmarks:
- Only 1-2 questions touched, not completed: 10–30
- Covered ~25% of assignment with some understanding: 25–45
- Covered ~50% with good engagement: 45–65
- Covered most of the assignment with real progression: 65–85
- Covered all/most with exceptional understanding: 80–95
- Barely engaged, refused to attempt, gave up immediately: 5–20

Do NOT penalise a student for starting with low knowledge. Do NOT give a high score for partial coverage. The score should honestly reflect how much of the work was done and how well.

The summary should mention where they started, how they progressed, and specifically what they should review next.
The title must be 3–5 words, sentence-case, describing the topic (e.g. "Mitochondria & ATP synthesis", "Basic addition facts").`;

  let receiptText = "{}";
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [{ role: "user", content: receiptPrompt }],
    });
    receiptText = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("[end-session] Groq error:", err);
  }

  let receipt: LearningReceipt;
  let sessionTitle: string | null = null;
  try {
    const cleaned = receiptText.replace(/```(?:json)?\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as LearningReceipt & { title?: string };
    sessionTitle = parsed.title ?? null;
    // Strip title from receipt JSON before storing (it lives on the session row)
    const { title: _t, ...receiptFields } = parsed;
    void _t;
    receipt = {
      conceptsCovered: receiptFields.conceptsCovered ?? [],
      gaps: receiptFields.gaps ?? [],
      score: receiptFields.score ?? 0,
      summary: receiptFields.summary ?? "",
      ...(receiptFields.understoodWell ? { understoodWell: receiptFields.understoodWell } : {}),
      ...(receiptFields.toRevisit ? { toRevisit: receiptFields.toRevisit } : {}),
      ...(receiptFields.followUpQuestion ? { followUpQuestion: receiptFields.followUpQuestion } : {}),
      ...(receiptFields.closingMessage ? { closingMessage: receiptFields.closingMessage } : {}),
      ...(receiptFields.directAnswer ? { directAnswer: receiptFields.directAnswer } : {}),
      ...(receiptFields.subject ? { subject: receiptFields.subject } : {}),
    };
  } catch {
    receipt = {
      conceptsCovered: [],
      gaps: [],
      score: 0,
      summary: "Receipt could not be generated for this session.",
    };
  }

  // Calculate grit for this session
  const gritEarned = calculateGrit(
    body.messages as { role: "student" | "tutor" | "system"; content: string }[],
  );
  receipt = { ...receipt, gritEarned };

  // Persist receipt, title and final messages to Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdmin().from("sessions") as any)
    .update({
      receipt,
      messages: body.messages,
      ...(sessionTitle ? { title: sessionTitle } : {}),
    })
    .eq("id", body.sessionId)
    .eq("user_id", user.id);

  // Sync grit to user_metadata (increment total, update streak)
  try {
    const adminAuth = getSupabaseAdmin().auth;
    const { data: { user: fullUser } } = await adminAuth.admin.getUserById(user.id);
    const meta = fullUser?.user_metadata ?? {};
    const prevTotal: number = typeof meta.total_grit_points === "number" ? meta.total_grit_points : 0;
    const lastSessionDate: string | undefined = typeof meta.last_session_date === "string" ? meta.last_session_date : undefined;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const prevStreak: number = typeof meta.grit_streak === "number" ? meta.grit_streak : 0;
    const newStreak = lastSessionDate === today
      ? prevStreak
      : lastSessionDate === yesterday
        ? prevStreak + 1
        : 1;
    await adminAuth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        total_grit_points: prevTotal + gritEarned,
        grit_streak: newStreak,
        last_session_date: today,
      },
    });
  } catch {
    // Non-critical, silently skip
  }

  return Response.json({ receiptId: body.sessionId, gritEarned });
}
