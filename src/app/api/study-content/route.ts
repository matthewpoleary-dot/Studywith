import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { topic } = (await request.json()) as { topic: string };

  const prompt = `You are Sage. A student needs to study the following topic: "${topic}". Return ONLY a valid JSON object with no markdown or preamble:
{
  "title": "Topic title",
  "subject": "subject area",
  "introduction": "2-3 sentence plain-English intro to the topic",
  "sections": [
    {
      "heading": "Section heading",
      "body": "3-5 sentence explanation. Clear, accurate, student-friendly.",
      "keyPoint": "One sentence takeaway for this section"
    }
  ],
  "summary": "3-4 sentence recap of the whole topic",
  "quickQuiz": ["2-3 short questions the student can ask themselves to test understanding"]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```(?:json)?\n?|\n?```/g, "").trim();
    const content = JSON.parse(cleaned);
    return Response.json({ content });
  } catch (err) {
    console.error("[study-content]", err);
    return Response.json({ error: "Failed to generate study content" }, { status: 502 });
  }
}
