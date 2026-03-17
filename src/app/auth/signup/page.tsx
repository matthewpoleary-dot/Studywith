"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "redirecting">(
    "idle",
  );
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
        // ignore — let them see the signup page
      }
    });
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus("creating");

    const supabase = createSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
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

    // Check if this account is already subscribed (e.g. existing user who signed out)
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

    // New account — redirect to Stripe checkout
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
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
        : "Create account and subscribe";

  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            Start learning smarter
          </h1>
          <p className="text-sm text-[#57534E]">
            Create your account, then subscribe for €20/month. Cancel anytime.
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
