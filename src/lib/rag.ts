import { getSupabaseAdmin } from "./supabase-service";
import { embedText } from "./embeddings";

type DocumentChunk = {
  id: string;
  title: string;
  subject: string | null;
  doc_type: string | null;
  content: string;
  similarity: number;
};

/**
 * Retrieve the most relevant LC/JC document chunks for a given query.
 * Returns a formatted string ready to inject into a system prompt, or "" if nothing relevant found.
 */
export async function retrieveRelevantContext(
  query: string,
  limit = 4,
  threshold = 0.45,
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";

  try {
    const embedding = await embedText(query);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (getSupabaseAdmin() as any).rpc(
      "match_lc_documents",
      {
        query_embedding: embedding,
        match_count: limit,
        similarity_threshold: threshold,
      },
    );

    if (error || !data || data.length === 0) return "";

    const chunks = (data as DocumentChunk[])
      .map((doc) => {
        const label = [doc.subject, doc.doc_type, doc.title]
          .filter(Boolean)
          .join(" — ");
        return `[${label}]\n${doc.content}`;
      })
      .join("\n\n---\n\n");

    return `\n\nCURRICULUM KNOWLEDGE BASE — Retrieved LC/JC reference material for this session:\n${chunks}`;
  } catch {
    // Never block the tutor route if RAG fails
    return "";
  }
}
