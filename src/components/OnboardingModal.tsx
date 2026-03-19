"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import Link from "next/link";

export default function OnboardingModal() {
  const [visible, setVisible] = useState(true);

  const dismiss = async () => {
    setVisible(false);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.updateUser({ data: { has_onboarded: true } });
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => void dismiss()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-7 animate-in fade-in zoom-in-95 duration-200">
        {/* Skip */}
        <button
          onClick={() => void dismiss()}
          className="absolute top-4 right-4 text-xs text-[#A8A29E] hover:text-[#57534E] transition"
        >
          Skip
        </button>

        <h2 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-1">
          Welcome to StudyWith
        </h2>
        <p className="text-sm text-[#57534E] mb-7">Here&apos;s how it works.</p>

        {/* Steps */}
        <div className="space-y-5 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0 text-lg">
              📝
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A] mb-0.5">
                Paste any question or topic
              </p>
              <p className="text-xs text-[#57534E] leading-relaxed">
                An assignment, exam question, or concept you&apos;re stuck on. Anything works.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0 text-lg">
              🤔
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A] mb-0.5">
                Sage asks you questions
              </p>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Instead of just giving answers, Sage helps you think it through, so it actually sticks.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0 text-lg">
              📊
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A] mb-0.5">
                Track your progress
              </p>
              <p className="text-xs text-[#57534E] leading-relaxed">
                See what you&apos;ve covered and what to revisit after every session.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/app/new"
          onClick={() => void dismiss()}
          className="flex items-center justify-center gap-2 w-full bg-[#1A1A1A] text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.01]"
        >
          Start my first session →
        </Link>
      </div>
    </div>
  );
}
