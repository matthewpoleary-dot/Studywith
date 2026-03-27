"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  isGenerating: boolean;
  error: string | null;
}

export default function UploadZone({ onFileUpload, isGenerating, error }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === "application/pdf");

    if (pdfFile) {
      onFileUpload(pdfFile);
    } else {
      alert("Please upload a PDF file.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      onFileUpload(file);
    } else if (file) {
      alert("Please select a PDF file.");
    }
  };

  return (
    <div className="mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? "border-[#D97706] bg-[#D97706]/5"
            : "border-[#E7E5E4] hover:border-[#D97706]/50 hover:bg-[#D97706]/5"
        } ${isGenerating ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isGenerating}
        />

        {isGenerating ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
            <div>
              <p className="font-medium text-[#1A1A1A] mb-1">Generating flashcards & quiz...</p>
              <p className="text-sm text-[#57534E]">This may take a minute</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#D97706]/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-[#D97706]" />
            </div>
            <div>
              <p className="font-medium text-[#1A1A1A] mb-1">Upload your study materials</p>
              <p className="text-sm text-[#57534E] mb-3">
                Drop a PDF here or click to browse
              </p>
              <p className="text-xs text-[#A8A29E]">
                We'll generate flashcards and practice questions automatically
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}