import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

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

  const { imageBase64, mimeType } = (await request.json()) as {
    imageBase64: string;
    mimeType: string;
  };

  if (!imageBase64 || !mimeType) {
    return Response.json({ error: "Missing image data" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
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

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    return Response.json({ text });
  } catch (err) {
    console.error("extract-assignment error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
