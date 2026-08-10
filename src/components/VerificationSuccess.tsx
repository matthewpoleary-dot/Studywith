"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function VerificationSuccess({ loginHref }: { loginHref: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    const redirect = window.setTimeout(() => router.replace(loginHref), 5000);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(redirect);
    };
  }, [loginHref, router]);

  return (
    <section className="card w-full max-w-md justify-self-end p-7 text-center md:p-9" aria-labelledby="verification-title">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dcfce7] text-[#15803d]">
        <CheckCircle2 aria-hidden="true" size={32} strokeWidth={2.25} />
      </span>
      <p className="eyebrow mt-6 text-brand">Email confirmed</p>
      <h1 id="verification-title" className="display mt-4 text-4xl tracking-[-.04em]">Your account is verified.</h1>
      <p className="mt-4 text-sm leading-6 text-muted">You can now sign in with the email and password you chose.</p>
      <Link href={loginHref} className="focus-ring mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3.5 text-sm font-extrabold text-white hover:bg-[var(--blue-dark)]">
        Continue to sign in <ArrowRight aria-hidden="true" size={17} />
      </Link>
      <p className="mt-4 text-xs text-muted" aria-live="polite">Returning to sign in in {seconds} second{seconds === 1 ? "" : "s"}…</p>
    </section>
  );
}
