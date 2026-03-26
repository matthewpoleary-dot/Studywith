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

  const prompt = `You are an expert Irish Leaving Cert and Junior Cycle study tutor. Generate a focused LC/JC study cheat sheet for: "${topic}". Be specific to the Irish curriculum where relevant (SEC exam format, marking scheme, common exam questions). Return a JSON object:
{
  "title": "Clear topic title (e.g. 'Meiosis', 'Le Chatelier Principle', 'The 1916 Rising')",
  "subject": "LC/JC subject area (e.g. 'LC Biology', 'LC Chemistry', 'LC History', 'LC Maths')",
  "mentalModel": "Two paragraphs. First: explain the core concept with one vivid analogy that sticks. Second: push the analogy to cover the most common point of confusion or the part most often tested on the LC.",
  "fastFacts": [
    "The single most important exam fact (what you must know for full marks)",
    "A critical second fact or definition students often miss or mix up",
    "A third LC-exam-relevant fact, formula, or rule worth memorising",
    "A fourth fact tied to a specific common exam question on this topic",
    "A fifth fact: a marking scheme point or SRP that frequently appears"
  ],
  "activeRecall": [
    { "question": "An LC-style exam question on this topic (e.g. '2023 LC Higher Q4: Explain...')", "answer": "Model answer for full marks in 2-3 sentences" },
    { "question": "A question testing application or a related concept that comes up in exams", "answer": "Clear model answer" },
    { "question": "A question about a common misconception students have about this topic", "answer": "Answer that corrects the misconception and explains why" },
    { "question": "A deeper question linking this topic to another part of the course", "answer": "Clear answer" }
  ],
  "commonMistakes": [
    "First common mistake LC students make on this topic in exams, and how to avoid it",
    "Second common mistake (often costs marks in the marking scheme)",
    "Third mistake: a terminology or definition error that loses marks"
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const content = JSON.parse(raw);
    return Response.json({ content });
  } catch (err) {
    console.error("[study-content]", err);
    return Response.json({ error: "Failed to generate study content" }, { status: 502 });
  }
}
