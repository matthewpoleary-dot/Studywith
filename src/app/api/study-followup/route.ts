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

  const { topic, question } = (await request.json()) as { topic: string; question: string };

  const systemPrompt = `You are an academic study tutor. The student is reading a study guide about "${topic}" and has a follow-up question. Only answer questions that have a clear academic or educational purpose. If the question is non-academic or involves dangerous or inappropriate content, decline and redirect the student to their study material. For valid academic questions, answer clearly and concisely in 2-4 sentences. Do not write a full essay. Do not use em-dashes. Calibrate your language to the evident level of the question.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });
    const answer = completion.choices[0]?.message?.content ?? "";
    return Response.json({ answer });
  } catch (err) {
    console.error("[study-followup]", err);
    return Response.json({ error: "Failed to answer question" }, { status: 502 });
  }
}
