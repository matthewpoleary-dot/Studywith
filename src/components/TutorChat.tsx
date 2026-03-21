"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Send, ImagePlus, X, FileText, BookOpen } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type MessageRole = "student" | "tutor" | "system";

export type TutorMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

const SUBJECT_OPTIONS = [
  "General", "Maths", "Science", "English", "History", "Languages",
  "Computer Science", "Engineering", "Economics", "Psychology", "Business", "Art & Design",
] as const;
type Subject = (typeof SUBJECT_OPTIONS)[number];

// Map display subjects to opening-message pools
const SUBJECT_TO_POOL: Record<Subject, keyof typeof OPENING_MESSAGES> = {
  General: "General", Maths: "Maths", Science: "Science", English: "English",
  History: "History", Languages: "Languages",
  "Computer Science": "General", Engineering: "Maths",
  Economics: "General", Psychology: "General", Business: "General", "Art & Design": "English",
};

function detectSubject(text: string): Subject {
  const t = text.toLowerCase();
  if (/\b(algorithm|programming|code|python|javascript|java|c\+\+|database|software|html|css|function|loop|array|recursion|compiler|network|api|git)\b/.test(t)) return "Computer Science";
  if (/\b(circuit|thermodynamics|mechanical|structural|stress|strain|fluid|engineering|cad|electronics|statics|dynamics|beam|torque|voltage|current)\b/.test(t)) return "Engineering";
  if (/\b(economics|supply|demand|gdp|inflation|macroeconom|microeconom|fiscal|monetary|elasticity|equilibrium|market|trade)\b/.test(t)) return "Economics";
  if (/\b(psychology|behaviour|cognitive|memory|attachment|personality|experiment|mental|stimulus|response|piaget|freud|brain)\b/.test(t)) return "Psychology";
  if (/\b(business|marketing|management|strategy|finance|accounting|revenue|profit|entrepreneur|stakeholder|swot|cash flow)\b/.test(t)) return "Business";
  if (/\b(art|design|colour|composition|painting|sculpture|photography|typography|texture|perspective|visual|aesthetic)\b/.test(t)) return "Art & Design";
  if (/\b(math|algebra|calculus|equation|differentiat|integrat|trigonometry|geometry|probability|statistics|vector|matrix|polynomial|logarithm|quadratic|times|multiply|divide|fraction|percentage|decimal|squared|cubed|factorial|prime|arithmetic|calculate)\b/.test(t) || /\d\s*[×÷+\-*/^]\s*\d/.test(t) || /\bwhat(?:'?s| is)\s+\d+/.test(t)) return "Maths";
  if (/\b(biology|chemistry|physics|photosynthesis|atom|molecule|cell|dna|evolution|force|energy|wave|element|compound|reaction|enzyme)\b/.test(t)) return "Science";
  if (/\b(essay|literature|poem|poetry|novel|write|writing|argument|thesis|character|theme|metaphor|narrative|prose|language analysis)\b/.test(t)) return "English";
  if (/\b(history|war|revolution|empire|century|medieval|ancient|cold war|world war|industrial|political|government|democracy|monarch)\b/.test(t)) return "History";
  if (/\b(french|spanish|german|italian|japanese|chinese|korean|arabic|latin|translate|conjugat|vocabulary|grammar|verb|tense)\b/.test(t)) return "Languages";
  return "General";
}

const OPENING_MESSAGES: Record<string, string[]> = {
  Maths: [
    "Let's approach this systematically. What does the problem ask you to find, and what information do you have to work with?",
    "Good. Before we start: what's the mathematical concept or method you think is relevant here?",
    "Let's think this through carefully. What do you already know, and what are you trying to solve for?",
  ],
  English: [
    "Let's think critically about this. What's the core argument or idea you think this assignment wants you to explore?",
    "Good choice of topic. What angle do you want to take, and what's the first thing that comes to mind?",
    "Before we start writing: what do you think makes a strong response to this kind of question?",
  ],
  Science: [
    "Interesting topic. What's the key principle or concept you think this question is built around?",
    "Let's break this down. What do you already know about this topic, and what feels unclear?",
    "Good. What scientific idea or law do you think is central to answering this?",
  ],
  History: [
    "Let's dig into this. What's your initial take on the main causes or factors at play here?",
    "Good. Before we analyse: what do you already know about this period or event?",
    "Interesting question. What argument do you think this essay wants you to make?",
  ],
  Languages: [
    "Let's work through this together. What grammatical structure or vocabulary do you think is being tested here?",
    "Good. What's your first attempt at this? Don't worry about being perfect, just try.",
    "Let's think about the rules at play. What pattern do you notice in this question?",
  ],
  General: [
    "Let's work through this together. What's your first instinct about what this question is really getting at?",
    "Good. Before we dive in: in your own words, what do you think this assignment wants you to demonstrate?",
    "Let's think this through properly. What's the core concept or skill being tested here?",
    "Interesting. What do you already know that feels relevant to this?",
    "Let's approach this methodically. What's the key thing you need to understand or show here?",
  ],
};

function getOpeningMessage(subject: Subject): string {
  const poolKey = SUBJECT_TO_POOL[subject] ?? "General";
  const pool = OPENING_MESSAGES[poolKey] ?? OPENING_MESSAGES.General;
  return pool[Math.floor(Math.random() * pool.length)];
}

const REVIEW_OPENERS: Array<(topic: string) => string> = [
  (t) => `Let's get ${t} properly clear. Walk me through what you do understand about it so far, even if it's just a little.`,
  (t) => `Good call revisiting this. What's your current understanding of ${t}? Start anywhere and we'll build from there.`,
  (t) => `Let's work through ${t} together. Tell me what you already know, and I'll help fill in the gaps.`,
  (t) => `${t.charAt(0).toUpperCase() + t.slice(1)} is worth getting solid on. What do you think is the core idea behind it?`,
];

function getReviewOpeningMessage(topic: string): string {
  const opener = REVIEW_OPENERS[Math.floor(Math.random() * REVIEW_OPENERS.length)];
  return opener(topic);
}

type SessionMode = "tutor" | "corrector";

const CORRECTOR_OPENING_MESSAGES = [
  "Share your answers and I'll mark them for you — correct, incorrect, or partially correct, with an explanation for each.",
  "Ready to review your work. Paste your answers (all at once or one by one) and I'll give you direct feedback on each.",
  "Let's go through your answers. Share what you've got and I'll tell you what's right, what needs fixing, and why.",
];

function getCorrectorOpeningMessage(): string {
  return CORRECTOR_OPENING_MESSAGES[Math.floor(Math.random() * CORRECTOR_OPENING_MESSAGES.length)];
}

type TutorChatProps = {
  initialAssignment?: string;
  initialMessages?: TutorMessage[];
  initialSessionId?: string | null;
  initialImageUrl?: string;
  autoFetchOpener?: boolean;
  assignmentFileUrl?: string;
  assignmentFileName?: string;
  initialMode?: SessionMode;
};

export default function TutorChat({
  initialAssignment = "",
  initialMessages = [],
  initialSessionId = null as string | null,
  initialImageUrl,
  autoFetchOpener = false,
  assignmentFileUrl,
  assignmentFileName,
  initialMode = "tutor",
}: TutorChatProps = {}) {
  const [assignment, setAssignment] = useState(initialAssignment);
  const [subject, setSubject] = useState<Subject>(() => detectSubject(initialAssignment));
  const [mode, setMode] = useState<SessionMode>(initialMode);
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
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectPulsing, setSubjectPulsing] = useState(false);
  const prevSubjectRef = useRef<Subject>(detectSubject(initialAssignment));
  const [sageAvatar, setSageAvatar] = useState("🌿");
  const [showPdf, setShowPdf] = useState(false);

  // Pending image URL from room assignment — attached automatically on first send
  const pendingImageUrlRef = useRef<string | null>(initialImageUrl ?? null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const router = useRouter();
  const pathname = usePathname();
  const isSessionRoute =
    !!pathname?.startsWith("/app/session/") || pathname === "/app/new";

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  const handleContainerScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // Scroll to bottom when soft keyboard opens (visualViewport shrinks)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (isNearBottomRef.current) scrollToBottom(false);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [scrollToBottom]);

  // Auth guard + load sage avatar
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login?redirectTo=/app"); return; }
      const avatar = user.user_metadata?.sage_avatar as string | undefined;
      if (avatar) setSageAvatar(avatar);
    });
  }, [router]);

  // Smart auto-scroll: always scroll on new tutor messages; respect user position otherwise
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length <= prev) return; // no new messages
    const last = messages[messages.length - 1];
    // Always scroll for tutor messages. For user messages, only scroll if near bottom.
    if (last?.role === "tutor" || isNearBottomRef.current) {
      scrollToBottom();
      isNearBottomRef.current = true;
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isLoading && isNearBottomRef.current) scrollToBottom();
  }, [isLoading, scrollToBottom]);

  // Focus input when session starts
  useEffect(() => {
    if (isSessionStarted) textareaRef.current?.focus();
  }, [isSessionStarted]);

  // Auto-detect subject as user types, animate on change
  useEffect(() => {
    if (!isSessionStarted) {
      const detected = detectSubject(assignment);
      if (detected !== prevSubjectRef.current) {
        prevSubjectRef.current = detected;
        setSubject(detected);
        setSubjectPulsing(true);
        setTimeout(() => setSubjectPulsing(false), 600);
      }
    }
  }, [assignment, isSessionStarted]);

  // Close subject dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(e.target as Node)) {
        setSubjectOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-start when arriving from a room assignment (?prefill=..&autoStart=1) or review link (?topic=...)
  useEffect(() => {
    if (!initialAssignment) return;

    if (autoFetchOpener) {
      // Room assignment: start session and fetch Sage's real opener (knows actual questions)
      setIsSessionStarted(true);
      setIsLoading(true);

      const pendingUrl = pendingImageUrlRef.current;
      if (pendingUrl) pendingImageUrlRef.current = null;

      void fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment: initialAssignment,
          subject: detectSubject(initialAssignment),
          messages: [{ id: "opener", role: "student", content: "Start on question 1 now." }],
          ...(pendingUrl && { imageUrl: pendingUrl }),
        }),
      })
        .then((r) => r.json())
        .then((data: { content?: string; sessionId?: string | null }) => {
          if (data.sessionId) setSessionId(data.sessionId);
          setMessages([
            {
              id: crypto.randomUUID(),
              role: "tutor",
              content: data.content ?? getReviewOpeningMessage(initialAssignment),
            },
          ]);
        })
        .catch(() => {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: "tutor",
              content: getReviewOpeningMessage(initialAssignment),
            },
          ]);
        })
        .finally(() => setIsLoading(false));
    } else {
      // Study-page review link: instant hardcoded opener
      setIsSessionStarted(true);
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "tutor",
          content: getReviewOpeningMessage(initialAssignment),
        },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFile = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMime("");
    setFileName("");
  };

  const processFile = (file: File) => {
    // PDF: read as base64 directly (no compression)
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => {
        const [, data] = (reader.result as string).split(",");
        setImagePreview(null);
        setImageBase64(data);
        setImageMime("application/pdf");
        setFileName(file.name || "document.pdf");
      };
      reader.readAsDataURL(file);
      return;
    }

    // Image: compress to max 1024px
    if (!file.type.startsWith("image/")) return;
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
        setFileName(file.name || "screenshot.jpg");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && (items[i].type.startsWith("image/") || items[i].type === "application/pdf")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          return;
        }
      }
    }
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
        content: mode === "corrector" ? getCorrectorOpeningMessage() : getOpeningMessage(subject),
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

    // Consume pending image URL from room assignment (first send only)
    const pendingUrl = pendingImageUrlRef.current;
    if (pendingUrl) pendingImageUrlRef.current = null;

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment,
          subject,
          messages: [...messages, userMessage],
          sessionId,
          mode,
          // User-attached image (base64); PDFs are already embedded as text
          ...(pendingImage && pendingMime !== "application/pdf" && { imageBase64: pendingImage, imageMime: pendingMime }),
          // Room assignment image URL — only used if no user-attached image this turn
          ...(!pendingImage && pendingUrl && { imageUrl: pendingUrl }),
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
      window.location.href = `/app/session/${data.receiptId}/summary`;
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
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-10 md:py-16">
        {/* File input must be mounted here too since active session JSX isn't rendered yet */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleImageSelect}
        />
        <div className="w-full max-w-xl mx-auto">
          <h1 className="font-serif text-3xl font-medium text-[#1A1A1A] mb-2">
            What are we working on?
          </h1>
          <p className="text-sm text-[#57534E] mb-6 leading-relaxed">
            Paste a question, topic, or assignment, or upload a photo of your notes.
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
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) void handleStart();
            }}
            placeholder={
              imageBase64
                ? "Add notes or extra context (optional)..."
                : "e.g. 'Explain the causes of WW1' or paste your assignment directly..."
            }
            rows={6}
            className="w-full resize-none rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition mb-3 shadow-sm"
          />

          {/* Helper text — shown when textarea is empty */}
          {!assignment.trim() && !imageBase64 && (
            <p className="text-xs text-[#A8A29E] mb-3 -mt-1">
              Sage will ask what you already know, then guide you from there.
            </p>
          )}

          {/* Example prompts — shown when textarea is empty */}
          {!assignment.trim() && !imageBase64 && (
            <div className="mb-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#A8A29E] mb-2">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Explain how photosynthesis converts light into energy",
                  "Solve: 3x² + 5x − 2 = 0",
                  "Help me structure a history essay on the causes of WW1",
                  "What is the role of mitochondria in cellular respiration?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setAssignment(prompt)}
                    className="rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs text-[#57534E] hover:border-[#D97706]/50 hover:text-[#1A1A1A] transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject auto-detected silently in background — no dropdown shown */}

          {/* Mode selector */}
          <div className="mb-5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#A8A29E] mb-2">Mode</p>
            <div className="inline-flex rounded-xl border border-[#E7E5E4] bg-white p-1 gap-1">
              <button
                type="button"
                onClick={() => setMode("tutor")}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                  mode === "tutor"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "text-[#57534E] hover:text-[#1A1A1A]"
                }`}
              >
                Study with Sage
              </button>
              <button
                type="button"
                onClick={() => setMode("corrector")}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                  mode === "corrector"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "text-[#57534E] hover:text-[#1A1A1A]"
                }`}
              >
                Check my answers
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[#A8A29E]">
              {mode === "tutor"
                ? "Sage guides you through the work with questions."
                : "Share your completed answers and Sage will mark them."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleStart()}
              disabled={!canStart || isExtracting}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-7 py-3 text-sm font-medium text-white hover:bg-[#1A1A1A]/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isExtracting ? "Reading file..." : mode === "corrector" ? "Start marking" : "Start session"}
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

          <p className="hidden md:block text-xs text-[#A8A29E] mt-3">
            Cmd+Enter to start
          </p>
        </div>
      </div>
    );
  }

  // ── Session active ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      {/* Assignment strip */}
      <div className="sticky top-0 z-10 bg-[#FDFCF8]/95 backdrop-blur-sm border-b border-[#E7E5E4] px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* Mode chip */}
          {mode === "corrector" && (
            <span className="shrink-0 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700 uppercase tracking-wide">
              Corrector
            </span>
          )}
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
          {/* View questions toggle — only shown when a PDF is attached */}
          {assignmentFileUrl && (
            <button
              onClick={() => setShowPdf((v) => !v)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${showPdf ? "border-[#D97706] bg-[#D97706]/10 text-[#D97706]" : "border-[#E7E5E4] text-[#57534E] hover:border-[#D97706]/50 hover:text-[#D97706]"}`}
            >
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
              Questions
            </button>
          )}
          {/* Mode toggle buttons */}
          {mode === "tutor" ? (
            <button
              onClick={() => {
                setMode("corrector");
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "tutor" as const,
                    content: "Switching to marking mode. Share your completed answers — text or a photo of your work — and I'll go through them for you.",
                  },
                ]);
              }}
              className="shrink-0 rounded-lg border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#57534E] hover:border-emerald-400 hover:text-emerald-700 transition whitespace-nowrap"
            >
              Check answers
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("tutor");
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "tutor" as const,
                    content: "Back to tutor mode. What would you like to work through?",
                  },
                ]);
              }}
              className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-white transition whitespace-nowrap"
            >
              Back to tutoring
            </button>
          )}
          <button
            onClick={() => void handleEndSession()}
            disabled={messages.length === 0 || isEnding || !sessionId}
            className="shrink-0 rounded-lg border border-[#E7E5E4] px-4 py-1.5 text-xs font-medium text-[#57534E] hover:border-red-300 hover:text-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isEnding ? "Ending…" : "End session"}
          </button>
        </div>
      </div>

      {/* PDF panel — fixed overlay so it sits above sticky header */}
      {showPdf && assignmentFileUrl && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop — click anywhere on the left to close */}
          <div
            className="flex-1 bg-black/20 cursor-pointer"
            onClick={() => setShowPdf(false)}
          />
          {/* Panel */}
          <div className="w-full md:w-[52%] bg-white border-l border-[#E7E5E4] shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E5E4] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-red-400 shrink-0" strokeWidth={1.5} />
                <span className="text-xs font-medium text-[#1A1A1A] truncate">
                  {assignmentFileName ?? "Assignment"}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <a
                  href={assignmentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#A8A29E] hover:text-[#57534E] transition whitespace-nowrap"
                >
                  Open in tab
                </a>
                <button
                  onClick={() => setShowPdf(false)}
                  className="p-1 rounded-lg text-[#A8A29E] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] transition"
                  title="Close"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <object
                data={`${assignmentFileUrl}#toolbar=0&view=FitH`}
                type="application/pdf"
                className="w-full h-full"
                style={{ minHeight: "400px" }}
              >
                <div className="flex flex-col items-center justify-center h-40 gap-3 p-6">
                  <FileText className="w-8 h-8 text-red-400" strokeWidth={1.5} />
                  <p className="text-sm text-[#57534E] text-center">
                    PDF can&apos;t be previewed here.{" "}
                    <a href={assignmentFileUrl} target="_blank" rel="noopener noreferrer" className="text-[#D97706] underline">
                      Open in new tab
                    </a>
                  </p>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto overscroll-contain py-8 px-6"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.role === "student" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "tutor" && (
                <div className="flex flex-col items-center mr-2.5 shrink-0">
                  <div className="w-7 h-7 rounded-full bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center mt-0.5 text-base leading-none">
                    {sageAvatar}
                  </div>
                  <span className="text-[9px] text-[#A8A29E] mt-0.5 leading-none">Sage</span>
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
              <div className="flex flex-col items-center mr-2.5 shrink-0">
                <div className="w-7 h-7 rounded-full bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center mt-0.5 text-base leading-none">
                  {sageAvatar}
                </div>
                <span className="text-[9px] text-[#A8A29E] mt-0.5 leading-none">Sage</span>
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
      <div
        className="sticky bottom-0 bg-[#FDFCF8]/95 backdrop-blur-sm border-t border-[#E7E5E4] px-6 pt-4 pb-4"
        style={isSessionRoute ? { paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" } : undefined}
      >
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
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={mode === "corrector" ? "Paste your answers here..." : "Write your response..."}
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
          <p className="text-center text-[11px] text-[#A8A29E] mt-2 hidden md:block">
            Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
