import { getSupabaseAdmin } from "./supabase-service";

type DocumentChunk = {
  title: string;
  subject: string | null;
  doc_type: string | null;
  content: string;
};

/**
 * Retrieve the most relevant LC/JC document chunks for a given query
 * using PostgreSQL full-text search (no embedding API required).
 * Returns a formatted string ready to inject into the system prompt, or "" if nothing found.
 */
export async function retrieveRelevantContext(
  query: string,
  limit = 4,
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (getSupabaseAdmin() as any).rpc(
      "search_lc_documents",
      { query_text: query, match_count: limit },
    );

    if (error || !data || data.length === 0) return "";

    const chunks = (data as DocumentChunk[])
      .map((doc) => {
        const label = [doc.subject, doc.doc_type, doc.title]
          .filter(Boolean)
          .join(" - ");
        return `[${label}]\n${doc.content}`;
      })
      .join("\n\n---\n\n");

    return `\n\nCURRICULUM KNOWLEDGE BASE - Retrieved LC/JC reference material for this session:\n${chunks}`;
  } catch {
    // Never block the tutor route if RAG fails
    return "";
  }
}
