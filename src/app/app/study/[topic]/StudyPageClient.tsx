"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import Link from "next/link";
import { Send } from "lucide-react";

type StudySection = {
  heading: string;
  body: string;
  keyPoint: string;
};

type StudyContent = {
  title: string;
  subject: string;
  introduction: string;
  sections: StudySection[];
  summary: string;
  quickQuiz: string[];
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load study content from AI
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

    // Load saved notes
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
        // study_notes table may not exist yet; silently ignore
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
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-6 py-10 md:py-14">

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
          {content.subject && (
            <span className="inline-block rounded-md bg-[#D97706]/10 px-2.5 py-1 text-xs font-medium text-[#D97706] uppercase tracking-wide">
              {content.subject}
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Introduction */}
          <section>
            <p className="text-sm leading-relaxed text-[#57534E]">{content.introduction}</p>
          </section>

          {/* Sections */}
          {content.sections.map((section, i) => (
            <section key={i} className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <h2 className="font-serif text-lg font-medium text-[#1A1A1A] mb-2">
                {section.heading}
              </h2>
              <p className="text-sm leading-relaxed text-[#57534E] mb-3">{section.body}</p>
              <div className="bg-[#D97706]/8 border-l-4 border-[#D97706] rounded-r-xl pl-4 pr-3 py-2.5">
                <p className="text-xs font-semibold text-[#D97706] uppercase tracking-wider mb-1">
                  Key point
                </p>
                <p className="text-sm text-[#1A1A1A] leading-relaxed">{section.keyPoint}</p>
              </div>
            </section>
          ))}

          {/* Summary */}
          {content.summary && (
            <section className="bg-[#F5F4F0] border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-2">
                Summary
              </p>
              <p className="text-sm leading-relaxed text-[#1A1A1A]">{content.summary}</p>
            </section>
          )}

          {/* Quick quiz */}
          {content.quickQuiz && content.quickQuiz.length > 0 && (
            <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">
                Quick quiz
              </p>
              <p className="text-xs text-[#A8A29E] mb-3">Think through each question yourself first.</p>
              <ol className="space-y-3">
                {content.quickQuiz.map((q, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#1A1A1A]">
                    <span className="w-5 h-5 rounded-full bg-[#E7E5E4] flex items-center justify-center text-[10px] font-bold text-[#57534E] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {q}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Notes area */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">
                Your notes
              </p>
              {notesSaved && (
                <span className="text-xs text-green-600">Saved</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write anything here. Your notes save automatically."
              rows={5}
              className="w-full resize-none rounded-xl border border-[#E7E5E4] bg-[#FDFCF8] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
            />
          </section>

          {/* Follow-up question input */}
          <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">
              Ask Sage a follow-up question about this topic
            </p>
            {followUpAnswer && (
              <div className="mb-4 bg-[#F5F4F0] rounded-xl px-4 py-3">
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
                placeholder="e.g. Can you explain the second section differently?"
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
