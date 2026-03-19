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

  const prompt = `You are Sage, a friendly study tutor. A student needs to deeply understand: "${topic}". Return ONLY a valid JSON object with no markdown or preamble:
{
  "title": "Clear topic title",
  "subject": "subject area (e.g. Maths, Biology, History)",
  "mentalModel": "Two full paragraphs that explain this concept using one vivid everyday analogy. First paragraph: introduce the analogy and map it to the concept. Second paragraph: push the analogy further to explain nuance or a common point of confusion.",
  "fastFacts": [
    "The single most important thing to know",
    "A critical second fact students often miss",
    "A third practical or exam-relevant fact"
  ],
  "activeRecall": [
    { "question": "A meaningful question requiring real understanding, not recall", "answer": "A clear, accurate answer in 1-3 sentences" },
    { "question": "A second question testing application or a related concept", "answer": "Clear answer" },
    { "question": "A third question, perhaps about a common misconception", "answer": "Clear answer that corrects the misconception" }
  ],
  "commonMistakes": [
    "First common mistake: describe what students get wrong and why it happens",
    "Second common mistake: describe what students get wrong and why it happens"
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
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
