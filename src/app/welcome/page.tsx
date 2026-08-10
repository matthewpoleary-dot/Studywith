"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

function WelcomeContent() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Preparing your account…");
  useEffect(() => {
    const product = params.get("product");
    if (!product) { window.location.replace("/app"); return; }
    fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product, campaignCode: params.get("talk") }) })
      .then(async (response) => ({ response, body: await response.json() as { url?: string; error?: string } }))
      .then(({ response, body }) => { if (response.ok && body.url) window.location.replace(body.url); else setMessage(body.error ?? "Checkout could not be opened."); })
      .catch(() => setMessage("Checkout could not be opened."));
  }, [params]);
  return <main className="grid min-h-screen place-items-center bg-paper p-6"><div className="card max-w-md p-9 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl font-black text-white">S</span><h1 className="display mt-5 text-4xl">Welcome to StudyWith.</h1><p className="mt-4 text-sm text-muted">{message}</p><Link href="/app" className="mt-7 inline-block text-sm font-bold text-brand">Continue to the free workspace</Link></div></main>;
}
export default function WelcomePage() { return <Suspense><WelcomeContent /></Suspense>; }
