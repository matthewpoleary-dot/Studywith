"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
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

function StudyDashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("flashcards");
  const [selected, setSelected] = useState<MaterialDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const lastIdRef = useRef<string | null>(null);

  const idParam = searchParams.get("id");

  // On first load with no ?id, load the most recent material
  useEffect(() => {
    const load = async () => {
      if (idParam) {
        setInitialLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/study-materials");
        const data = (await res.json()) as { materials?: StudyMaterial[] };
        const list = data.materials ?? [];
        if (list.length > 0) {
          router.replace(`/app/study-materials?id=${list[0].id}`);
        }
      } finally {
        setInitialLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load material whenever ?id changes
  useEffect(() => {
    if (!idParam || idParam === lastIdRef.current) return;
    lastIdRef.current = idParam;
    setLoadingDetail(true);
    setTab("flashcards");
    fetch(`/api/study-materials/${idParam}`)
      .then((r) => r.json())
      .then((data: MaterialDetail) => setSelected(data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [idParam]);

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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-[#1A1A1A] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  if (!idParam && !selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-24">
        <p className="font-serif text-2xl text-[#1A1A1A] mb-2">No material selected</p>
        <p className="text-sm text-[#57534E] max-w-xs leading-relaxed">
          Upload a PDF using the sidebar to generate flashcards and a practice quiz.
        </p>
      </div>
    );
  }

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-[#1A1A1A] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  if (!selected) return null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-1">
            {selected.material.topic || selected.material.file_name}
          </h1>
          <p className="text-xs text-[#A8A29E]">
            {selected.flashcards.length} flashcards · {selected.quiz_questions.length} quiz questions ·{" "}
            {new Date(selected.material.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {/* Underline tabs */}
        <div className="flex border-b border-[#E7E5E4] mb-6">
          {(["flashcards", "quiz"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
                tab === t ? "border-[#1A1A1A] text-[#1A1A1A]" : "border-transparent text-[#A8A29E] hover:text-[#57534E]"
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
    </div>
  );
}

export default function StudyDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-[#1A1A1A] animate-spin" strokeWidth={2} />
      </div>
    }>
      <StudyDashboardInner />
    </Suspense>
  );
}
