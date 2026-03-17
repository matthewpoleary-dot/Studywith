"use client";

import { useEffect, useState } from "react";

export default function PaymentSuccessPage() {
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Give up after 15 attempts (~30 seconds)
    if (attempts >= 15) {
      setTimedOut(true);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-subscription");
        const data = (await res.json()) as { subscribed: boolean };
        if (data.subscribed) {
          // Full reload so the proxy reads the freshly-healed DB row
          window.location.href = "/app";
          return;
        }
      } catch {
        // network hiccup — keep retrying
      }
      setAttempts((a) => a + 1);
    }, 2000);

    return () => clearTimeout(timer);
  }, [attempts, router]);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-4">
            Payment received
          </h1>
          <p className="text-[#57534E] mb-8 leading-relaxed">
            Your payment went through but activation is taking a little longer
            than expected. Try signing in — your account should be active.
          </p>
          <a
            href="/auth/login"
            className="inline-block bg-[#1A1A1A] text-white rounded-full px-8 py-3 font-medium hover:bg-[#1A1A1A]/90 transition-all"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 border-4 border-[#D97706] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-3">
          Verifying your access...
        </h1>
        <p className="text-[#57534E]">
          Just a moment while we confirm your subscription.
        </p>
      </div>
    </div>
  );
}
