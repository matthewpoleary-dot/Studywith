import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

// Inline type to avoid importing from a 'use client' boundary
type TutorMessage = { id: string; role: "student" | "tutor" | "system"; content: string };

const BASE_PROMPT = `You are a Socratic tutor. Your rules:
1. NEVER give the full answer directly — not even if the student begs.
2. Always ask the student to attempt something before providing any help.
3. If the student is stuck, give a hint — not the answer.
4. Keep responses short and conversational (2–4 sentences maximum).
5. Acknowledge correct thinking briefly, then push the student one step deeper.
6. Track which concepts the student demonstrates understanding of and where gaps appear.
7. If a student asks you to just give the answer, gently decline and redirect to thinking.
8. Start by asking the student to explain in their own words what the assignment is asking.
9. NEVER use LaTeX notation. Do not wrap anything in $ signs. Write maths in plain readable text: use ^ for powers (z^3), use plain letters for variables (z1, z2), use sqrt() for square roots, use * for multiplication.`;

const SUBJECT_ADDONS: Record<string, string> = {
  Maths: `\n\nFor maths: Ask the student to identify what they know, what they're solving for, and which formula or method applies. When they attempt a step, ask them to explain their reasoning. Ask them to check if their answer makes sense (units, magnitude, sign). Never skip steps — work through problems one line at a time.`,
  English: `\n\nFor English and essay writing: Focus on thesis clarity, argument structure, and use of evidence. Ask what their main claim is, how each paragraph supports it, and whether their quotes or examples are specific and accurately referenced. Push for analysis over summary — "what does this tell us?" not just "what happens?".`,
  Science: `\n\nFor science: Focus on the underlying principles, not just the calculation. Ask the student to state the relevant law or concept before applying it, predict the outcome before working through it, and connect their answer back to the scientific principle. For experiments, guide them through hypothesis, variables, and data interpretation.`,
  History: `\n\nFor history: Focus on causation, consequence, and source evaluation. Ask the student to explain WHY events happened, not just what happened. Prompt them to consider multiple perspectives and assess the reliability of sources. Push for analytical reasoning: "How significant was this cause compared to others?"`,
  Languages: `\n\nFor language learning: Focus on grammar rules, vocabulary in context, and sentence construction. Ask the student to identify the grammatical structure being used and explain why it applies. Prompt them to spot patterns and construct their own example sentences. Correct errors by asking "Is there another form of this word that fits better?" rather than giving the answer.`,
};

type RequestBody = {
  assignment: string;
  subject?: string;
  messages: TutorMessage[];
  sessionId?: string;
  imageBase64?: string;
  imageMime?: string;
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

  // Map messages — drop leading assistant messages (OpenAI requires user-first)
  const allMapped = body.messages
    .filter((m) => m.role === "student" || m.role === "tutor")
    .map((m) => ({
      role: (m.role === "student" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));
  const firstUserIdx = allMapped.findIndex((m) => m.role === "user");
  const chatMessages = firstUserIdx >= 0 ? allMapped.slice(firstUserIdx) : allMapped;

  // Persist / update session
  const messagesJson = JSON.parse(JSON.stringify(body.messages)) as Database["public"]["Tables"]["sessions"]["Insert"]["messages"];
  let sessionId = body.sessionId ?? null;

  if (!sessionId) {
    const { data: session } = await getSupabaseAdmin()
      .from("sessions")
      .insert({
        user_id: user.id,
        assignment_text: body.assignment,
        messages: messagesJson,
      })
      .select("id")
      .single();
    sessionId = session?.id ?? null;
  } else {
    await getSupabaseAdmin()
      .from("sessions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ messages: messagesJson } as any)
      .eq("id", sessionId)
      .eq("user_id", user.id);
  }

  // Build message list — if image attached, use vision model and inject image into last user message
  const systemMessage = {
    role: "system" as const,
    content: `${BASE_PROMPT}${SUBJECT_ADDONS[body.subject ?? ""] ?? ""}\n\nThe student's assignment is:\n${body.assignment}`,
  };

  type GroqMessage =
    | { role: "system" | "user" | "assistant"; content: string }
    | { role: "user"; content: Array<{ type: "image_url"; image_url: { url: string } } | { type: "text"; text: string }> };

  let groqMessages: GroqMessage[];
  let model: string;

  if (body.imageBase64 && chatMessages.length > 0) {
    const lastMsg = chatMessages[chatMessages.length - 1];
    model = "meta-llama/llama-4-scout-17b-16e-instruct";
    groqMessages = [
      systemMessage,
      ...chatMessages.slice(0, -1),
      {
        role: "user" as const,
        content: [
          { type: "image_url" as const, image_url: { url: `data:${body.imageMime ?? "image/jpeg"};base64,${body.imageBase64}` } },
          { type: "text" as const, text: typeof lastMsg.content === "string" ? lastMsg.content : "" },
        ],
      },
    ];
  } else {
    model = "llama-3.3-70b-versatile";
    groqMessages = [systemMessage, ...chatMessages];
  }

  // Call Groq
  let completion;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    completion = await groq.chat.completions.create({ model, max_tokens: 512, messages: groqMessages as any });
  } catch (err) {
    console.error("[tutor] Groq error:", err);
    return Response.json({ error: "AI unavailable" }, { status: 502 });
  }

  const content = completion.choices[0]?.message?.content ?? "";

  return Response.json(
    { content, sessionId },
    { headers: { "X-Session-Id": sessionId ?? "" } },
  );
}
