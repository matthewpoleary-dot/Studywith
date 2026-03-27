"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StudyMaterial = {
  id: string;
  file_name: string;
  topic: string | null;
  created_at: string;
};

export default function LibraryPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/study-materials");
        const data = await res.json();
        setMaterials(data.materials || []);
      } catch {
        setError("Could not load library. Try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#1A1A1A]">Library</h1>
          <p className="text-sm text-[#57534E]">All uploaded PDFs and generated study sets.</p>
        </div>
        <Link href="/app" className="text-sm font-medium text-[#D97706] hover:underline">Back to Dashboard</Link>
      </div>

      {loading && <p className="text-sm text-[#6B7280]">Loading library...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-3">
        {materials.map((mat) => (
          <Link
            key={mat.id}
            href={`/app/library?focus=${mat.id}`}
            className="rounded-xl border border-[#E7E5E4] bg-white p-4 hover:shadow-md transition"
          >
            <div className="font-medium text-[#1A1A1A]">{mat.topic || mat.file_name}</div>
            <div className="text-xs text-[#6B7280] mt-1">{mat.file_name}</div>
          </Link>
        ))}
      </div>

      {materials.length === 0 && !loading && !error && (
        <p className="text-sm text-[#6B7280] mt-4">No materials yet. Upload a PDF from the command center.</p>
      )}
    </div>
  );
}
