import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import Link from "next/link";
import type { Database, LearningReceipt } from "@/lib/database.types";

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

  const { data: sessions } = await getSupabaseAdmin()
    .from("sessions")
    .select("id, assignment_text, title, created_at, receipt")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const allSessions = sessions ?? [];
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

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-12 md:py-16">
      {/* Greeting */}
      <div className="mb-10">
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
        className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-lg px-7 py-3.5 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.02] mb-12"
      >
        <span className="text-lg leading-none">+</span>
        New session
      </Link>

      {/* Stats — only shown when there are sessions */}
      {allSessions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-medium text-[#57534E] mb-2">
                Total sessions
              </p>
              <p className="text-3xl font-serif font-medium text-[#1A1A1A]">
                {allSessions.length}
              </p>
            </div>
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-medium text-[#57534E] mb-2">
                Completed
              </p>
              <p className="text-3xl font-serif font-medium text-[#1A1A1A]">
                {completedSessions.length}
              </p>
            </div>
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-medium text-[#57534E] mb-2">
                Avg score
              </p>
              <p
                className={`text-3xl font-serif font-medium ${
                  avgScore === null
                    ? "text-[#A8A29E]"
                    : avgScore >= 75
                      ? "text-emerald-600"
                      : avgScore >= 50
                        ? "text-amber-600"
                        : "text-red-500"
                }`}
              >
                {avgScore !== null ? `${avgScore}` : "--"}
                {avgScore !== null && (
                  <span className="text-base text-[#A8A29E]">/100</span>
                )}
              </p>
            </div>
          </div>

          {/* Recent completed sessions */}
          {completedSessions.length > 0 && (
            <div>
              <h2 className="font-medium text-[#1A1A1A] mb-4">
                Recent receipts
              </h2>
              <div className="space-y-3">
                {completedSessions.slice(0, 5).map((s) => {
                  const receipt = s.receipt as unknown as LearningReceipt;
                  const score = receipt?.score ?? null;
                  const date = new Date(s.created_at).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short", year: "numeric" },
                  );
                  return (
                    <Link
                      key={s.id}
                      href={`/receipt/${s.id}`}
                      className="flex items-center justify-between gap-4 bg-white border border-[#E7E5E4] rounded-xl px-5 py-4 hover:border-[#D97706]/40 hover:shadow-sm transition-all group"
                    >
                      <p className="text-sm text-[#1A1A1A] truncate flex-1 leading-relaxed">
                        {(s as { title?: string | null }).title ?? s.assignment_text ?? "Session"}
                      </p>
                      <div className="flex items-center gap-4 shrink-0">
                        {score !== null && (
                          <span
                            className={`text-sm font-medium ${
                              score >= 75
                                ? "text-emerald-600"
                                : score >= 50
                                  ? "text-amber-600"
                                  : "text-red-500"
                            }`}
                          >
                            {score}/100
                          </span>
                        )}
                        <span className="text-xs text-[#A8A29E]">{date}</span>
                        <span className="text-xs text-[#D97706] opacity-0 group-hover:opacity-100 transition-opacity">
                          View receipt
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {allSessions.length === 0 && (
        <div className="border border-dashed border-[#E7E5E4] rounded-2xl px-6 py-16 text-center">
          <p className="font-serif text-lg text-[#1A1A1A] mb-2">
            No sessions yet
          </p>
          <p className="text-sm text-[#57534E]">
            Paste any assignment above to get started.
          </p>
        </div>
      )}
    </div>
  );
}
