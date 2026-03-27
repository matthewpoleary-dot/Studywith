"use client";

import { useState } from "react";
import { Check, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

export interface FlashcardRow {
  id: string;
  question: string;
  answer: string;
  topic: string;
  confidence: number; // 0=unseen, 1=needs_review, 2=mastered
}

interface Props {
  cards: FlashcardRow[];
  onConfidenceChange: (id: string, confidence: number) => void;
}

type Filter = "all" | "review" | "mastered";

export default function FlashcardDeck({ cards, onConfidenceChange }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = cards.filter((c) => {
    if (filter === "mastered") return c.confidence === 2;
    if (filter === "review") return c.confidence !== 2;
    return true;
  });

  const card = filtered[index];
  const mastered = cards.filter((c) => c.confidence === 2).length;
  const needsReview = cards.filter((c) => c.confidence === 1).length;

  const navigate = (delta: number) => {
    setFlipped(false);
    // slight delay so the flip-back animation finishes before content changes
    setTimeout(() => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), filtered.length - 1));
    }, 120);
  };

  const handleConfidence = (confidence: number) => {
    if (!card) return;
    onConfidenceChange(card.id, confidence);
    if (index < filtered.length - 1) {
      navigate(1);
    } else {
      setFlipped(false);
    }
  };

  const switchFilter = (f: Filter) => {
    setFilter(f);
    setIndex(0);
    setFlipped(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stats row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1.5 p-1 bg-[#F1F5F9] rounded-xl">
          {(["all", "review", "mastered"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => switchFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-white text-[#1A2B3C] shadow-sm"
                  : "text-[#64748B] hover:text-[#334155]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#64748B]">
          <span>
            <span className="font-semibold text-emerald-600">{mastered}</span> mastered
          </span>
          <span>
            <span className="font-semibold text-[#B91C1C]">{needsReview}</span> to review
          </span>
          <span className="text-[#CBD5E1]">·</span>
          <span>{cards.length} total</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[#64748B] text-sm mb-3">No cards in this view.</p>
          <button
            onClick={() => switchFilter("all")}
            className="text-xs text-[#2563EB] underline"
          >
            Show all cards
          </button>
        </div>
      ) : (
        <>
          {/* Flip card */}
          <div
            className="relative w-full cursor-pointer select-none"
            style={{ perspective: "1400px", height: "300px" }}
            onClick={() => setFlipped((f) => !f)}
          >
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front — Question */}
              <div
                className="absolute inset-0 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col p-7"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="flex items-start justify-between gap-3 mb-auto">
                  <span className="inline-flex items-center rounded-lg bg-[#1A2B3C]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1A2B3C]">
                    {card.topic}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] shrink-0">
                    {index + 1} / {filtered.length}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-center py-4">
                  <p className="font-serif text-xl text-[#1A2B3C] text-center leading-snug">
                    {card.question}
                  </p>
                </div>
                <p className="text-xs text-[#94A3B8] text-center mt-auto">
                  Click card to reveal answer
                </p>
              </div>

              {/* Back — Answer */}
              <div
                className="absolute inset-0 rounded-2xl border border-[#1A2B3C]/15 bg-[#1A2B3C] shadow-sm flex flex-col p-7"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="flex items-center justify-between mb-auto">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Answer
                  </span>
                  <span className="text-[10px] text-white/40 shrink-0">
                    {index + 1} / {filtered.length}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-center py-4">
                  <p className="text-white text-base text-center leading-relaxed">
                    {card.answer}
                  </p>
                </div>
                {/* Action buttons */}
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfidence(1);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-2.5 text-xs font-medium text-white hover:bg-[#B91C1C] hover:border-[#B91C1C] transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                    Need Review
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfidence(2);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FEF08A] py-2.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#FDE047] transition"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Mastered
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <button
              onClick={() => navigate(-1)}
              disabled={index === 0}
              className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:border-[#1A2B3C]/30 hover:text-[#1A2B3C] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Dot trail (up to 12 shown) */}
            <div className="flex items-center gap-1">
              {filtered.slice(0, 12).map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setIndex(i);
                    setFlipped(false);
                  }}
                  className={`rounded-full transition-all ${
                    i === index
                      ? "w-4 h-1.5 bg-[#1A2B3C]"
                      : "w-1.5 h-1.5 bg-[#E2E8F0] hover:bg-[#CBD5E1]"
                  }`}
                />
              ))}
              {filtered.length > 12 && (
                <span className="text-[10px] text-[#94A3B8] ml-0.5">
                  +{filtered.length - 12}
                </span>
              )}
            </div>

            <button
              onClick={() => navigate(1)}
              disabled={index === filtered.length - 1}
              className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:border-[#1A2B3C]/30 hover:text-[#1A2B3C] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
