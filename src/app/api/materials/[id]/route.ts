import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await context.params; const { data } = await createAdminSupabase().from("study_materials").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle(); if (!data) return NextResponse.json({ error: "Material not found." }, { status: 404 }); return NextResponse.json({ deleted: true }); }
