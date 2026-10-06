"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const linkExpired = useSearchParams().get("error") === "expired";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await createBrowserSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      setMessage(error ? error.message : "If that account exists, a secure reset link is on its way.");
    } catch {
      setMessage("The reset link could not be sent. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="card w-full max-w-md justify-self-end p-8">
      <p className="eyebrow text-brand">Password reset</p>
      <h1 className="display mt-4 text-4xl">Get a secure link.</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Enter the email attached to your StudyWith account.</p>
      {linkExpired ? (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          That reset link is invalid or has expired. Request a new one below.
        </p>
      ) : null}
      <form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4">
        <label className="grid gap-2 text-sm font-bold">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="rounded-2xl border border-line px-4 py-3 outline-none focus:border-brand"
          />
        </label>
        <button
          disabled={loading}
          className="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      {message ? (
        <p role="status" className="mt-4 text-sm font-bold text-muted">
          {message}
        </p>
      ) : null}
      <Link href="/auth/login" className="mt-6 block text-xs font-bold text-brand">
        Back to sign in
      </Link>
    </div>
  );
}
