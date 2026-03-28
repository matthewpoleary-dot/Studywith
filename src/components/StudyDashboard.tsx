"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Loader2, X, Plus } from "lucide-react";
import FlashcardDeck, { type FlashcardRow } from "./FlashcardDeck";
import PracticeQuiz, { type QuizQuestionRow } from "./PracticeQuiz";

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

export default function StudyDashboard() {
  const [tab, setTab] = useState<Tab>("flashcards");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selected, setSelected] = useState<MaterialDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setTab("flashcards");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFile = async (file: File) => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const [, data] = (reader.result as string).split(",");
          resolve(data);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const extractRes = await fetch("/api/extract-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || "application/pdf" }),
      });
      const extractData = (await extractRes.json()) as { text?: string; error?: string };
      if (!extractData.text) throw new Error(extractData.error ?? "Could not extract text from the file.");

      const genRes = await fetch("/api/study-materials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractData.text, fileName: file.name }),
      });
      const genData = (await genRes.json()) as { materialId?: string; error?: string };
      if (!genData.materialId) throw new Error(genData.error ?? "Generation failed.");

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

  const handleConfidenceChange = async (flashcardId: string, confidence: number) => {
    setSelected((prev) =>
      prev
        ? { ...prev, flashcards: prev.flashcards.map((f) => f.id === flashcardId ? { ...f, confidence } : f) }
        : prev,
    );
    await fetch("/api/study-materials/confidence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId, confidence }),
    });
  };

  if (loadingList) {
    return (
      <div className="flex items-center justify-center min-h-64 flex-1">
        <Loader2 className="w-5 h-5 text-[#1A1A1A] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full overflow-hidden flex flex-col md:flex-row">
      {/* Left panel — materials list */}
      <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-[#E7E5E4] flex flex-col bg-[#FAFAF8]">
        <div className="p-4 border-b border-[#E7E5E4]">
          <h2 className="font-serif text-lg font-medium text-[#1A1A1A] mb-3">Materials</h2>
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
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#D6D3D1] bg-white px-3 py-2.5 text-xs font-medium text-[#57534E] hover:border-[#D97706]/50 hover:text-[#1A1A1A] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> Generating…</>
            ) : (
              <><Plus className="w-3.5 h-3.5" strokeWidth={2} /> Upload new</>
            )}
          </button>
          {generateError && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2">
              <X className="w-3 h-3 text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[10px] text-red-600 leading-snug">{generateError}</p>
            </div>
          )}
        </div>

        {/* Materials list */}
        <div className="flex-1 overflow-y-auto py-2">
          {materials.length === 0 ? (
            <p className="text-xs text-[#A8A29E] px-4 py-3">No materials yet.</p>
          ) : (
            materials.map((m) => {
              const active = selected?.material.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => void loadMaterial(m.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition group ${
                    active ? "bg-white border-l-2 border-[#D97706]" : "border-l-2 border-transparent hover:bg-white/60"
                  }`}
                >
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${active ? "text-[#D97706]" : "text-[#A8A29E] group-hover:text-[#57534E]"}`}
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium leading-snug truncate ${active ? "text-[#1A1A1A]" : "text-[#57534E]"}`}>
                      {m.topic || m.file_name}
                    </p>
                    {m.topic && (
                      <p className="text-[10px] text-[#A8A29E] truncate mt-0.5">{m.file_name}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selected && !loadingDetail && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-24">
            <div className="w-12 h-12 rounded-xl bg-[#F5F4F0] flex items-center justify-center mb-4">
              <Upload className="w-5 h-5 text-[#A8A29E]" strokeWidth={1.5} />
            </div>
            <p className="font-serif text-xl text-[#1A1A1A] mb-2">No material selected</p>
            <p className="text-sm text-[#57534E] max-w-xs leading-relaxed">
              Upload a PDF or image to generate flashcards and a practice quiz.
            </p>
          </div>
        )}

        {loadingDetail && (
          <div className="flex items-center justify-center h-full py-24">
            <Loader2 className="w-5 h-5 text-[#1A1A1A] animate-spin" strokeWidth={2} />
          </div>
        )}

        {selected && !loadingDetail && (
          <div className="px-6 py-6 max-w-2xl mx-auto">
            {/* Material header */}
            <div className="mb-6">
              <h1 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-1">
                {selected.material.topic || selected.material.file_name}
              </h1>
              <p className="text-xs text-[#A8A29E]">
                {selected.flashcards.length} flashcards · {selected.quiz_questions.length} quiz questions ·{" "}
                {new Date(selected.material.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>

            {/* Underline tab switcher */}
            <div className="flex border-b border-[#E7E5E4] mb-6">
              {(["flashcards", "quiz"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
                    tab === t
                      ? "border-[#1A1A1A] text-[#1A1A1A]"
                      : "border-transparent text-[#A8A29E] hover:text-[#57534E]"
                  }`}
                >
                  {t === "quiz" ? "Practice Quiz" : "Flashcards"}
                </button>
              ))}
            </div>

            {/* Content */}
            {tab === "flashcards" ? (
              selected.flashcards.length > 0 ? (
                <FlashcardDeck cards={selected.flashcards} onConfidenceChange={handleConfidenceChange} />
              ) : (
                <p className="text-sm text-[#57534E] text-center py-12">No flashcards were generated for this material.</p>
              )
            ) : selected.quiz_questions.length > 0 ? (
              <PracticeQuiz questions={selected.quiz_questions} fileName={selected.material.file_name} />
            ) : (
              <p className="text-sm text-[#57534E] text-center py-12">No quiz questions were generated for this material.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
