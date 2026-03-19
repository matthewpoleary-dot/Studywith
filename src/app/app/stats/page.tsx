export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import Link from "next/link";
import type { Database } from "@/lib/database.types";
import StatsClient from "./StatsClient";

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
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E7E5E4] bg-white px-6 py-10 text-center">
            <div className="text-4xl mb-4">📈</div>
            <h2 className="font-serif text-xl font-medium text-[#1A1A1A] mb-2">
              Your learning history will live here
            </h2>
            <p className="text-sm text-[#57534E] max-w-sm mx-auto leading-relaxed">
              After your first session, you&apos;ll see subjects covered, time studied, and topics to revisit.
            </p>
          </div>

          <div className="opacity-40 pointer-events-none select-none">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
                <p className="text-xs font-medium text-[#57534E] mb-3">Daily streak</p>
                <div className="w-12 h-8 bg-[#E7E5E4] rounded-lg mb-1" />
                <div className="w-20 h-3 bg-[#E7E5E4] rounded mt-2" />
              </div>
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
                <p className="text-xs font-medium text-[#57534E] mb-3">Today&apos;s goal</p>
                <div className="w-12 h-8 bg-[#E7E5E4] rounded-lg mb-1" />
                <div className="w-full h-1.5 bg-[#E7E5E4] rounded-full mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["Sessions", "Completed", "Avg score"].map((label) => (
                <div key={label} className="bg-white border border-[#E7E5E4] rounded-2xl p-4">
                  <p className="text-[10px] font-medium text-[#57534E] mb-2">{label}</p>
                  <div className="w-10 h-7 bg-[#E7E5E4] rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/app/new"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.02]"
            >
              <span className="text-lg leading-none">+</span>
              Start your first session
            </Link>
          </div>
        </div>
      ) : (
        <StatsClient
          initialSessions={allSessions}
          streak={streak}
          dailyGoal={dailyGoal}
          sessionsToday={sessionsToday}
          dailyGoalMet={dailyGoalMet}
        />
      )}
    </div>
  );
}
