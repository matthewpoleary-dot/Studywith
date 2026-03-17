"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type MessageRole = "student" | "tutor" | "system";

export type TutorMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

export default function TutorChat() {
  const [assignment, setAssignment] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/auth/login?redirectTo=/app");
    });
  }, [router]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when session starts
  useEffect(() => {
    if (isSessionStarted) textareaRef.current?.focus();
  }, [isSessionStarted]);

  const handleStart = () => {
    if (!assignment.trim()) return;
    setIsSessionStarted(true);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "tutor",
        content:
          "Got it. I'll help you work through this, but you'll do the thinking. In one sentence, what do you think this assignment is really asking you to do?",
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !isSessionStarted || isLoading) return;

    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "student",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment,
          messages: [...messages, userMessage],
          sessionId,
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = (await response.json()) as {
        content: string;
        sessionId: string | null;
      };

      if (!sessionId && data.sessionId) setSessionId(data.sessionId);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "tutor",
          content: data.content,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "tutor",
          content: "Something went wrong. Try sending that again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (isEnding || !sessionId) return;
    setIsEnding(true);
    try {
      const res = await fetch("/api/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, assignment, messages }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { receiptId: string };
      window.location.href = `/receipt/${data.receiptId}`;
    } catch {
      setIsEnding(false);
      alert("Could not end session. Please try again.");
    }
  };

  // ── Before session starts: centered prompt ─────────────────────────────────
  if (!isSessionStarted) {
    return (
      <div className="h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            New tutoring session
          </h1>
          <p className="text-sm text-[#57534E] mb-6 leading-relaxed">
            Paste your assignment below. Your tutor will guide you to the
            answer step by step — without giving it away.
          </p>

          <textarea
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleStart();
            }}
            placeholder="Paste your assignment, problem, or question here..."
            rows={6}
            className="w-full resize-none rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition mb-4 shadow-sm"
          />

          <button
            onClick={handleStart}
            disabled={!assignment.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-7 py-3 text-sm font-medium text-white hover:bg-[#1A1A1A]/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start session
          </button>
          <p className="text-xs text-[#A8A29E] mt-3">
            Cmd+Enter to start
          </p>
        </div>
      </div>
    );
  }

  // ── Session active ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      {/* Assignment strip */}
      <div className="sticky top-0 z-10 bg-[#FDFCF8]/95 backdrop-blur-sm border-b border-[#E7E5E4] px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <p className="text-xs text-[#57534E] truncate flex-1 min-w-0">
            <span className="font-semibold text-[#1A1A1A]">Assignment:</span>{" "}
            {assignment}
          </p>
          <button
            onClick={() => void handleEndSession()}
            disabled={messages.length === 0 || isEnding || !sessionId}
            className="shrink-0 rounded-full border border-[#E7E5E4] px-4 py-1.5 text-xs font-medium text-[#57534E] hover:border-red-300 hover:text-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isEnding ? "Ending..." : "End session"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-8 px-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.role === "student" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "tutor" && (
                <div className="w-6 h-6 rounded-full bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center shrink-0 mt-0.5 mr-2.5">
                  <span className="text-[9px] font-bold text-[#D97706]">T</span>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "student"
                    ? "bg-[#1A1A1A] text-white rounded-br-sm"
                    : "bg-white border border-[#E7E5E4] text-[#1A1A1A] rounded-bl-sm shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center shrink-0 mt-0.5 mr-2.5">
                <span className="text-[9px] font-bold text-[#D97706]">T</span>
              </div>
              <div className="bg-white border border-[#E7E5E4] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-[#FDFCF8]/95 backdrop-blur-sm border-t border-[#E7E5E4] px-6 py-4">
        <form
          className="max-w-2xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <div className="flex items-end gap-3 bg-white border border-[#E7E5E4] rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#D97706] focus-within:ring-1 focus-within:ring-[#D97706]/30 transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Write your response..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] max-h-32"
              style={{ lineHeight: "1.5rem" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 shrink-0 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white hover:bg-[#1A1A1A]/80 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
          <p className="text-center text-[11px] text-[#A8A29E] mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
