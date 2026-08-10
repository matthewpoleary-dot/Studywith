import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import type { Json } from "@/lib/database.types";

type Subject = { name: string; confidence: number; priority: number };

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const allowedMinutes = new Set([25, 40, 50, 60, 75, 90]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    examYear?: number;
    sessionsPerWeek?: number;
    sessionMinutes?: number;
    subjects?: Subject[];
  } | null;
  const examYear = Number(body?.examYear);
  const count = Number(body?.sessionsPerWeek);
  const minutes = Number(body?.sessionMinutes);
  const subjects = (Array.isArray(body?.subjects) ? body.subjects : [])
    .map((item) => ({
      name: String(item.name ?? "").trim().slice(0, 60),
      confidence: Math.max(1, Math.min(5, Number(item.confidence) || 3)),
      priority: Math.max(1, Math.min(3, Number(item.priority) || 2)),
    }))
    .filter((item) => item.name)
    .slice(0, 12);

  if (examYear < 2026 || examYear > 2035 || count < 1 || count > 14 || !allowedMinutes.has(minutes) || !subjects.length) {
    return NextResponse.json({ error: "Check the year, available time and subject names." }, { status: 400 });
  }

  const weighted = subjects.flatMap((subject) =>
    Array.from({ length: Math.max(1, 6 - subject.confidence + subject.priority - 1) }, () => subject),
  );
  const schedule = Array.from({ length: count }, (_, index) => {
    const subject = weighted[index % weighted.length];
    const focus = subject.confidence <= 2
      ? "Rebuild one weak syllabus area, then answer two practice questions"
      : subject.priority === 3
        ? "Review the teacher-priority area and complete timed practice"
        : "Use active recall, then correct one gap from memory";
    return { day: days[Math.floor((index * 7) / count)], subject: subject.name, focus, minutes };
  });

  const payload = {
    user_id: user.id,
    exam_type: "LC",
    exam_year: examYear,
    start_date: new Date().toISOString().slice(0, 10),
    sessions_per_week: count,
    session_duration_mins: minutes,
    subjects: subjects as unknown as Json,
    topics: [] as Json,
    schedule: schedule as unknown as Json,
  };
  const admin = createAdminSupabase();
  const { error } = await admin.from("study_plans").upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[planner] save failed", { userId: user.id, code: error.code, message: error.message });
    return NextResponse.json({ error: "Your plan was built but could not be saved. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ schedule });
}
