import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

// Inline type to avoid importing from a 'use client' boundary
type TutorMessage = { id: string; role: "student" | "tutor" | "system"; content: string };

const SYSTEM_PROMPT = `You are a Socratic tutor. Your rules:
1. NEVER give the full answer directly — not even if the student begs.
2. Always ask the student to attempt something before providing any help.
3. If the student is stuck, give a hint — not the answer.
4. Keep responses short and conversational (2–4 sentences maximum).
5. Acknowledge correct thinking briefly, then push the student one step deeper.
6. Track which concepts the student demonstrates understanding of and where gaps appear.
7. If a student asks you to just give the answer, gently decline and redirect to thinking.
8. Start by asking the student to explain in their own words what the assignment is asking.`;

type RequestBody = {
  assignment: string;
  messages: TutorMessage[];
  sessionId?: string;
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

  // Call Groq
  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatMessages,
      ],
    });
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
