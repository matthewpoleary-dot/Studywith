import { Suspense } from "react";
import Link from "next/link";
import CheckoutButton from "@/components/CheckoutButton";
import SubscribeBanner from "@/components/SubscribeBanner";

// ─── Static data ──────────────────────────────────────────────────────────────

const features = [
  {
    title: "Socratic method",
    desc: "The AI never gives you the answer. It asks questions that lead you there yourself — the way every great teacher does.",
  },
  {
    title: "Learning receipts",
    desc: "Score out of 100, a list of concepts you handled, gaps to review, and a written summary of what you learned.",
  },
  {
    title: "Full session history",
    desc: "Every session is saved. Come back any time to see how you've improved, what subjects you've covered, and where you keep slipping.",
  },
  {
    title: "Any subject",
    desc: "English essays, maths problem sets, science questions, history essays, programming — paste it and the tutor adapts.",
  },
  {
    title: "Honest scoring",
    desc: "The score reflects actual confidence with the material, not effort. No participation trophies — a clear picture of where you stand.",
  },
  {
    title: "Shareable receipts",
    desc: "Each receipt has a permanent link. Share it with a teacher, tutor, or parent to show exactly what you worked through.",
  },
];

const steps = [
  {
    n: "01",
    title: "Paste your assignment",
    desc: "Drop in any homework question, essay prompt, or problem set. The tutor reads it and adapts its approach to your subject.",
  },
  {
    n: "02",
    title: "Think it through together",
    desc: "The tutor asks, you answer. It corrects you when you're wrong and pushes you deeper when you're right. No shortcuts.",
  },
  {
    n: "03",
    title: "Get your receipt",
    desc: "A scored breakdown of everything you covered, where you struggled, and exactly what to study before your next session.",
  },
];

const pricingFeatures = [
  "Unlimited tutoring sessions",
  "Learning receipt after every session",
  "Full session history & dashboard",
  "Shareable receipt links",
  "Any subject or assignment type",
  "Cancel anytime from your dashboard",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">

      {/* Subscribe banner — shown when redirected back after signup without payment */}
      <Suspense>
        <SubscribeBanner />
      </Suspense>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-zinc-950">
            StudyWith
          </span>

          <div className="hidden items-center gap-6 text-sm text-zinc-500 sm:flex">
            <a href="#how-it-works" className="transition hover:text-zinc-900">
              How it works
            </a>
            <a href="#features" className="transition hover:text-zinc-900">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-zinc-900">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-zinc-500 transition hover:text-zinc-900"
            >
              Sign in
            </Link>
            <CheckoutButton
              label="Get started"
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-28 pt-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold leading-[1.1] tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl">
            The AI tutor that refuses to give you the answer.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-zinc-500">
            StudyWith guides you through any assignment using Socratic
            questioning. You do the thinking. The AI asks, prompts, and
            challenges — never skips you to the solution.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <CheckoutButton
              label="Start tutoring — €20/month"
              className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <a
              href="#how-it-works"
              className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-xs text-zinc-400">
            No contracts. Cancel anytime from your account.
          </p>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-zinc-100 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            How it works
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Three steps to understanding the material
          </h2>

          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="mb-5 text-5xl font-bold text-zinc-100">
                  {s.n}
                </div>
                <h3 className="font-semibold text-zinc-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Conversation preview */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-zinc-200">
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
              <div className="h-2 w-2 rounded-full bg-zinc-300" />
              <p className="text-xs font-medium text-zinc-400">
                Example session — Biology assignment
              </p>
            </div>
            <div className="space-y-4 bg-white p-5 text-sm">
              <div className="flex justify-start">
                <div className="max-w-[72%] rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 leading-relaxed text-zinc-800">
                  In one sentence — what do you think this assignment is asking
                  you to do?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[72%] rounded-2xl rounded-tr-sm bg-zinc-950 px-4 py-3 leading-relaxed text-white">
                  I think it wants me to explain how photosynthesis converts
                  light into energy?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[72%] rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 leading-relaxed text-zinc-800">
                  Good start. What molecule does the plant produce to store that
                  energy — and where does the carbon come from?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-zinc-100 bg-zinc-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Features
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Everything you need to actually learn
          </h2>

          <div className="mt-16 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="border-t border-zinc-200 pt-5">
                <h3 className="font-semibold text-zinc-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-zinc-100 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            One plan. Everything included.
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            No tiers. No usage limits. No upsells.
          </p>

          <div className="mt-12 max-w-sm">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-semibold tracking-tight text-zinc-950">
                  €20
                </span>
                <span className="text-zinc-500">/ month</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Billed monthly. Cancel anytime from your dashboard.
              </p>

              <ul className="mt-8 space-y-3">
                {pricingFeatures.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-3 text-sm text-zinc-700"
                  >
                    <span className="mt-0.5 shrink-0 text-zinc-400">—</span>
                    {feat}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <CheckoutButton
                  label="Get started"
                  className="w-full rounded-full bg-zinc-950 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <p className="mt-3 text-center text-xs text-zinc-400">
                No commitment. Cancel whenever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-100 bg-zinc-950 py-24 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to actually understand your work?
          </h2>
          <p className="mt-4 max-w-lg text-zinc-400">
            Stop submitting assignments you didn&apos;t fully understand. Start
            a session, work through it properly, and leave with a score that
            tells you exactly where you stand.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <CheckoutButton
              label="Start tutoring — €20/month"
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Link
              href="/auth/login"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <span className="text-sm font-semibold text-zinc-950">StudyWith</span>
          <div className="flex gap-5 text-xs text-zinc-400">
            <Link href="/auth/login" className="transition hover:text-zinc-700">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="transition hover:text-zinc-700"
            >
              Create account
            </Link>
            <a href="#pricing" className="transition hover:text-zinc-700">
              Pricing
            </a>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} StudyWith
          </p>
        </div>
      </footer>
    </div>
  );
}
