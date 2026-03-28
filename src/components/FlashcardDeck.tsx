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
    <div>
      {/* Stats + filter row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-0.5">
          {(["all", "review", "mastered"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => switchFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-[#1A1A1A] text-white"
                  : "text-[#57534E] hover:text-[#1A1A1A] hover:bg-[#F5F4F0]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#A8A29E]">
          <span><span className="font-semibold text-emerald-600">{mastered}</span> mastered</span>
          <span><span className="font-semibold text-red-500">{needsReview}</span> to review</span>
          <span className="text-[#D6D3D1]">·</span>
          <span>{cards.length} total</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[#57534E] text-sm mb-3">No cards in this view.</p>
          <button onClick={() => switchFilter("all")} className="text-xs text-[#D97706] underline">
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
              style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 rounded-2xl bg-[#FFFBEB] shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex flex-col p-7"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="flex items-start justify-between gap-3 mb-auto">
                  <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#92400E]">
                    {card.topic}
                  </span>
                  <span className="text-[10px] text-[#A8A29E] shrink-0">{index + 1} / {filtered.length}</span>
                </div>
                <div className="flex flex-1 items-center justify-center py-4">
                  <p className="font-serif text-xl text-[#1A1A1A] text-center leading-snug">{card.question}</p>
                </div>
                <p className="text-xs text-[#A8A29E] text-center mt-auto">Click to reveal answer</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 rounded-2xl bg-[#1A1A1A] shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex flex-col p-7"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <div className="flex items-center justify-between mb-auto">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Answer</span>
                  <span className="text-[10px] text-white/30 shrink-0">{index + 1} / {filtered.length}</span>
                </div>
                <div className="flex flex-1 items-center justify-center py-4">
                  <p className="text-white text-base text-center leading-relaxed">{card.answer}</p>
                </div>
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleConfidence(1); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/8 py-2.5 text-xs font-medium text-white/70 hover:bg-red-600 hover:text-white hover:border-red-600 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                    Review again
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleConfidence(2); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FEF08A] py-2.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#FDE047] transition"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Got it
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
              className="p-2 rounded-lg border border-[#E7E5E4] text-[#57534E] hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>

            <div className="flex items-center gap-1">
              {filtered.slice(0, 12).map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => { setIndex(i); setFlipped(false); }}
                  className={`rounded-full transition-all ${
                    i === index ? "w-4 h-1.5 bg-[#1A1A1A]" : "w-1.5 h-1.5 bg-[#E7E5E4] hover:bg-[#D6D3D1]"
                  }`}
                />
              ))}
              {filtered.length > 12 && (
                <span className="text-[10px] text-[#A8A29E] ml-0.5">+{filtered.length - 12}</span>
              )}
            </div>

            <button
              onClick={() => navigate(1)}
              disabled={index === filtered.length - 1}
              className="p-2 rounded-lg border border-[#E7E5E4] text-[#57534E] hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
