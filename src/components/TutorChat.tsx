"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [isEnding, setIsEnding] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth/login?redirectTo=/app");
      }
    });
  }, [router]);

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
    if (!input.trim() || !isSessionStarted) return;

    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "student",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

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

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "tutor",
            content: "Something went wrong. Try sending that again in a moment.",
          },
        ]);
        return;
      }

      const data = (await response.json()) as { content: string; sessionId: string | null };

      // Capture session ID on first exchange
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "tutor",
          content: data.content,
        },
      ]);
    } catch (err) {
      console.error("[handleSend] error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "tutor",
          content: "Something went wrong. Try sending that again in a moment.",
        },
      ]);
    }
  };

  const handleEndSession = async () => {
    if (isEnding) return;
    setIsEnding(true);

    try {
      const res = await fetch("/api/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId!,
          assignment,
          messages,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to end session");
      }

      const data = (await res.json()) as { receiptId: string };
      window.location.href = `/receipt/${data.receiptId}`;
    } catch {
      setIsEnding(false);
      alert("Could not end session. Please try again.");
    }
  };

  return (
    <div className="flex h-[72vh] flex-col gap-4 md:h-[78vh]">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-900 bg-zinc-950/80 p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Assignment
          </h2>
          <textarea
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            disabled={isSessionStarted}
            placeholder="Paste your assignment, problem, or question here..."
            className="min-h-[140px] flex-1 resize-none rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
          />
          <button
            type="button"
            onClick={handleStart}
            disabled={!assignment.trim() || isSessionStarted}
            className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {isSessionStarted ? "Session started" : "Start tutoring session"}
          </button>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-black/40">
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                Your tutor will appear here once you start a session.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "student" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                      m.role === "student"
                        ? "bg-emerald-500 text-black"
                        : m.role === "tutor"
                          ? "bg-zinc-900 text-zinc-100"
                          : "bg-zinc-950 text-zinc-400"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-zinc-900 bg-black/60 p-3">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!isSessionStarted}
                placeholder={
                  isSessionStarted
                    ? "Write your next attempt or idea..."
                    : "Start a session by adding an assignment first."
                }
                rows={2}
                className="max-h-24 flex-1 resize-none rounded-2xl border border-zinc-800 bg-black/60 p-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
              />
              <button
                type="submit"
                disabled={!isSessionStarted || !input.trim()}
                className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-100 px-4 text-xs font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => void handleEndSession()}
                disabled={!isSessionStarted || messages.length === 0 || isEnding}
                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-700 bg-transparent px-4 text-xs font-medium text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
              >
                {isEnding ? "Ending..." : "End session"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
