"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { posthog } from "@/lib/posthog";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "redirecting">(
    "idle",
  );
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const router = useRouter();

  // If already signed in and subscribed, skip straight to the app
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const res = await fetch("/api/check-subscription");
        const data = (await res.json()) as { subscribed: boolean };
        if (data.subscribed) router.replace("/app");
      } catch {
        // ignore - let them see the signup page
      }
    });
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus("creating");
    posthog.capture('signup_started');

    const supabase = createSupabaseBrowserClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      setStatus("idle");
      return;
    }

    // No session = email confirmation is required. Show the "check your email" screen.
    if (!signUpData.session) {
      posthog.capture('signup_completed');
      setConfirmEmail(email);
      setLoading(false);
      return;
    }

    // Session exists = email confirmation is off, or existing confirmed account.
    // Identify and track signup, then check subscription.
    if (signUpData.user) {
      posthog.identify(signUpData.user.id, { email: signUpData.user.email, created_at: signUpData.user.created_at });
      posthog.capture('signup_completed');
    }
    setStatus("redirecting");
    try {
      const subRes = await fetch("/api/check-subscription");
      if (subRes.ok) {
        const subData = (await subRes.json()) as { subscribed: boolean };
        if (subData.subscribed) {
          window.location.href = "/app";
          return;
        }
      }
    } catch {
      // fall through to Stripe
    }

    // Read the plan they chose before signing up (set by CheckoutButton)
    const storedPlan =
      typeof window !== "undefined"
        ? (localStorage.getItem("studywith_plan") as
            | "trial"
            | "monthly"
            | "annual"
            | null)
        : null;

    // No plan chosen - default to trial (matches signup messaging)
    const planToUse = storedPlan ?? "trial";

    localStorage.removeItem("studywith_plan");

    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planToUse }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fall through to fallback
    }

    window.location.href = "/?checkout=required";
  };

  const buttonLabel =
    status === "creating"
      ? "Creating account…"
      : status === "redirecting"
        ? "Redirecting…"
        : "Create account";

  const handleResend = async () => {
    if (!confirmEmail || resendLoading) return;
    setResendLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resend({ type: "signup", email: confirmEmail });
    setResendLoading(false);
    setResendDone(true);
  };

  // Email confirmation required - show check-your-inbox screen
  if (confirmEmail) {
    return (
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-[#E7E5E4] p-8 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#D97706]/10 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-2">
                Check your inbox
              </h2>
              <p className="text-sm text-[#57534E] leading-relaxed">
                We sent a confirmation link to{" "}
                <span className="font-medium text-[#1A1A1A]">{confirmEmail}</span>.
                Click it to confirm your account, then come back to subscribe.
              </p>
            </div>
            <p className="text-xs text-[#A8A29E]">
              Check your spam folder if it doesn&apos;t arrive within a minute.
            </p>
            {resendDone ? (
              <p className="text-xs text-[#D97706] font-medium">Email resent!</p>
            ) : (
              <button
                onClick={() => void handleResend()}
                disabled={resendLoading}
                className="text-xs text-[#57534E] hover:text-[#1A1A1A] underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Sending…" : "Resend confirmation email"}
              </button>
            )}
            <Link
              href="/auth/login"
              className="inline-block text-xs text-[#57534E] hover:text-[#1A1A1A] underline underline-offset-2 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            Start studying smarter
          </h1>
          <p className="text-sm text-[#57534E]">
            Create your account to start your 7-day free trial. Upload your notes and get to work. No card required.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
          <form
            onSubmit={(e) => void handleSignup(e)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-[#57534E]"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                placeholder="you@example.com"
                className="rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-[#57534E]"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                minLength={8}
                className="rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1A1A1A]/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {buttonLabel}
            </button>

            <p className="text-center text-xs text-[#57534E]">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-[#D97706] font-medium underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
