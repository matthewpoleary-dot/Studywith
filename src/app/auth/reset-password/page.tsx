"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error: updateError } = await createBrowserSupabase().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    window.location.href = "/app";
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
        {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={loading} className="rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white">
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
