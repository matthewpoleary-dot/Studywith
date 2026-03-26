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
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-2 leading-tight">
          What would you like to work on?
        </h1>
        <p className="text-[#57534E] leading-relaxed">
          Start a new session, or continue from your history below.
        </p>
      </div>

      {/* New session CTA */}
      <Link
        href="/app/new"
        className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-7 py-3.5 text-sm font-medium hover:bg-[#1A1A1A]/85 transition-all hover:scale-[1.02] shadow-md hover:shadow-lg mb-10"
      >
        <span className="text-base leading-none font-light">+</span>
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
                  className="flex items-center justify-between gap-4 bg-white border border-[#E7E5E4] rounded-xl px-5 py-4 hover:border-[#D97706]/50 hover:shadow-[0_2px_12px_-4px_rgba(217,119,6,0.15)] transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0 group-hover:scale-110 transition-transform" />
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
        <div className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden mb-8 shadow-sm">
          <div className="px-6 py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 mb-5 text-2xl">
              📚
            </div>
            <h2 className="font-serif text-xl font-medium text-[#1A1A1A] mb-2">
              Ready when you are
            </h2>
            <p className="text-sm text-[#57534E] mb-6 max-w-sm mx-auto leading-relaxed">
              Paste any question, assignment, or topic. Sage will guide you through it with questions, not answers.
            </p>
            <Link
              href="/app/new"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-[#1A1A1A]/85 transition-all hover:scale-[1.02] shadow-sm"
            >
              <span className="text-base leading-none font-light">+</span>
              Start your first session
            </Link>
          </div>
          <div className="border-t border-[#E7E5E4] bg-[#FAFAF8] px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-3 text-center">Try an example</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "LC Biology: explain meiosis vs mitosis",
                "LC Maths: differentiate f(x) = x³ + 4x from first principles",
                "LC History: causes of the 1916 Rising",
                "LC Chemistry: Le Chatelier's Principle and the Haber Process",
                "LC English: how to write a comparative essay",
              ].map((prompt) => (
                <Link
                  key={prompt}
                  href={`/app/new?topic=${encodeURIComponent(prompt)}`}
                  className="rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs text-[#57534E] hover:border-[#D97706]/50 hover:text-[#1A1A1A] hover:shadow-sm transition-all"
                >
                  {prompt}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
