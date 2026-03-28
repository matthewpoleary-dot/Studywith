"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Upload, Loader2 } from "lucide-react";
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
  const materialId = searchParams?.get("id");
  const [selected, setSelected] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("flashcards");
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!materialId) {
      // No id param — try to redirect to first material
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/study-materials");
          const data = (await res.json()) as { materials?: StudyMaterial[] };
          const first = data.materials?.[0];
          if (first) {
            router.replace(`/app/study-materials?id=${first.id}`);
          }
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    if (loadedId.current === materialId) return;
    loadedId.current = materialId;
    setLoading(true);
    setTab("flashcards");
    void (async () => {
      try {
        const res = await fetch(`/api/study-materials/${materialId}`);
        const data = (await res.json()) as MaterialDetail;
        setSelected(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [materialId, router]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="w-5 h-5 text-[#1A1A1A] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-24">
        <div className="w-12 h-12 rounded-xl bg-[#F5F4F0] flex items-center justify-center mb-4">
          <Upload className="w-5 h-5 text-[#A8A29E]" strokeWidth={1.5} />
        </div>
        <p className="font-serif text-xl text-[#1A1A1A] mb-2">No material selected</p>
        <p className="text-sm text-[#57534E] max-w-xs leading-relaxed">
          Upload a PDF or image using the sidebar to generate flashcards and a practice quiz.
        </p>
      </div>
    );
  }

  return (
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
  );
}

export default function StudyDashboard() {
  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full py-24">
            <Loader2 className="w-5 h-5 text-[#1A1A1A] animate-spin" strokeWidth={2} />
          </div>
        }
      >
        <StudyDashboardInner />
      </Suspense>
    </div>
  );
}
