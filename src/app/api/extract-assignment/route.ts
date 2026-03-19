import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Auth check
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    imageBase64?: string;
    mimeType?: string;
    fileUrl?: string;
  };

  // Support both base64 upload and direct URL (for room assignment files)
  let imageBase64 = body.imageBase64;
  let mimeType = body.mimeType;

  if (body.fileUrl && !imageBase64) {
    try {
      const fileRes = await fetch(body.fileUrl);
      if (!fileRes.ok) return Response.json({ error: "Could not fetch file" }, { status: 400 });
      mimeType = fileRes.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
      const arrayBuffer = await fileRes.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuffer).toString("base64");
    } catch {
      return Response.json({ error: "Failed to fetch file from URL" }, { status: 400 });
    }
  }

  if (!imageBase64 || !mimeType) {
    return Response.json({ error: "Missing file data" }, { status: 400 });
  }

  try {
    // PDF: use internal lib path to skip the test-file loading in index.js
    if (mimeType === "application/pdf") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
      const buffer = Buffer.from(imageBase64, "base64");
      const data = await pdfParse(buffer);
      const text = data.text.trim();
      if (!text) return Response.json({ error: "No text found in PDF. It may be a scanned image. Try uploading a photo of the page instead." }, { status: 422 });
      return Response.json({ text });
    }

    // Image: use Groq vision model
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "Please transcribe all the assignment questions and instructions visible in this image. Output only the assignment text, exactly as written, with no extra commentary. If there are multiple questions, number them clearly.",
            },
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return Response.json({ text });
  } catch (err) {
    console.error("extract-assignment error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
