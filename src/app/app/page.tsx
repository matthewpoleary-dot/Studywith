export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import Link from "next/link";
import type { Database } from "@/lib/database.types";
import OnboardingModal from "@/components/OnboardingModal";

type SessionRow = {
  id: string;
  assignment_text: string;
  title: string | null;
  created_at: string;
  receipt: unknown | null;
};

function sessionLabel(s: SessionRow) {
  const raw =
    s.title ??
    (s.assignment_text.length > 60
      ? s.assignment_text.slice(0, 60) + "…"
      : s.assignment_text) ??
    "Session";
  return raw.replace(/^#+\s*/, "").trim();
}

export default async function AppDashboard() {
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

  const inProgressSessions = allSessions.filter((s) => s.receipt === null);

  // Show onboarding modal for brand-new users who haven't seen it
  const hasOnboarded = user?.user_metadata?.has_onboarded === true;
  const showOnboarding = allSessions.length === 0 && !hasOnboarded;

  return (
    <div className="w-full max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16">
      {showOnboarding && <OnboardingModal />}
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-2">
          What would you like to work on?
        </h1>
        <p className="text-[#57534E]">
          Start a new session or pick up where you left off.
        </p>
      </div>

      {/* New session CTA */}
      <Link
        href="/app/new"
        className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-lg px-7 py-3.5 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.02] mb-10"
      >
        <span className="text-lg leading-none">+</span>
        New session
      </Link>

      {/* In-progress sessions */}
      {inProgressSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-medium text-[#1A1A1A] mb-3">Continue where you left off</h2>
          <div className="space-y-2">
            {inProgressSessions.slice(0, 5).map((s) => {
              const date = new Date(s.created_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "short",
              });
              return (
                <Link
                  key={s.id}
                  href={`/app/session/${s.id}`}
                  className="flex items-center justify-between gap-4 bg-white border border-[#E7E5E4] rounded-xl px-5 py-4 hover:border-[#D97706]/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
                    <p className="text-sm text-[#1A1A1A] truncate">{sessionLabel(s)}</p>
                  </div>
                  <span className="text-xs text-[#A8A29E] shrink-0">{date}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allSessions.length === 0 && (
        <div className="rounded-2xl border border-[#E7E5E4] bg-white px-6 py-14 text-center mb-8">
          <div className="text-4xl mb-4">📚</div>
          <h2 className="font-serif text-xl font-medium text-[#1A1A1A] mb-2">
            Ready when you are
          </h2>
          <p className="text-sm text-[#57534E] mb-6 max-w-sm mx-auto leading-relaxed">
            Start a session with any question, assignment, or topic — Sage will guide you through it.
          </p>
          <Link
            href="/app/new"
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.02]"
          >
            <span className="text-lg leading-none">+</span>
            Start your first session
          </Link>
        </div>
      )}
    </div>
  );
}
