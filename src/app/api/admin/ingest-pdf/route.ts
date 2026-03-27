import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import { chunkText } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Admin-only
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim();
  const subject = (formData.get("subject") as string | null) ?? "General";
  const doc_type = (formData.get("doc_type") as string | null) ?? "past_paper";
  const yearRaw = formData.get("year") as string | null;
  const year = yearRaw ? parseInt(yearRaw) : null;

  if (!file || !title) {
    return Response.json({ error: "file and title are required" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  // Extract text from PDF
  let content: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    content = parsed.text.trim();
  } catch (err) {
    return Response.json({ error: `PDF parse failed: ${err instanceof Error ? err.message : "unknown error"}` }, { status: 422 });
  }

  if (!content) {
    return Response.json({ error: "No text found in PDF. It may be a scanned image — convert to selectable text first." }, { status: 422 });
  }

  // Delete existing chunks for same title+subject (clean re-upload)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdmin() as any)
    .from("lc_documents")
    .delete()
    .eq("title", title)
    .eq("subject", subject);

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    return Response.json({ error: "No usable content after chunking" }, { status: 400 });
  }

  const rows = chunks.map((chunk, i) => ({
    title,
    subject,
    doc_type,
    year: isNaN(year!) ? null : year,
    chunk_index: i,
    content: chunk,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from("lc_documents")
    .insert(rows);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, chunks: rows.length, text_length: content.length });
}
