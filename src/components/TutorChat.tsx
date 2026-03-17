"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, ImagePlus, X, FileText } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type MessageRole = "student" | "tutor" | "system";

export type TutorMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

const SUBJECTS = ["General", "Maths", "English", "Science", "History", "Languages"] as const;
type Subject = (typeof SUBJECTS)[number];

const OPENING_MESSAGES: Record<string, string[]> = {
  Maths: [
    "Let's approach this systematically. What does the problem ask you to find, and what information do you have to work with?",
    "Good. Before we start — what's the mathematical concept or method you think is relevant here?",
    "Let's think this through carefully. What do you already know, and what are you trying to solve for?",
  ],
  English: [
    "Let's think critically about this. What's the core argument or idea you think this assignment wants you to explore?",
    "Good choice of topic. What angle do you want to take, and what's the first thing that comes to mind?",
    "Before we start writing — what do you think makes a strong response to this kind of question?",
  ],
  Science: [
    "Interesting topic. What's the key principle or concept you think this question is built around?",
    "Let's break this down. What do you already know about this topic, and what feels unclear?",
    "Good. What scientific idea or law do you think is central to answering this?",
  ],
  History: [
    "Let's dig into this. What's your initial take on the main causes or factors at play here?",
    "Good. Before we analyse — what do you already know about this period or event?",
    "Interesting question. What argument do you think this essay wants you to make?",
  ],
  Languages: [
    "Let's work through this together. What grammatical structure or vocabulary do you think is being tested here?",
    "Good. What's your first attempt at this? Don't worry about being perfect — just try.",
    "Let's think about the rules at play. What pattern do you notice in this question?",
  ],
  General: [
    "Let's work through this together. What's your first instinct about what this question is really getting at?",
    "Good. Before we dive in — in your own words, what do you think this assignment wants you to demonstrate?",
    "Let's think this through properly. What's the core concept or skill being tested here?",
    "Interesting. What do you already know that feels relevant to this?",
    "Let's approach this methodically. What's the key thing you need to understand or show here?",
  ],
};

