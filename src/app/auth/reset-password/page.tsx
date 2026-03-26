"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function initRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Handle PKCE recovery links (?code=...)
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          // Clean URL (remove code) after exchange
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        } else {
          // Handle implicit recovery links (#access_token=...&refresh_token=...&type=recovery)
          const hash = window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash;
          const hashParams = new URLSearchParams(hash);
          const access_token = hashParams.get("access_token");
          const refresh_token = hashParams.get("refresh_token");
          const hashError = hashParams.get("error_description") ?? hashParams.get("error");

          if (hashError) {
            throw new Error(decodeURIComponent(hashError));
          }

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;

            // Clean URL (remove tokens) after session set
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        // Ensure we have a session before showing the form
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("This reset link is invalid or expired. Please request a new one.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not validate reset link.";
        if (!cancelled) setInitError(message);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void initRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/login?reset=success"), 900);
    }
  };

  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            Choose a new password
          </h1>
          <p className="text-sm text-[#57534E]">
            Pick something strong and memorable.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
          {initializing ? (
            <div className="py-2">
              <p className="text-sm font-medium text-[#1A1A1A]">Validating reset link…</p>
              <p className="text-xs text-[#57534E] mt-1">Just a moment.</p>
            </div>
          ) : initError ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-[#1A1A1A]">Reset link problem</p>
              <p className="text-xs text-[#57534E] leading-relaxed">{initError}</p>
              <button
                type="button"
                onClick={() => router.push("/auth/forgot-password")}
                className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1A1A1A]/80"
              >
                Request a new reset link
              </button>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  Password updated
                </p>
                <p className="text-xs text-[#57534E] mt-1">
                  Taking you to sign in…
                </p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium text-[#57534E]"
                  htmlFor="password"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium text-[#57534E]"
                  htmlFor="confirm"
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
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
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
