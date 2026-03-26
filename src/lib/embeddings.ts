import OpenAI from "openai";

// Uses OpenAI text-embedding-3-small — 1536 dimensions, ~$0.00002 per 1K tokens
function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function embedText(text: string): Promise<number[]> {
  const openai = getClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000), // API max
  });
  return response.data[0].embedding;
}

// Split into ~1500-char chunks, breaking at sentence/paragraph boundaries, with overlap
export function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    // Try to break at a paragraph or sentence boundary within the last 300 chars
    let breakAt = end;
    if (end < text.length) {
      const window = text.slice(Math.max(end - 300, start), end);
      const lastPara = window.lastIndexOf("\n\n");
      const lastNewline = window.lastIndexOf("\n");
      const lastPeriod = window.lastIndexOf(". ");

      const best = Math.max(lastPara, lastNewline, lastPeriod);
      if (best > 0) {
        breakAt = Math.max(end - 300, start) + best + 1;
      }
    }

    const chunk = text.slice(start, breakAt).trim();
    if (chunk.length > 80) chunks.push(chunk);

    start = breakAt - overlap;
    if (start <= 0 || breakAt >= text.length) break;
  }

  return chunks;
}
