"use client";

import { useState, useEffect } from "react";
import { Layers, BookOpen, ChevronDown, X } from "lucide-react";
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

interface LibraryViewProps {
  materials: StudyMaterial[];
  selectedMaterial: MaterialDetail | null;
  onMaterialSelect: (materialId: string) => void;
  loading: boolean;
}

export default function LibraryView({
  materials,
  selectedMaterial,
  onMaterialSelect,
  loading
}: LibraryViewProps) {
  const [tab, setTab] = useState<Tab>("flashcards");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Auto-select first material if none selected
  useEffect(() => {
    if (materials.length > 0 && !selectedMaterial) {
      onMaterialSelect(materials[0].id);
    }
  }, [materials, selectedMaterial, onMaterialSelect]);

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F5F4F0] border border-[#E7E5E4] mb-4">
          <BookOpen className="w-8 h-8 text-[#A8A29E]" />
        </div>
        <h3 className="font-medium text-[#1A1A1A] mb-2">No study materials yet</h3>
        <p className="text-sm text-[#57534E]">
          Upload a PDF above to generate flashcards and practice questions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Material Selector */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E7E5E4] rounded-lg hover:border-[#D97706]/50 transition-colors"
          >
            <FileText className="w-4 h-4 text-[#D97706]" />
            <span className="text-sm font-medium text-[#1A1A1A]">
              {selectedMaterial?.material.file_name || "Select material"}
            </span>
            <ChevronDown className="w-4 h-4 text-[#A8A29E]" />
          </button>

          {pickerOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[#E7E5E4] rounded-lg shadow-lg z-10">
              {materials.map((material) => (
                <button
                  key={material.id}
                  onClick={() => {
                    onMaterialSelect(material.id);
                    setPickerOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-[#F5F4F0] transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D97706] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">
                        {material.file_name}
                      </p>
                      {material.topic && (
                        <p className="text-xs text-[#57534E] truncate">
                          {material.topic}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm text-[#57534E]">
          {selectedMaterial && (
            <span>
              {selectedMaterial.flashcards.length} cards • {selectedMaterial.quiz_questions.length} questions
            </span>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1 bg-[#F5F4F0] rounded-lg p-1">
        <button
          onClick={() => setTab("flashcards")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "flashcards"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#57534E] hover:text-[#1A1A1A]"
          }`}
        >
          <Layers className="w-4 h-4" />
          Flashcards
        </button>
        <button
          onClick={() => setTab("quiz")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "quiz"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#57534E] hover:text-[#1A1A1A]"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Practice Quiz
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#D97706]/10 mb-3">
              <div className="w-4 h-4 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm text-[#57534E]">Loading...</p>
          </div>
        </div>
      ) : selectedMaterial ? (
        <div className="bg-white border border-[#E7E5E4] rounded-xl overflow-hidden">
          {tab === "flashcards" ? (
            <FlashcardDeck flashcards={selectedMaterial.flashcards} />
          ) : (
            <PracticeQuiz questions={selectedMaterial.quiz_questions} />
          )}
        </div>
      ) : null}
    </div>
  );
}