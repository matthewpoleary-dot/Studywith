import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Database, LearningReceipt } from "@/lib/database.types";

type SessionRow = {
  id: string;
  user_id: string;
  assignment_text: string;
  title: string | null;
  receipt: unknown | null;
  created_at: string;
};

export default async function SessionSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/app");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin().from("sessions") as any;
  const { data } = await admin
    .select("id, user_id, assignment_text, title, receipt, created_at")
    .eq("id", id)
    .single();

  if (!data || data.user_id !== user.id) notFound();
  const session = data as SessionRow;

  // If no receipt yet (session still active), redirect to active session
  if (!session.receipt) redirect(`/app/session/${id}`);

  const receipt = session.receipt as unknown as LearningReceipt;

  const title =
    session.title ??
    (session.assignment_text.length > 50
      ? session.assignment_text.slice(0, 50) + "…"
      : session.assignment_text);

  const date = new Date(session.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const scoreColor =
    receipt.score >= 75 ? "text-emerald-600" :
    receipt.score >= 50 ? "text-[#D97706]" :
    "text-red-500";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-6 py-10 md:py-14">

        {/* Session title + subject badge */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-3">
            Session complete · {date}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-3 leading-tight">
            {title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-2xl font-serif font-medium ${scoreColor}`}>
              {receipt.score}<span className="text-sm text-[#A8A29E]">/100</span>
            </span>
            <Link
              href={`/app/session/${id}`}
              className="text-xs text-[#A8A29E] hover:text-[#57534E] transition underline underline-offset-2"
            >
              View full chat →
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {/* What you covered */}
          {receipt.conceptsCovered && receipt.conceptsCovered.length > 0 && (
            <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">
                What you covered
              </p>
              <ul className="space-y-2">
                {receipt.conceptsCovered.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#1A1A1A]">
                    <span className="text-[#D97706] mt-0.5 shrink-0">✦</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* You understood well */}
          {receipt.understoodWell && receipt.understoodWell.length > 0 && (
            <section className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">
                You understood well
              </p>
              <ul className="space-y-2">
                {receipt.understoodWell.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#1A1A1A]">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Worth revisiting */}
          {(receipt.toRevisit ?? receipt.gaps).length > 0 && (
            <section className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3">
                Worth revisiting
              </p>
              <ul className="space-y-2">
                {(receipt.toRevisit ?? receipt.gaps).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#1A1A1A]">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                    <span className="flex-1">{item}</span>
                    <Link
                      href={`/app/new?topic=${encodeURIComponent(item)}`}
                      className="shrink-0 text-[11px] font-medium text-amber-600 hover:underline"
                    >
                      Review →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Think about this */}
          {receipt.followUpQuestion && (
            <section className="bg-[#F5F4F0] border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">
                Think about this...
              </p>
              <blockquote className="font-serif text-base md:text-lg text-[#1A1A1A] leading-relaxed">
                &ldquo;{receipt.followUpQuestion}&rdquo;
              </blockquote>
            </section>
          )}

          {/* Summary */}
          {receipt.summary && (
            <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">
                Sage&apos;s summary
              </p>
              <p className="text-sm leading-relaxed text-[#57534E]">{receipt.summary}</p>
            </section>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/app/new"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.01]"
            >
              <span className="text-base leading-none">+</span>
              Start a new session
            </Link>
            <Link
              href="/app"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-[#E7E5E4] text-[#57534E] rounded-xl px-6 py-3 text-sm font-medium hover:border-[#D97706]/40 hover:text-[#1A1A1A] transition-all"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
