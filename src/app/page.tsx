import Link from "next/link";
import CheckoutButton from "@/components/CheckoutButton";

// ─── Static data ──────────────────────────────────────────────────────────────

const features = [
  {
    icon: "🧠",
    title: "Socratic method",
    description:
      "The tutor never hands over an answer. It asks targeted questions that lead you to figure it out yourself — the way great teachers do.",
  },
  {
    icon: "📋",
    title: "Learning receipts",
    description:
      "Every session ends with a scored summary: concepts you demonstrated, gaps to review, and an honest overall score from 0–100.",
  },
  {
    icon: "📚",
    title: "Full session history",
    description:
      "Every tutoring session is saved to your dashboard. Track your improvement across subjects and spot patterns in your progress.",
  },
  {
    icon: "⚡",
    title: "Any subject",
    description:
      "Maths, history, programming, essay writing, science — paste any assignment and the tutor adapts to the material instantly.",
  },
  {
    icon: "🎯",
    title: "Honest scoring",
    description:
      "Your score reflects actual confidence with the material, not effort. No participation trophies — just a clear picture of where you stand.",
  },
  {
    icon: "🔗",
    title: "Shareable receipts",
    description:
      "Each learning receipt has a unique URL you can share with teachers, tutors, or parents to show exactly what you worked through.",
  },
];

const steps = [
  {
    title: "Paste your assignment",
    description:
      "Drop in any homework question, essay prompt, or problem set. The tutor reads it and adapts its approach to the subject.",
  },
  {
    title: "Think it through together",
    description:
      "The tutor guides you with questions and hints. You do the reasoning — the AI never skips you to the answer.",
  },
  {
    title: "Get your learning receipt",
    description:
      "A scored summary of what you understood and what to review appears at the end of every session.",
  },
];

const pricingFeatures = [
  "Unlimited tutoring sessions",
  "Learning receipt after every session",
  "Full session history & dashboard",
  "Shareable receipt links",
  "Any subject or topic",
  "Cancel anytime — no contracts",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">

      {/* ── Sticky nav ────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold tracking-tight">StudyWith</span>
          </div>

          {/* Nav links */}
          <div className="hidden items-center gap-6 text-sm text-zinc-500 sm:flex">
            <a href="#features" className="transition hover:text-zinc-100">Features</a>
            <a href="#how-it-works" className="transition hover:text-zinc-100">How it works</a>
            <a href="#pricing" className="transition hover:text-zinc-100">Pricing</a>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              Sign in
            </Link>
            <CheckoutButton
              label="Get started"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Guided by AI — answered by you
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            The AI tutor that makes{" "}
            <span className="text-emerald-400">you</span> do the thinking
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 sm:text-lg">
            Stop copying answers. StudyWith uses Socratic questioning to guide you
            through any assignment — so you actually learn, retain, and understand
            the material.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <CheckoutButton
              label="Start for €20 / month"
              className="rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <a
              href="#how-it-works"
              className="rounded-full border border-zinc-700 px-7 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            No contracts. Cancel anytime from your dashboard.
          </p>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-zinc-900 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Why StudyWith
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for students who want to actually learn
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-zinc-700"
              >
                <div className="mb-4 text-2xl">{f.icon}</div>
                <h3 className="font-medium text-zinc-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-zinc-900 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Three steps to genuine understanding
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  {i + 1}
                </div>
                <h3 className="font-medium text-zinc-100">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{s.description}</p>
              </div>
            ))}
          </div>

          {/* Live chat preview */}
          <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="mb-5 text-xs font-medium uppercase tracking-widest text-zinc-600">
              Example exchange
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs leading-relaxed text-zinc-300">
                  In one sentence — what do you think this assignment is asking you to do?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs leading-relaxed text-black">
                  I think it wants me to explain how photosynthesis converts light into energy?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs leading-relaxed text-zinc-300">
                  Good start. What molecule does the plant produce to store that energy — and where does the carbon come from?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-zinc-900 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              One plan. Everything included.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500">
              No tiers, no usage limits, no upsells. Pay monthly, cancel whenever.
            </p>
          </div>

          <div className="mx-auto max-w-sm">
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/50 to-zinc-950 p-8 shadow-2xl shadow-emerald-950/30">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                Pro — everything included
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-semibold text-zinc-100">€20</span>
                <span className="text-zinc-500">/ month</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Billed monthly. Cancel from your account anytime.
              </p>

              {/* Feature list */}
              <ul className="mt-8 space-y-3">
                {pricingFeatures.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm text-zinc-300">
                    <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8">
                <CheckoutButton
                  label="Get started now"
                  className="w-full rounded-full bg-emerald-500 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <p className="mt-3 text-center text-xs text-zinc-600">
                No commitment. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-900 py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to actually understand your work?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-zinc-400">
            Join students who have replaced copying with real understanding.
            Your first session is waiting.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <CheckoutButton
              label="Start tutoring — €20/month"
              className="rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Link
              href="/auth/login"
              className="text-sm text-zinc-500 transition hover:text-zinc-300"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-zinc-400">StudyWith</span>
            </div>

            {/* Links */}
            <div className="flex gap-6 text-xs text-zinc-600">
              <Link href="/auth/login" className="transition hover:text-zinc-400">
                Sign in
              </Link>
              <Link href="/auth/signup" className="transition hover:text-zinc-400">
                Create account
              </Link>
              <a href="#pricing" className="transition hover:text-zinc-400">
                Pricing
              </a>
            </div>

            {/* Tagline */}
            <p className="text-xs text-zinc-700">
              © {new Date().getFullYear()} StudyWith · Built for students who want to learn.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
