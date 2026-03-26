"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import CheckoutButton from "@/components/CheckoutButton";
import { posthog } from "@/lib/posthog";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Identify user in PostHog
    const supabaseForUser = createSupabaseBrowserClient();
    const { data: { user } } = await supabaseForUser.auth.getUser();
    if (user) {
      posthog.identify(user.id, { email: user.email, created_at: user.created_at });
      posthog.capture('login_completed');
    }

    // Persist the user's "keep me signed in" preference
    localStorage.setItem("sw_remember", keepSignedIn ? "1" : "0");

    // Check subscription - heals DB via Stripe fallback if webhook was missed
    try {
      const res = await fetch("/api/check-subscription");
      const data = (await res.json()) as { subscribed: boolean };

      if (data.subscribed) {
        window.location.href = searchParams.get("redirectTo") ?? "/app";
      } else {
        setNeedsSubscription(true);
        setLoading(false);
      }
    } catch {
      window.location.href = searchParams.get("redirectTo") ?? "/app";
    }
  };

  // Shown after sign-in when no active subscription is found
  if (needsSubscription) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <div>
          <p className="text-sm font-medium text-[#1A1A1A] mb-1">
            No active subscription
          </p>
          <p className="text-xs text-[#57534E] leading-relaxed">
            You&apos;re signed in as <span className="font-medium">{email}</span> but
            we couldn&apos;t find an active subscription on this account.
          </p>
        </div>
        <CheckoutButton
          plan="trial"
          label="Start free trial"
          className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1A1A1A]/80 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          onClick={() => {
            setNeedsSubscription(false);
            setEmail("");
            setPassword("");
          }}
          className="text-xs text-[#57534E] hover:text-[#1A1A1A] transition"
        >
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleLogin(e)} className="flex flex-col gap-4">
      {resetSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Password updated. Please sign in with your new password.
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#57534E]" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-medium text-[#57534E]"
            htmlFor="password"
          >
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-[#A8A29E] hover:text-[#D97706] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
        />
      </div>

      {/* Keep me signed in toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={keepSignedIn}
          onClick={() => setKeepSignedIn(!keepSignedIn)}
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            keepSignedIn ? "bg-[#1A1A1A]" : "bg-[#E7E5E4]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              keepSignedIn ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-xs text-[#57534E]">Keep me signed in</span>
      </label>

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
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-[#57534E]">
        No account?{" "}
        <Link
          href="/auth/signup"
          className="text-[#D97706] font-medium underline-offset-2 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center px-6 py-10 md:py-16">
      <div className="w-full max-w-sm">
        <div className="mb-7">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Sign in to continue your tutoring sessions.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-7 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08),0_1px_4px_-2px_rgba(0,0,0,0.04)]">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
