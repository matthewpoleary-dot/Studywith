"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import Link from "next/link";
import { Send, ChevronDown, Download, ClipboardCopy, Check } from "lucide-react";

type ActiveRecallItem = { question: string; answer: string };

type StudyContent = {
  title: string;
  subject: string;
  mentalModel: string;
  fastFacts: string[];
  activeRecall: ActiveRecallItem[];
  commonMistakes: string[];
};

type Props = { topic: string; userId: string };

export default function StudyPageClient({ topic, userId }: Props) {
  const [content, setContent] = useState<StudyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState<string | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [ankiCopied, setAnkiCopied] = useState(false);
  const [notionCopied, setNotionCopied] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/study-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });
        if (!res.ok) throw new Error("Failed to generate study content");
        const data = (await res.json()) as { content?: StudyContent; error?: string };
        if (data.error) throw new Error(data.error);
        setContent(data.content ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    const loadNotes = async () => {
      try {
        const { data } = await (supabase.from("study_notes") as ReturnType<typeof supabase.from>)
          .select("notes")
          .eq("user_id", userId)
          .eq("topic", topic)
          .maybeSingle();
        if (data && "notes" in data && typeof data.notes === "string") {
          setNotes(data.notes);
        }
      } catch {
        // study_notes table may not exist yet
      }
    };

    void load();
    void loadNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const saveNotes = useCallback(async (value: string) => {
    const supabase = createSupabaseBrowserClient();
    try {
      await (supabase.from("study_notes") as ReturnType<typeof supabase.from>)
        .upsert({ user_id: userId, topic, notes: value }, { onConflict: "user_id,topic" });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      // Silently ignore if table doesn't exist yet
    }
  }, [userId, topic]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void saveNotes(value), 1200);
  };

  const handleFollowUp = async () => {
    if (!followUp.trim() || followUpLoading) return;
    setFollowUpLoading(true);
    try {
      const res = await fetch("/api/study-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, question: followUp.trim() }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      setFollowUpAnswer(data.answer ?? "Sorry, I couldn't answer that. Try rephrasing.");
    } catch {
      setFollowUpAnswer("Something went wrong. Please try again.");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const toggleReveal = (i: number) => {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  // Task 17: Anki CSV download
  const downloadAnki = () => {
    if (!content?.activeRecall) return;
    const rows = content.activeRecall.map((c) => `"${c.question.replace(/"/g, '""')}","${c.answer.replace(/"/g, '""')}"`);
    const csv = ["#separator:comma", "#html:false", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.slice(0, 40)}-anki.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setAnkiCopied(true);
    setTimeout(() => setAnkiCopied(false), 2000);
  };

  // Task 17: Notion Markdown copy
  const copyNotion = () => {
    if (!content) return;
    const lines: string[] = [
      `# ${content.title}`,
      `**Subject:** ${content.subject}`,
      ``,
      `## Understanding it`,
      content.mentalModel,
      ``,
      `## Fast facts`,
      ...content.fastFacts.map((f) => `- ${f}`),
      ``,
      `## Active recall`,
      ...content.activeRecall.map((c) => `**Q:** ${c.question}\n**A:** ${c.answer}`),
      ``,
      `## Common mistakes`,
      ...content.commonMistakes.map((m) => `- ${m}`),
      ``,
      `## My notes`,
      notes || "_No notes yet._",
    ];
    void navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setNotionCopied(true);
      setTimeout(() => setNotionCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#57534E]">Sage is preparing your study guide...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0 px-6">
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-500 mb-4">{error ?? "Could not load content."}</p>
          <Link href="/app" className="text-sm text-[#57534E] hover:text-[#1A1A1A] underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#FDFCF8]">
      {/* Subtle notebook line background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #1A1A1A 28px)",
          backgroundSize: "100% 28px",
        }}
      />
      <div className="relative w-full max-w-2xl mx-auto px-6 py-10 md:py-14">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app"
            className="text-xs text-[#A8A29E] hover:text-[#57534E] transition mb-4 inline-block"
          >
            &larr; Back to dashboard
          </Link>
          <div className="flex items-start gap-3 flex-wrap mb-2">
            <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A] leading-tight">
              {content.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {content.subject && (
              <span className="inline-block rounded-md bg-[#D97706]/10 px-2.5 py-1 text-xs font-medium text-[#D97706] uppercase tracking-wide">
                {content.subject}
              </span>
            )}
            {/* Export buttons */}
            <button
              onClick={downloadAnki}
              className="inline-flex items-center gap-1.5 border border-[#1A1A1A] text-[#1A1A1A] rounded-full px-3 py-1 text-xs font-medium hover:bg-[#1A1A1A] hover:text-white transition-all duration-200"
              title="Download as Anki flashcard deck"
            >
              {ankiCopied ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
              Anki export
            </button>
            <button
              onClick={copyNotion}
              className="inline-flex items-center gap-1.5 border border-[#1A1A1A] text-[#1A1A1A] rounded-full px-3 py-1 text-xs font-medium hover:bg-[#1A1A1A] hover:text-white transition-all duration-200"
              title="Copy as Notion-ready Markdown"
            >
              {notionCopied ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
              {notionCopied ? "Copied!" : "Copy to Notion"}
            </button>
          </div>
        </div>

        <div className="space-y-5">

          {/* 1. Mental model */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">
              Understanding it
            </p>
            {content.mentalModel.split("\n\n").map((para, i) => (
              <p key={i} className={`text-sm leading-relaxed text-[#57534E] ${i > 0 ? "mt-3" : ""}`}>
                {para}
              </p>
            ))}
          </section>

          {/* 2. Fast facts */}
          {content.fastFacts && content.fastFacts.length > 0 && (
            <section className="bg-[#D97706]/5 border border-[#D97706]/20 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D97706] mb-3">
                Fast facts
              </p>
              <ul className="space-y-2.5">
                {content.fastFacts.map((fact, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#1A1A1A]">
                    <span className="w-5 h-5 rounded-full bg-[#D97706] flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {fact}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 3. Active recall (toggle to reveal) */}
          {content.activeRecall && content.activeRecall.length > 0 && (
            <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-1">
                Active recall
              </p>
              <p className="text-xs text-[#A8A29E] mb-4">Answer each question yourself, then reveal the answer.</p>
              <div className="space-y-3">
                {content.activeRecall.map((card, i) => (
                  <div key={i} className="border border-[#E7E5E4] rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleReveal(i)}
                      className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[#F5F4F0] transition-colors"
                    >
                      <span className="text-sm font-medium text-[#1A1A1A] leading-snug">{card.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-[#A8A29E] mt-0.5 transition-transform duration-200 ${
                          revealedCards.has(i) ? "rotate-180" : ""
                        }`}
                        strokeWidth={1.5}
                      />
                    </button>
                    {revealedCards.has(i) && (
                      <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Answer</p>
                        <p className="text-sm text-[#1A1A1A] leading-relaxed">{card.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Common mistakes */}
          {content.commonMistakes && content.commonMistakes.length > 0 && (
            <section className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">
                Common mistakes
              </p>
              <ul className="space-y-3">
                {content.commonMistakes.map((mistake, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#1A1A1A]">
                    <span className="text-red-400 mt-0.5 shrink-0 text-base leading-none">&#9888;</span>
                    {mistake}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 5. Notes area */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">
                Your notes
              </p>
              {notesSaved && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write anything here. Your notes save automatically."
              rows={5}
              className="w-full resize-none rounded-xl border border-[#E7E5E4] bg-[#FDFCF8] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
              style={{
                backgroundImage: "repeating-linear-gradient(transparent, transparent 23px, #E7E5E4 24px)",
                lineHeight: "24px",
              }}
            />
          </section>

          {/* 6. Follow-up (Still confused?) */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-1">
              Still confused?
            </p>
            <p className="text-xs text-[#A8A29E] mb-4">Ask Sage one follow-up question about this topic.</p>
            {followUpAnswer && (
              <div className="mb-4 bg-[#F5F4F0] border border-[#E7E5E4] rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-[#A8A29E] mb-1.5 uppercase tracking-wider">Sage</p>
                <p className="text-sm leading-relaxed text-[#1A1A1A]">{followUpAnswer}</p>
              </div>
            )}
            <div className="flex items-end gap-2 bg-[#FDFCF8] border border-[#E7E5E4] rounded-xl px-3 py-2.5 focus-within:border-[#D97706] focus-within:ring-1 focus-within:ring-[#D97706]/30 transition">
              <textarea
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleFollowUp();
                  }
                }}
                placeholder="e.g. Can you explain the analogy in a different way?"
                rows={2}
                className="flex-1 resize-none bg-transparent text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E]"
              />
              <button
                onClick={() => void handleFollowUp()}
                disabled={!followUp.trim() || followUpLoading}
                className="h-8 w-8 shrink-0 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white hover:bg-[#1A1A1A]/80 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </section>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/app/new"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all hover:scale-[1.01]"
            >
              <span className="text-base leading-none">+</span>
              Start a session on this topic
            </Link>
            <Link
              href="/app"
              className="flex-1 inline-flex items-center justify-center bg-white border border-[#E7E5E4] text-[#57534E] rounded-xl px-6 py-3 text-sm font-medium hover:border-[#D97706]/40 hover:text-[#1A1A1A] transition-all"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
