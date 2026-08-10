"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const supabase = createBrowserSupabase();
    const product = params.get("product");
    const talk = params.get("talk");
    const fallback = product ? `/welcome?product=${encodeURIComponent(product)}${talk ? `&talk=${encodeURIComponent(talk)}` : ""}` : "/app";
    const redirectTo = params.get("redirectTo");
    const next = redirectTo?.startsWith("/") ? redirectTo : fallback;

    if (mode === "signup") {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", next);
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback.toString(), data: { full_name: fullName, account_type: "student" } },
      });
      if (authError) { setError(authError.message); setLoading(false); return; }
      if (!data.session) { setConfirmation(true); setLoading(false); return; }
      window.location.href = next;
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    window.location.href = next;
  }

  if (confirmation) return <div className="card w-full max-w-md justify-self-end p-8"><p className="eyebrow text-brand">One last step</p><h2 className="display mt-4 text-4xl tracking-[-.04em]">Check your inbox.</h2><p className="mt-4 text-sm leading-6 text-muted">We sent a secure confirmation link to <strong className="text-ink">{email}</strong>. Open it to finish creating your StudyWith account.</p></div>;

  return <div className="card w-full max-w-md justify-self-end p-7 md:p-9"><p className="eyebrow text-brand">{mode === "signup" ? "Create your account" : "Welcome back"}</p><h2 className="display mt-4 text-4xl tracking-[-.04em]">{mode === "signup" ? "Start studying free." : "Continue your work."}</h2><p className="mt-3 text-sm leading-6 text-muted">{mode === "signup" ? "No card required. Your first three AI study actions are included." : "Sign in to your tutor, notes and revision plan."}</p><form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4">{mode === "signup" ? <label className="grid gap-2 text-sm font-bold">First name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="given-name" className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-brand" /></label> : null}<label className="grid gap-2 text-sm font-bold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-brand" /></label><label className="grid gap-2 text-sm font-bold">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-brand" /></label>{mode === "signup" ? <label className="flex items-start gap-3 text-xs leading-5 text-muted"><input required checked={agreed} onChange={(event) => setAgreed(event.target.checked)} type="checkbox" className="mt-1 accent-[var(--blue)]" /><span>I agree to the <Link className="font-bold text-ink underline" href="/terms">terms</Link> and have read the <Link className="font-bold text-ink underline" href="/privacy">privacy notice</Link>. If I need help deciding whether I may use or buy the service, I will speak with a parent or guardian.</span></label> : null}{error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}<button disabled={loading || (mode === "signup" && !agreed)} className="focus-ring mt-1 rounded-full bg-brand px-5 py-3.5 text-sm font-extrabold text-white hover:bg-[var(--blue-dark)] disabled:opacity-50">{loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button></form><p className="mt-6 text-center text-xs text-muted">{mode === "signup" ? <>Already registered? <Link className="font-bold text-brand" href="/auth/login">Sign in</Link></> : <>New to StudyWith? <Link className="font-bold text-brand" href="/auth/signup">Create an account</Link></>}</p></div>;
}
