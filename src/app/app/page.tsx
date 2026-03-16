import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-service";
import type { Database, LearningReceipt } from "@/lib/database.types";

export default async function DashboardPage() {
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
    .select("id, assignment_text, created_at, receipt")
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Page header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome back,{" "}
            <span className="text-zinc-400">{user?.email}</span>
          </p>
        </div>
        <Link
          href="/app/new"
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-black transition hover:bg-emerald-400"
        >
          + New session
        </Link>
      </div>

      {/* Stats row */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-medium text-zinc-500">Total sessions</p>
          <p className="mt-2 text-4xl font-semibold">{allSessions.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-medium text-zinc-500">Completed</p>
          <p className="mt-2 text-4xl font-semibold">{completedSessions.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-medium text-zinc-500">Average score</p>
          <p
            className={`mt-2 text-4xl font-semibold ${
              avgScore === null
                ? "text-zinc-600"
                : avgScore >= 75
                  ? "text-emerald-400"
                  : avgScore >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
            }`}
          >
            {avgScore !== null ? `${avgScore}` : "—"}
            {avgScore !== null && (
              <span className="text-lg text-zinc-600">/100</span>
            )}
          </p>
        </div>
      </div>

      {/* Session history */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-medium tracking-tight">Session history</h2>
        <span className="text-xs text-zinc-600">{allSessions.length} total</span>
      </div>

      {allSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-20 text-center">
          <div className="mb-3 text-3xl">📚</div>
          <p className="font-medium text-zinc-300">No sessions yet</p>
          <p className="mt-1 text-sm text-zinc-600">
            Start your first session to see your progress here.
          </p>
          <Link
            href="/app/new"
            className="mt-6 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-400"
          >
            Start your first session
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {allSessions.map((s) => {
            const receipt = s.receipt as unknown as LearningReceipt | null;
            const score = receipt?.score ?? null;
            const scoreColor =
              score === null
                ? "text-zinc-600"
                : score >= 75
                  ? "text-emerald-400"
                  : score >= 50
                    ? "text-yellow-400"
                    : "text-red-400";
            const date = new Date(s.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={s.id}
                className="group flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
              >
                {/* Assignment preview + score */}
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-zinc-300">
                    {s.assignment_text || "No assignment text"}
                  </p>
                  {score !== null && (
                    <div className={`shrink-0 text-2xl font-semibold ${scoreColor}`}>
                      {score}
                      <span className="text-xs text-zinc-600">/100</span>
                    </div>
                  )}
                  {score === null && (
                    <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">
                      In progress
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{date}</span>
                  {receipt ? (
                    <Link
                      href={`/receipt/${s.id}`}
                      className="text-xs text-emerald-400 transition hover:text-emerald-300"
                    >
                      View receipt →
                    </Link>
                  ) : (
                    <Link
                      href="/app/new"
                      className="text-xs text-zinc-600 transition hover:text-zinc-400"
                    >
                      Resume →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
