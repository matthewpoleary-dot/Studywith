"use client";

import { useState } from "react";

export default function ReferralLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 rounded-lg bg-white border border-[#E7E5E4] px-3 py-2 text-xs text-[#57534E] truncate">
        {url}
      </code>
      <button
        onClick={() => void handleCopy()}
        className="shrink-0 rounded-lg bg-[#1A1A1A] text-white text-xs font-medium px-3 py-2 hover:bg-[#1A1A1A]/80 transition"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
