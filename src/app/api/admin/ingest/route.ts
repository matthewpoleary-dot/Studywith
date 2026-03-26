import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import { embedText, chunkText } from "@/lib/embeddings";

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

  const { title, subject, doc_type, year, content } = (await request.json()) as {
    title: string;
    subject?: string;
    doc_type?: string;
    year?: number;
    content: string;
  };

  if (!title?.trim() || !content?.trim()) {
    return Response.json({ error: "title and content are required" }, { status: 400 });
  }

  // Delete existing chunks for same title+subject so re-uploading replaces cleanly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdmin() as any)
    .from("lc_documents")
    .delete()
    .eq("title", title)
    .eq("subject", subject ?? "");

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    return Response.json({ error: "No usable content after chunking" }, { status: 400 });
  }

  const inserted: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    // Prepend title so each chunk has context about what document it came from
    const textToEmbed = `${title}\n\n${chunks[i]}`;
    const embedding = await embedText(textToEmbed);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (getSupabaseAdmin() as any)
      .from("lc_documents")
      .insert({
        title,
        subject: subject ?? null,
        doc_type: doc_type ?? "notes",
        year: year ?? null,
        chunk_index: i,
        content: chunks[i],
        embedding,
      })
      .select("id")
      .single();

    if (!error && data) inserted.push(data.id as string);
  }

  return Response.json({ success: true, chunks: inserted.length });
}

export async function GET(request: Request) {
  // List all documents (distinct titles)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from("lc_documents")
    .select("title, subject, doc_type, year, chunk_index, created_at")
    .order("created_at", { ascending: false });

  // Group by title to get unique documents with chunk counts
  const docMap = new Map<string, { title: string; subject: string; doc_type: string; year: number | null; chunks: number; created_at: string }>();
  for (const row of (data ?? [])) {
    const key = `${row.title}||${row.subject}`;
    if (docMap.has(key)) {
      docMap.get(key)!.chunks++;
    } else {
      docMap.set(key, { title: row.title, subject: row.subject, doc_type: row.doc_type, year: row.year, chunks: 1, created_at: row.created_at });
    }
  }

  return Response.json({ documents: Array.from(docMap.values()) });
}

export async function DELETE(request: Request) {
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

  const { title, subject } = (await request.json()) as { title: string; subject: string };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdmin() as any)
    .from("lc_documents")
    .delete()
    .eq("title", title)
    .eq("subject", subject ?? "");

  return Response.json({ success: true });
}
