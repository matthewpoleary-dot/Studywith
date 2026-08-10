import Link from "next/link";
import { ArrowUpRight, BookOpen, Brain, CalendarDays, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { getAccessSummary } from "@/lib/access";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = createAdminSupabase();
  const [{ count: sessions }, { count: materials }, { data: plan }, access] = await Promise.all([
    admin.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("study_materials").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("study_plans").select("id, subjects").eq("user_id", user.id).maybeSingle(),
    getAccessSummary(user.id),
  ]);
  const name = String(user.user_metadata?.full_name ?? "").split(" ")[0] || "there";
  const actions = [
    { href: "/app/tutor", title: "Get unstuck with the tutor", text: "Work through one difficult idea without being handed the answer.", icon: Brain, color: "bg-[#dfe6ff]" },
    { href: "/app/materials", title: "Turn notes into practice", text: "Upload or paste class notes, then generate flashcards and a quiz.", icon: FileText, color: "bg-[#d8f7e9]" },
    { href: "/app/planner", title: "Set this week’s plan", text: "Build a realistic schedule around the time you actually have.", icon: CalendarDays, color: "bg-[#ffe9cf]" },
  ];
  return <div><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow text-brand">Study workspace</p><h1 className="display mt-3 text-5xl tracking-[-.045em] md:text-6xl">Good to see you, {name}.</h1><p className="mt-3 text-sm text-muted">Choose one useful thing to do next. You do not need to fix every subject today.</p></div><div className="card flex items-center gap-4 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-white"><BookOpen size={19} /></span><div><p className="text-xs font-bold text-muted">Current access</p><p className="text-sm font-extrabold">{access.planLabel}</p></div></div></div><section className="mt-10 grid gap-4 lg:grid-cols-3">{actions.map(({ href, title, text, icon: Icon, color }) => <Link key={href} href={href} className="card group p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}><Icon size={21} /></div><h2 className="mt-7 text-xl font-extrabold tracking-[-.025em]">{title}</h2><p className="mt-3 min-h-12 text-sm leading-6 text-muted">{text}</p><span className="mt-7 flex items-center gap-2 text-sm font-extrabold text-brand">Open <ArrowUpRight size={16} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span></Link>)}</section><section className="mt-8 grid gap-4 md:grid-cols-3"><div className="card p-6"><p className="text-xs font-bold text-muted">Tutor sessions</p><p className="display mt-2 text-4xl">{sessions ?? 0}</p></div><div className="card p-6"><p className="text-xs font-bold text-muted">Saved materials</p><p className="display mt-2 text-4xl">{materials ?? 0}</p></div><div className="card p-6"><p className="text-xs font-bold text-muted">Study plan</p><p className="mt-3 text-lg font-extrabold">{plan ? "Ready for this week" : "Not built yet"}</p></div></section>{!access.hasToolkit ? <section className="mt-8 rounded-[28px] bg-brand p-7 text-white md:flex md:items-center md:justify-between"><div><p className="eyebrow text-white/60">Make it repeatable</p><h2 className="display mt-3 text-3xl">Get the complete AI Study Toolkit.</h2><p className="mt-2 text-sm text-white/70">Permanent workflows plus 25 fixed AI actions. One payment, no subscription.</p></div><Link href="/pricing" className="focus-ring mt-5 inline-block rounded-full bg-white px-6 py-3 text-sm font-extrabold text-brand md:mt-0">See the toolkit</Link></section> : null}</div>;
}
