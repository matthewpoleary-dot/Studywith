"use client";

import { useState } from "react";
import { BookOpen, FileText, ExternalLink, Plus } from "lucide-react";
import type { TutorMessage } from "./TutorChat";
import type { LearningReceipt } from "@/lib/database.types";
import CopyLinkButton from "./CopyLinkButton";

type Props = {
  sessionId: string;
  assignment: string;
  messages: TutorMessage[];
  receipt: LearningReceipt | null;
  title: string | null;
  createdAt: string;
};

function scoreBand(score: number): { label: string; pillClass: string } {
  if (score >= 90) return { label: "Excellent", pillClass: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (score >= 80) return { label: "Strong understanding", pillClass: "bg-emerald-50 text-emerald-600 border border-emerald-100" };
  if (score >= 60) return { label: "Developing", pillClass: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (score >= 40) return { label: "Needs work", pillClass: "bg-orange-50 text-orange-600 border border-orange-200" };
  return { label: "Struggling", pillClass: "bg-red-50 text-red-600 border border-red-200" };
}

export default function CompletedSessionView({ sessionId, assignment, messages, receipt, title, createdAt }: Props) {
  const [tab, setTab] = useState<"chat" | "receipt">("receipt");

  const date = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const scoreColor = receipt
    ? receipt.score >= 75 ? "text-emerald-600" : receipt.score >= 50 ? "text-[#D97706]" : "text-red-500"
    : "";

  const scoreBg = receipt
    ? receipt.score >= 75 ? "bg-emerald-50 border-emerald-100" : receipt.score >= 50 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"
    : "bg-[#F5F4F0] border-[#E7E5E4]";

  const band = receipt ? scoreBand(receipt.score) : null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header with tabs */}
      <div className="sticky top-0 z-10 bg-[#FDFCF8]/95 backdrop-blur-sm border-b border-[#E7E5E4] px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[#F5F4F0] rounded-lg p-1">
            <button
              onClick={() => setTab("receipt")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "receipt"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#57534E] hover:text-[#1A1A1A]"
              }`}
            >
              <FileText className="w-3 h-3" strokeWidth={1.5} />
              Receipt
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "chat"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#57534E] hover:text-[#1A1A1A]"
              }`}
            >
              <BookOpen className="w-3 h-3" strokeWidth={1.5} />
              Chat
            </button>
          </div>

          <a
            href={`/receipt/${sessionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#57534E] hover:text-[#D97706] transition-colors"
          >
            <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
            Shareable receipt
          </a>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "chat" ? (
          /* ── Read-only chat ────────────────────────────────────────────── */
          <div className="py-8 px-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Assignment context */}
              <div className="rounded-xl border border-[#E7E5E4] bg-[#F5F4F0] px-4 py-3 mb-6">
                <p className="text-xs font-medium text-[#A8A29E] mb-1 uppercase tracking-widest">Assignment</p>
                <p className="text-sm text-[#57534E] leading-relaxed">{assignment}</p>
              </div>

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "tutor" && (
                    <div className="w-6 h-6 rounded-full bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center shrink-0 mt-0.5 mr-2.5">
                      <span className="text-[9px] font-bold text-[#D97706]">T</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "student"
                        ? "bg-[#1A1A1A] text-white rounded-br-sm"
                        : "bg-white border border-[#E7E5E4] text-[#1A1A1A] rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Receipt ───────────────────────────────────────────────────── */
          <div className="py-8 px-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              {/* Header */}
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-2">
                  Learning Receipt
                </p>
                <h1 className="font-serif text-2xl md:text-3xl font-medium text-[#1A1A1A] mb-1">
                  {title ?? "Session"}
                </h1>
                <p className="text-sm font-medium text-[#D97706] mb-2">{date}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-[#57534E]">Shareable. Never shows exact answers.</p>
                  <CopyLinkButton />
                </div>
              </div>

              {receipt ? (
                <>
                  {/* Score + concepts + gaps */}
                  <section className="grid gap-4 md:grid-cols-3">
                    <div className={`rounded-2xl border p-5 ${scoreBg}`}>
                      <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-2">Score</p>
                      <div className={`font-serif text-4xl font-medium ${scoreColor}`}>
                        {receipt.score}<span className="text-lg text-[#A8A29E]">/100</span>
                      </div>
                      {band && (
                        <span className={`inline-block mt-2 rounded-md px-2 py-0.5 text-xs font-medium ${band.pillClass}`}>
                          {band.label}
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                      <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-2">Concepts covered</p>
                      {receipt.conceptsCovered.length > 0 ? (
                        <ul className="space-y-1.5">
                          {receipt.conceptsCovered.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A1A]">
                              <span className="text-[#D97706] mt-0.5">✓</span>{c}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-[#A8A29E]">None recorded.</p>}
                    </div>

                    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                      <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-2">Gaps to review</p>
                      {receipt.gaps.length > 0 ? (
                        <ul className="space-y-3">
                          {receipt.gaps.map((gap, i) => (
                            <li key={i} className="flex flex-col gap-1">
                              <span className="flex items-start gap-2 text-sm text-[#57534E]">
                                <span className="text-[#A8A29E] mt-0.5 shrink-0">→</span>{gap}
                              </span>
                              <a
                                href={`/app/new?topic=${encodeURIComponent(gap)}`}
                                className="ml-5 text-[11px] font-medium text-[#D97706] hover:underline"
                              >
                                Review this →
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-[#A8A29E]">None identified.</p>}
                    </div>
                  </section>

                  {receipt.summary && (
                    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-widest text-[#A8A29E] mb-2">Summary</p>
                      <p className="text-sm leading-relaxed text-[#1A1A1A]">{receipt.summary}</p>
                    </section>
                  )}

                  {/* Bottom CTA */}
                  <section className="rounded-2xl border border-[#E7E5E4] bg-[#F5F4F0] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#1A1A1A] text-sm">Ready to keep learning?</p>
                      <p className="text-xs text-[#57534E] mt-0.5">
                        {receipt.gaps.length > 0
                          ? "You have gaps to review — or start something new."
                          : "Great session. Start a new one to keep the momentum going."}
                      </p>
                    </div>
                    <a
                      href="/app/new"
                      className="inline-flex items-center gap-2 shrink-0 rounded-lg bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.02]"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2} />
                      New session
                    </a>
                  </section>
                </>
              ) : (
                <div className="rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center">
                  <p className="text-sm text-[#57534E]">Receipt not available for this session.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
