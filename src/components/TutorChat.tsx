"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, ImagePlus, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type MessageRole = "student" | "tutor" | "system";

export type TutorMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

const SUBJECTS = ["General", "Maths", "English", "Science", "History", "Languages"] as const;
type Subject = (typeof SUBJECTS)[number];

type TutorChatProps = {
  initialAssignment?: string;
  initialMessages?: TutorMessage[];
  initialSessionId?: string | null;
};

export default function TutorChat({
  initialAssignment = "",
  initialMessages = [],
  initialSessionId = null as string | null,
}: TutorChatProps = {}) {
  const [assignment, setAssignment] = useState(initialAssignment);
  const [subject, setSubject] = useState<Subject>("General");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>(initialMessages);
  const [isSessionStarted, setIsSessionStarted] = useState(initialMessages.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [isAssignmentExpanded, setIsAssignmentExpanded] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Compress to max 1024px — keeps base64 well under Next.js 4MB body limit
        const MAX = 1024;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        const [, data] = compressed.split(",");
        setImagePreview(compressed);
        setImageBase64(data);
        setImageMime("image/jpeg");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleStart = async () => {
    let finalAssignment = assignment.trim();

    // If image uploaded but no assignment text yet, extract first
    if (imageBase64 && !finalAssignment) {
      setIsExtracting(true);
      setExtractError(null);
      try {
        const res = await fetch("/api/extract-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mimeType: imageMime }),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (data.text) {
          finalAssignment = data.text;
          setAssignment(data.text);
        } else {
          setExtractError(data.error ?? "Couldn't read the image. Try again or type your assignment.");
        }
      } catch (err) {
        setExtractError(err instanceof Error ? err.message : "Network error reading image. Try again.");
      } finally {
        setIsExtracting(false);
      }
    }

    if (!finalAssignment) return;
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
    if ((!input.trim() && !imageBase64) || !isSessionStarted || isLoading) return;

    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "student",
      content: input.trim() || "📷 [image attached]",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    const pendingImage = imageBase64;
    const pendingMime = imageMime;
    setImagePreview(null);
    setImageBase64(null);
    setImageMime("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment,
          subject,
          messages: [...messages, userMessage],
          sessionId,
          ...(pendingImage && { imageBase64: pendingImage, imageMime: pendingMime }),
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
    const canStart = !!assignment.trim() || !!imageBase64;
    return (
      <div className="h-screen flex items-center justify-center px-6 py-12">
        {/* File input must be mounted here too since active session JSX isn't rendered yet */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <div className="w-full max-w-xl">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            New tutoring session
          </h1>
          <p className="text-sm text-[#57534E] mb-6 leading-relaxed">
            Paste your assignment below, or upload a photo and we&apos;ll read it for you.
          </p>

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mb-4 rounded-2xl overflow-hidden border border-[#E7E5E4] shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Assignment"
                className="w-full max-h-56 object-cover"
              />
              <button
                onClick={() => {
                  setImagePreview(null);
                  setImageBase64(null);
                  setImageMime("");
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {extractError && (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {extractError}
            </p>
          )}

          <textarea
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) void handleStart();
            }}
            placeholder={
              imageBase64
                ? "Add notes or extra context (optional)..."
                : "Paste your assignment, problem, or question here..."
            }
            rows={6}
            className="w-full resize-none rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition mb-4 shadow-sm"
          />

          {/* Subject picker */}
          <div className="mb-5">
            <p className="text-xs font-medium text-[#57534E] mb-2">Subject</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    subject === s
                      ? "bg-[#D97706] text-white"
                      : "border border-[#E7E5E4] text-[#57534E] hover:border-[#D97706] hover:text-[#D97706]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleStart()}
              disabled={!canStart || isExtracting}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-7 py-3 text-sm font-medium text-white hover:bg-[#1A1A1A]/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isExtracting ? "Reading image..." : "Start session"}
            </button>

            {/* Image upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-[#E7E5E4] px-4 py-3 text-sm text-[#57534E] hover:border-[#D97706] hover:text-[#D97706] transition"
              title="Upload image of assignment"
            >
              <ImagePlus className="w-4 h-4" strokeWidth={1.5} />
              Upload image
            </button>
          </div>

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
        <div className="max-w-2xl mx-auto flex items-start gap-4">
          <button
            onClick={() => setIsAssignmentExpanded((v) => !v)}
            className="flex-1 min-w-0 text-left group"
          >
            <p
              className={`text-xs text-[#57534E] transition-all ${
                isAssignmentExpanded ? "" : "truncate"
              }`}
            >
              <span className="font-semibold text-[#1A1A1A]">Assignment:</span>{" "}
              {assignment}
            </p>
            <span className="text-[10px] text-[#A8A29E] group-hover:text-[#57534E] transition mt-0.5 block">
              {isAssignmentExpanded ? "Show less ▲" : "Show more ▼"}
            </span>
          </button>
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

      {/* Hidden file input — always mounted */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Input bar */}
      <div className="sticky bottom-0 bg-[#FDFCF8]/95 backdrop-blur-sm border-t border-[#E7E5E4] px-6 py-4">
        <form
          className="max-w-2xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          {/* Image attachment preview */}
          {imagePreview && (
            <div className="mb-2 flex">
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="attached"
                  className="h-16 rounded-xl border border-[#E7E5E4] shadow-sm object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageBase64(null); setImageMime(""); }}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#1A1A1A] text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

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
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[#A8A29E] hover:text-[#D97706] transition"
              title="Attach image"
            >
              <ImagePlus className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="submit"
              disabled={(!input.trim() && !imageBase64) || isLoading}
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
