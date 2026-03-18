"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Props = {
  label?: string;
  className?: string;
  plan?: "monthly" | "annual";
};

export default function CheckoutButton({
  label = "Get started",
  className,
  plan = "monthly",
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Persist the intended plan so we can resume after signup
      if (typeof window !== "undefined") {
        localStorage.setItem("studywith_plan", plan);
      }
      window.location.href = "/auth/signup";
      return;
    }

    // Pick up referral code if visitor arrived via /?ref=...
    const referredBy =
      typeof window !== "undefined"
        ? (localStorage.getItem("studywith_referral") ?? undefined)
        : undefined;

    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, referred_by: referredBy }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const defaultClass =
    "inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      className={
        loading
          ? `${className ?? defaultClass} opacity-60 cursor-not-allowed`
          : (className ?? defaultClass)
      }
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
