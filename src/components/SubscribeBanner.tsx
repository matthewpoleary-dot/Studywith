"use client";

import { useSearchParams } from "next/navigation";
import CheckoutButton from "./CheckoutButton";

export default function SubscribeBanner() {
  const searchParams = useSearchParams();

  if (searchParams.get("checkout") !== "required") return null;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="text-sm text-zinc-300">
          <strong className="text-white">Account created.</strong> Subscribe to
          unlock your tutor.
        </p>
        <CheckoutButton
          label="Subscribe — €20/month"
          className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </div>
  );
}
