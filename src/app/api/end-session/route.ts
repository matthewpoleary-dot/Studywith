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
  const studentMessages = body.messages.filter((m) => m.role === "student");
  const transcript = body.messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "student" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n");

  const receiptPrompt = `You are Sage, a study tutor generating a learning receipt. Return ONLY a valid JSON object with no markdown, preamble, or commentary.

=== STEP 1: IDENTIFY SESSION TYPE ===
Is this a NUMBERED QUESTION SET (has numbered/lettered sub-questions like 1.1, (a), (b), Q2 etc.) or an OPEN-ENDED TOPIC SESSION (a topic, concept, or essay prompt with no discrete sub-questions)?

=== STEP 2: ANALYSE THE TRANSCRIPT ===
Read the transcript carefully. For each question or concept in the assignment, determine:
- COMPLETED: student demonstrated correct understanding or gave a substantively correct/reasoned answer. A student who gives a correct real-world example, corrects their own misconception, or shows they grasp the concept counts as COMPLETED.
- ATTEMPTED: student engaged genuinely but did not reach correct understanding
- NOT REACHED: never discussed or student was entirely passive

IMPORTANT: If the tutor explicitly affirmed an answer ("Exactly right", "Great thinking", "You're on the right track", "Correct"), that question/concept is COMPLETED. Starting with a wrong answer but correcting to a right one = COMPLETED, not attempted.

=== STEP 3: SCORE ===
For NUMBERED QUESTION SETS:
Score = (completed * 1.0 + attempted * 0.6) / total_questions * 100

For OPEN-ENDED TOPIC SESSIONS (topic explanations, essay prompts, concept exploration):
Base the score on depth of understanding demonstrated:
- Student was passive or showed no understanding → 15–30
- Student engaged but showed only surface understanding → 35–50
- Student engaged well, showed partial correct understanding, made progress → 55–70
- Student showed solid understanding of the main concept with correct examples/reasoning → 65–80
- Student demonstrated strong, nuanced understanding throughout → 80–93

Then apply engagement modifier (both session types):
- Student showed genuine reasoning, corrected misconceptions, or had breakthrough moments: +5 to +15
- Student was passive, only guessed, or gave up easily: -5 to -15
- Minimum score: 10. Maximum: 98.

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

  // If the student never sent a single message, skip AI and return a zero-score receipt
  if (studentMessages.length === 0) {
    const emptyReceipt = {
      conceptsCovered: [],
      gaps: [],
      score: 0,
      summary: "No responses were submitted in this session.",
      closingMessage: "Looks like you didn't get a chance to respond this time. Open a new session whenever you're ready.",
      questionsTotal: 0,
      questionsAttempted: 0,
      gritEarned: 0,
    };
    await (getSupabaseAdmin().from("sessions") as any)
      .update({ receipt: emptyReceipt, messages: body.messages })
      .eq("id", body.sessionId)
      .eq("user_id", user.id);
    return Response.json({ receiptId: body.sessionId, gritEarned: 0 });
  }

  let receiptText = "{}";
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      response_format: { type: "json_object" },
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
