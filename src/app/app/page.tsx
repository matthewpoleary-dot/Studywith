import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Brain, CalendarDays, Camera, FileText, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { getAccessSummary } from "@/lib/access";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = createAdminSupabase();
  const [
    { count: sessions },
    { count: materials },
    { data: plan },
    { data: recentSessions },
    { data: recentMaterials },
    access,
  ] = await Promise.all([
    admin.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("study_materials").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("study_plans").select("id, subjects, schedule, updated_at").eq("user_id", user.id).maybeSingle(),
    admin
      .from("sessions")
      .select("id, title, subject, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
    admin
      .from("study_materials")
      .select("id, title, subject, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
    getAccessSummary(user.id),
  ]);
  const name = String(user.user_metadata?.full_name ?? "").split(" ")[0] || "there";
  const planSessions = Array.isArray(plan?.schedule) ? plan.schedule.length : 0;
  const actions = [
    {
      href: "/app/tutor",
      title: "Ask the tutor",
      text: "Type a question or photograph the page you are stuck on.",
      icon: Brain,
      tag: "Chat + images",
      color: "bg-[#e5e9ff] text-brand",
    },
    {
      href: "/app/materials",
      title: "Add class notes",
      text: "Turn handwritten pages, screenshots or PDFs into reusable practice.",
      icon: Camera,
      tag: "Notes to practice",
      color: "bg-[#dff6ec] text-[#087451]",
    },
    {
      href: "/app/planner",
      title: "Build this week",
      text: "Allocate realistic sessions around confidence and current priorities.",
      icon: CalendarDays,
      tag: "Weekly plan",
      color: "bg-[#ffe9cf] text-[#8a4b08]",
    },
  ];

  return (
    <div>
      <section className="relative overflow-hidden rounded-[32px] bg-ink p-7 text-white shadow-[0_24px_60px_rgba(16,24,32,.18)] md:p-10 lg:p-12">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-brand/35 blur-3xl" />
        <div className="absolute -bottom-36 right-1/3 h-72 w-72 rounded-full bg-[#4fd2a2]/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-9 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#9fb4ff]">Your study workspace</p>
            <h1 className="display mt-4 max-w-3xl text-5xl leading-[.98] tracking-[-.045em] md:text-6xl">
              Good to see you, {name}.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c7d0d7] md:text-base">
              Bring one real piece of work—a difficult idea, a photo of a question, or the notes you need to learn.
              StudyWith helps you do the next useful thing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/app/tutor"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(36,87,255,.3)] hover:bg-[#3867ff]"
              >
                <Sparkles size={16} /> Start a tutor chat
              </Link>
              <Link
                href="/app/materials"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-6 py-3.5 text-sm font-extrabold text-white hover:bg-white/14"
              >
                <Camera size={16} /> Upload notes
              </Link>
            </div>
          </div>
          <div className="grid min-w-64 grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[.06] p-2 backdrop-blur">
            <Stat value={sessions ?? 0} label="Chats" />
            <Stat value={materials ?? 0} label="Materials" />
            <Stat value={planSessions} label="Planned" />
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-brand">Choose your next step</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-.03em]">What do you want to work on?</h2>
          </div>
          <span className="hidden rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-[#5d6670] sm:block">
            {access.planLabel}
          </span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {actions.map(({ href, title, text, icon: Icon, tag, color }) => (
            <Link
              key={href}
              href={href}
              className="card group p-6 shadow-[0_12px_34px_rgba(16,24,32,.04)] transition hover:-translate-y-1 hover:border-[#b9c6ff] hover:shadow-[0_18px_42px_rgba(16,24,32,.09)]"
            >
              <div className="flex items-start justify-between">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}>
                  <Icon size={20} />
                </span>
                <span className="rounded-full bg-[#f1f3f3] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#5d6670]">
                  {tag}
                </span>
              </div>
              <h3 className="mt-7 text-xl font-black tracking-[-.025em]">{title}</h3>
              <p className="mt-3 min-h-12 text-sm leading-6 text-muted">{text}</p>
              <span className="mt-6 flex items-center gap-2 text-sm font-extrabold text-brand">
                Open{" "}
                <ArrowUpRight
                  size={15}
                  className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
        <div className="card overflow-hidden shadow-[0_12px_34px_rgba(16,24,32,.04)]">
          <header className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <p className="text-sm font-black">Continue where you left off</p>
              <p className="mt-1 text-xs text-muted">Your latest conversations and materials</p>
            </div>
            <BookOpen size={18} className="text-brand" />
          </header>
          {recentSessions?.length || recentMaterials?.length ? (
            <div className="divide-y divide-line">
              {(recentSessions ?? []).map((session) => (
                <RecentRow
                  key={`session-${session.id}`}
                  href={`/app/tutor?session=${session.id}`}
                  icon={Brain}
                  title={session.title}
                  meta={`${session.subject} · Tutor conversation`}
                />
              ))}
              {(recentMaterials ?? []).map((material) => (
                <RecentRow
                  key={`material-${material.id}`}
                  href="/app/materials"
                  icon={FileText}
                  title={material.title}
                  meta={`${material.subject} · Saved material`}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e5e9ff] text-brand">
                  <Sparkles size={18} />
                </span>
                <h3 className="mt-4 text-sm font-black">Nothing saved yet</h3>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted">
                  Your tutor conversations and uploaded notes will appear here automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="card p-6 shadow-[0_12px_34px_rgba(16,24,32,.04)]">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff6ec] text-[#087451]">
              <CalendarDays size={18} />
            </span>
            <span className="rounded-full bg-[#f1f3f3] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#5d6670]">
              This week
            </span>
          </div>
          <h3 className="mt-6 text-lg font-black">
            {plan ? `${planSessions} focused session${planSessions === 1 ? "" : "s"} planned` : "No weekly plan yet"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            {plan
              ? "Your plan is saved. Rebuild it whenever confidence, deadlines or available time change."
              : "Set honest confidence levels and current priorities to build a realistic week."}
          </p>
          <Link
            href="/app/planner"
            className="focus-ring mt-6 flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm font-extrabold text-ink shadow-sm hover:border-ink"
          >
            {plan ? "Review weekly plan" : "Build my first plan"}
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {!access.hasToolkit ? (
        <section className="mt-7 overflow-hidden rounded-[28px] bg-brand p-7 text-white shadow-[0_18px_42px_rgba(36,87,255,.18)] md:flex md:items-center md:justify-between md:p-8">
          <div>
            <p className="eyebrow text-white/65">Make it repeatable</p>
            <h2 className="display mt-3 text-3xl tracking-[-.03em]">Get the complete AI Study Toolkit.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Permanent guided workflows plus 25 fixed AI study actions. One payment, no subscription.
            </p>
          </div>
          <Link
            href="/pricing"
            className="surface-button focus-ring mt-5 inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3.5 text-sm font-extrabold md:mt-0"
          >
            See toolkit pricing <ArrowRight size={15} />
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-black/10 px-3 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-[#aeb9c1]">{label}</p>
    </div>
  );
}

function RecentRow({
  href,
  icon: Icon,
  title,
  meta,
}: {
  href: string;
  icon: typeof Brain;
  title: string;
  meta: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-4 px-6 py-4 hover:bg-[#fafaf7]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf0f1] text-brand">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{title}</strong>
        <span className="mt-1 block text-[11px] text-muted">{meta}</span>
      </span>
      <ArrowRight size={15} className="text-[#9aa1a6] transition group-hover:translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}
