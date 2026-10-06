import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { CheckoutButton } from "@/components/CheckoutButton";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose a one-time AI Study Toolkit or ongoing StudyWith Pro access.",
};

const plans = [
  {
    name: "Free",
    price: "€0",
    cadence: "forever",
    description: "Try the core system before paying.",
    features: ["3 AI study actions each month", "Socratic tutor", "Basic study planner"],
    product: null,
  },
  {
    name: "AI Study Toolkit",
    price: "€19",
    cadence: "one time",
    description: "A permanent LC workflow library with fixed AI credits.",
    features: [
      "Permanent prompt and workflow library",
      "25 included AI study actions",
      "Note-to-flashcard and quiz tools",
      "No subscription",
    ],
    product: "toolkit" as const,
    featured: true,
  },
  {
    name: "StudyWith Pro",
    price: "€7.99",
    cadence: "per month",
    description: "For regular study throughout the school year.",
    features: [
      "Full AI tutor access",
      "Unlimited materials and study plans",
      "Flashcards and practice quizzes",
      "Cancel from your account",
    ],
    product: "pro_monthly" as const,
  },
];

export default function PricingPage() {
  return (
    <>
      <PublicNav />
      <main className="py-20 md:py-28">
        <div className="shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow text-brand">Simple pricing</p>
            <h1 className="display mt-5 text-5xl leading-none tracking-[-.045em] md:text-7xl">
              Pay for what you will actually use.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl leading-7 text-muted">
              Start free. Buy the toolkit once, or use Pro when you want StudyWith beside you every week.
            </p>
          </div>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`card relative p-7 ${plan.featured ? "border-brand shadow-xl shadow-brand/10" : ""}`}
              >
                {plan.featured ? (
                  <span className="absolute right-6 top-6 rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                    Best first step
                  </span>
                ) : null}
                <h2 className="text-lg font-extrabold">{plan.name}</h2>
                <div className="mt-7 flex items-end gap-2">
                  <strong className="display text-5xl font-medium tracking-[-.04em]">{plan.price}</strong>
                  <span className="pb-2 text-xs text-muted">{plan.cadence}</span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-muted">{plan.description}</p>
                <ul className="my-8 grid gap-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check size={17} className="mt-0.5 shrink-0 text-brand" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.product ? (
                  <CheckoutButton
                    product={plan.product}
                    label={plan.product === "toolkit" ? "Buy the toolkit" : "Choose Pro"}
                    className={`w-full rounded-full px-5 py-3 text-sm font-extrabold ${plan.featured ? "bg-brand text-white hover:bg-[var(--blue-dark)]" : "bg-ink text-white hover:bg-ink/85"}`}
                  />
                ) : (
                  <a
                    href="/auth/signup"
                    className="focus-ring block rounded-full border border-line px-5 py-3 text-center text-sm font-extrabold hover:border-ink"
                  >
                    Start free
                  </a>
                )}
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted">
            Talk attendees receive a private €12 toolkit link. Pro is also available annually for €59 from account
            settings.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
