"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Loader2,
  Layers,
  BookOpen,
  ChevronDown,
  X,
} from "lucide-react";
import FlashcardDeck, { type FlashcardRow } from "./FlashcardDeck";
import PracticeQuiz, { type QuizQuestionRow } from "./PracticeQuiz";

// ── Types ───────────────────────────────────────────────────────────────────

interface StudyMaterial {
  id: string;
  file_name: string;
  topic: string | null;
  created_at: string;
}

interface MaterialDetail {
  material: StudyMaterial;
  flashcards: FlashcardRow[];
  quiz_questions: QuizQuestionRow[];
}

type Tab = "flashcards" | "quiz";

// ── Component ────────────────────────────────────────────────────────────────

export default function StudyDashboard() {
  const [tab, setTab] = useState<Tab>("flashcards");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selected, setSelected] = useState<MaterialDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load materials list on mount
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/study-materials");
        const data = (await res.json()) as { materials?: StudyMaterial[] };
        const list = data.materials ?? [];
        setMaterials(list);
        if (list.length > 0) await loadMaterial(list[0].id);
      } finally {
        setLoadingList(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMaterial = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/study-materials/${id}`);
      const data = (await res.json()) as MaterialDetail;
      setSelected(data);
      setTab("flashcards"); // reset to first tab on new material
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── File upload flow ────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setGenerating(true);
    setGenerateError(null);

    try {
      // 1. Encode as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const [, data] = (reader.result as string).split(",");
          resolve(data);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // 2. Extract text via existing endpoint (handles PDF + images)
      const extractRes = await fetch("/api/extract-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || "application/pdf",
        }),
      });
      const extractData = (await extractRes.json()) as {
        text?: string;
        error?: string;
      };
      if (!extractData.text) {
        throw new Error(
          extractData.error ?? "Could not extract text from the file.",
        );
      }

      // 3. Generate flashcards + quiz
      const genRes = await fetch("/api/study-materials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractData.text, fileName: file.name }),
      });
      const genData = (await genRes.json()) as {
        materialId?: string;
        error?: string;
        flashcards?: number;
        questions?: number;
      };
      if (!genData.materialId) {
        throw new Error(genData.error ?? "Generation failed.");
      }

      // 4. Refresh list and open the new material
      const listRes = await fetch("/api/study-materials");
      const listData = (await listRes.json()) as { materials?: StudyMaterial[] };
      setMaterials(listData.materials ?? []);
      await loadMaterial(genData.materialId);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  // Optimistic confidence update
  const handleConfidenceChange = async (flashcardId: string, confidence: number) => {
    setSelected((prev) =>
      prev
        ? {
            ...prev,
            flashcards: prev.flashcards.map((f) =>
              f.id === flashcardId ? { ...f, confidence } : f,
            ),
          }
        : prev,
    );
    await fetch("/api/study-materials/confidence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId, confidence }),
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loadingList) {
    return (
      <div className="flex items-center justify-center min-h-64 flex-1">
        <Loader2 className="w-5 h-5 text-[#1A2B3C] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto app-main">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-[#1A2B3C] mb-1">
              Study Materials
            </h1>
            <p className="text-sm text-[#64748B]">
              Upload your notes to generate flashcards and practice quizzes.
            </p>
          </div>
        </div>

        {/* Upload + material selector row */}
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Upload trigger */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={generating}
              className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-white px-5 py-4 text-sm text-[#64748B] hover:border-[#1A2B3C]/30 hover:text-[#1A2B3C] hover:bg-[#F8FAFC] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" strokeWidth={2} />
                  <span>Generating materials — this takes ~20 seconds…</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>Upload PDF or image to generate study materials</span>
                </>
              )}
            </button>
            {generateError && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-[#B91C1C]/25 bg-red-50 px-3 py-2">
                <X className="w-3.5 h-3.5 text-[#B91C1C] shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-xs text-[#B91C1C]">{generateError}</p>
              </div>
            )}
          </div>

          {/* Material picker */}
          {materials.length > 0 && (
            <div className="relative sm:w-64 shrink-0" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="w-full flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-left hover:border-[#1A2B3C]/30 transition"
              >
                <FileText
                  className="w-4 h-4 text-[#1A2B3C] shrink-0"
                  strokeWidth={1.5}
                />
                <span className="flex-1 truncate text-[#334155] text-sm">
                  {selected?.material.file_name ?? "Select a material"}
                </span>
                <ChevronDown
                  className="w-4 h-4 text-[#94A3B8] shrink-0"
                  strokeWidth={1.5}
                />
              </button>

              {pickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-[#E2E8F0] bg-white shadow-lg z-20 overflow-hidden max-h-64 overflow-y-auto">
                  {materials.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        void loadMaterial(m.id);
                        setPickerOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 hover:bg-[#F8FAFC] transition ${
                        selected?.material.id === m.id
                          ? "bg-[#F8FAFC] font-medium text-[#1A2B3C]"
                          : "text-[#334155]"
                      }`}
                    >
                      <FileText
                        className="w-3.5 h-3.5 shrink-0 text-[#94A3B8]"
                        strokeWidth={1.5}
                      />
                      <span className="truncate">{m.file_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empty state */}
        {!selected && !loadingDetail && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1A2B3C]/8 flex items-center justify-center mb-5">
              <Layers className="w-8 h-8 text-[#1A2B3C]" strokeWidth={1.5} />
            </div>
            <p className="font-serif text-2xl text-[#1A2B3C] mb-2">
              No materials yet
            </p>
            <p className="text-sm text-[#64748B] max-w-xs leading-relaxed">
              Upload your notes, past papers, or revision sheets above to generate
              syllabus-aligned flashcards and exam-style quizzes.
            </p>
          </div>
        )}

        {/* Loading detail */}
        {loadingDetail && (
          <div className="flex items-center justify-center py-24">
            <Loader2
              className="w-5 h-5 text-[#1A2B3C] animate-spin"
              strokeWidth={2}
            />
          </div>
        )}

        {/* Material content */}
        {selected && !loadingDetail && (
          <div>
            {/* Source + stats */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-5">
              <FileText
                className="w-3.5 h-3.5 text-[#94A3B8]"
                strokeWidth={1.5}
              />
              <p className="text-xs text-[#64748B]">{selected.material.file_name}</p>
              <span className="text-[#CBD5E1]">·</span>
              <p className="text-xs text-[#64748B]">
                {selected.flashcards.length} flashcards
              </p>
              <span className="text-[#CBD5E1]">·</span>
              <p className="text-xs text-[#64748B]">
                {selected.quiz_questions.length} quiz questions
              </p>
              <span className="text-[#CBD5E1]">·</span>
              <p className="text-xs text-[#94A3B8]">
                {new Date(selected.material.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-[#F1F5F9] rounded-xl mb-6 w-fit">
              <button
                onClick={() => setTab("flashcards")}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${
                  tab === "flashcards"
                    ? "bg-white text-[#1A2B3C] shadow-sm"
                    : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
                Flashcards
              </button>
              <button
                onClick={() => setTab("quiz")}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${
                  tab === "quiz"
                    ? "bg-white text-[#1A2B3C] shadow-sm"
                    : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                Practice Quiz
              </button>
            </div>

            {/* Tab content */}
            {tab === "flashcards" ? (
              selected.flashcards.length > 0 ? (
                <FlashcardDeck
                  cards={selected.flashcards}
                  onConfidenceChange={handleConfidenceChange}
                />
              ) : (
                <p className="text-sm text-[#64748B] text-center py-12">
                  No flashcards were generated for this material.
                </p>
              )
            ) : selected.quiz_questions.length > 0 ? (
              <PracticeQuiz
                questions={selected.quiz_questions}
                fileName={selected.material.file_name}
              />
            ) : (
              <p className="text-sm text-[#64748B] text-center py-12">
                No quiz questions were generated for this material.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
