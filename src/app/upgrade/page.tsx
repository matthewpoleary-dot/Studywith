"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap } from "lucide-react";

const FEATURES = [
  "Unlimited tutoring sessions",
  "Learning receipts after every session",
  "Subject-specific Socratic guidance",
  "Answer checker / corrector mode",
  "Session history & progress stats",
  "Teacher rooms & assignment tracking",
  "Vision support (photo your work)",
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<"trial" | "monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (plan: "trial" | "monthly" | "annual") => {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.error === "trial_used") {
        setError("You've already used your free trial. Choose a paid plan below.");
        setLoading(null);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Could not start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center px-6 py-16">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 text-sm text-[#A8A29E] hover:text-[#57534E] transition"
      >
        ← Back
      </button>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-full px-3 py-1 mb-4">
            <Zap className="w-3 h-3" />
            You&apos;ve reached your free limit
          </span>
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-3">
            Upgrade to StudyWith Pro
          </h1>
          <p className="text-sm text-[#57534E]">
            You&apos;ve completed your 3 free sessions. Upgrade to keep going.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}

        {/* Feature list */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-4">
            Everything in Pro
          </p>
          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-[#1A1A1A]">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Plans */}
        <div className="space-y-3">
          {/* Trial */}
          <button
            onClick={() => void startCheckout("trial")}
            disabled={loading !== null}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl px-6 py-4 text-left hover:bg-[#1A1A1A]/90 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {loading === "trial" ? "Redirecting…" : "Start 7-day free trial"}
                </p>
                <p className="text-xs text-white/60 mt-0.5">Then €12.99/mo. No card required to start.</p>
              </div>
              <span className="text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium">
                Free
              </span>
            </div>
          </button>

          {/* Monthly */}
          <button
            onClick={() => void startCheckout("monthly")}
            disabled={loading !== null}
            className="w-full bg-white border border-[#E7E5E4] rounded-2xl px-6 py-4 text-left hover:border-[#D97706]/40 hover:shadow-sm transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {loading === "monthly" ? "Redirecting…" : "Monthly"}
                </p>
                <p className="text-xs text-[#A8A29E] mt-0.5">Access starts immediately</p>
              </div>
              <span className="text-sm font-semibold text-[#1A1A1A]">€12.99<span className="text-xs font-normal text-[#A8A29E]">/mo</span></span>
            </div>
          </button>

          {/* Annual */}
          <button
            onClick={() => void startCheckout("annual")}
            disabled={loading !== null}
            className="w-full bg-white border border-[#D97706]/30 rounded-2xl px-6 py-4 text-left hover:border-[#D97706] hover:shadow-sm transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {loading === "annual" ? "Redirecting…" : "Annual"}
                </p>
                <p className="text-xs text-[#A8A29E] mt-0.5">
                  €89/yr · save 43%
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#D97706]">€7.42<span className="text-xs font-normal text-[#A8A29E]">/mo</span></span>
                <span className="ml-2 text-[10px] font-medium bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2 py-0.5">Best value</span>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-[#A8A29E] mt-5">
          Student at a .edu or .ac.* institution?{" "}
          Student pricing (€5.99/mo) is applied automatically at checkout.
        </p>
      </div>
    </div>
  );
}
