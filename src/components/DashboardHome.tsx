"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, MessageSquare, Plus, Upload, Sparkles } from "lucide-react";

interface SessionRow {
  id: string;
  assignment_text: string;
  title: string | null;
  created_at: string;
  receipt: unknown | null;
}

interface StudyMaterial {
  id: string;
  file_name: string;
  topic: string | null;
  created_at: string;
}

interface MaterialDetail {
  material: StudyMaterial;
  flashcards: Array<{ id: string; front: string; back: string; mastery?: number }>;
  quiz_questions: Array<{ id: string; question: string; choices: string[]; answer: string }>;
}

type TutorContext = {
  source: "none" | "flashcard" | "session" | "material";
  id?: string;
  title?: string;
  prompt?: string;
};

export default function DashboardHome() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askText, setAskText] = useState("");
  const [tutorContext, setTutorContext] = useState<TutorContext>({ source: "none" });
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const sessionsRes = await fetch("/api/sessions");
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData || []);

        const materialsRes = await fetch("/api/study-materials");
        const materialsData = await materialsRes.json();
        setMaterials(materialsData.materials || []);
      } catch (err) {
        setError("Unable to load dashboard content. Refresh to retry.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const resumeItems = useMemo(() => {
    const recentSessions = sessions
      .filter((s) => s.receipt === null)
      .slice(0, 3)
      .map((s) => ({
        key: s.id,
        type: "chat" as const,
        title: s.title ?? s.assignment_text.slice(0, 50),
        progress: 52,
        date: s.created_at,
        meta: "Tutor chat",
      }));

    const recentMaterials = materials
      .slice(0, 3)
      .map((m) => ({
        key: m.id,
        type: "material" as const,
        title: m.topic || m.file_name,
        progress: 34,
        date: m.created_at,
        meta: "Study set",
      }));

    return [...recentSessions, ...recentMaterials].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 3);
  }, [sessions, materials]);

  const handleUploadFile = async (file: File) => {
    setProcessing(true);
    setError(null);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const [, dataPart] = result.split(",");
          resolve(dataPart);
        };
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/study-materials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, text: b64 }),
      });

      const payload = await response.json();
      if (!payload.materialId) throw new Error(payload.error ?? "Upload failed");

      const materialsResponse = await fetch("/api/study-materials");
      const materialsJson = await materialsResponse.json();
      setMaterials(materialsJson.materials || []);

      // load selected material automatically
      const materialDetail = await (await fetch(`/api/study-materials/${payload.materialId}`)).json();
      setSelectedMaterial(materialDetail);
      setTutorContext({ source: "material", id: payload.materialId, title: materialDetail.material.file_name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected upload issue");
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) await handleUploadFile(file);
  };

  const handleAsk = () => {
    if (!askText.trim()) return;
    router.push(`/app/new?prompt=${encodeURIComponent(askText.trim())}`);
  };

  const selectFlashcard = (index: number) => {
    setActiveFlashcardIndex(index);
    setTutorContext({
      source: "flashcard",
      id: selectedMaterial?.flashcards[index]?.id,
      title: selectedMaterial?.flashcards[index]?.front,
    });
  };

  const selectedFlashcard = selectedMaterial?.flashcards?.[activeFlashcardIndex];

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[#1A1A1A]">Command Center</h1>
          <p className="text-sm text-[#57534E]">Subject-first hub for tutoring and study sets.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-[#6B7280]">Last sync: {new Date().toLocaleTimeString()}</div>
      </div>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-[#1A1A1A]">Resume Learning</h2>
          <span className="text-xs text-[#A8A29E]">Quick access to recent activity</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="w-[260px] h-24 rounded-xl bg-[#F5F5F4] animate-pulse" />
            ))
          ) : resumeItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D1D5DB] px-4 py-5 text-sm text-[#6B7280]">No recent items yet. Start with New Chat or Upload Material.</div>
          ) : (
            resumeItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  if (item.type === "chat") router.push(`/app/session/${item.key}`);
                  else if (item.type === "material") router.push(`/app/library?focus=${item.key}`);
                }}
                className="w-[260px] flex-shrink-0 rounded-xl border border-[#E7E5E4] bg-white p-3 text-left hover:shadow-md transition"
              >
                <div className="flex items-center gap-2 text-xs text-[#A8A29E] uppercase tracking-wide">
                  {item.type === "chat" ? "Tutor" : "Material"}
                  <span>·</span>
                  <span>{item.meta}</span>
                </div>
                <h3 className="font-semibold text-sm text-[#1A1A1A] truncate mt-1">{item.title}</h3>
                <div className="mt-2 h-2 rounded-full bg-[#E5E7EB]">
                  <div className="h-2 rounded-full bg-[#D97706]" style={{ width: `${item.progress}%` }} />
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-[#1A1A1A] mb-2">Active Learning</h3>
          <p className="text-sm text-[#57534E] mb-4">Ask any subject question and continue tutoring instantly.</p>
          <div className="flex gap-2">
            <input
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              placeholder="Ask about calculus, Shakespeare, or physics..."
              className="flex-1 rounded-lg border border-[#E7E5E4] px-3 py-2 text-sm focus:border-[#D97706] outline-none"
            />
            <button
              onClick={handleAsk}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#111111] transition"
            >
              <Sparkles className="w-4 h-4" />
              Go
            </button>
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-5 text-center transition hover:border-[#D97706] hover:bg-[#FFFBF5]"
        >
          <Upload className="mx-auto h-6 w-6 text-[#D97706]" />
          <h3 className="font-semibold text-[#1A1A1A] mt-3">Resource Creation</h3>
          <p className="text-sm text-[#57534E] mt-1">Drop a PDF to generate a study set with flashcards and quizzes.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4B4F51] px-3 py-2 text-xs font-medium text-white hover:bg-[#363B3E] transition"
          >
            Upload PDF
          </button>
        </div>
      </section>

      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUploadFile(file);
        }}
      />

      {processing && <p className="text-xs text-[#A8A29E]">Processing PDF... this can take up to 15–30 seconds.</p>}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {selectedMaterial ? (
        <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Integrated Workbench</h2>
            <span className="text-xs text-[#A8A29E]">Material: {selectedMaterial.material.file_name}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-[#FCFCFB] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#1A1A1A]">Flashcard Carousel</h3>
                <span className="text-xs text-[#A8A29E]">{selectedMaterial.flashcards.length} cards</span>
              </div>
              {selectedMaterial.flashcards.length === 0 ? (
                <p className="text-sm text-[#57534E]">No flashcards yet. Go to uploads to generate.</p>
              ) : (
                <>
                  <div className="rounded-xl border border-[#E7E5E4] p-4 mb-3">
                    <p className="text-xs uppercase tracking-wide text-[#A8A29E]">Card {activeFlashcardIndex + 1} / {selectedMaterial.flashcards.length}</p>
                    <h4 className="text-base font-semibold text-[#1A1A1A] mt-2">{selectedFlashcard?.front}</h4>
                    <p className="text-sm text-[#57534E] mt-2">{selectedFlashcard?.back}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      disabled={activeFlashcardIndex === 0}
                      onClick={() => selectFlashcard(activeFlashcardIndex - 1)}
                      className="px-3 py-2 rounded-lg border text-xs text-[#1A1A1A] hover:bg-[#E7E5E4] disabled:opacity-50"
                    >Previous</button>
                    <button
                      disabled={activeFlashcardIndex === selectedMaterial.flashcards.length - 1}
                      onClick={() => selectFlashcard(activeFlashcardIndex + 1)}
                      className="px-3 py-2 rounded-lg border text-xs text-[#1A1A1A] hover:bg-[#E7E5E4] disabled:opacity-50"
                    >Next</button>
                    <button
                      onClick={() => setTutorContext({ source: "flashcard", id: selectedFlashcard?.id, title: selectedFlashcard?.front })}
                      className="px-3 py-2 rounded-lg bg-[#D97706] text-xs text-white hover:bg-[#b86b04] transition"
                    >Explain this</button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-[#FCFCFB] rounded-xl p-4 border border-[#E7E5E4]">
              <h3 className="font-semibold text-[#1A1A1A] mb-3">Tutor Drawer</h3>
              <p className="text-xs uppercase tracking-wide text-[#A8A29E] mb-3">Context-aware conversation</p>
              <div className="rounded-lg border border-[#E7E5E4] p-3 mb-3 bg-white">
                <div className="text-[10px] text-[#A8A29E]">Current context</div>
                <div className="text-sm text-[#1A1A1A] mt-1">
                  {tutorContext.source === "none" && "No context selected yet."}
                  {tutorContext.source === "material" && `Material: ${tutorContext.title}`}
                  {tutorContext.source === "flashcard" && `Card: ${tutorContext.title}`}
                  {tutorContext.source === "session" && `Session ID: ${tutorContext.id}`}
                </div>
              </div>
              <textarea
                className="w-full rounded-lg border border-[#E7E5E4] p-2 text-sm min-h-[120px] focus:border-[#D97706] outline-none"
                placeholder="Ask the tutor about this context (e.g., explain, compare, summarize...)
"                onFocus={() => setTutorContext((prev) => (prev.source === "none" ? { source: "material", title: selectedMaterial.material.file_name } : prev))}
              />
              <button className="mt-2 w-full rounded-lg bg-[#1A1A1A] px-3 py-2 text-sm text-white hover:bg-[#111111] transition">Send to Tutor</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
