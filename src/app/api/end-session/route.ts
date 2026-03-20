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

  const receiptPrompt = `You are Sage, a study tutor generating a learning receipt. Return ONLY a valid JSON object with no markdown, preamble, or commentary.

=== STEP 1: ANALYSE THE ASSIGNMENT SCOPE ===
Read the assignment carefully. Count every distinct question, sub-question, and lettered/numbered part. For example, if there are 3 sections with (a)-(k), (a)-(f), and (a)-(e), the total is 22 sub-questions. Be precise: this number drives the score.

=== STEP 2: ANALYSE THE TRANSCRIPT ===
Read the transcript carefully. For each question/sub-question in the assignment, determine:
- COMPLETED: student gave a substantively correct or reasoned answer
- ATTEMPTED: student tried but did not reach a correct answer
- NOT REACHED: never discussed

Count completed and attempted separately. A student who only asked "what does that mean?" and never gave an answer to any question has 0 completed and 0 attempted.

=== STEP 3: SCORE HONESTLY ===
Score = (completed * 1.0 + attempted * 0.4) / total_questions * 100, then apply engagement modifier:
- If the student showed genuine reasoning and progression, add up to 10 points
- If the student was passive, guessing, or gave up, subtract up to 10 points
- Minimum score: 5. Maximum: 98.

Examples:
- 0 questions answered, only asked for definitions → 5–15
- 1 of 14 sub-questions completed with effort → 10–20
- 7 of 14 completed with good reasoning → 45–60
- 14 of 14 completed with strong understanding → 80–95

=== OUTPUT ===
{
  "title": "3-5 word topic title (sentence-case)",
  "subject": "detected subject area",
  "questionsTotal": <exact count of all questions and sub-questions in the assignment>,
  "questionsAttempted": <count of questions the student actually tried to answer, even partially>,
  "closingMessage": "Warm 1-2 sentence message. Honest about coverage. If they barely started, say so warmly. Never pretend more was done than actually happened.",
  "directAnswer": "2-3 sentences: exactly which questions were covered (cite the numbers/letters), what the student understood, and what remains. Be specific and honest. If 0 questions were completed, say that plainly.",
  "conceptsCovered": ["only concepts the student actually engaged with, not the full topic list"],
  "understoodWell": ["things the student demonstrably grasped, empty array if nothing was shown"],
  "toRevisit": ["specific topics or question types still to work on"],
  "followUpQuestion": "One thought-provoking question tied to where they left off.",
  "gaps": ["specific knowledge gaps revealed in the session"],
  "score": <calculated score>,
  "summary": "One honest paragraph: how many questions were covered out of how many total, what the student understood, what they struggled with, and exactly what to focus on next."
}

Assignment:
${body.assignment}

Transcript:
${transcript}`;

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
      ...(receiptFields.questionsTotal !== undefined ? { questionsTotal: receiptFields.questionsTotal } : {}),
      ...(receiptFields.questionsAttempted !== undefined ? { questionsAttempted: receiptFields.questionsAttempted } : {}),
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
