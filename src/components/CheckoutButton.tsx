"use client";

import { useState } from "react";

type Product = "toolkit" | "pro_monthly" | "pro_annual";

export function CheckoutButton({
  product,
  label,
  campaignCode,
  className = "",
}: {
  product: Product;
  label: string;
  campaignCode?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, campaignCode }),
      });
      if (response.status === 401) {
        const query = new URLSearchParams({ product });
        if (campaignCode) query.set("talk", campaignCode);
        window.location.href = `/auth/signup?${query.toString()}`;
        return;
      }
      const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (body?.url) {
        window.location.href = body.url;
        return;
      }
      setError(body?.error ?? "Checkout is unavailable. Please try again.");
    } catch {
      setError("Checkout is unavailable. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void checkout()}
        disabled={loading}
        className={`focus-ring disabled:cursor-wait disabled:opacity-60 ${className}`}
      >
        {loading ? "Opening checkout…" : label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
