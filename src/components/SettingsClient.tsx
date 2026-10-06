"use client";

import { useState } from "react";
import { CheckoutButton } from "./CheckoutButton";

export function SettingsClient({
  planLabel,
  creditsRemaining,
  hasPro,
  paymentSucceeded = false,
}: {
  planLabel: string;
  creditsRemaining: number;
  hasPro: boolean;
  paymentSucceeded?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  async function portal() {
    setMessage("");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (body.url) window.location.href = body.url;
      else setMessage(body.error ?? "Billing management is unavailable.");
    } catch {
      setMessage("Billing management is unavailable. Please try again.");
    }
  }
  async function removeAccount() {
    if (!confirm("Permanently delete your account, study sessions and materials? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (response.ok) {
        window.location.href = "/";
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Account deletion failed.");
    } catch {
      setMessage("Account deletion failed. Check your connection and try again.");
    }
    setDeleting(false);
  }
  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <section className="card p-7">
        {paymentSucceeded ? (
          <p role="status" className="mb-5 rounded-xl bg-[#dcfce7] px-4 py-3 text-sm font-bold text-[#166534]">
            Payment received. Your access can take a few seconds to update; refresh if it has not changed yet.
          </p>
        ) : null}
        <p className="eyebrow text-brand">Current access</p>
        <h2 className="display mt-4 text-4xl">{planLabel}</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          {hasPro
            ? "Your Pro subscription includes full product access under the fair-use safeguard."
            : creditsRemaining > 0
              ? `${creditsRemaining} fixed AI actions remain in your toolkit entitlement.`
              : "Your free account includes three AI study actions each month."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {hasPro ? (
            <button
              onClick={() => void portal()}
              className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-extrabold text-white"
            >
              Manage subscription
            </button>
          ) : (
            <CheckoutButton
              product="pro_monthly"
              label="Upgrade to Pro"
              className="rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white"
            />
          )}
          {hasPro ? null : (
            <CheckoutButton
              product="pro_annual"
              label="Choose annual (€59)"
              className="rounded-full border border-line px-5 py-3 text-sm font-extrabold"
            />
          )}
        </div>
      </section>
      <section className="card p-7">
        <p className="eyebrow text-muted">Data & account</p>
        <h2 className="mt-4 text-xl font-extrabold">Your study data belongs to you.</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Deleting your account removes your profile, study sessions, materials, generated practice and plans. Stripe
          transaction records may be retained separately where legally required.
        </p>
        <button
          onClick={() => void removeAccount()}
          disabled={deleting}
          className="focus-ring mt-6 rounded-full border border-red-200 px-5 py-3 text-sm font-extrabold text-red-700 hover:bg-red-50"
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
        {message ? <p className="mt-4 text-xs font-bold text-red-700">{message}</p> : null}
      </section>
    </div>
  );
}
