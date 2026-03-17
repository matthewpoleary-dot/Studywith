"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Props = {
  label?: string;
  className?: string;
};

export default function CheckoutButton({
  label = "Start tutoring session",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    // getUser() validates against the server — avoids stale cached sessions
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth/signup";
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
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
    "inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      className={loading ? `${className ?? defaultClass} opacity-60 cursor-not-allowed` : (className ?? defaultClass)}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
