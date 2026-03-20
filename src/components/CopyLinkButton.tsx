"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { posthog } from "@/lib/posthog";

export default function CopyLinkButton({ source = 'app' }: { source?: 'app' | 'public_page' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      posthog.capture('receipt_shared', { source });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("input");
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={() => void handleCopy()}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D97706] hover:text-[#D97706]"
      }`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" strokeWidth={2.5} />
          Copied!
        </>
      ) : (
        <>
          <Link2 className="w-3 h-3" strokeWidth={2} />
          Copy link
        </>
      )}
    </button>
  );
}
