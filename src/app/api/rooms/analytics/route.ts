import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database, LearningReceipt } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) return Response.json({ error: "roomId required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Verify this user is the teacher of the room
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: room } = await (admin.from("rooms") as any)
    .select("id, name, code, teacher_id")
    .eq("id", roomId)
    .single();

  if (!room || room.teacher_id !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all sessions linked to this room
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions } = await (admin.from("sessions") as any)
    .select("id, user_id, receipt, created_at, title, assignment_text")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  const sessionRows = (sessions ?? []) as {
    id: string;
    user_id: string;
    receipt: LearningReceipt | null;
    created_at: string;
    title: string | null;
    assignment_text: string;
  }[];

  // Fetch member list for this room
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberRows } = await (admin.from("room_members") as any)
    .select("user_id")
    .eq("room_id", roomId);

  const memberIds: string[] = (memberRows ?? []).map((m: { user_id: string }) => m.user_id);

  // Build per-student progress
  const studentMap = new Map<string, {
    email: string;
    sessions: typeof sessionRows;
  }>();

  // Resolve emails for all members
  await Promise.all(
    memberIds.map(async (uid) => {
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(uid);
      studentMap.set(uid, {
        email: authUser?.email ?? uid,
        sessions: [],
      });
    }),
  );

  // Attach sessions to students
  for (const s of sessionRows) {
    const entry = studentMap.get(s.user_id);
    if (entry) {
      entry.sessions.push(s);
    } else {
      // Session from a user no longer in the room - include them anyway
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(s.user_id);
      studentMap.set(s.user_id, {
        email: authUser?.email ?? s.user_id,
        sessions: [s],
      });
    }
  }

  // Build concept heatmap: concept → { totalScore, count }
  const conceptMap = new Map<string, { totalScore: number; count: number }>();

  for (const s of sessionRows) {
    if (!s.receipt) continue;
    const r = s.receipt as LearningReceipt;
    const score = r.score ?? 0;
    for (const concept of r.conceptsCovered ?? []) {
      const existing = conceptMap.get(concept) ?? { totalScore: 0, count: 0 };
      conceptMap.set(concept, {
        totalScore: existing.totalScore + score,
        count: existing.count + 1,
      });
    }
    for (const gap of r.gaps ?? []) {
      const existing = conceptMap.get(gap) ?? { totalScore: 0, count: 0 };
      // Gaps treated as 0-score concept encounters
      conceptMap.set(gap, {
        totalScore: existing.totalScore,
        count: existing.count + 1,
      });
    }
  }

  const heatmap = Array.from(conceptMap.entries())
    .map(([concept, { totalScore, count }]) => ({
      concept,
      avgScore: Math.round(totalScore / count),
      count,
    }))
    .sort((a, b) => a.avgScore - b.avgScore); // lowest avg first = biggest gaps

  // Build student progress list
  const studentProgress = Array.from(studentMap.entries()).map(([uid, { email, sessions: ss }]) => {
    const completed = ss.filter((s) => s.receipt !== null);
    const avgScore =
      completed.length > 0
        ? Math.round(completed.reduce((acc, s) => acc + ((s.receipt as LearningReceipt)?.score ?? 0), 0) / completed.length)
        : null;
    const latestSession = ss[0] ?? null;
    return {
      userId: uid,
      email,
      totalSessions: ss.length,
      completedSessions: completed.length,
      avgScore,
      latestSessionAt: latestSession?.created_at ?? null,
    };
  }).sort((a, b) => (b.completedSessions - a.completedSessions));

  return Response.json({
    room,
    heatmap,
    studentProgress,
    totalSessions: sessionRows.length,
    completedSessions: sessionRows.filter((s) => s.receipt !== null).length,
    avgRoomScore:
      sessionRows.filter((s) => s.receipt !== null).length > 0
        ? Math.round(
            sessionRows
              .filter((s) => s.receipt !== null)
              .reduce((acc, s) => acc + ((s.receipt as LearningReceipt)?.score ?? 0), 0) /
              sessionRows.filter((s) => s.receipt !== null).length,
          )
        : null,
  });
}
