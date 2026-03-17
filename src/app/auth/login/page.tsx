"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Call check-subscription before navigating — this heals the DB if the
    // webhook was slow or failed, so the proxy finds subscribed=true on arrival.
    try {
      const res = await fetch("/api/check-subscription");
      const data = (await res.json()) as { subscribed: boolean };

      if (data.subscribed) {
        const redirectTo = searchParams.get("redirectTo") ?? "/app";
        router.push(redirectTo);
      } else {
        router.push("/?checkout=required");
      }
    } catch {
      // Network error — fall back to /app and let the proxy decide
      router.push(searchParams.get("redirectTo") ?? "/app");
    }

    router.refresh();
  };

  return (
    <form onSubmit={(e) => void handleLogin(e)} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          placeholder="••••••••"
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
        {loading ? "Signing in..." : "Sign in"}
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
    <div className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-[#57534E]">
            Sign in to continue your tutoring sessions.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
