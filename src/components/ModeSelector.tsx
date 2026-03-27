"use client";

import { useState } from "react";
import { MessageCircle, BookOpen } from "lucide-react";

type Mode = "tutor" | "materials";

interface ModeSelectorProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-[#F5F4F0] rounded-xl p-1 mb-6">
      <button
        onClick={() => onModeChange("tutor")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          currentMode === "tutor"
            ? "bg-white text-[#1A1A1A] shadow-sm"
            : "text-[#57534E] hover:text-[#1A1A1A]"
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        Tutor Mode
      </button>
      <button
        onClick={() => onModeChange("materials")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          currentMode === "materials"
            ? "bg-white text-[#1A1A1A] shadow-sm"
            : "text-[#57534E] hover:text-[#1A1A1A]"
        }`}
      >
        <BookOpen className="w-4 h-4" />
        Study Materials
      </button>
    </div>
  );
}