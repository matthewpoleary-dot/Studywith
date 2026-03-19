import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database, LearningReceipt } from "@/lib/database.types";

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

  const receiptPrompt = `Analyse this tutoring session and return a JSON learning receipt.

Assignment:
${body.assignment}

Transcript:
${transcript}

Return ONLY valid JSON — no markdown fences, no explanation — with exactly this shape:
{
  "title": "3-5 word topic title",
  "conceptsCovered": ["concept 1", "concept 2"],
  "gaps": ["gap 1", "gap 2"],
  "score": 75,
  "summary": "One paragraph summarising learning progress and what to review."
}

SCORING RULES — this is a LEARNING score (0–100), not a knowledge test score. You are rewarding growth and effort, not prior knowledge.

Score based on these factors (in order of importance):
1. PROGRESSION: Did the student's understanding visibly improve from the start of the session to the end? A student who started clueless but ended with real grasp should score well.
2. RESPONSIVENESS: Did they pick up on hints and build from them? Did they try to reason through prompts rather than guess or give up?
3. EFFORT & ENGAGEMENT: Did they keep trying even when stuck? Did they ask good follow-up questions? Did they attempt answers rather than saying "I don't know"?
4. CONSOLIDATION: By the end, could they explain ideas in their own words or apply them to a step they hadn't seen yet?

Scoring benchmarks:
- Started with no knowledge, showed real progression and effort: 60–75
- Started with partial knowledge, filled gaps through the session: 65–80
- Arrived with solid base, deepened understanding meaningfully: 75–90
- Exceptional progression, connected concepts unprompted, confident by end: 85–95
- Little engagement, ignored hints, no visible improvement: 10–35
- Moderate effort, some improvement but gaps remain: 35–60

Do NOT penalise a student for starting with low knowledge. Do NOT give a high score just because they knew the answer upfront — reward the journey, not the destination.

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
    receipt = receiptFields as LearningReceipt;
  } catch {
    receipt = {
      conceptsCovered: [],
      gaps: [],
      score: 0,
      summary: "Receipt could not be generated for this session.",
    };
  }

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

  return Response.json({ receiptId: body.sessionId });
}
