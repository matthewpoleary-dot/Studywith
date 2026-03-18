"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CheckoutButton from "./CheckoutButton";

export default function SubscribeBanner() {
  const searchParams = useSearchParams();

  if (searchParams.get("checkout") !== "required") return null;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-zinc-300">
          <strong className="text-white">Account created.</strong> Choose a plan
          to unlock your tutor.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/#pricing"
            className="text-sm text-zinc-400 hover:text-white transition underline underline-offset-2"
          >
            See all plans
          </Link>
          <CheckoutButton
            plan="trial"
            label="Start free trial"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
