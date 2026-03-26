import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database } from "@/lib/database.types";
import JoinClient from "./JoinClient";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Fetch room by code (public - no auth required)
  const admin = getSupabaseAdmin();
  const { data: room } = await admin
    .from("rooms")
    .select("id, code, name")
    .eq("code", upperCode)
    .single();

  if (!room) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <a href="/" className="font-serif text-2xl font-semibold text-[#1A1A1A] hover:opacity-80 transition-opacity mb-10 inline-block">
            StudyWith
          </a>
          <h1 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-3">Room not found</h1>
          <p className="text-sm text-[#57534E]">Check the code and try again.</p>
        </div>
      </div>
    );
  }

  // Check if user is logged in
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Logged in: auto-join and redirect
  if (user) {
    // Join the room (upsert - safe to call even if already a member)
    await admin
      .from("room_members")
      .upsert({ room_id: room.id, user_id: user.id }, { onConflict: "room_id,user_id" });

    redirect(`/app/rooms/${upperCode}`);
  }

  // Not logged in: show sign-in prompt
  return <JoinClient roomName={room.name} roomCode={upperCode} />;
}
