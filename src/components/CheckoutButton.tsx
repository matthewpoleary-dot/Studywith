"use client";

import { useState } from "react";

type Product = "toolkit" | "pro_monthly" | "pro_annual";

export function CheckoutButton({ product, label, campaignCode, className = "" }: { product: Product; label: string; campaignCode?: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true); setError("");
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, campaignCode }),
    });
    const body = await response.json() as { url?: string; error?: string };
    if (response.status === 401) {
      const query = new URLSearchParams({ product });
      if (campaignCode) query.set("talk", campaignCode);
      window.location.href = `/auth/signup?${query.toString()}`;
      return;
    }
    if (body.url) { window.location.href = body.url; return; }
    setError(body.error ?? "Checkout is unavailable. Please try again."); setLoading(false);
  }

  return <div><button type="button" onClick={() => void checkout()} disabled={loading} className={`focus-ring disabled:cursor-wait disabled:opacity-60 ${className}`}>{loading ? "Opening checkout…" : label}</button>{error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}</div>;
}
