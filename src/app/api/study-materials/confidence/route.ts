export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";

export async function PATCH(request: Request) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { flashcardId, confidence } = (await request.json()) as {
    flashcardId: string;
    confidence: number;
  };

  if (!flashcardId || typeof confidence !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // user_id check ensures users can only update their own cards
  const { error } = await getSupabaseAdmin()
    .from("flashcards")
    .update({ confidence })
    .eq("id", flashcardId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
