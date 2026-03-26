// Splits text into ~1500-char chunks at sentence/paragraph boundaries with overlap.
// No embedding API needed - retrieval uses PostgreSQL full-text search.
export function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    let breakAt = end;
    if (end < text.length) {
      const window = text.slice(Math.max(end - 300, start), end);
      const lastPara = window.lastIndexOf("\n\n");
      const lastNewline = window.lastIndexOf("\n");
      const lastPeriod = window.lastIndexOf(". ");
      const best = Math.max(lastPara, lastNewline, lastPeriod);
      if (best > 0) breakAt = Math.max(end - 300, start) + best + 1;
    }

    const chunk = text.slice(start, breakAt).trim();
    if (chunk.length > 80) chunks.push(chunk);

    start = breakAt - overlap;
    if (start <= 0 || breakAt >= text.length) break;
  }

  return chunks;
}
