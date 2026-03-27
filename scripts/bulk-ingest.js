#!/usr/bin/env node
/**
 * Bulk ingest PDFs into lc_documents via Supabase service role.
 *
 * SETUP:
 *   npm install @supabase/supabase-js pdf-parse dotenv
 *
 * USAGE:
 *   node scripts/bulk-ingest.js ./pdfs
 *
 * FILE NAMING CONVENTION (used to auto-detect metadata):
 *   {Level}_{Subject}_{DocType}_{Year}.pdf
 *   e.g.  LC_Biology_PastPaper_2023.pdf
 *         JC_Maths_MarkingScheme_2022.pdf
 *         LC_English_ChiefExaminer_2021.pdf
 *
 *   Level:    LC or JC
 *   Subject:  Biology, Maths, English, Chemistry, Physics, History, Geography,
 *             Irish, French, Spanish, German, BusinessStudies, Accounting, etc.
 *   DocType:  PastPaper | MarkingScheme | ChiefExaminer
 *   Year:     4-digit year
 *
 * Any part that can't be parsed falls back to a prompt asking you to fix it.
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// --- Chunking (matches src/lib/embeddings.ts) ---
function chunkText(text, chunkSize = 1500, overlap = 200) {
  const chunks = [];
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

// --- Filename parsing ---
const DOC_TYPE_MAP = {
  pastpaper: "past_paper",
  past_paper: "past_paper",
  markingscheme: "marking_scheme",
  marking_scheme: "marking_scheme",
  chiefexaminer: "chief_examiner",
  chief_examiner: "chief_examiner",
  examinersreport: "chief_examiner",
};

function parseName(filename) {
  const base = path.basename(filename, ".pdf");
  const parts = base.split(/[_\s-]+/);

  // Try to find year (4-digit number)
  const yearIdx = parts.findIndex((p) => /^\d{4}$/.test(p));
  const year = yearIdx !== -1 ? parseInt(parts[yearIdx]) : null;

  // Try to find level (LC / JC)
  const levelIdx = parts.findIndex((p) => /^(lc|jc)$/i.test(p));
  const level = levelIdx !== -1 ? parts[levelIdx].toUpperCase() : null;

  // Try to find doc type
  let docType = null;
  let docTypeIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i].toLowerCase();
    if (DOC_TYPE_MAP[key]) {
      docType = DOC_TYPE_MAP[key];
      docTypeIdx = i;
      break;
    }
    // two-word match e.g. "Marking" + "Scheme"
    if (i + 1 < parts.length) {
      const twoWord = (parts[i] + parts[i + 1]).toLowerCase();
      if (DOC_TYPE_MAP[twoWord]) {
        docType = DOC_TYPE_MAP[twoWord];
        docTypeIdx = i;
        break;
      }
    }
  }

  // Subject = everything that's not level, year, or doc type
  const usedIdx = new Set([levelIdx, docTypeIdx, docTypeIdx + 1, yearIdx].filter((i) => i >= 0));
  const subjectParts = parts.filter((_, i) => !usedIdx.has(i));
  const subject = subjectParts.length > 0 ? subjectParts.join(" ") : null;

  // Title = human-readable
  const docTypeLabel = {
    past_paper: "Past Paper",
    marking_scheme: "Marking Scheme",
    chief_examiner: "Chief Examiner Report",
  };
  const title = [
    level,
    subject,
    docTypeLabel[docType] ?? docType,
    year,
  ]
    .filter(Boolean)
    .join(" ");

  return { level, subject, docType, year, title };
}

// --- Main ---
async function ingestFile(filePath) {
  const filename = path.basename(filePath);
  const { level, subject, docType, year, title } = parseName(filename);

  const fullSubject = [level, subject].filter(Boolean).join(" ") || "General";

  console.log(`\n[${filename}]`);
  console.log(`  title:   ${title || "(unknown)"}`);
  console.log(`  subject: ${fullSubject}`);
  console.log(`  type:    ${docType || "(unknown)"}`);
  console.log(`  year:    ${year || "(unknown)"}`);

  if (!title || !docType) {
    console.warn("  SKIPPED — couldn't parse filename. Rename to: LC_Biology_PastPaper_2023.pdf");
    return { status: "skipped", file: filename };
  }

  // Parse PDF
  let text;
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    text = result.text.trim();
  } catch (err) {
    console.error("  ERROR parsing PDF:", err.message);
    return { status: "error", file: filename, reason: err.message };
  }

  if (!text || text.length < 100) {
    console.warn("  SKIPPED — no usable text (scanned image PDF?)");
    return { status: "skipped", file: filename, reason: "no text" };
  }

  // Delete any existing chunks for this title+subject (idempotent)
  await supabase.from("lc_documents").delete().eq("title", title).eq("subject", fullSubject);

  const chunks = chunkText(text);
  const rows = chunks.map((chunk, i) => ({
    title,
    subject: fullSubject,
    doc_type: docType,
    year,
    chunk_index: i,
    content: chunk,
  }));

  const { error } = await supabase.from("lc_documents").insert(rows);
  if (error) {
    console.error("  ERROR inserting:", error.message);
    return { status: "error", file: filename, reason: error.message };
  }

  console.log(`  OK — ${chunks.length} chunks`);
  return { status: "ok", file: filename, chunks: chunks.length };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: node scripts/bulk-ingest.js <pdf-folder>");
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.join(dir, f));

  if (files.length === 0) {
    console.error("No PDF files found in", dir);
    process.exit(1);
  }

  console.log(`Found ${files.length} PDFs in ${dir}\n`);

  const results = [];
  for (const file of files) {
    const result = await ingestFile(file);
    results.push(result);
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log("\n=== DONE ===");
  console.log(`  ${ok} uploaded, ${skipped} skipped, ${errors} errors`);

  if (errors > 0) {
    console.log("\nErrors:");
    results.filter((r) => r.status === "error").forEach((r) => console.log(`  ${r.file}: ${r.reason}`));
  }
  if (skipped > 0) {
    console.log("\nSkipped (check filenames):");
    results.filter((r) => r.status === "skipped").forEach((r) => console.log(`  ${r.file}: ${r.reason || "bad filename"}`));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