function getOpeningMessage(subject: Subject): string {
  const pool = OPENING_MESSAGES[subject] ?? OPENING_MESSAGES.General;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  const [fileName, setFileName] = useState<string>("");
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

  const clearFile = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMime("");
    setFileName("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PDF: read as base64 directly (no compression)
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => {
        const [, data] = (reader.result as string).split(",");
        setImagePreview(null);
        setImageBase64(data);
        setImageMime("application/pdf");
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
      return;
    }

    // Image: compress to max 1024px
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
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
        setFileName(file.name);
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
          setExtractError(data.error ?? "Couldn't read the file. Try again or type your assignment.");
        }
      } catch (err) {
        setExtractError(err instanceof Error ? err.message : "Network error reading file. Try again.");
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
        content: getOpeningMessage(subject),
      },
    ]);
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageBase64) || !isSessionStarted || isLoading) return;

    const pendingImage = imageBase64;
    const pendingMime = imageMime;
    const inputText = input.trim();

    // For PDFs: extract text first, embed in message content
    let pdfText: string | null = null;
    let pdfError: string | null = null;
    if (pendingImage && pendingMime === "application/pdf") {
      setIsLoading(true);
      try {
        const res = await fetch("/api/extract-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: pendingImage, mimeType: pendingMime }),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        pdfText = data.text ?? null;
        if (!pdfText) pdfError = data.error ?? "Couldn't extract PDF text.";
      } catch (err) {
        pdfError = err instanceof Error ? err.message : "Network error reading PDF.";
      }
    }

    // If PDF extraction failed, surface the error and abort the send
    if (pdfError) {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "tutor" as const,
          content: `I couldn't read that PDF (${pdfError}). Try uploading a photo of the page instead, or paste the text directly.`,
        },
      ]);
      return;
    }

    const messageContent = pdfText
      ? `${inputText ? inputText + "\n\n" : ""}[Uploaded file contents:\n${pdfText}]`
      : inputText || "📷 [image attached]";

    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "student",
      content: messageContent,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    clearFile();
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
          // Only send images to vision model; PDFs are already embedded as text above
          ...(pendingImage && pendingMime !== "application/pdf" && { imageBase64: pendingImage, imageMime: pendingMime }),
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

  // Returns a clean display version of a message (hides raw PDF text dump)
  const getDisplayContent = (content: string): string => {
    const pdfTag = "[Uploaded file contents:";
    const idx = content.indexOf(pdfTag);
    if (idx === -1) return content;
    const before = content.slice(0, idx).trim();
    return before ? `${before}\n\n📄 PDF attached` : "📄 PDF attached";
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
          accept="image/*,.pdf"
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

          {/* File preview */}
          {(imagePreview ?? (imageMime === "application/pdf" ? true : null)) && (
            <div className="relative mb-4 rounded-2xl overflow-hidden border border-[#E7E5E4] shadow-sm">
              {imageMime === "application/pdf" ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-white">
                  <FileText className="w-8 h-8 shrink-0 text-[#D97706]" strokeWidth={1.5} />
                  <span className="text-sm text-[#1A1A1A] truncate">{fileName}</span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imagePreview!} alt="Assignment" className="w-full max-h-56 object-cover" />
              )}
              <button
                onClick={clearFile}
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
              {isExtracting ? "Reading file..." : "Start session"}
            </button>

            {/* Image upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-[#E7E5E4] px-4 py-3 text-sm text-[#57534E] hover:border-[#D97706] hover:text-[#D97706] transition"
              title="Upload image or PDF of assignment"
            >
              <ImagePlus className="w-4 h-4" strokeWidth={1.5} />
              Upload file
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
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* Subject chip */}
          {subject !== "General" && (
            <span className="shrink-0 rounded-md bg-[#D97706]/10 px-2 py-0.5 text-[10px] font-medium text-[#D97706] uppercase tracking-wide">
              {subject}
            </span>
          )}
          {/* Truncated assignment — click to expand */}
          <button
            onClick={() => setIsAssignmentExpanded((v) => !v)}
            className="flex-1 min-w-0 text-left"
            title={isAssignmentExpanded ? undefined : assignment}
          >
            <p className={`text-xs text-[#57534E] leading-relaxed transition-all ${isAssignmentExpanded ? "" : "line-clamp-1"}`}>
              {assignment}
            </p>
          </button>
          <button
            onClick={() => void handleEndSession()}
            disabled={messages.length === 0 || isEnding || !sessionId}
            className="shrink-0 rounded-lg border border-[#E7E5E4] px-4 py-1.5 text-xs font-medium text-[#57534E] hover:border-red-300 hover:text-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isEnding ? "Ending…" : "End session"}
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
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "student"
                    ? "bg-[#1A1A1A] text-white rounded-br-sm"
                    : "bg-white border border-[#E7E5E4] text-[#1A1A1A] rounded-bl-sm shadow-sm"
                }`}
              >
                {getDisplayContent(m.content)}
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
        accept="image/*,.pdf"
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
          {/* File attachment preview */}
          {(imagePreview ?? (imageMime === "application/pdf" ? true : null)) && (
            <div className="mb-2 flex">
              <div className="relative inline-flex items-center gap-2 bg-white border border-[#E7E5E4] rounded-xl px-3 py-2 shadow-sm">
                {imageMime === "application/pdf" ? (
                  <>
                    <FileText className="w-5 h-5 shrink-0 text-[#D97706]" strokeWidth={1.5} />
                    <span className="text-xs text-[#1A1A1A] max-w-[160px] truncate">{fileName}</span>
                  </>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={imagePreview!} alt="attached" className="h-12 rounded-lg object-cover" />
                )}
                <button
                  type="button"
                  onClick={clearFile}
                  className="ml-1 p-0.5 rounded-full bg-[#1A1A1A] text-white shrink-0"
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
              title="Attach image or PDF"
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
