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

Score 0–100 based on how confidently the student handled the core ideas. Be honest and specific.
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
