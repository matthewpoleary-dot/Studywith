import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await request.formData(); const title = String(form.get("title") ?? "").trim().slice(0, 120); const subject = String(form.get("subject") ?? "General").trim().slice(0, 60); let text = String(form.get("notes") ?? "").trim(); let sourceType = "text";
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5_000_000) return NextResponse.json({ error: "Keep files under 5 MB." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default; const parsed = await pdfParse(buffer); text = parsed.text.trim(); sourceType = "pdf";
    } else { text = buffer.toString("utf8").trim(); sourceType = "file"; }
  }
  text = text.slice(0, 60000);
  if (!title || text.length < 20) return NextResponse.json({ error: "Add a title and at least a few lines of readable notes." }, { status: 400 });
  const { data, error } = await createAdminSupabase().from("study_materials").insert({ user_id: user.id, title, file_name: title, subject, topic: subject, source_type: sourceType, extracted_text: text }).select("id, title, subject, extracted_text").single();
  if (error) return NextResponse.json({ error: "The material could not be saved." }, { status: 500 });
  return NextResponse.json({ material: { ...data, flashcards: [], quiz: [] } }, { status: 201 });
}
