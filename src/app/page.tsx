import Link from "next/link";
import { ArrowRight, Brain, FileText, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

const tools = [
  {
    icon: Brain,
    title: "Get unstuck",
    text: "A Socratic tutor asks the right next question and gives a smaller hint when you need it.",
  },
  {
    icon: FileText,
    title: "Use your own notes",
    text: "Turn class notes into flashcards, practice questions and an active-recall session.",
  },
  {
    icon: Gauge,
    title: "Plan what fits",
    text: "Build a weekly LC plan from your subjects, confidence and actual available time.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="noise relative min-h-[720px] overflow-hidden bg-ink text-white">
        <PublicNav inverse />
        <div className="soft-grid absolute inset-0 opacity-30" />
        <div className="absolute -right-28 top-32 h-[460px] w-[460px] rounded-full bg-brand/35 blur-[100px]" />
        <div className="shell relative z-10 grid min-h-[720px] items-center gap-12 pt-28 lg:grid-cols-[1.05fr_.95fr]">
          <div className="animate-rise max-w-3xl">
            <p className="eyebrow mb-6 text-[#9fb2ff]">Built for the Leaving Cert</p>
            <h1 className="display text-[clamp(3.5rem,8vw,7.25rem)] font-medium leading-[.88] tracking-[-.055em]">
              Think better.
              <br />
              <em className="text-[#bff4df]">Study smarter.</em>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/68">
              StudyWith helps you understand difficult topics, practise from your own notes and revise with purpose. It
              supports your thinking. It does not do the work for you.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-ink hover:bg-[#eaf0ff]"
              >
                Start free <ArrowRight size={17} />
              </Link>
              <Link
                href="/schools"
                className="focus-ring rounded-full border border-white/20 px-6 py-3.5 text-sm font-bold hover:bg-white/10"
              >
                Bring StudyWith to a school
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/45">3 AI study actions each month. No card required.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] lg:justify-self-end">
            <div className="card rotate-[-2deg] border-white/10 bg-white p-5 text-ink shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <p className="text-xs font-bold text-muted">LC BIOLOGY</p>
                  <p className="mt-1 font-extrabold">Active recall: respiration</p>
                </div>
                <span className="rounded-full bg-[#e8edff] px-3 py-1 text-xs font-bold text-brand">Guided</span>
              </div>
              <div className="space-y-4 py-5 text-sm leading-6">
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-[#edf0f1] p-4">
                  Start with the purpose of aerobic respiration. What does the cell gain from breaking down glucose?
                </div>
                <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-brand p-4 text-white">
                  It releases energy to make ATP.
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-[#edf0f1] p-4">
                  Exactly. Now place that process: which organelle carries out most aerobic respiration, and what
                  feature helps it do so efficiently?
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-muted">
                Write what you think…
              </div>
            </div>
            <div className="absolute -bottom-7 -left-5 rounded-2xl border border-white/10 bg-[#bff4df] px-5 py-4 text-ink shadow-xl">
              <p className="text-2xl font-black">Not answers.</p>
              <p className="text-sm font-bold">Better questions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="shell">
          <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]">
            <p className="eyebrow text-brand">One study system</p>
            <h2 className="display max-w-3xl text-5xl leading-[1.02] tracking-[-.04em] md:text-7xl">
              Turn confusion into a clear next step.
            </h2>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {tools.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="card p-7">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-white">
                    <Icon size={21} />
                  </span>
                  <span className="text-xs font-black text-muted">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-xl font-extrabold tracking-[-.025em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-strong py-24">
        <div className="shell grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-brand">Academic integrity built in</p>
            <h2 className="display mt-5 text-5xl leading-none tracking-[-.04em] md:text-6xl">
              AI that keeps you in the driver&apos;s seat.
            </h2>
            <p className="mt-6 max-w-xl leading-7 text-muted">
              StudyWith is designed for explanation, active recall, practice and revision planning. It refuses requests
              to create coursework or assessed work for submission.
            </p>
            <div className="mt-8 grid gap-4 text-sm font-bold">
              <p className="flex items-center gap-3">
                <ShieldCheck className="text-brand" /> Your work stays yours
              </p>
              <p className="flex items-center gap-3">
                <Sparkles className="text-brand" /> Hints scale up only when needed
              </p>
              <p className="flex items-center gap-3">
                <Brain className="text-brand" /> Every session ends with an action
              </p>
            </div>
          </div>
          <blockquote className="rounded-[32px] bg-ink p-9 text-white md:p-12">
            <p className="display text-3xl leading-tight md:text-5xl">
              “Don&apos;t ask AI to think for you. Ask it to make your thinking impossible to avoid.”
            </p>
            <footer className="mt-9 border-t border-white/15 pt-5 text-sm text-white/55">
              The principle behind every StudyWith workflow
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="bg-brand py-20 text-white">
        <div className="shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-white/60">Your next session</p>
            <h2 className="display mt-4 max-w-3xl text-5xl leading-none tracking-[-.04em] md:text-7xl">
              Bring the chapter you keep avoiding.
            </h2>
          </div>
          <Link
            href="/auth/signup"
            className="focus-ring shrink-0 rounded-full bg-white px-7 py-4 text-sm font-extrabold text-brand"
          >
            Start studying free
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
