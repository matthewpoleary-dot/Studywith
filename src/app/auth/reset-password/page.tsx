"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("expired");
        setLoading(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      window.location.href = "/app";
    } catch {
      setError("Your password could not be saved. Check your connection and try again.");
      setLoading(false);
    }
  }
  return (
    <div className="card w-full max-w-md justify-self-end p-8">
      <p className="eyebrow text-brand">Choose a new password</p>
      <h1 className="display mt-4 text-4xl">Make it memorable, not reused.</h1>
      <form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4">
        <label className="grid gap-2 text-sm font-bold">
          New password
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-line px-4 py-3 outline-none focus:border-brand"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Confirm new password
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-2xl border border-line px-4 py-3 outline-none focus:border-brand"
          />
        </label>
        {error === "expired" ? (
          <p role="alert" className="text-sm font-bold text-red-700">
            Your reset link has expired.{" "}
            <Link href="/auth/forgot-password" className="text-brand underline">
              Request a new one
            </Link>
            .
          </p>
        ) : error ? (
          <p role="alert" className="text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
        <button
          disabled={loading}
          className="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white"
        >
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
