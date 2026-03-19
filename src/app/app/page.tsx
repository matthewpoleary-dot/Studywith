export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import Link from "next/link";
import type { Database } from "@/lib/database.types";
import ReferralLink from "@/components/ReferralLink";

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

  const referralCode = user!.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studywith-phi.vercel.app";
  const referralUrl = `${siteUrl}/?ref=${referralCode}`;

  return (
    <div className="w-full max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16">
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
        <div className="border border-dashed border-[#E7E5E4] rounded-2xl px-6 py-16 text-center mb-8">
          <p className="font-serif text-lg text-[#1A1A1A] mb-2">Your sessions will appear here</p>
          <p className="text-sm text-[#57534E]">Start a new session above to begin.</p>
        </div>
      )}

      {/* Refer a friend */}
      <div className="bg-[#F5F4F0] border border-[#E7E5E4] rounded-2xl p-6">
        <p className="text-sm font-medium text-[#1A1A1A] mb-1">Refer a friend</p>
        <p className="text-xs text-[#57534E] mb-4">
          Share your link. Friends get 14 days free instead of the usual 7.
        </p>
        <ReferralLink url={referralUrl} />
      </div>
    </div>
  );
}
