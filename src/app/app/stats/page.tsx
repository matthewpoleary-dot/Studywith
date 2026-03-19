export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import Link from "next/link";
import { BookOpen, CheckCircle, Star } from "lucide-react";
import type { Database, LearningReceipt } from "@/lib/database.types";

type SessionRow = {
  id: string;
  assignment_text: string;
  title: string | null;
  created_at: string;
  receipt: unknown | null;
};

function calcStreak(sessions: { created_at: string }[]): number {
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(sessions.map((s) => toKey(new Date(s.created_at))));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    if (days.has(toKey(d))) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function sessionLabel(s: SessionRow) {
  const raw =
    s.title ??
    (s.assignment_text.length > 60
      ? s.assignment_text.slice(0, 60) + "…"
      : s.assignment_text) ??
    "Session";
  return raw.replace(/^#+\s*/, "").trim();
}

export default async function StatsPage() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin().from("sessions") as any;
  let allSessions: SessionRow[] = [];

  const { data: withTitle, error: titleErr } = await admin
    .select("id, assignment_text, title, created_at, receipt")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (!titleErr) {
    allSessions = (withTitle ?? []) as SessionRow[];
  } else {
    const { data: withoutTitle } = await admin
      .select("id, assignment_text, created_at, receipt")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    allSessions = ((withoutTitle ?? []) as Omit<SessionRow, "title">[]).map(
      (s) => ({ ...s, title: null }),
    );
  }

  const completedSessions = allSessions.filter((s) => s.receipt !== null);

  const avgScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, s) => {
            const r = s.receipt as unknown as LearningReceipt;
            return acc + (r?.score ?? 0);
          }, 0) / completedSessions.length,
        )
      : null;

  const streak = calcStreak(allSessions);

  const dailyGoal: number | null =
    typeof user?.user_metadata?.daily_goal === "number"
      ? user.user_metadata.daily_goal
      : null;

  const toKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const sessionsToday = allSessions.filter(
    (s) => toKey(new Date(s.created_at)) === toKey(new Date()),
  ).length;
  const dailyGoalMet = dailyGoal !== null && sessionsToday >= dailyGoal;

  return (
    <div className="w-full max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-1">
          Statistics
        </h1>
        <p className="text-sm text-[#57534E]">Your learning progress at a glance.</p>
      </div>

      {allSessions.length === 0 ? (
        <div className="border border-dashed border-[#E7E5E4] rounded-2xl px-6 py-16 text-center">
          <p className="font-serif text-lg text-[#1A1A1A] mb-2">No data yet</p>
          <p className="text-sm text-[#57534E]">Complete your first session to see stats here.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Streak + daily goal */}
          <div className={`grid gap-4 ${dailyGoal !== null ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-medium text-[#57534E] mb-3">Daily streak</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-serif font-medium text-[#1A1A1A]">{streak}</p>
                <span className="text-xl mb-0.5">{streak > 0 ? "🔥" : "💤"}</span>
              </div>
              <p className="text-xs text-[#A8A29E] mt-1">
                {streak === 0
                  ? "Study today to start one"
                  : streak === 1
                  ? "1 day in a row"
                  : `${streak} days in a row`}
              </p>
            </div>

            {dailyGoal !== null && (
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
                <p className="text-xs font-medium text-[#57534E] mb-3">Today&apos;s goal</p>
                <div className="flex items-end gap-1">
                  <p className="text-3xl font-serif font-medium text-[#1A1A1A]">{sessionsToday}</p>
                  <span className="text-base text-[#A8A29E] mb-0.5">/{dailyGoal}</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dailyGoalMet ? "bg-emerald-500" : "bg-[#D97706]"}`}
                    style={{ width: `${Math.min(100, Math.round((sessionsToday / dailyGoal) * 100))}%` }}
                  />
                </div>
                <p className="text-xs text-[#A8A29E] mt-1">
                  {dailyGoalMet ? "Goal complete!" : `${dailyGoal - sessionsToday} more to go`}
                </p>
              </div>
            )}
          </div>

          {/* Counts + avg score */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-medium text-[#57534E]">Sessions</p>
                <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#A8A29E]" strokeWidth={1.5} />
              </div>
              <p className="text-2xl md:text-3xl font-serif font-medium text-[#1A1A1A]">{allSessions.length}</p>
            </div>
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-medium text-[#57534E]">Completed</p>
                <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#A8A29E]" strokeWidth={1.5} />
              </div>
              <p className="text-2xl md:text-3xl font-serif font-medium text-[#1A1A1A]">{completedSessions.length}</p>
            </div>
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-medium text-[#57534E]">Avg score</p>
                <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#A8A29E]" strokeWidth={1.5} />
              </div>
              <p className={`text-2xl md:text-3xl font-serif font-medium ${
                avgScore === null ? "text-[#A8A29E]"
                : avgScore >= 75 ? "text-emerald-600"
                : avgScore >= 50 ? "text-amber-600"
                : "text-red-500"
              }`}>
                {avgScore !== null ? avgScore : "--"}
                {avgScore !== null && <span className="text-sm md:text-base text-[#A8A29E]">/100</span>}
              </p>
              {avgScore !== null && (
                <div className="mt-2 h-1 w-full rounded-full bg-[#E7E5E4] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      avgScore >= 75 ? "bg-emerald-500" : avgScore >= 50 ? "bg-amber-500" : "bg-red-400"
                    }`}
                    style={{ width: `${avgScore}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Completed session history */}
          {completedSessions.length > 0 && (
            <div>
              <h2 className="font-medium text-[#1A1A1A] mb-3">Session receipts</h2>
              <div className="space-y-2">
                {completedSessions.map((s) => {
                  const receipt = s.receipt as unknown as LearningReceipt;
                  const score = receipt?.score ?? null;
                  const date = new Date(s.created_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  return (
                    <Link
                      key={s.id}
                      href={`/app/session/${s.id}`}
                      className="flex items-center justify-between gap-4 bg-white border border-[#E7E5E4] rounded-xl px-5 py-4 hover:border-[#D97706]/40 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm text-[#1A1A1A] truncate flex-1 min-w-0">{sessionLabel(s)}</p>
                      <div className="flex items-center gap-3 shrink-0">
                        {score !== null && (
                          <span className={`text-sm font-medium ${
                            score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500"
                          }`}>{score}/100</span>
                        )}
                        <span className="text-xs text-[#A8A29E]">{date}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
